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
  
  // guests state 변경 추적 (디버깅용)
  useEffect(() => {
    console.log('[Guests] state size', guests.length)
  }, [guests])

  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
      console.log('[Guests] load start', { source: 'firestore', time: Date.now() })
      try {
        // 게스트 데이터 로드
        const firestoreGuestsData = await getFirestoreData('guests' as any, 'all')
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
        
        console.log('[Guests] fetched', firestoreGuests.length, firestoreGuests.slice(0, 3))
        console.log('[Guests] fetched isDeleted count', firestoreGuests.filter(g => g.isDeleted === true).length)
        console.log('[Guests] before set', guests.length)
        
        // 초기 로드 시 Firestore 데이터만 사용 (로컬 데이터 확인하지 않음)
        // 게스트 리스트는 절대 임의로 바뀌어서는 안 되므로 Firestore 데이터를 신뢰
        // 초기 로드에서는 데이터만 설정하고, 리스너가 설정된 후에는 리스너가 모든 업데이트를 처리
        const firestoreCleared = (firestoreGuestsData as any)?._cleared
        const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null
        
        // 초기화 마커가 있으면 무조건 빈 배열 적용
        if (isFirestoreCleared) {
          console.log('[DataContext] 초기 로드: 의도적인 게스트 초기화가 감지되었습니다. 빈 배열을 적용합니다.')
          setGuests([])
          localStorage.setItem('guests', JSON.stringify([]))
          lastGuestsHashRef.current = JSON.stringify([])
        } else {
          // Firestore 데이터 적용 (마커 제거하지 않음 - 리스너가 처리)
          // ✅ 교체 패턴 (누적 금지) - Firestore가 단일 소스
          setGuests(firestoreGuests)
          localStorage.setItem('guests', JSON.stringify(firestoreGuests))
          lastGuestsHashRef.current = JSON.stringify(firestoreGuests)
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
            console.log('[DataContext] 리스너: 초기 로드 미완료, 스킵')
            return
          }
          
          console.log('[Guests] load start', { source: 'listener', time: Date.now() })
          console.log('[Guests] fetched', firestoreGuests.length, firestoreGuests.slice(0, 3))
          console.log('[Guests] before set', guests.length)
          
          // 현재 게스트 리스트 해시 생성 (중복 업데이트 방지)
          const currentHash = JSON.stringify(firestoreGuests)
          if (currentHash === lastGuestsHashRef.current) {
            console.log('[DataContext] 리스너: 게스트 리스트 변경 없음, 업데이트 스킵')
            return
          }
          lastGuestsHashRef.current = currentHash
          
          // Firestore 데이터를 무조건 적용 (로컬 데이터 확인하지 않음)
          // 초기화 마커 확인 (우선순위: 마커가 있으면 무조건 빈 배열 적용)
          const firestoreCleared = (data as any)?._cleared
          const isFirestoreCleared = firestoreCleared !== undefined && firestoreCleared !== null
          
          // 초기화 마커가 있으면 무조건 빈 배열 적용 (게스트 배열 길이와 관계없이)
          if (isFirestoreCleared) {
            console.log('[DataContext] 리스너: 초기화 마커 감지, 빈 배열 적용')
            setGuests([])
            localStorage.setItem('guests', JSON.stringify([]))
            lastGuestsHashRef.current = JSON.stringify([])
            return
          }
          
          // 초기화 마커가 없으면 Firestore 데이터 적용 (교체 패턴 - 누적 금지)
          console.log('[DataContext] 리스너: Firestore 데이터 적용, 게스트 수:', firestoreGuests.length)
          setGuests(firestoreGuests) // ✅ 교체 패턴 (누적 금지)
          localStorage.setItem('guests', JSON.stringify(firestoreGuests))
          lastGuestsHashRef.current = JSON.stringify(firestoreGuests)
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
        console.error('Firestore guests 실시간 리스너 오류:', error)
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
    
    // 엑셀에서 업로드된 게스트는 사전 예매로 설정 (isWalkIn이 명시되지 않은 경우)
    // 중복 제거: phone 기준으로 고유하게 유지
    const guestMap = new Map<string, Guest>()
    newGuests.forEach(guest => {
      const key = `${guest.name}_${guest.phone.replace(/[-\s()]/g, '')}`
      // 이미 있으면 업데이트, 없으면 추가 (upsert 패턴)
      guestMap.set(key, {
        ...guest,
        isWalkIn: guest.isWalkIn !== undefined ? guest.isWalkIn : false,
        paymentConfirmed: guest.paymentConfirmed !== undefined ? guest.paymentConfirmed : false
      })
    })
    
    const processedGuests = Array.from(guestMap.values())
    console.log('[Guests] upload processed', { original: newGuests.length, unique: processedGuests.length })
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      await setFirestoreData('guests' as any, { guests: processedGuests, _cleared: null }, 'all')
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
    try {
      await setFirestoreData('guests' as any, { guests: updatedGuests }, 'all')
      
      // Firestore 저장 성공 후에만 state 업데이트
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

    const updatedGuests = [...guests]
    const currentPaymentStatus = updatedGuests[index].paymentConfirmed
    updatedGuests[index] = {
      ...updatedGuests[index],
      paymentConfirmed: !currentPaymentStatus,
      paymentConfirmedAt: !currentPaymentStatus ? Date.now() : undefined // 결제 확인 시 시간 기록, 취소 시 삭제
    }

    // Firestore에 업데이트 (성공 확인 후 state 업데이트)
    try {
      await setFirestoreData('guests' as any, { guests: updatedGuests }, 'all')
      
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
    console.log('[DataContext] clearGuests 호출됨')
    
    // 로컬 상태와 스토리지 즉시 제거
    setGuests([])
    localStorage.setItem('guests', JSON.stringify([]))
    
    // Firestore에서도 삭제 (초기화 마커와 함께)
    const clearTimestamp = Date.now()
    console.log('[DataContext] Firestore에 초기화 마커 저장:', clearTimestamp)
    await setFirestoreData('guests' as any, { guests: [], _cleared: clearTimestamp }, 'all').catch((error) => {
      console.error('Firestore 게스트 초기화 오류:', error)
    })
    
    // 리스너가 마커를 감지하고 처리한 후 마커 제거 (2초 딜레이로 증가)
    setTimeout(async () => {
      console.log('[DataContext] 초기화 마커 제거 중...')
      // 마커 제거 (빈 배열은 유지)
      await setFirestoreData('guests' as any, { guests: [] }, 'all').catch((error) => {
        console.error('Firestore 초기화 마커 제거 오류:', error)
      })
      console.log('[DataContext] 초기화 마커 제거 완료')
    }, 2000)
    
    // 운영진 정보도 함께 삭제 (userProfiles 컬렉션에서 phone === 'admin'인 문서 삭제)
    try {
      const userProfilesRef = collection(db, 'userProfiles')
      const snapshot = await getDocs(userProfilesRef)
      
      const deletePromises = snapshot.docs
        .filter(docSnapshot => {
          const data = docSnapshot.data()
          return data.phone === 'admin'
        })
        .map(docSnapshot => deleteDoc(doc(db, 'userProfiles', docSnapshot.id)))
      
      await Promise.all(deletePromises)
      console.log(`[DataContext] ${deletePromises.length}개의 운영진 userProfile 삭제 완료`)
    } catch (error) {
      console.error('[DataContext] 운영진 userProfile 삭제 오류:', error)
    }
  }

  const deleteGuest = async (index: number) => {
    const guest = guests[index]
    if (!guest) return
    
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
      await setFirestoreData('guests' as any, { guests: updatedGuests }, 'all')
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
    const updatedGuests = guests.map((guest, i) => i === index ? updatedGuest : guest)
    
    // Firestore에 저장 (성공 확인 후 state 업데이트)
    try {
      await setFirestoreData('guests' as any, { guests: updatedGuests }, 'all')
      
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


