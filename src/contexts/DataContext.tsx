import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

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
  refundPolicy: string // 환불 정책
  contactPhone: string // 안내 전화번호
}


interface DataContextType {
  guests: Guest[]
  performanceData: PerformanceData | null
  guestbookMessages: GuestbookMessage[]
  bookingInfo: BookingInfo | null
  eventsEnabled: boolean
  uploadGuests: (guests: Guest[]) => void
  addWalkInGuest: (name: string, phone: string, isWalkIn?: boolean, email?: string) => { success: boolean; message?: string }
  toggleGuestPayment: (index: number) => void
  setPerformanceData: (data: PerformanceData) => void
  setBookingInfo: (info: BookingInfo) => void
  addGuestbookMessage: (message: GuestbookMessage) => void
  clearGuests: () => void
  deleteGuest: (index: number) => void
  updateGuest: (index: number, updatedGuest: Guest) => void
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

  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
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
        
        if (firestoreGuests.length > 0) {
          setGuests(firestoreGuests)
        } else {
          // Firestore에 없으면 localStorage에서 로드
          const savedGuests = localStorage.getItem('guests')
          if (savedGuests) {
            try {
              const parsedGuests = JSON.parse(savedGuests)
              setGuests(parsedGuests)
              // Firestore에 동기화 (실패해도 계속 진행)
              if (parsedGuests.length > 0) {
                await setFirestoreData('guests' as any, parsedGuests).catch(err => {
                  console.warn('[DataContext] 게스트 데이터 Firestore 동기화 실패:', err)
                })
              }
            } catch (parseError) {
              console.error('[DataContext] localStorage 게스트 데이터 파싱 오류:', parseError)
            }
          }
        }

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
            setBookingInfoState(bookingData as BookingInfo)
          } else {
            // Firestore 데이터가 불완전한 경우 localStorage 확인
            const savedBookingInfo = localStorage.getItem('bookingInfo')
            if (savedBookingInfo) {
              const parsedInfo = JSON.parse(savedBookingInfo)
              setBookingInfoState(parsedInfo)
              await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
            } else {
              // 기본값 설정
              const defaultBookingInfo: BookingInfo = {
                accountName: '이지우',
                bankName: '카카오뱅크',
                accountNumber: '3333254015574',
                walkInPrice: '7천원',
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
            setBookingInfoState(parsedInfo)
            await setFirestoreData('bookingInfo' as any, parsedInfo, 'main')
          } else {
            // 기본값 설정
            const defaultBookingInfo: BookingInfo = {
              accountName: '이지우',
              bankName: '카카오뱅크',
              accountNumber: '3333254015574',
              walkInPrice: '7천원',
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
          setBookingInfoState(JSON.parse(savedBookingInfo))
        } else {
          // 기본값 설정
          const defaultBookingInfo: BookingInfo = {
            accountName: '이지우',
            bankName: '카카오뱅크',
            accountNumber: '3333254015574',
            walkInPrice: '7천원',
            refundPolicy: '환불 불가',
            contactPhone: '01048246873'
          }
          setBookingInfoState(defaultBookingInfo)
          localStorage.setItem('bookingInfo', JSON.stringify(defaultBookingInfo))
        }
        if (savedBookingInfo) {
          setBookingInfoState(JSON.parse(savedBookingInfo))
        } else {
          // 기본값 설정
          const defaultBookingInfo: BookingInfo = {
            accountName: '이지우',
            bankName: '카카오뱅크',
            accountNumber: '3333254015574',
            walkInPrice: '7천원',
            refundPolicy: '환불 불가',
            contactPhone: '01048246873'
          }
          setBookingInfoState(defaultBookingInfo)
          localStorage.setItem('bookingInfo', JSON.stringify(defaultBookingInfo))
        }
      }
    }

    loadFirestoreData()

    // Firestore 실시간 리스너 설정 (guests 자동 업데이트)
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
          
          if (firestoreGuests.length > 0 || guests.length > 0) {
            // Firestore 데이터가 있으면 업데이트
            setGuests(firestoreGuests)
            localStorage.setItem('guests', JSON.stringify(firestoreGuests))
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

  const uploadGuests = (newGuests: Guest[]) => {
    // 엑셀에서 업로드된 게스트는 사전 예매로 설정 (isWalkIn이 명시되지 않은 경우)
    const processedGuests = newGuests.map(guest => ({
      ...guest,
      isWalkIn: guest.isWalkIn !== undefined ? guest.isWalkIn : false,
      paymentConfirmed: guest.paymentConfirmed !== undefined ? guest.paymentConfirmed : false
    }))
    
    setGuests(processedGuests)
    localStorage.setItem('guests', JSON.stringify(processedGuests))
    // Firestore에 저장 (비동기로 처리) - 'all' 문서 ID로 배열 저장
    setFirestoreData('guests' as any, { guests: processedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 저장 오류:', error)
    })
  }

  const addWalkInGuest = (name: string, phone: string, isWalkIn: boolean = true, email?: string): { success: boolean; message?: string } => {
    // 이름과 전화번호 정규화
    const normalizedName = name.trim()
    const normalizedPhone = phone.replace(/[-\s()]/g, '')

    if (!normalizedName || !normalizedPhone) {
      return { success: false, message: '이름과 전화번호를 입력해주세요.' }
    }

    // 이미 등록된 게스트인지 확인 (전화번호 비교 시 하이픈 제거 후 비교)
    const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
    const existingGuest = guests.find((guest) => {
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
      paymentConfirmed: isWalkIn ? false : true, // 사전 예매는 결제 완료로 간주
      paymentConfirmedAt: isWalkIn ? undefined : Date.now() // 사전 예매는 결제 시간 기록
    }

    const updatedGuests = [...guests, newGuest]
    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 현장 구매자 저장 오류:', error)
    })

    return { success: true, message: '현장 구매 등록이 완료되었습니다.' }
  }

  const toggleGuestPayment = (index: number) => {
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

    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    
    // Firestore에 업데이트
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 입금 확인 업데이트 오류:', error)
    })
  }

  const setPerformanceData = (data: PerformanceData) => {
    // 기존 데이터와 안전하게 병합 (중요한 데이터 보호)
    const mergedData: PerformanceData = {
      ...performanceDataState, // 기존 데이터 우선
      ...data, // 새 데이터로 덮어쓰기
      // 셋리스트와 공연진은 기존 값이 있으면 유지 (절대 덮어쓰지 않음)
      setlist: data.setlist && data.setlist.length > 0 
        ? data.setlist 
        : (performanceDataState?.setlist || []),
      performers: data.performers && data.performers.length > 0
        ? data.performers
        : (performanceDataState?.performers || [])
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


  const clearGuests = () => {
    setGuests([])
    localStorage.removeItem('guests')
    // Firestore에서도 삭제
    setFirestoreData('guests' as any, { guests: [] }, 'all').catch((error) => {
      console.error('Firestore 게스트 초기화 오류:', error)
    })
  }

  const deleteGuest = (index: number) => {
    const updatedGuests = guests.filter((_, i) => i !== index)
    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    // Firestore에 저장
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 삭제 오류:', error)
    })
  }

  const updateGuest = (index: number, updatedGuest: Guest) => {
    const updatedGuests = guests.map((guest, i) => i === index ? updatedGuest : guest)
    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    // Firestore에 저장
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 수정 오류:', error)
    })
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

