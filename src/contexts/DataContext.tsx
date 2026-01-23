import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { FIRESTORE_PATHS, getGuestsStorageKey } from '../config/firestorePaths'
import { normalizePhone, normalizeName, getGuestKey, dedupeGuests } from '../utils/guestUtils'
import * as XLSX from 'xlsx'

export interface Guest {
  name: string
  phone: string
  email?: string // 이메일 주소
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
  isWalkIn?: boolean // 현장 예매 여부
  paymentConfirmed?: boolean // 입금 확인 완료 여부
  paymentConfirmedAt?: number // 입금 확인 시간 (timestamp)
  isDeleted?: boolean // 삭제 여부 (취소선 표시용)
  deletedAt?: number // 삭제 시간 (timestamp)
  [key: string]: any
}

export interface SetlistItem {
  songName: string
  artist: string
  image?: string
  vocal?: string
  guitar?: string
  bass?: string
  keyboard?: string
  drum?: string
  part?: 1 | 2 // 1부 또는 2부 구분
  team?: string // 팀명 (멜로딕, 노을, 렉사 등)
}

export interface PerformanceData {
  setlist?: SetlistItem[]
  performers?: string[]
  events?: Array<{
    title: string
    description: string
    time?: string
  }>
  ticket?: {
    eventName: string
    date: string
    venue: string
    seat?: string
  }
}

export interface GuestbookMessage {
  id: string
  name: string
  message: string
  timestamp: number
  ornamentType?: string
  position?: { x: number; y: number }
}

export interface BookingInfo {
  accountName: string // 입금 계좌 이름
  bankName: string // 은행명
  accountNumber: string // 계좌번호
  walkInPrice: string // 현장 예매 가격
  preBookingPrice?: string // 사전 예매 가격
  refundPolicy: string // 환불 정책
  contactPhone: string // 안내 전화번호
}


interface DataContextType {
  guests: Guest[]
  performanceData: PerformanceData | null
  guestbookMessages: GuestbookMessage[]
  bookingInfo: BookingInfo | null
  eventsEnabled: boolean
  uploadGuests: (guests: Guest[]) => Promise<void>
  addWalkInGuest: (name: string, phone: string, isWalkIn?: boolean, email?: string) => Promise<{ success: boolean; message?: string }>
  toggleGuestPayment: (index: number) => Promise<void>
  setPerformanceData: (data: PerformanceData) => void
  setBookingInfo: (info: BookingInfo) => void
  addGuestbookMessage: (message: GuestbookMessage) => void
  clearGuests: () => void
  deleteGuest: (index: number) => Promise<void>
  updateGuest: (index: number, updatedGuest: Guest) => Promise<void>
  clearSetlist: () => void
  setEventsEnabled: (enabled: boolean) => void
  clearGuestbookMessages: () => void
  clearChatMessages: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [guests, setGuests] = useState<Guest[]>([])
  const [performanceData, setPerformanceDataState] = useState<PerformanceData | null>(null)
  const [guestbookMessages, setGuestbookMessages] = useState<GuestbookMessage[]>([])
  const [bookingInfo, setBookingInfoState] = useState<BookingInfo | null>(null)
  const [eventsEnabled, setEventsEnabledState] = useState<boolean>(false)
  
  // 초기 로드 완료 여부 추적 (리스너와 충돌 방지)
  const initialLoadCompleteRef = useRef(false)
  const lastGuestsHashRef = useRef<string>('')
  
  // ✅ 리스너에서 최신 guests state 참조용 (클로저 문제 해결)
  const guestsRef = useRef<Guest[]>([])
  useEffect(() => {
    guestsRef.current = guests
  }, [guests])
  
  // ✅ 충돌 감지용: 마지막으로 본 updatedAt 추적
  const lastKnownUpdatedAtRef = useRef<number | null>(null)
  
  // ✅ guests write coalesce (연타/중복 방지) + 충돌 감지
  const writeInFlightRef = useRef(false)
  const pendingWriteRef = useRef<{ guests: Guest[], _cleared?: number | null } | null>(null)
  
  // ✅ 초기화 후 일정 시간 동안 자동 저장 차단
  const clearBlockUntilRef = useRef<number | null>(null)
  
  // ✅ 클라이언트 ID 생성 (누가 썼는지 추적용)
  const getClientId = (): string => {
    let clientId = localStorage.getItem('clientId')
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('clientId', clientId)
    }
    return clientId
  }
  
  const saveGuestsAllCoalesced = async (
    payload: { guests: Guest[], _cleared?: number | null }, 
    maxRetries: number = 3,
    writeSource: string = 'unknown'
  ) => {
    console.log('[WRITE] saveGuestsAllCoalesced 시작:', {
      guestsCount: payload.guests.length,
      _cleared: payload._cleared,
      _clearedType: typeof payload._cleared,
      writeSource,
      clearBlockUntil: clearBlockUntilRef.current,
      now: Date.now()
    })
    
    // ✅ 초기화 후 차단 시간이 지나지 않았으면 저장 차단
    // 단, _cleared가 명시적으로 설정된 경우(초기화 작업)는 허용
    const isClearOperation = payload._cleared !== undefined && payload._cleared !== null
    if (!isClearOperation && clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('[WRITE] 저장 차단됨 (초기화 후 차단 시간 내)')
      return
    }
    
    // ✅ 초기화 마커 보존 및 보호 로직
    // 1. 초기화 작업: _cleared가 숫자(타임스탬프)인 경우 → 항상 허용
    // 2. 초기화 해제: _cleared가 null이고 guests가 있는 경우 → 허용
    // 3. 일반 저장: _cleared가 undefined인 경우 → 초기화 마커가 있으면 차단
    
    const isInitializing = payload._cleared !== undefined && payload._cleared !== null && typeof payload._cleared === 'number'
    const isClearing = payload._cleared === null && payload.guests.length > 0
    const isNormalSave = payload._cleared === undefined
    
    // 초기화 작업이나 초기화 해제 작업은 항상 허용
    if (isInitializing || isClearing) {
      // 계속 진행
    } else if (isNormalSave) {
      // 일반 저장 작업인 경우, 초기화 마커가 있으면 차단
      // ✅ guests 우선 원칙: guests가 있으면 초기화 마커와 관계없이 저장 허용
      try {
        const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
        const currentCleared = (currentData as any)?._cleared
        const isFirestoreCleared = currentCleared !== undefined && currentCleared !== null && typeof currentCleared === 'number'
        const currentGuests = (currentData as any)?.guests || []
        const hasGuests = Array.isArray(currentGuests) && currentGuests.length > 0
        
        // guests가 없고 초기화 마커가 있을 때만 차단
        if (!hasGuests && isFirestoreCleared) {
          throw new Error('게스트 리스트가 초기화된 상태입니다. 초기화를 해제하려면 게스트를 업로드하거나 복원해주세요.')
        }
      } catch (error: any) {
        // 초기화 마커 확인 중 오류가 발생했고, 이미 위에서 throw된 경우는 재throw
        if (error?.message?.includes('초기화된 상태')) {
          throw error
        }
      }
    }
    
    // 최신 payload로 업데이트 (이전 요청이 있으면 덮어쓰기)
    pendingWriteRef.current = payload
    
    // 이미 write가 진행 중이면 대기
    if (writeInFlightRef.current) {
      return
    }
    
    writeInFlightRef.current = true
    
    try {
      // pending이 있는 동안 계속 처리 (coalesce)
      while (pendingWriteRef.current) {
        const currentPayload = pendingWriteRef.current
        pendingWriteRef.current = null // 처리 중인 payload 초기화
        
        // ✅ 충돌 감지: write 전에 현재 문서의 updatedAt 확인
        let retryCount = 0
        let writeSuccess = false
        
        while (retryCount < maxRetries && !writeSuccess) {
          try {
            // 현재 Firestore 문서 읽기
            const { getFirestoreData } = await import('../services/firestoreService')
            const currentDoc = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID) as any
            
            // ✅ 기존 DB 데이터와 merge하여 중복 방지
            let existingGuests: Guest[] = []
            if (currentDoc && Array.isArray(currentDoc.guests)) {
              existingGuests = currentDoc.guests
            }
            
            // ✅ 초기화 작업이 아닌 경우에만 merge (초기화는 빈 배열로 덮어쓰기)
            let finalGuests: Guest[] = currentPayload.guests
            if (!isInitializing) {
              // 기존 guests + 새로운 guests를 합치고 중복 제거
              const mergedGuests = [...existingGuests, ...currentPayload.guests]
              finalGuests = dedupeGuests(mergedGuests)
              
              console.log('[WRITE] 중복 제거 결과:', {
                existingCount: existingGuests.length,
                incomingCount: currentPayload.guests.length,
                mergedCount: mergedGuests.length,
                dedupedCount: finalGuests.length,
                duplicatesRemoved: mergedGuests.length - finalGuests.length
              })
            }
            
            if (currentDoc && currentDoc.updatedAt) {
              // updatedAt을 number로 변환 (Timestamp 또는 number일 수 있음)
              const currentUpdatedAt = currentDoc.updatedAt?.toMillis?.() || currentDoc.updatedAt?.seconds * 1000 || currentDoc.updatedAt
              
              // 마지막으로 본 updatedAt과 비교
              if (lastKnownUpdatedAtRef.current !== null && currentUpdatedAt !== lastKnownUpdatedAtRef.current) {
                // 최신 데이터로 재시도 (현재 state를 최신 Firestore 데이터와 merge)
                if (retryCount < maxRetries - 1) {
                  // 현재 state의 guests를 사용 (이미 최신 데이터를 반영했을 가능성)
                  // 또는 Firestore의 최신 데이터를 읽어서 merge할 수도 있음
                  retryCount++
                  await new Promise(resolve => setTimeout(resolve, 100 * retryCount)) // 백오프
                  continue
                } else {
                  throw new Error('CONFLICT: 다른 클라이언트가 데이터를 수정했습니다. 페이지를 새로고침하고 다시 시도해주세요.')
                }
              }
            }
            
            // 충돌 없음 또는 첫 write → 정상 진행
            
            // ✅ lastAction 결정
            let lastAction = 'AUTO_SAVE'
            if (isInitializing) {
              lastAction = 'CLEAR'
            } else if (isClearing) {
              lastAction = 'IMPORT' // 초기화 해제는 보통 업로드/복원
            } else if (writeSource.includes('upload')) {
              lastAction = 'UPLOAD'
            } else if (writeSource.includes('addWalkIn')) {
              lastAction = 'ADD_WALKIN'
            } else if (writeSource.includes('togglePayment')) {
              lastAction = 'TOGGLE_PAYMENT'
            } else if (writeSource.includes('delete')) {
              lastAction = 'DELETE'
            } else if (writeSource.includes('update')) {
              lastAction = 'UPDATE'
            }
            
            // ✅ 최종 payload 생성 (merge된 guests 사용)
            const finalPayload: any = {
              guests: finalGuests,
              updatedBy: getClientId(),
              lastAction: lastAction,
              writeSource: writeSource
            }
            
            // _cleared는 명시적으로 설정된 경우만 포함
            // 초기화 작업: _cleared가 숫자 → 포함
            // 초기화 해제: _cleared가 null → deleteField()로 완전 삭제
            // 일반 저장: _cleared가 undefined → 포함하지 않음 (기존 값 보존)
            if (currentPayload._cleared !== undefined) {
              if (currentPayload._cleared === null) {
                // null이면 완전히 삭제 (초기화 해제)
                const { deleteField } = await import('firebase/firestore')
                finalPayload._cleared = deleteField()
              } else {
                // 숫자면 그대로 포함 (초기화 작업)
                finalPayload._cleared = currentPayload._cleared
              }
            }
            // undefined인 경우는 finalPayload에 포함하지 않음 → setFirestoreData에서 기존 값 보존
            
            console.log('[WRITE] Firestore write 시작:', {
              path: `${FIRESTORE_PATHS.GUESTS_COLLECTION}/${FIRESTORE_PATHS.GUESTS_DOC_ID}`,
              guestsCount: finalPayload.guests.length,
              _cleared: finalPayload._cleared,
              lastAction,
              writeSource
            })
            
            const result = await setFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, finalPayload, FIRESTORE_PATHS.GUESTS_DOC_ID)
            
            if (result === false) {
              throw new Error('Firestore write failed')
            }
            
            console.log('[WRITE] Firestore write 성공, 저장 후 데이터 확인 중...')
            
            // ✅ 성공 시 updatedAt 업데이트 및 저장 후 데이터 확인
            const newDoc = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID) as any
            
            console.log('[WRITE] 저장 후 DB 확인:', {
              dbGuestsCount: newDoc?.guests?.length || 0,
              dbCleared: newDoc?._cleared,
              dbClearedType: typeof newDoc?._cleared,
              dbUpdatedAt: newDoc?.updatedAt,
              writeSource: newDoc?.writeSource,
              lastAction: newDoc?.lastAction
            })
            
            if (newDoc && newDoc.updatedAt) {
              const newUpdatedAtValue = newDoc.updatedAt?.toMillis?.() || newDoc.updatedAt?.seconds * 1000 || newDoc.updatedAt
              lastKnownUpdatedAtRef.current = newUpdatedAtValue
            }
            
            writeSuccess = true
            console.log('[WRITE] saveGuestsAllCoalesced 완료')
            
          } catch (error: any) {
            if (error?.message?.includes('CONFLICT')) {
              throw error // 충돌 에러는 즉시 throw
            }
            
            if (retryCount < maxRetries - 1) {
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount)) // 백오프
            } else {
              throw error
            }
          }
        }
      }
    } catch (error: any) {
      throw error
    } finally {
      writeInFlightRef.current = false
    }
  }
  

  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
      try {
        // 게스트 데이터 로드
        const firestoreGuestsData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
        
        let firestoreGuests: Guest[] = []
        
        if (firestoreGuestsData) {
          const data = firestoreGuestsData as any
          
          // Firestore에서 로드한 데이터가 배열인지 확인
          if (Array.isArray(data)) {
            firestoreGuests = data
          } else if (data.guests && Array.isArray(data.guests)) {
            firestoreGuests = data.guests
          } else if (Array.isArray(data.data)) {
            firestoreGuests = data.data
          }
        }
        
        // 초기 로드 시 Firestore 데이터만 사용 (로컬 데이터 확인하지 않음)
        // 게스트 리스트는 절대 임의로 바뀌어서는 안 되므로 Firestore 데이터를 신뢰
        // 초기 로드에서는 데이터만 설정하고, 리스너가 설정된 후에는 리스너가 모든 업데이트를 처리
        const firestoreCleared = (firestoreGuestsData as any)?._cleared
        const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null && typeof firestoreCleared === 'number'
        
        console.log('[INIT LOAD] Firestore 데이터 로드:', {
          hasData: !!firestoreGuestsData,
          guestsCount: firestoreGuests.length,
          _cleared: firestoreCleared,
          _clearedType: typeof firestoreCleared,
          isFirestoreCleared,
          updatedAt: (firestoreGuestsData as any)?.updatedAt,
          writeSource: (firestoreGuestsData as any)?.writeSource,
          lastAction: (firestoreGuestsData as any)?.lastAction
        })
        
        // ✅ 초기 로드 시 updatedAt 추적 (충돌 감지용)
        if (firestoreGuestsData && (firestoreGuestsData as any).updatedAt) {
          const updatedAt = (firestoreGuestsData as any).updatedAt?.toMillis?.() || (firestoreGuestsData as any).updatedAt?.seconds * 1000 || (firestoreGuestsData as any).updatedAt
          lastKnownUpdatedAtRef.current = updatedAt
        }
        
        // ✅ guests 우선 원칙: guests가 있으면 guests를 믿고, guests가 비어있을 때만 _cleared 마커 확인
        const hasGuests = Array.isArray(firestoreGuests) && firestoreGuests.length > 0
        
        if (hasGuests) {
          // ✅ 삭제된 게스트 필터링 (화면에 표시되지 않도록)
          const activeGuests = firestoreGuests.filter(guest => guest.isDeleted !== true)
          
          console.log('[INIT LOAD] guests 있음 → 게스트 데이터 적용:', {
            totalGuestsCount: firestoreGuests.length,
            activeGuestsCount: activeGuests.length,
            deletedCount: firestoreGuests.length - activeGuests.length,
            _cleared: firestoreCleared,
            note: 'guests 우선 적용 (초기화 마커 무시, 삭제된 게스트 제외)'
          })
          setGuests(activeGuests)
          localStorage.setItem(getGuestsStorageKey(), JSON.stringify(activeGuests))
          lastGuestsHashRef.current = JSON.stringify(activeGuests)
        } else if (isFirestoreCleared) {
          // guests가 없고 초기화 마커가 있으면 → 빈 배열 적용
          console.log('[INIT LOAD] guests 없음 + 초기화 마커 감지 → 빈 배열 적용')
          setGuests([])
          localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
          lastGuestsHashRef.current = JSON.stringify([])
        } else {
          // guests가 없고 초기화 마커도 없으면 → 빈 배열 적용 (정상 상태)
          console.log('[INIT LOAD] guests 없음 + 초기화 마커 없음 → 빈 배열 적용 (정상 상태)')
          setGuests([])
          localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
          lastGuestsHashRef.current = JSON.stringify([])
        }
        
        // 초기 로드 완료 표시
        initialLoadCompleteRef.current = true
        console.log('[INIT LOAD] 초기 로드 완료')

        // 공연 데이터 로드
        const firestorePerformanceData = await getFirestoreData('performanceData' as any, 'main')
        if (firestorePerformanceData && !Array.isArray(firestorePerformanceData)) {
          const loadedData = firestorePerformanceData as PerformanceData
          // events 배열이 3개가 아니거나 첫 번째가 '관객 입장'이 아니면 업데이트
          if (!loadedData.events || loadedData.events.length !== 3 || loadedData.events[0]?.title !== '관객 입장') {
            const defaultEvents = [
              {
                title: '관객 입장',
                description: '관객 입장 시간입니다.',
                time: '18:30-19:00'
              },
              {
                title: '1부',
                description: '멜로딕의 2번째 단독공연이 시작됩니다.',
                time: '19:00-20:00'
              },
              {
                title: '2부',
                description: '10분 휴식 시간 후 2부가 시작됩니다.',
                time: '20:10-21:00'
              }
            ]
            const updatedData = { 
              ...loadedData, 
              events: defaultEvents,
              // 셋리스트와 공연진은 기존 값 유지 (절대 덮어쓰지 않음)
              setlist: loadedData.setlist || [],
              performers: loadedData.performers || []
            }
            setPerformanceDataState(updatedData)
            await setFirestoreData('performanceData' as any, updatedData, 'main').catch(() => {})
          } else {
            setPerformanceDataState(loadedData)
          }
        } else {
          const savedPerformanceData = localStorage.getItem('performanceData')
          if (savedPerformanceData) {
            try {
              const parsedData = JSON.parse(savedPerformanceData)
              // events 배열이 3개가 아니거나 첫 번째가 '관객 입장'이 아니면 업데이트
              if (!parsedData.events || parsedData.events.length !== 3 || parsedData.events[0]?.title !== '관객 입장') {
                const defaultEvents = [
                  {
                    title: '관객 입장',
                    description: '관객 입장 시간입니다.',
                    time: '18:30-19:00'
                  },
                  {
                    title: '1부',
                    description: '멜로딕의 2번째 단독공연이 시작됩니다.',
                    time: '19:00-20:00'
                  },
                  {
                    title: '2부',
                    description: '10분 휴식 시간 후 2부가 시작됩니다.',
                    time: '20:10-21:00'
                  }
                ]
                parsedData.events = defaultEvents
              }
              // 셋리스트와 공연진은 기존 값 유지 (절대 덮어쓰지 않음)
              if (!parsedData.setlist) {
                parsedData.setlist = []
              }
              if (!parsedData.performers) {
                parsedData.performers = []
              }
              setPerformanceDataState(parsedData)
              // Firestore에 동기화 (실패해도 계속 진행)
              await setFirestoreData('performanceData' as any, parsedData, 'main').catch(() => {})
            } catch (parseError) {
              // 파싱 오류 무시
            }
          } else {
            // 기본 공연 데이터 설정 (events와 ticket 포함)
            const defaultPerformanceData: PerformanceData = {
              events: [
                {
                  title: '관객 입장',
                  description: '관객 입장 시간입니다.',
                  time: '18:30-19:00'
                },
                {
                  title: '1부',
                  description: '멜로딕의 2번째 단독공연이 시작됩니다.',
                  time: '19:00-20:00'
                },
                {
                  title: '2부',
                  description: '10분 휴식 시간 후 2부가 시작됩니다.',
                  time: '20:10-21:00'
                }
              ],
              ticket: {
                eventName: '2025 멜로딕 단독 공연',
                date: '2025년 12월 27일 (토)',
                venue: '얼라이브 홀',
                seat: '자유석'
              },
              setlist: [],
              performers: []
            }
            setPerformanceDataState(defaultPerformanceData)
            localStorage.setItem('performanceData', JSON.stringify(defaultPerformanceData))
            // Firestore에 동기화 (실패해도 계속 진행)
            await setFirestoreData('performanceData' as any, defaultPerformanceData, 'main').catch(() => {})
          }
        }

        // 방명록 메시지 로드
        const firestoreMessages = await getFirestoreData('messages' as any)
        if (firestoreMessages && Array.isArray(firestoreMessages) && firestoreMessages.length > 0) {
          setGuestbookMessages(firestoreMessages)
        } else {
          const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
          if (savedGuestbookMessages) {
            try {
              const parsedMessages = JSON.parse(savedGuestbookMessages)
              setGuestbookMessages(parsedMessages)
              // Firestore에 동기화 (실패해도 계속 진행)
              if (parsedMessages.length > 0) {
                await setFirestoreData('messages' as any, parsedMessages).catch(() => {})
              }
            } catch (parseError) {
              // 파싱 오류 무시
            }
          }
        }

        // 이벤트 활성화 상태 로드
        const firestoreEventsStatus = await getFirestoreData('current' as any, 'events')
        if (firestoreEventsStatus && !Array.isArray(firestoreEventsStatus) && typeof (firestoreEventsStatus as any).enabled === 'boolean') {
          setEventsEnabledState((firestoreEventsStatus as any).enabled)
        } else {
          const savedEventsEnabled = localStorage.getItem('eventsEnabled')
          if (savedEventsEnabled !== null) {
            setEventsEnabledState(savedEventsEnabled === 'true')
          }
        }


        // 예매 정보 로드
        const firestoreBookingInfo = await getFirestoreData('bookingInfo' as any, 'main')
        if (firestoreBookingInfo && !Array.isArray(firestoreBookingInfo)) {
          const bookingData = firestoreBookingInfo as any
          if (bookingData.accountName && bookingData.bankName && bookingData.accountNumber) {
            // 기존 데이터가 '7천원' 또는 '5천원'이면 '6천원'으로 업데이트
            if (bookingData.walkInPrice === '7천원' || bookingData.walkInPrice === '5천원') {
              bookingData.walkInPrice = '6천원'
              await setFirestoreData('bookingInfo' as any, bookingData, 'main')
              localStorage.setItem('bookingInfo', JSON.stringify(bookingData))
            }
            setBookingInfoState(bookingData as BookingInfo)
          } else {
            // Firestore 데이터가 불완전한 경우 localStorage 확인
            const savedBookingInfo = localStorage.getItem('bookingInfo')
            if (savedBookingInfo) {
              const parsedInfo = JSON.parse(savedBookingInfo)
              // 기존 데이터가 '7천원' 또는 '5천원'이면 '6천원'으로 업데이트
              if (parsedInfo.walkInPrice === '7천원' || parsedInfo.walkInPrice === '5천원') {
                parsedInfo.walkInPrice = '6천원'
                localStorage.setItem('bookingInfo', JSON.stringify(parsedInfo))
                await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
              }
              setBookingInfoState(parsedInfo)
              await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
            } else {
              // 기본값 설정
              const defaultBookingInfo: BookingInfo = {
                accountName: '이지우',
                bankName: '카카오뱅크',
                accountNumber: '3333254015574',
                walkInPrice: '6천원',
                preBookingPrice: '5천원',
                refundPolicy: '환불 불가',
                contactPhone: '01048246873'
              }
              setBookingInfoState(defaultBookingInfo)
              localStorage.setItem('bookingInfo', JSON.stringify(defaultBookingInfo))
              await setFirestoreData('bookingInfo' as any, defaultBookingInfo, 'main')
            }
          }
        } else {
          const savedBookingInfo = localStorage.getItem('bookingInfo')
          if (savedBookingInfo) {
            const parsedInfo = JSON.parse(savedBookingInfo)
            // 기존 데이터가 '7천원'이면 '6천원'으로 업데이트
            if (parsedInfo.walkInPrice === '7천원') {
              parsedInfo.walkInPrice = '6천원'
              localStorage.setItem('bookingInfo', JSON.stringify(parsedInfo))
              await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
            }
            setBookingInfoState(parsedInfo)
            await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
          } else {
            // 기본값 설정
            const defaultBookingInfo: BookingInfo = {
              accountName: '이지우',
              bankName: '카카오뱅크',
              accountNumber: '3333254015574',
              walkInPrice: '6천원',
              refundPolicy: '환불 불가',
              contactPhone: '01048246873'
            }
            setBookingInfoState(defaultBookingInfo)
            localStorage.setItem('bookingInfo', JSON.stringify(defaultBookingInfo))
            await setFirestoreData('bookingInfo' as any, defaultBookingInfo, 'main')
          }
        }
      } catch (error) {
        // ✅ 오류 발생 시에도 localStorage에서 로드하지 않음
        // 초기화 마커가 있는 경우 예전 데이터를 복원하면 안 되므로
        // Firestore 연결이 실패해도 빈 배열로 시작 (리스너가 복구되면 자동 동기화)
        setGuests([]) // 빈 배열로 시작
        localStorage.setItem(getGuestsStorageKey(), JSON.stringify([])) // localStorage도 빈 배열로 초기화
        
        const savedPerformanceData = localStorage.getItem('performanceData')
        const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
        const savedBookingInfo = localStorage.getItem('bookingInfo')
    if (savedPerformanceData) {
      setPerformanceDataState(JSON.parse(savedPerformanceData))
    }
    if (savedGuestbookMessages) {
      setGuestbookMessages(JSON.parse(savedGuestbookMessages))
    }
    if (savedBookingInfo) {
          const parsedInfo = JSON.parse(savedBookingInfo)
          // 기존 데이터가 '7천원' 또는 '5천원'이면 '6천원'으로 업데이트
          if (parsedInfo.walkInPrice === '7천원' || parsedInfo.walkInPrice === '5천원') {
            parsedInfo.walkInPrice = '6천원'
            localStorage.setItem('bookingInfo', JSON.stringify(parsedInfo))
          }
          setBookingInfoState(parsedInfo)
        } else {
          // 기본값 설정
          const defaultBookingInfo: BookingInfo = {
            accountName: '이지우',
            bankName: '카카오뱅크',
            accountNumber: '3333254015574',
            walkInPrice: '6천원',
            refundPolicy: '환불 불가',
            contactPhone: '01048246873'
          }
          setBookingInfoState(defaultBookingInfo)
          localStorage.setItem('bookingInfo', JSON.stringify(defaultBookingInfo))
        }
      }
    }

    loadFirestoreData()

    // Firestore 실시간 리스너 설정 (guests 자동 업데이트) - Firestore 데이터만 사용
    // 게스트 리스트는 절대 임의로 바뀌어서는 안 되므로 로컬 데이터를 전혀 확인하지 않음
    const guestsDocRef = doc(db, FIRESTORE_PATHS.GUESTS_COLLECTION, FIRESTORE_PATHS.GUESTS_DOC_ID)
    const unsubscribeGuests = onSnapshot(
      guestsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          let firestoreGuests: Guest[] = []
          
          if (data) {
            if (Array.isArray(data)) {
              firestoreGuests = data
            } else if (data.guests && Array.isArray(data.guests)) {
              firestoreGuests = data.guests
            } else if (Array.isArray(data.data)) {
              firestoreGuests = data.data
            }
          }
          
          // 초기 로드가 완료되지 않았으면 리스너 실행 스킵 (초기 로드와 충돌 방지)
          if (!initialLoadCompleteRef.current) {
            console.log('[LISTENER] 초기 로드 미완료 → 스킵')
            return
          }
          
          // ✅ 리스너에서 updatedAt 추적 (충돌 감지용)
          if (data && (data as any).updatedAt) {
            const updatedAt = (data as any).updatedAt?.toMillis?.() || (data as any).updatedAt?.seconds * 1000 || (data as any).updatedAt
            lastKnownUpdatedAtRef.current = updatedAt
          }
          
          // ✅ 삭제된 게스트를 제외한 활성 게스트만으로 해시 생성 (중복 업데이트 방지)
          const activeGuestsForHash = firestoreGuests.filter(guest => guest.isDeleted !== true)
          const currentHash = JSON.stringify(activeGuestsForHash)
          
          if (currentHash === lastGuestsHashRef.current) {
            console.log('[LISTENER] 해시 동일 → 스킵')
            return
          }
          
          console.log('[LISTENER] Firestore 변경 감지:', {
            guestsCount: firestoreGuests.length,
            _cleared: (data as any)?._cleared,
            _clearedType: typeof (data as any)?._cleared,
            updatedAt: (data as any)?.updatedAt,
            writeSource: (data as any)?.writeSource,
            lastAction: (data as any)?.lastAction,
            currentStateCount: guestsRef.current.length
          })
          
          lastGuestsHashRef.current = currentHash
          
          // Firestore 데이터를 무조건 적용 (로컬 데이터 확인하지 않음)
          // ✅ guests 우선 원칙: guests가 있으면 guests를 믿고, guests가 비어있을 때만 _cleared 마커 확인
          const firestoreCleared = (data as any)?._cleared
          const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null && typeof firestoreCleared === 'number'
          const hasGuests = Array.isArray(firestoreGuests) && firestoreGuests.length > 0
          
          if (hasGuests) {
            // ✅ 삭제된 게스트 필터링 (화면에 표시되지 않도록)
            const activeGuests = firestoreGuests.filter(guest => guest.isDeleted !== true)
            
            console.log('[LISTENER] guests 있음 → 게스트 데이터 적용:', {
              totalGuestsCount: firestoreGuests.length,
              activeGuestsCount: activeGuests.length,
              deletedCount: firestoreGuests.length - activeGuests.length,
              _cleared: firestoreCleared,
              note: 'guests 우선 적용 (초기화 마커 무시, 삭제된 게스트 제외)'
            })
            setGuests(activeGuests) // ✅ 교체 패턴 (누적 금지) - 삭제된 게스트 제외
            localStorage.setItem(getGuestsStorageKey(), JSON.stringify(activeGuests))
            lastGuestsHashRef.current = JSON.stringify(activeGuests)
          } else if (isFirestoreCleared) {
            // guests가 없고 초기화 마커가 있으면 → 빈 배열 적용
            console.log('[LISTENER] guests 없음 + 초기화 마커 감지 → 빈 배열 적용')
            setGuests([])
            localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
            lastGuestsHashRef.current = JSON.stringify([])
          } else {
            // guests가 없고 초기화 마커도 없으면 → 빈 배열 적용 (정상 상태)
            console.log('[LISTENER] guests 없음 + 초기화 마커 없음 → 빈 배열 적용 (정상 상태)')
            setGuests([])
            localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
            lastGuestsHashRef.current = JSON.stringify([])
          }
        } else {
          // Firestore 문서가 없으면 빈 배열 적용
          const emptyHash = JSON.stringify([])
          if (emptyHash !== lastGuestsHashRef.current) {
            lastGuestsHashRef.current = emptyHash
            setGuests([])
            localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
          }
        }
      },
      () => {
        // ✅ 에러 시 state를 변경하지 않음 - 기존 state 유지 (UI 깜빡임/리셋 방지)
        // 에러는 UI를 "리셋"시키면 안 됨. 리스너가 복구되면 자동으로 다시 동기화됨
      }
    )

    // Firestore 실시간 리스너 설정 (performanceData 자동 업데이트) - 서버 상태 우선
    const performanceDataDocRef = doc(db, 'performanceData', 'main')
    const unsubscribePerformanceData = onSnapshot(
      performanceDataDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PerformanceData
          // 서버의 최신 데이터로 업데이트 (셋리스트 보호)
          if (data) {
            setPerformanceDataState((prevData) => {
              // 기존 셋리스트가 있고 새 데이터에 셋리스트가 없거나 비어있으면 유지
              const mergedData: PerformanceData = {
                ...data,
                setlist: data.setlist && data.setlist.length > 0 
                  ? data.setlist 
                  : (prevData?.setlist || []),
                performers: data.performers && data.performers.length > 0
                  ? data.performers
                  : (prevData?.performers || [])
              }
              localStorage.setItem('performanceData', JSON.stringify(mergedData))
              return mergedData
            })
          }
        }
      },
      () => {
        // 에러 무시
      }
    )

    // cleanup 함수
    return () => {
      unsubscribeGuests()
      unsubscribePerformanceData()
    }
  }, [])

  // 게스트 리스트를 엑셀 파일로 자동 다운로드하는 함수 - 현재 사용하지 않음
  // @ts-ignore
  const downloadGuestsToExcel = (guestsList: Guest[]) => {
    try {
      // 엑셀 데이터 형식으로 변환
      const excelData = guestsList.map((guest, index) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
        return {
          번호: index + 1,
          이름: guestName,
          전화번호: guestPhone,
          이메일: guest.email || '',
          닉네임: '', // 닉네임은 별도로 관리되므로 빈 값
          예매유형: guest.isWalkIn ? '현장 예매' : '사전 예매',
          입금확인: guest.paymentConfirmed ? '확인완료' : '대기중',
          입금확인시간: guest.paymentConfirmedAt 
            ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
            : '',
          입장번호: guest.entryNumber || '',
          체크인: guest.checkedIn ? '완료' : '미완료',
          체크인시간: guest.checkedInAt 
            ? new Date(guest.checkedInAt).toLocaleString('ko-KR')
            : ''
        }
      })

      // 엑셀 파일 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '게스트 목록')
      
      // 파일명에 날짜와 시간 포함
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
      const fileName = `게스트_목록_${dateStr}_${timeStr}.xlsx`
      
      // 엑셀 파일 다운로드
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      // 오류가 발생해도 게스트 리스트 저장은 계속 진행
    }
  }

  const uploadGuests = async (newGuests: Guest[]) => {
    console.log('[UPLOAD] uploadGuests 시작:', {
      inputGuestsCount: newGuests.length,
      currentStateCount: guests.length,
      clearBlockUntil: clearBlockUntilRef.current,
      now: Date.now(),
      isBlocked: clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current
    })
    
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      throw new Error('게스트 리스트가 방금 초기화되었습니다. 잠시 후 다시 시도해주세요.')
    }
    
    // ✅ Firestore에서 최신 게스트 리스트 가져오기 (웹 예매 게스트 포함)
    let existingGuests: Guest[] = []
    try {
      const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
      const firestoreGuests = (currentData as any)?.guests || []
      if (Array.isArray(firestoreGuests) && firestoreGuests.length > 0) {
        existingGuests = firestoreGuests.filter((guest: Guest) => guest.isDeleted !== true)
      } else {
        // Firestore에 데이터가 없으면 로컬 state 사용
        existingGuests = guests.filter(guest => guest.isDeleted !== true)
      }
    } catch (error) {
      // Firestore 확인 실패 시 로컬 state 사용
      existingGuests = guests.filter(guest => guest.isDeleted !== true)
    }
    
    console.log('[UPLOAD] 최신 게스트 리스트 확인:', {
      firestoreGuestsCount: existingGuests.length,
      stateGuestsCount: guests.length
    })
    
    // ✅ 중복 제거: 전화번호만 키로 사용 (이름은 변경 가능하므로)
    const guestMap = new Map<string, Guest>()
    
    // 1. 기존 게스트 먼저 추가 (삭제된 게스트는 제외)
    existingGuests.forEach(guest => {
      if (guest.isDeleted !== true) {
        const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
        const key = getGuestKey(guest.name || guest['이름'] || guest.Name, guestPhone)
        if (key) {
          guestMap.set(key, guest)
        }
      }
    })
    
    // 2. 새 게스트 추가/업데이트 (기존 게스트를 덮어쓰기)
    newGuests.forEach(guest => {
      const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
      const key = getGuestKey(guest.name || guest['이름'] || guest.Name, guestPhone)
      if (key) {
        // 이미 있으면 업데이트, 없으면 추가 (upsert 패턴)
        guestMap.set(key, {
          ...guest,
          // 정규화된 전화번호로 저장 (일관성 유지)
          phone: normalizePhone(guestPhone),
          name: normalizeName(guest.name || guest['이름'] || guest.Name),
          isWalkIn: guest.isWalkIn !== undefined ? guest.isWalkIn : false,
          paymentConfirmed: guest.paymentConfirmed !== undefined ? guest.paymentConfirmed : false,
          // 삭제 마커 제거 (새로 업로드하면 활성화)
          isDeleted: false,
          deletedAt: undefined
        })
      }
    })
    
    const processedGuests = Array.from(guestMap.values())
    
    console.log('[UPLOAD] 중복 제거 결과:', {
      existingCount: existingGuests.length,
      newCount: newGuests.length,
      processedCount: processedGuests.length,
      duplicatesRemoved: existingGuests.length + newGuests.length - processedGuests.length
    })
    
    console.log('[UPLOAD] 게스트 처리 완료:', {
      processedCount: processedGuests.length,
      existingCount: existingGuests.length,
      newCount: newGuests.length
    })
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      console.log('[UPLOAD] saveGuestsAllCoalesced 호출 시작:', {
        guestsCount: processedGuests.length,
        _cleared: null,
        writeSource: 'uploadGuests'
      })
      
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      // 엑셀 업로드 시 초기화 마커 자동 해제: _cleared를 null로 명시
      await saveGuestsAllCoalesced({ guests: processedGuests, _cleared: null }, 3, 'uploadGuests')
      
      console.log('[UPLOAD] saveGuestsAllCoalesced 완료, state 업데이트 시작')
      
      // Firestore 저장 성공 후에만 state 업데이트 (교체 패턴 - 누적 금지)
      setGuests(processedGuests)
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify(processedGuests))
      lastGuestsHashRef.current = JSON.stringify(processedGuests)
      
      console.log('[UPLOAD] uploadGuests 완료:', {
        stateUpdated: true,
        localStorageUpdated: true,
        finalCount: processedGuests.length
      })
    } catch (error) {
      console.error('[UPLOAD] uploadGuests 실패:', error)
      // Firestore 저장 실패 시 state 업데이트하지 않음
      throw error
    }
  }

  const addWalkInGuest = async (name: string, phone: string, isWalkIn: boolean = true, email?: string): Promise<{ success: boolean; message?: string }> => {
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      return { success: false, message: '게스트 리스트가 방금 초기화되었습니다. 잠시 후 다시 시도해주세요.' }
    }
    
    // 이름과 전화번호 정규화 (통일된 함수 사용)
    const normalizedName = normalizeName(name)
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedName || !normalizedPhone) {
      return { success: false, message: '이름과 전화번호를 입력해주세요.' }
    }

    // 이미 등록된 게스트인지 확인 (전화번호만 비교 - 이름은 변경 가능)
    // ✅ 삭제된 게스트는 제외하고 활성 게스트만 체크
    // ✅ Firestore에서 최신 데이터를 직접 확인하여 엑셀 업로드 게스트도 인식
    
    // 1. 먼저 Firestore에서 최신 데이터 확인 (엑셀 업로드 게스트 포함)
    let existingGuest: Guest | undefined = undefined
    try {
      const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
      const firestoreGuests = (currentData as any)?.guests || []
      if (Array.isArray(firestoreGuests) && firestoreGuests.length > 0) {
        existingGuest = firestoreGuests.find((guest: Guest) => {
          // 삭제된 게스트는 제외
          if (guest.isDeleted === true) {
            return false
          }
          // 전화번호만 비교 (이름은 변경 가능하므로)
          const guestPhone = normalizePhone(guest.phone || guest['전화번호'] || guest.Phone)
          return guestPhone === normalizedPhone && guestPhone !== ''
        })
      }
    } catch (error) {
      // Firestore 확인 실패 시 로컬 데이터 확인
    }
    
    // 2. Firestore에서 찾지 못했으면 로컬 데이터 확인 (state + localStorage)
    if (!existingGuest) {
      const latestGuestsFromStorage = JSON.parse(localStorage.getItem(getGuestsStorageKey()) || '[]')
      const latestGuests = latestGuestsFromStorage.length > 0 ? latestGuestsFromStorage : guests
      
      existingGuest = latestGuests.find((guest: Guest) => {
        // 삭제된 게스트는 제외
        if (guest.isDeleted === true) {
          return false
        }
        // 전화번호만 비교 (이름은 변경 가능하므로)
        const guestPhone = normalizePhone(guest.phone || guest['전화번호'] || guest.Phone)
        return guestPhone === normalizedPhone && guestPhone !== ''
      })
    }

    if (existingGuest) {
      console.log('[addWalkInGuest] 중복 게스트 발견:', {
        name: normalizedName,
        phone: normalizedPhone,
        source: 'Firestore 또는 로컬',
        existingGuest: {
          name: existingGuest.name || existingGuest['이름'] || existingGuest.Name,
          phone: existingGuest.phone || existingGuest['전화번호'] || existingGuest.Phone,
          paymentConfirmed: existingGuest.paymentConfirmed
        }
      })
      return { success: false, message: '이미 등록된 게스트입니다.' }
    }

    // 새로운 게스트 추가 (사전 예매 또는 현장 예매)
    const newGuest: Guest = {
      name: normalizedName,
      phone: normalizedPhone,
      email: email,
      checkedIn: false,
      isWalkIn: isWalkIn,
      paymentConfirmed: false, // 예매 신청 시 입금 확인은 대기중
      paymentConfirmedAt: undefined // 입금 확인 시간은 관리자가 확인할 때 설정
    }

    // ✅ Firestore에서 최신 게스트 리스트 가져오기 (엑셀 업로드 게스트 포함)
    let latestGuests: Guest[] = []
    try {
      const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
      const firestoreGuests = (currentData as any)?.guests || []
      if (Array.isArray(firestoreGuests) && firestoreGuests.length > 0) {
        latestGuests = firestoreGuests
      } else {
        // Firestore에 데이터가 없으면 로컬 데이터 사용
        const latestGuestsFromStorage = JSON.parse(localStorage.getItem(getGuestsStorageKey()) || '[]')
        latestGuests = latestGuestsFromStorage.length > 0 ? latestGuestsFromStorage : guests
      }
    } catch (error) {
      // Firestore 확인 실패 시 로컬 데이터 사용
      const latestGuestsFromStorage = JSON.parse(localStorage.getItem(getGuestsStorageKey()) || '[]')
      latestGuests = latestGuestsFromStorage.length > 0 ? latestGuestsFromStorage : guests
    }
    
    // ✅ Map을 사용하여 중복 제거 (전화번호만 키로 사용)
    const guestMap = new Map<string, Guest>()
    
    // 1. 기존 게스트 먼저 추가 (삭제된 게스트는 제외)
    latestGuests.forEach((guest: Guest) => {
      if (guest.isDeleted !== true) {
        const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
        const key = getGuestKey(guest.name || guest['이름'] || guest.Name, guestPhone)
        if (key) {
          guestMap.set(key, guest)
        }
      }
    })
    
    // 2. 새 게스트 추가 (중복이면 덮어쓰기)
    const newGuestKey = getGuestKey(normalizedName, normalizedPhone)
    if (newGuestKey) {
      guestMap.set(newGuestKey, {
        ...newGuest,
        // 정규화된 값으로 저장 (일관성 유지)
        phone: normalizedPhone,
        name: normalizedName
      })
    }
    
    const updatedGuests = Array.from(guestMap.values())
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    // ✅ guests 우선 원칙: 현재 state에 guests가 있으면 초기화 마커와 관계없이 추가 허용
    // 초기화 마커는 숫자(타임스탬프)일 때만 초기화 상태로 판단
    try {
      // 현재 Firestore 데이터 확인
      const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
      const currentCleared = (currentData as any)?._cleared
      const isFirestoreCleared = currentCleared !== undefined && currentCleared !== null && typeof currentCleared === 'number'
      const currentGuests = (currentData as any)?.guests || []
      const hasGuests = Array.isArray(currentGuests) && currentGuests.length > 0
      
      // ✅ guests가 있으면 초기화 마커와 관계없이 추가 허용
      // guests가 없고 초기화 마커가 있으면 차단
      if (!hasGuests && isFirestoreCleared) {
        return { success: false, message: '게스트 리스트가 초기화된 상태입니다. 먼저 엑셀 파일로 게스트를 업로드해주세요.' }
      }
      
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      // 초기화 해제: _cleared를 null로 명시 (deleteField로 완전 삭제)
      try {
        await saveGuestsAllCoalesced({ guests: updatedGuests, _cleared: null }, 3, 'addWalkInGuest')
      } catch (error: any) {
        return { success: false, message: '등록에 실패했습니다. 다시 시도해주세요.' }
      }
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests)
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)

      return { success: true, message: '현장 구매 등록이 완료되었습니다.' }
    } catch (error) {
      return { success: false, message: '등록에 실패했습니다. 다시 시도해주세요.' }
    }
  }

  const toggleGuestPayment = async (index: number) => {
    if (index < 0 || index >= guests.length) {
      return
    }

    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      return
    }

    const updatedGuests = [...guests]
    const currentPaymentStatus = updatedGuests[index].paymentConfirmed
    updatedGuests[index] = {
      ...updatedGuests[index],
      paymentConfirmed: !currentPaymentStatus,
      paymentConfirmedAt: !currentPaymentStatus ? Date.now() : undefined // 결제 확인 시 시간 기록, 취소 시 삭제
    }

    // Firestore에 업데이트 (성공 확인 후 state 업데이트)
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: updatedGuests }, 3, 'toggleGuestPayment')
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests)
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      // Firestore 저장 실패 시 state 업데이트하지 않음
    }
  }

  const setPerformanceData = (data: PerformanceData) => {
    // 기존 데이터와 안전하게 병합 (중요한 데이터 보호)
    const mergedData: PerformanceData = {
      ...performanceData, // 기존 데이터 우선
      ...data, // 새 데이터로 덮어쓰기
      // 셋리스트와 공연진은 기존 값이 있으면 유지 (절대 덮어쓰지 않음)
      setlist: data.setlist && data.setlist.length > 0 
        ? data.setlist 
        : (performanceData?.setlist || []),
      performers: data.performers && data.performers.length > 0
        ? data.performers
        : (performanceData?.performers || [])
    }
    
    setPerformanceDataState(mergedData)
    localStorage.setItem('performanceData', JSON.stringify(mergedData))
    // Firestore에 저장 (비동기로 처리, merge 옵션으로 안전하게)
    setFirestoreData('performanceData' as any, mergedData, 'main').catch(() => {})
  }

  const setBookingInfo = (info: BookingInfo) => {
    setBookingInfoState(info)
    localStorage.setItem('bookingInfo', JSON.stringify(info))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('bookingInfo' as any, info, 'main').catch(() => {})
  }

  const addGuestbookMessage = (message: GuestbookMessage) => {
    const newMessages = [...guestbookMessages, message]
    setGuestbookMessages(newMessages)
    localStorage.setItem('guestbookMessages', JSON.stringify(newMessages))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('messages' as any, message, message.id).catch(() => {})
  }


  const clearGuests = async () => {
    // ✅ 1. 예약된 저장 작업 취소 (초기화 전에 예약된 write가 실행되지 않도록)
    pendingWriteRef.current = null
    
    // ✅ 2. 초기화 후 일정 시간(5초) 동안 자동 저장 차단
    clearBlockUntilRef.current = Date.now() + 5000 // 5초 후까지 차단
    
    // Firestore에서도 삭제 (초기화 마커와 함께)
    const clearTimestamp = Date.now()
    
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      // 차단 시간 내이지만 clearGuests에서 직접 호출하는 것은 허용 (차단 로직에서 예외 처리)
      await saveGuestsAllCoalesced({ guests: [], _cleared: clearTimestamp }, 3, 'clearGuests')
      
      // Firestore 저장 성공 후에만 로컬 상태 업데이트
      setGuests([])
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify([]))
      lastGuestsHashRef.current = JSON.stringify([])
      
      // 마커는 유지 (제거하지 않음) - 초기화 상태를 명확히 표시
      // 다른 클라이언트에서도 초기화 상태를 인식할 수 있도록 마커 유지
    } catch (error: any) {
      // ✅ Quota exceeded 오류 명시적 처리
      if (error?.message?.includes('QUOTA_EXCEEDED') || error?.code === 'resource-exhausted' || error?.message?.includes('quota')) {
        alert('Firestore 할당량이 초과되어 초기화에 실패했습니다.\n\n잠시 후 다시 시도해주세요. (몇 분 후 재시도 권장)')
      } else {
        alert('게스트 리스트 초기화에 실패했습니다. 다시 시도해주세요.')
      }
      
      // ✅ 실패 시: state는 이미 변경하지 않았으므로 롤백 불필요 (서버 write 실패 시 state는 그대로 유지됨)
    }
    
    // ✅ userProfiles 대량 삭제 제거 (쿼터 폭탄 방지)
    // 운영진 정보 삭제는 쿼터 초과를 유발할 수 있으므로 임시로 비활성화
    // 필요시 개별 삭제 또는 서버 함수로 처리 권장
    // try {
    //   const userProfilesRef = collection(db, 'userProfiles')
    //   const snapshot = await getDocs(userProfilesRef)
    //   
    //   const deletePromises = snapshot.docs
    //     .filter(docSnapshot => {
    //       const data = docSnapshot.data()
    //       return data.phone === 'admin'
    //     })
    //     .map(docSnapshot => deleteDoc(doc(db, 'userProfiles', docSnapshot.id)))
    //   
    //   await Promise.all(deletePromises)
    //   console.log(`[DataContext] ${deletePromises.length}개의 운영진 userProfile 삭제 완료`)
    // } catch (error) {
    //   console.error('[DataContext] 운영진 userProfile 삭제 오류:', error)
    // }
  }

  const deleteGuest = async (index: number) => {
    const guest = guests[index]
    if (!guest) return
    
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      return
    }
    
    // 실제로 삭제하지 않고 isDeleted 플래그만 설정 (취소선 표시용)
    const updatedGuests = guests.map((g, i) => {
      if (i === index) {
        return {
          ...g,
          isDeleted: true,
          deletedAt: Date.now()
        }
      }
      return g
    })
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: updatedGuests }, 3, 'deleteGuest')
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests) // ✅ 교체 패턴 (누적 금지)
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      // Firestore 저장 실패 시 state 업데이트하지 않음
    }
  }

  const updateGuest = async (index: number, updatedGuest: Guest) => {
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      return
    }
    
    const updatedGuests = guests.map((guest, i) => i === index ? updatedGuest : guest)
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: updatedGuests }, 3, 'updateGuest')
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests)
      localStorage.setItem(getGuestsStorageKey(), JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      // Firestore 저장 실패 시 state 업데이트하지 않음
    }
  }

  const clearSetlist = () => {
    if (performanceData) {
      const updatedData: PerformanceData = {
        ...performanceData,
        setlist: [],
        performers: []
      }
      setPerformanceData(updatedData)
    }
  }

  const setEventsEnabled = (enabled: boolean) => {
    setEventsEnabledState(enabled)
    localStorage.setItem('eventsEnabled', enabled.toString())
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('current' as any, { enabled }, 'events').catch(() => {})
  }

  const clearGuestbookMessages = async () => {
    setGuestbookMessages([])
    localStorage.removeItem('guestbookMessages')
    
    // Firestore에서 모든 메시지 삭제
    try {
      const messagesRef = collection(db, 'messages')
      const querySnapshot = await getDocs(messagesRef)
      
      const deletePromises = querySnapshot.docs.map((docSnapshot) => 
        deleteDoc(doc(db, 'messages', docSnapshot.id))
      )
      
      await Promise.all(deletePromises)
    } catch (error) {
    }
  }

  const clearChatMessages = async () => {
    // Firestore에서 모든 채팅 메시지 삭제
    try {
      const chatRef = collection(db, 'chat')
      const querySnapshot = await getDocs(chatRef)
      
      const deletePromises = querySnapshot.docs.map((docSnapshot) => 
        deleteDoc(doc(db, 'chat', docSnapshot.id))
      )
      
      await Promise.all(deletePromises)
    } catch (error) {
      throw error
    }
  }

  return (
    <DataContext.Provider value={{ 
      guests, 
      performanceData, 
      guestbookMessages,
      bookingInfo,
      eventsEnabled,
      uploadGuests, 
      addWalkInGuest,
      toggleGuestPayment,
      setPerformanceData,
      setBookingInfo,
      addGuestbookMessage,
      clearGuests,
      deleteGuest,
      updateGuest,
      clearSetlist,
      setEventsEnabled,
      clearGuestbookMessages,
      clearChatMessages
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}


