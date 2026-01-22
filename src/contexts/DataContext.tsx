import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
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
  
  const saveGuestsAllCoalesced = async (payload: { guests: Guest[], _cleared?: number | null }, maxRetries: number = 3) => {
    // ✅ 초기화 후 차단 시간이 지나지 않았으면 저장 차단
    // 단, _cleared가 명시적으로 설정된 경우(초기화 작업)는 허용
    const isClearOperation = payload._cleared !== undefined && payload._cleared !== null
    if (!isClearOperation && clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('🟡 [saveGuestsAllCoalesced] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
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
      console.log('🟡 [saveGuestsAllCoalesced] ✅ 초기화/해제 작업 허용:', {
        isInitializing,
        isClearing,
        guestsCount: payload.guests.length,
        _cleared: payload._cleared
      })
      // 계속 진행
    } else if (isNormalSave) {
      // 일반 저장 작업인 경우, 초기화 마커가 있으면 차단
      try {
        const currentData = await getFirestoreData('guests' as any, 'all')
        const currentCleared = (currentData as any)?._cleared
        const hasClearedMarker = currentCleared !== undefined && currentCleared !== null
        
        if (hasClearedMarker) {
          console.warn('🔴 [saveGuestsAllCoalesced] ❌ 초기화 마커가 있어서 일반 저장 차단:', {
            currentCleared,
            payloadCleared: payload._cleared,
            guestsCount: payload.guests.length
          })
          throw new Error('게스트 리스트가 초기화된 상태입니다. 초기화를 해제하려면 게스트를 업로드하거나 복원해주세요.')
        } else {
          console.log('🟡 [saveGuestsAllCoalesced] 초기화 마커 없음, 정상 저장 진행')
        }
      } catch (error: any) {
        // 초기화 마커 확인 중 오류가 발생했고, 이미 위에서 throw된 경우는 재throw
        if (error?.message?.includes('초기화된 상태')) {
          throw error
        }
        console.warn('🟡 [saveGuestsAllCoalesced] 현재 데이터 확인 실패, 계속 진행:', error)
      }
    }
    
    // 최신 payload로 업데이트 (이전 요청이 있으면 덮어쓰기)
    pendingWriteRef.current = payload
    
    // 이미 write가 진행 중이면 대기
    if (writeInFlightRef.current) {
      console.log('🟡 [saveGuestsAllCoalesced] write 진행 중, 대기...')
      return
    }
    
    writeInFlightRef.current = true
    
    try {
      // pending이 있는 동안 계속 처리 (coalesce)
      while (pendingWriteRef.current) {
        const currentPayload = pendingWriteRef.current
        pendingWriteRef.current = null // 처리 중인 payload 초기화
        
        console.log('🟡 [saveGuestsAllCoalesced] Firestore write 시작:', { 
          guestsCount: currentPayload.guests.length,
          _cleared: currentPayload._cleared 
        })
        
        // ✅ 충돌 감지: write 전에 현재 문서의 updatedAt 확인
        let retryCount = 0
        let writeSuccess = false
        
        while (retryCount < maxRetries && !writeSuccess) {
          try {
            // 현재 Firestore 문서 읽기
            const { getFirestoreData } = await import('../services/firestoreService')
            const currentDoc = await getFirestoreData('guests' as any, 'all') as any
            
            if (currentDoc && currentDoc.updatedAt) {
              // updatedAt을 number로 변환 (Timestamp 또는 number일 수 있음)
              const currentUpdatedAt = currentDoc.updatedAt?.toMillis?.() || currentDoc.updatedAt?.seconds * 1000 || currentDoc.updatedAt
              
              // 마지막으로 본 updatedAt과 비교
              if (lastKnownUpdatedAtRef.current !== null && currentUpdatedAt !== lastKnownUpdatedAtRef.current) {
                console.warn('🟠 [saveGuestsAllCoalesced] ⚠️ 충돌 감지!', {
                  lastKnown: lastKnownUpdatedAtRef.current,
                  current: currentUpdatedAt,
                  retryCount
                })
                
                // 최신 데이터로 재시도 (현재 state를 최신 Firestore 데이터와 merge)
                if (retryCount < maxRetries - 1) {
                  console.log('🟠 [saveGuestsAllCoalesced] 최신 데이터로 재시도...')
                  // 현재 state의 guests를 사용 (이미 최신 데이터를 반영했을 가능성)
                  // 또는 Firestore의 최신 데이터를 읽어서 merge할 수도 있음
                  retryCount++
                  await new Promise(resolve => setTimeout(resolve, 100 * retryCount)) // 백오프
                  continue
                } else {
                  console.error('🟠 [saveGuestsAllCoalesced] ❌ 최대 재시도 횟수 초과, 충돌로 인한 write 실패')
                  throw new Error('CONFLICT: 다른 클라이언트가 데이터를 수정했습니다. 페이지를 새로고침하고 다시 시도해주세요.')
                }
              }
            }
            
            // 충돌 없음 또는 첫 write → 정상 진행
            console.log('🟡 [saveGuestsAllCoalesced] Firestore write 실행 시작...')
            console.log('🟡 [saveGuestsAllCoalesced] 저장할 payload:', {
              guestsCount: currentPayload.guests.length,
              _cleared: currentPayload._cleared,
              guestsSample: currentPayload.guests.slice(0, 3)
            })
            
            const result = await setFirestoreData('guests' as any, currentPayload, 'all')
            
            console.log('🟡 [saveGuestsAllCoalesced] setFirestoreData 결과:', result)
            
            if (result === false) {
              console.error('🟡 [saveGuestsAllCoalesced] ❌ Firestore write 실패 (false 반환)')
              throw new Error('Firestore write failed')
            }
            
            // ✅ 성공 시 updatedAt 업데이트 및 저장 후 데이터 확인
            console.log('🟡 [saveGuestsAllCoalesced] write 성공, 저장 후 데이터 확인 중...')
            const newDoc = await getFirestoreData('guests' as any, 'all') as any
            console.log('🟡 [saveGuestsAllCoalesced] 저장 후 읽은 문서:', newDoc)
            
            if (newDoc) {
              const newGuests = newDoc.guests || []
              const newCleared = newDoc._cleared
              const newUpdatedAt = newDoc.updatedAt
              console.log('🟡 [saveGuestsAllCoalesced] 저장 후 DB 게스트 배열 길이:', Array.isArray(newGuests) ? newGuests.length : '배열 아님')
              console.log('🟡 [saveGuestsAllCoalesced] 저장 후 DB 초기화 마커 (_cleared):', newCleared)
              console.log('🟡 [saveGuestsAllCoalesced] 저장 후 DB updatedAt:', newUpdatedAt)
              
              if (newDoc.updatedAt) {
                const newUpdatedAtValue = newDoc.updatedAt?.toMillis?.() || newDoc.updatedAt?.seconds * 1000 || newDoc.updatedAt
                lastKnownUpdatedAtRef.current = newUpdatedAtValue
                console.log('🟡 [saveGuestsAllCoalesced] updatedAt 추적 업데이트:', newUpdatedAtValue)
              }
            } else {
              console.warn('🟡 [saveGuestsAllCoalesced] ⚠️ 저장 후 문서를 읽을 수 없음 (null)')
            }
            
            writeSuccess = true
            console.log('🟡 [saveGuestsAllCoalesced] ✅ Firestore write 성공 완료')
            
          } catch (error: any) {
            if (error?.message?.includes('CONFLICT')) {
              throw error // 충돌 에러는 즉시 throw
            }
            
            if (retryCount < maxRetries - 1) {
              console.warn('🟠 [saveGuestsAllCoalesced] write 실패, 재시도...', { retryCount, error: error?.message })
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount)) // 백오프
            } else {
              throw error
            }
          }
        }
      }
    } catch (error: any) {
      console.error('🟡 [saveGuestsAllCoalesced] ❌ Firestore write 오류:', error)
      throw error
    } finally {
      writeInFlightRef.current = false
    }
  }
  
  // guests state 변경 추적 (디버깅용)
  useEffect(() => {
    console.log('[Guests] state size', guests.length)
  }, [guests])

  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
      console.log('🔵 [초기 로드 시작] ==========================================')
      console.log('[Guests] load start', { source: 'firestore', time: Date.now() })
      try {
        // 게스트 데이터 로드
        const firestoreGuestsData = await getFirestoreData('guests' as any, 'all')
        console.log('🔵 [초기 로드] Firestore 원본 데이터:', firestoreGuestsData)
        
        let firestoreGuests: Guest[] = []
        
        if (firestoreGuestsData) {
          const data = firestoreGuestsData as any
          console.log('🔵 [초기 로드] 파싱 전 데이터 타입:', typeof data, 'isArray:', Array.isArray(data))
          console.log('🔵 [초기 로드] 데이터 키:', Object.keys(data))
          
          // Firestore에서 로드한 데이터가 배열인지 확인
          if (Array.isArray(data)) {
            firestoreGuests = data
            console.log('🔵 [초기 로드] 배열 형식으로 파싱됨')
          } else if (data.guests && Array.isArray(data.guests)) {
            firestoreGuests = data.guests
            console.log('🔵 [초기 로드] data.guests 배열로 파싱됨')
          } else if (Array.isArray(data.data)) {
            firestoreGuests = data.data
            console.log('🔵 [초기 로드] data.data 배열로 파싱됨')
          }
        }
        
        console.log('🔵 [초기 로드] 파싱된 게스트 수:', firestoreGuests.length)
        console.log('🔵 [초기 로드] 샘플 데이터:', firestoreGuests.slice(0, 3))
        console.log('🔵 [초기 로드] 삭제된 게스트 수:', firestoreGuests.filter(g => g.isDeleted === true).length)
        console.log('🔵 [초기 로드] 현재 state 게스트 수:', guests.length)
        
        // 초기 로드 시 Firestore 데이터만 사용 (로컬 데이터 확인하지 않음)
        // 게스트 리스트는 절대 임의로 바뀌어서는 안 되므로 Firestore 데이터를 신뢰
        // 초기 로드에서는 데이터만 설정하고, 리스너가 설정된 후에는 리스너가 모든 업데이트를 처리
        const firestoreCleared = (firestoreGuestsData as any)?._cleared
        const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null
        
        // ✅ 초기 로드 시 updatedAt 추적 (충돌 감지용)
        if (firestoreGuestsData && (firestoreGuestsData as any).updatedAt) {
          const updatedAt = (firestoreGuestsData as any).updatedAt?.toMillis?.() || (firestoreGuestsData as any).updatedAt?.seconds * 1000 || (firestoreGuestsData as any).updatedAt
          lastKnownUpdatedAtRef.current = updatedAt
          console.log('🔵 [초기 로드] updatedAt 추적:', updatedAt)
        }
        
        console.log('🔵 [초기 로드] 초기화 마커 확인:', {
          _cleared: firestoreCleared,
          isFirestoreCleared,
          마커타입: typeof firestoreCleared,
          마커값: firestoreCleared,
          원본데이터_cleared: (firestoreGuestsData as any)?._cleared,
          원본데이터_키목록: Object.keys(firestoreGuestsData || {}),
          원본데이터_전체: firestoreGuestsData
        })
        
        // 초기화 마커가 있으면 무조건 빈 배열 적용 (게스트 배열 길이와 관계없이)
        if (isFirestoreCleared) {
          console.log('🟢 [초기 로드] ✅ 초기화 마커 감지됨 → 빈 배열 적용')
          console.log('🟢 [초기 로드] 마커 타임스탬프:', firestoreCleared)
          setGuests([])
          localStorage.setItem('guests', JSON.stringify([]))
          lastGuestsHashRef.current = JSON.stringify([])
          console.log('🟢 [초기 로드] 빈 배열 적용 완료')
        } else {
          // 초기화 마커가 없고 게스트 데이터가 있으면 적용
          // ✅ 교체 패턴 (누적 금지) - Firestore가 단일 소스
          console.log('🟡 [초기 로드] ⚠️ 초기화 마커 없음 → Firestore 데이터 적용')
          console.log('🟡 [초기 로드] 적용할 게스트 수:', firestoreGuests.length)
          setGuests(firestoreGuests)
          localStorage.setItem('guests', JSON.stringify(firestoreGuests))
          lastGuestsHashRef.current = JSON.stringify(firestoreGuests)
          console.log('🟡 [초기 로드] Firestore 데이터 적용 완료')
        }
        
        // 초기 로드 완료 표시
        initialLoadCompleteRef.current = true
        
        // 초기 로드 완료 후 state 크기 로그
        setTimeout(() => {
          console.log('[Guests] state size after initial load', firestoreGuests.length)
        }, 100)

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
            await setFirestoreData('performanceData' as any, updatedData, 'main').catch(err => {
              console.warn('[DataContext] 공연 데이터 Firestore 업데이트 실패:', err)
            })
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
              await setFirestoreData('performanceData' as any, parsedData, 'main').catch(err => {
                console.warn('[DataContext] 공연 데이터 Firestore 동기화 실패:', err)
              })
            } catch (parseError) {
              console.error('[DataContext] localStorage 공연 데이터 파싱 오류:', parseError)
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
            await setFirestoreData('performanceData' as any, defaultPerformanceData, 'main').catch(err => {
              console.warn('[DataContext] 기본 공연 데이터 Firestore 동기화 실패:', err)
            })
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
                await setFirestoreData('messages' as any, parsedMessages).catch(err => {
                  console.warn('[DataContext] 방명록 메시지 Firestore 동기화 실패:', err)
                })
              }
            } catch (parseError) {
              console.error('[DataContext] localStorage 방명록 메시지 파싱 오류:', parseError)
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
        console.error('Firestore 로드 오류:', error)
        // 오류 발생 시 localStorage에서 로드
    const savedGuests = localStorage.getItem('guests')
    const savedPerformanceData = localStorage.getItem('performanceData')
    const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
    const savedBookingInfo = localStorage.getItem('bookingInfo')
    
    if (savedGuests) {
      setGuests(JSON.parse(savedGuests))
    }
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
    const guestsDocRef = doc(db, 'guests', 'all')
    
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
            console.log('🟣 [리스너] 초기 로드 미완료, 스킵')
            return
          }
          
          console.log('🟣 [리스너 시작] ==========================================')
          console.log('[Guests] load start', { source: 'listener', time: Date.now() })
          console.log('🟣 [리스너] Firestore 원본 데이터:', data)
          console.log('🟣 [리스너] 파싱된 게스트 수:', firestoreGuests.length)
          console.log('🟣 [리스너] 샘플 데이터:', firestoreGuests.slice(0, 3))
          console.log('🟣 [리스너] 삭제된 게스트 수:', firestoreGuests.filter(g => g.isDeleted === true).length)
          // ✅ useRef로 최신 guests 참조 (클로저 문제 해결)
          console.log('🟣 [리스너] 현재 state 게스트 수:', guestsRef.current.length)
          
          // ✅ 리스너에서 updatedAt 추적 (충돌 감지용)
          if (data && (data as any).updatedAt) {
            const updatedAt = (data as any).updatedAt?.toMillis?.() || (data as any).updatedAt?.seconds * 1000 || (data as any).updatedAt
            lastKnownUpdatedAtRef.current = updatedAt
            console.log('🟣 [리스너] updatedAt 추적:', updatedAt)
          }
          
          // 현재 게스트 리스트 해시 생성 (중복 업데이트 방지)
          const currentHash = JSON.stringify(firestoreGuests)
          const lastHash = lastGuestsHashRef.current
          console.log('🟣 [리스너] 해시 비교:', {
            현재해시길이: currentHash.length,
            이전해시길이: lastHash.length,
            해시동일: currentHash === lastHash
          })
          
          if (currentHash === lastGuestsHashRef.current) {
            console.log('🟣 [리스너] ⏭️ 게스트 리스트 변경 없음, 업데이트 스킵')
            return
          }
          lastGuestsHashRef.current = currentHash
          
          // Firestore 데이터를 무조건 적용 (로컬 데이터 확인하지 않음)
          // 초기화 마커 확인 (우선순위: 마커가 있으면 무조건 빈 배열 적용)
          const firestoreCleared = (data as any)?._cleared
          const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null
          
          console.log('🟣 [리스너] 초기화 마커 확인:', {
            _cleared: firestoreCleared,
            isFirestoreCleared,
            마커타입: typeof firestoreCleared,
            마커값: firestoreCleared,
            게스트배열길이: firestoreGuests.length,
            원본데이터_cleared: (data as any)?._cleared,
            원본데이터_키목록: Object.keys(data || {}),
            원본데이터_전체: data
          })
          
          // 초기화 마커가 있으면 무조건 빈 배열 적용 (게스트 배열 길이와 관계없이)
          if (isFirestoreCleared) {
            console.log('🟢 [리스너] ✅ 초기화 마커 감지됨 → 빈 배열 적용')
            console.log('🟢 [리스너] 마커 타임스탬프:', firestoreCleared)
            console.log('🟢 [리스너] 주의: 게스트 배열 길이는', firestoreGuests.length, '이지만 마커 우선 적용')
            setGuests([])
            localStorage.setItem('guests', JSON.stringify([]))
            lastGuestsHashRef.current = JSON.stringify([])
            console.log('🟢 [리스너] 빈 배열 적용 완료')
            return
          }
          
          // 초기화 마커가 없으면 Firestore 데이터 적용 (교체 패턴 - 누적 금지)
          console.log('🟡 [리스너] ⚠️ 초기화 마커 없음 → Firestore 데이터 적용')
          console.log('🟡 [리스너] 적용할 게스트 수:', firestoreGuests.length)
          setGuests(firestoreGuests) // ✅ 교체 패턴 (누적 금지)
          localStorage.setItem('guests', JSON.stringify(firestoreGuests))
          lastGuestsHashRef.current = JSON.stringify(firestoreGuests)
          console.log('🟡 [리스너] Firestore 데이터 적용 완료')
        } else {
          // Firestore 문서가 없으면 빈 배열 적용
          const emptyHash = JSON.stringify([])
          if (emptyHash !== lastGuestsHashRef.current) {
            console.log('[DataContext] 리스너: Firestore 문서 없음, 빈 배열 적용')
            lastGuestsHashRef.current = emptyHash
            setGuests([])
            localStorage.setItem('guests', JSON.stringify([]))
          }
        }
      },
      (error) => {
        console.error('🟣 [리스너] ❌ Firestore guests 실시간 리스너 오류:', error)
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
      (error) => {
        console.error('Firestore performanceData 실시간 리스너 오류:', error)
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
      console.log(`게스트 리스트가 엑셀 파일로 저장되었습니다: ${fileName}`)
    } catch (error) {
      console.error('엑셀 파일 다운로드 오류:', error)
      // 오류가 발생해도 게스트 리스트 저장은 계속 진행
    }
  }

  const uploadGuests = async (newGuests: Guest[]) => {
    console.log('[Guests] upload start', { count: newGuests.length })
    
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('🟡 [uploadGuests] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
      throw new Error('게스트 리스트가 방금 초기화되었습니다. 잠시 후 다시 시도해주세요.')
    }
    
    // ✅ 기존 게스트와 병합하여 dedupe (절대 append 금지)
    const existingGuests = [...guests]
    console.log('[Guests] upload 기존 게스트 수:', existingGuests.length)
    
    // ✅ 중복 제거: name + phone 기준으로 고유하게 유지
    const guestMap = new Map<string, Guest>()
    
    // 1. 기존 게스트 먼저 추가 (삭제된 게스트는 제외)
    existingGuests.forEach(guest => {
      if (guest.isDeleted !== true) {
        const key = `${(guest.name || '').trim()}_${String(guest.phone || '').replace(/[-\s()]/g, '')}`
        if (key && key !== '_') {
          guestMap.set(key, guest)
        }
      }
    })
    
    // 2. 새 게스트 추가/업데이트 (기존 게스트를 덮어쓰기)
    newGuests.forEach(guest => {
      const key = `${(guest.name || '').trim()}_${String(guest.phone || '').replace(/[-\s()]/g, '')}`
      if (key && key !== '_') {
        // 이미 있으면 업데이트, 없으면 추가 (upsert 패턴)
        guestMap.set(key, {
          ...guest,
          isWalkIn: guest.isWalkIn !== undefined ? guest.isWalkIn : false,
          paymentConfirmed: guest.paymentConfirmed !== undefined ? guest.paymentConfirmed : false,
          // 삭제 마커 제거 (새로 업로드하면 활성화)
          isDeleted: false,
          deletedAt: undefined
        })
      }
    })
    
    const processedGuests = Array.from(guestMap.values())
    console.log('[Guests] upload processed', { 
      original: newGuests.length, 
      existing: existingGuests.length,
      unique: processedGuests.length,
      추가됨: processedGuests.length - existingGuests.filter(g => !g.isDeleted).length
    })
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      // 현재 Firestore 데이터 확인
      const currentData = await getFirestoreData('guests' as any, 'all')
      const currentCleared = (currentData as any)?._cleared
      const hasClearedMarker = currentCleared !== undefined && currentCleared !== null
      
      console.log('🟡 [uploadGuests] 초기화 마커 확인:', {
        현재마커: currentCleared,
        마커있음: hasClearedMarker
      })
      
      // 초기화 마커가 있으면 게스트 업로드 불가 (초기화 상태 유지)
      if (hasClearedMarker) {
        console.log('🔴 [uploadGuests] ❌ 초기화 마커가 있어서 게스트 업로드 불가')
        throw new Error('게스트 리스트가 초기화된 상태입니다. 먼저 게스트를 업로드하려면 초기화를 해제해주세요.')
      }
      
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: processedGuests, _cleared: null })
      
      console.log('[Guests] upload result', { ok: true })
      
      // Firestore 저장 성공 후에만 state 업데이트 (교체 패턴 - 누적 금지)
      setGuests(processedGuests)
      localStorage.setItem('guests', JSON.stringify(processedGuests))
      lastGuestsHashRef.current = JSON.stringify(processedGuests)
    } catch (error) {
      console.error('[Guests] upload result', { ok: false, error })
      console.error('Firestore 게스트 저장 오류:', error)
      // Firestore 저장 실패 시 state 업데이트하지 않음
    }
  }

  const addWalkInGuest = async (name: string, phone: string, isWalkIn: boolean = true, email?: string): Promise<{ success: boolean; message?: string }> => {
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('🟡 [addWalkInGuest] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
      return { success: false, message: '게스트 리스트가 방금 초기화되었습니다. 잠시 후 다시 시도해주세요.' }
    }
    
    // 이름과 전화번호 정규화
    const normalizedName = name.trim()
    const normalizedPhone = phone.replace(/[-\s()]/g, '')

    if (!normalizedName || !normalizedPhone) {
      return { success: false, message: '이름과 전화번호를 입력해주세요.' }
    }

    // 이미 등록된 게스트인지 확인 (전화번호 비교 시 하이픈 제거 후 비교)
    const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
    const existingGuest = guests.find((guest) => {
      // 삭제된 게스트는 제외
      if (guest.isDeleted === true) return false
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
      return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
    })

    if (existingGuest) {
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

    const updatedGuests = [...guests, newGuest]
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    // 현재 Firestore의 초기화 마커 확인 - 마커가 있으면 유지하지 않음 (초기화 상태 유지)
    // 마커가 없을 때만 null로 설정하여 초기화 상태 해제
    try {
      // 현재 Firestore 데이터 확인
      const currentData = await getFirestoreData('guests' as any, 'all')
      const currentCleared = (currentData as any)?._cleared
      const hasClearedMarker = currentCleared !== undefined && currentCleared !== null
      
      console.log('🟡 [addWalkInGuest] 초기화 마커 확인:', {
        현재마커: currentCleared,
        마커있음: hasClearedMarker
      })
      
      // 초기화 마커가 있으면 게스트 추가 불가 (초기화 상태 유지)
      if (hasClearedMarker) {
        console.log('🔴 [addWalkInGuest] ❌ 초기화 마커가 있어서 게스트 추가 불가')
        return { success: false, message: '게스트 리스트가 초기화된 상태입니다. 먼저 게스트를 추가하려면 초기화를 해제해주세요.' }
      }
      
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      try {
        await saveGuestsAllCoalesced({ guests: updatedGuests, _cleared: null })
      } catch (error: any) {
        console.error('[DataContext] Firestore 저장 실패:', error)
        return { success: false, message: '등록에 실패했습니다. 다시 시도해주세요.' }
      }
      
      // Firestore 저장 성공 후에만 state 업데이트
      console.log('[DataContext] addWalkInGuest 저장 성공:', { guestName: normalizedName, totalGuests: updatedGuests.length })
      setGuests(updatedGuests)
      localStorage.setItem('guests', JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)

      return { success: true, message: '현장 구매 등록이 완료되었습니다.' }
    } catch (error) {
      console.error('Firestore 현장 구매자 저장 오류:', error)
      return { success: false, message: '등록에 실패했습니다. 다시 시도해주세요.' }
    }
  }

  const toggleGuestPayment = async (index: number) => {
    if (index < 0 || index >= guests.length) {
      return
    }

    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('🟡 [toggleGuestPayment] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
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
      await saveGuestsAllCoalesced({ guests: updatedGuests })
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests)
      localStorage.setItem('guests', JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      console.error('Firestore 게스트 입금 확인 업데이트 오류:', error)
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
    setFirestoreData('performanceData' as any, mergedData, 'main').catch((error) => {
      console.error('Firestore 공연 데이터 저장 오류:', error)
    })
  }

  const setBookingInfo = (info: BookingInfo) => {
    setBookingInfoState(info)
    localStorage.setItem('bookingInfo', JSON.stringify(info))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('bookingInfo' as any, info, 'main').catch((error) => {
      console.error('Firestore 예매 정보 저장 오류:', error)
    })
  }

  const addGuestbookMessage = (message: GuestbookMessage) => {
    const newMessages = [...guestbookMessages, message]
    setGuestbookMessages(newMessages)
    localStorage.setItem('guestbookMessages', JSON.stringify(newMessages))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('messages' as any, message, message.id).catch((error) => {
      console.error('Firestore 방명록 메시지 저장 오류:', error)
    })
  }


  const clearGuests = async () => {
    console.log('🔴 [초기화 시작] ==========================================')
    console.log('[DataContext] clearGuests 호출됨')
    
    // 🔍 Firebase 연결 상태 확인
    console.log('🔍 [clearGuests] Firebase 연결 상태 확인')
    console.log('🔍 [clearGuests] Firebase db 객체:', db)
    console.log('🔍 [clearGuests] Firebase app 이름:', db.app.name)
    console.log('🔍 [clearGuests] Firebase projectId:', db.app.options.projectId)
    
    // 🔍 초기화 전 현재 DB 상태 확인
    console.log('🔍 [clearGuests] 초기화 전 DB 상태 확인 시작')
    try {
      const currentDbData = await getFirestoreData('guests' as any, 'all')
      console.log('🔍 [clearGuests] 초기화 전 DB 데이터 (전체):', currentDbData)
      if (currentDbData) {
        const dbGuests = (currentDbData as any).guests || []
        const dbCleared = (currentDbData as any)._cleared
        const dbUpdatedAt = (currentDbData as any).updatedAt
        console.log('🔍 [clearGuests] 초기화 전 DB 게스트 배열 길이:', Array.isArray(dbGuests) ? dbGuests.length : '배열 아님')
        console.log('🔍 [clearGuests] 초기화 전 DB 초기화 마커 (_cleared):', dbCleared)
        console.log('🔍 [clearGuests] 초기화 전 DB updatedAt:', dbUpdatedAt)
        console.log('🔍 [clearGuests] 초기화 전 DB 게스트 샘플 (처음 3개):', Array.isArray(dbGuests) ? dbGuests.slice(0, 3) : '배열 아님')
      } else {
        console.log('🔍 [clearGuests] ⚠️ 초기화 전 DB에서 게스트 데이터를 찾을 수 없음 (null)')
      }
    } catch (dbCheckError) {
      console.error('🔍 [clearGuests] ❌ 초기화 전 DB 데이터 확인 중 오류:', dbCheckError)
    }
    
    console.log('🔴 [초기화] 현재 state 게스트 수:', guests.length)
    console.log('🔴 [초기화] 현재 localStorage 게스트 수:', JSON.parse(localStorage.getItem('guests') || '[]').length)
    
    // ✅ 1. 예약된 저장 작업 취소 (초기화 전에 예약된 write가 실행되지 않도록)
    pendingWriteRef.current = null
    console.log('🔴 [초기화] ✅ 예약된 저장 작업 취소 완료')
    
    // ✅ 2. 초기화 후 일정 시간(5초) 동안 자동 저장 차단
    clearBlockUntilRef.current = Date.now() + 5000 // 5초 후까지 차단
    console.log('🔴 [초기화] ✅ 초기화 후 5초 동안 자동 저장 차단 설정 (차단 해제 시간:', new Date(clearBlockUntilRef.current).toISOString(), ')')
    
    // Firestore에서도 삭제 (초기화 마커와 함께)
    const clearTimestamp = Date.now()
    console.log('🔴 [초기화] Firestore에 초기화 마커 저장 시도:', clearTimestamp)
    console.log('🔴 [초기화] 저장할 데이터:', { guests: [], _cleared: clearTimestamp })
    
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      // 차단 시간 내이지만 clearGuests에서 직접 호출하는 것은 허용 (차단 로직에서 예외 처리)
      console.log('🔴 [초기화] saveGuestsAllCoalesced 호출 시작...')
      await saveGuestsAllCoalesced({ guests: [], _cleared: clearTimestamp })
      console.log('🔴 [초기화] saveGuestsAllCoalesced 호출 완료')
      
      // 🔍 저장 후 즉시 DB 상태 확인
      console.log('🔍 [clearGuests] 저장 직후 DB 상태 확인 시작')
      try {
        const afterWriteData = await getFirestoreData('guests' as any, 'all')
        console.log('🔍 [clearGuests] 저장 직후 DB 데이터:', afterWriteData)
        if (afterWriteData) {
          const afterGuests = (afterWriteData as any).guests || []
          const afterCleared = (afterWriteData as any)._cleared
          const afterUpdatedAt = (afterWriteData as any).updatedAt
          console.log('🔍 [clearGuests] 저장 직후 DB 게스트 배열 길이:', Array.isArray(afterGuests) ? afterGuests.length : '배열 아님')
          console.log('🔍 [clearGuests] 저장 직후 DB 초기화 마커 (_cleared):', afterCleared)
          console.log('🔍 [clearGuests] 저장 직후 DB updatedAt:', afterUpdatedAt)
        }
      } catch (afterWriteError) {
        console.error('🔍 [clearGuests] ❌ 저장 직후 DB 확인 중 오류:', afterWriteError)
      }
      
      // Firestore 저장 성공 후에만 로컬 상태 업데이트
      console.log('🔴 [초기화] ✅ Firestore 초기화 마커 저장 성공')
      setGuests([])
      localStorage.setItem('guests', JSON.stringify([]))
      lastGuestsHashRef.current = JSON.stringify([])
      
      // 마커는 유지 (제거하지 않음) - 초기화 상태를 명확히 표시
      // 다른 클라이언트에서도 초기화 상태를 인식할 수 있도록 마커 유지
      console.log('🔴 [초기화] ✅ 초기화 완료 (마커 유지, 타임스탬프:', clearTimestamp, ')')
      console.log('🔴 [초기화] 이후 새로고침 시 마커가 감지되어야 함')
    } catch (error: any) {
      console.error('🔴 [초기화] ❌ Firestore 게스트 초기화 오류:', error)
      
      // ✅ Quota exceeded 오류 명시적 처리
      if (error?.message?.includes('QUOTA_EXCEEDED') || error?.code === 'resource-exhausted' || error?.message?.includes('quota')) {
        console.error('🔴 [초기화] ❌ Quota exceeded - Firestore 할당량 초과')
        alert('Firestore 할당량이 초과되어 초기화에 실패했습니다.\n\n잠시 후 다시 시도해주세요. (몇 분 후 재시도 권장)')
      } else {
        alert('게스트 리스트 초기화에 실패했습니다. 다시 시도해주세요.')
      }
      
      // ✅ 실패 시: state는 이미 변경하지 않았으므로 롤백 불필요 (서버 write 실패 시 state는 그대로 유지됨)
      console.log('🔴 [초기화] ⚠️ 서버 write 실패 - state는 변경하지 않았으므로 롤백 불필요')
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
      console.log('🟡 [deleteGuest] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
      return
    }
    
    const guestId = `${guest.name}_${guest.phone.replace(/[-\s()]/g, '')}`
    console.log('[Guests] delete click', guestId, { index, currentGuestsCount: guests.length })
    
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
    
    console.log('[Guests] delete before save', { 
      before: guests.filter(g => g.isDeleted === true).length,
      after: updatedGuests.filter(g => g.isDeleted === true).length,
      totalBefore: guests.length,
      totalAfter: updatedGuests.length
    })
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: updatedGuests })
      
      console.log('[Guests] delete result', { ok: true, savedCount: updatedGuests.length, deletedCount: updatedGuests.filter(g => g.isDeleted === true).length })
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests) // ✅ 교체 패턴 (누적 금지)
      localStorage.setItem('guests', JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      console.error('[Guests] delete result', { ok: false, error })
      console.error('Firestore 게스트 삭제 오류:', error)
      // Firestore 저장 실패 시 state 업데이트하지 않음
    }
  }

  const updateGuest = async (index: number, updatedGuest: Guest) => {
    // ✅ 초기화 후 차단 시간 동안 저장 차단
    if (clearBlockUntilRef.current !== null && Date.now() < clearBlockUntilRef.current) {
      console.log('🟡 [updateGuest] ⏸️ 초기화 후 차단 시간 동안 저장 차단')
      return
    }
    
    const updatedGuests = guests.map((guest, i) => i === index ? updatedGuest : guest)
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      // ✅ coalesce 패턴으로 write (연타/중복 방지)
      await saveGuestsAllCoalesced({ guests: updatedGuests })
      
      // Firestore 저장 성공 후에만 state 업데이트
      setGuests(updatedGuests)
      localStorage.setItem('guests', JSON.stringify(updatedGuests))
      lastGuestsHashRef.current = JSON.stringify(updatedGuests)
    } catch (error) {
      console.error('Firestore 게스트 수정 오류:', error)
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
    setFirestoreData('current' as any, { enabled }, 'events').catch((error) => {
      console.error('Firestore 이벤트 활성화 상태 저장 오류:', error)
    })
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
      console.log('모든 방명록 메시지가 삭제되었습니다.')
    } catch (error) {
      console.error('Firestore 방명록 메시지 삭제 오류:', error)
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
      console.log('모든 채팅 메시지가 삭제되었습니다.')
    } catch (error) {
      console.error('Firestore 채팅 메시지 삭제 오류:', error)
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


