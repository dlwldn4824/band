import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface Guest {
  name: string
  phone: string
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
  isWalkIn?: boolean // 현장 예매 여부
  paymentConfirmed?: boolean // 입금 확인 완료 여부
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
  checkInCode: string | null
  bookingInfo: BookingInfo | null
  eventsEnabled: boolean
  lastCheckedInGuest: { name: string; timestamp: number } | null
  uploadGuests: (guests: Guest[]) => void
  addWalkInGuest: (name: string, phone: string) => { success: boolean; message?: string }
  toggleGuestPayment: (index: number) => void
  setPerformanceData: (data: PerformanceData) => void
  setBookingInfo: (info: BookingInfo) => void
  addGuestbookMessage: (message: GuestbookMessage) => void
  checkInGuest: (name: string, phone: string) => { success: boolean; entryNumber?: number; message?: string }
  generateCheckInCode: () => string
  setCheckInCode: (code: string) => void
  verifyCheckInCode: (code: string) => boolean
  clearGuests: () => void
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
  const [checkInCode, setCheckInCodeState] = useState<string | null>('0215')
  const [bookingInfo, setBookingInfoState] = useState<BookingInfo | null>(null)
  const [eventsEnabled, setEventsEnabledState] = useState<boolean>(false)
  const [lastCheckedInGuest, setLastCheckedInGuest] = useState<{ name: string; timestamp: number } | null>(null)

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
          setPerformanceDataState(firestorePerformanceData as PerformanceData)
        } else {
          const savedPerformanceData = localStorage.getItem('performanceData')
          if (savedPerformanceData) {
            try {
              const parsedData = JSON.parse(savedPerformanceData)
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
                venue: '홍대 라디오 가가 공연장',
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

        // 체크인 코드 로드
        const firestoreAuth = await getFirestoreData('current' as any, 'auth')
        if (firestoreAuth && !Array.isArray(firestoreAuth) && (firestoreAuth as any).checkInCode) {
          setCheckInCodeState((firestoreAuth as any).checkInCode)
        } else {
          const fixedCode = '0215'
          setCheckInCodeState(fixedCode)
          localStorage.setItem('checkInCode', fixedCode)
          // Firestore에 저장
          await setFirestoreData('current' as any, { checkInCode: fixedCode }, 'auth')
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
    const savedCheckInCode = localStorage.getItem('checkInCode')
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
    if (savedCheckInCode) {
      setCheckInCodeState(savedCheckInCode)
        } else {
          const fixedCode = '0215'
          setCheckInCodeState(fixedCode)
          localStorage.setItem('checkInCode', fixedCode)
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

  const addWalkInGuest = (name: string, phone: string): { success: boolean; message?: string } => {
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

    // 새로운 현장 구매자 추가
    const newGuest: Guest = {
      name: normalizedName,
      phone: normalizedPhone,
      checkedIn: false,
      isWalkIn: true, // 현장 예매로 등록
      paymentConfirmed: false // 입금 확인은 아직 안됨
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
    updatedGuests[index] = {
      ...updatedGuests[index],
      paymentConfirmed: !updatedGuests[index].paymentConfirmed
    }

    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    
    // Firestore에 업데이트
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 입금 확인 업데이트 오류:', error)
    })
  }

  const setPerformanceData = (data: PerformanceData) => {
    setPerformanceDataState(data)
    localStorage.setItem('performanceData', JSON.stringify(data))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('performanceData' as any, data, 'main').catch((error) => {
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

  const checkInGuest = (name: string, phone: string): { success: boolean; entryNumber?: number; message?: string } => {
    const normalizedInputPhone = phone.replace(/[-\s()]/g, '')
    const normalizedInputName = name.trim()
    
    console.log('체크인 게스트 찾기:', {
      입력이름: normalizedInputName,
      입력전화번호: normalizedInputPhone,
      게스트수: guests.length,
      게스트데이터전체: guests
    })
    
    // guests 배열에서 해당 게스트 찾기
    const guestIndex = guests.findIndex((guest) => {
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      if (nameMatch || phoneMatch) {
        console.log('게스트 매칭 시도:', {
          게스트이름: guestName,
          이름일치: nameMatch,
          게스트전화번호: normalizedGuestPhone,
          전화번호일치: phoneMatch,
          전체일치: nameMatch && phoneMatch
        })
      }
      
      return nameMatch && phoneMatch
    })

    console.log('게스트 찾기 결과:', {
      guestIndex,
      찾음: guestIndex !== -1
    })

    if (guestIndex === -1) {
      console.error('게스트를 찾을 수 없습니다.')
      console.error('등록된 게스트 목록 (원본):', guests)
      console.error('등록된 게스트 목록 (파싱):', guests.map((g, idx) => {
        const guestName = g.name || g['이름'] || g.Name || ''
        const guestPhone = g.phone || g['전화번호'] || g.Phone || ''
        return {
          인덱스: idx,
          원본객체: g,
          이름: guestName,
          전화번호: guestPhone,
          모든키: Object.keys(g)
        }
      }))
      return { success: false, message: '등록된 정보가 없습니다.' }
    }

    const guest = guests[guestIndex]
    
    console.log('게스트 정보:', {
      이름: guest.name || guest['이름'] || guest.Name,
      전화번호: guest.phone || guest['전화번호'] || guest.Phone,
      체크인여부: guest.checkedIn,
      입장번호: guest.entryNumber
    })

    // 이미 체크인한 경우
    if (guest.checkedIn) {
      console.log('이미 체크인 완료된 게스트')
      return { 
        success: false, 
        message: `이미 체크인 완료되었습니다. 입장 번호: ${guest.entryNumber}번`,
        entryNumber: guest.entryNumber
      }
    }

    // 도착 순서대로 입장 번호 할당
    const checkedInGuests = guests.filter(g => g.checkedIn && g.entryNumber !== undefined)
    const maxEntryNumber = checkedInGuests.length > 0 
      ? Math.max(...checkedInGuests.map(g => g.entryNumber || 0))
      : 0
    const newEntryNumber = maxEntryNumber + 1

    // 게스트 정보 업데이트
    const updatedGuests = [...guests]
    updatedGuests[guestIndex] = {
      ...guest,
      entryNumber: newEntryNumber,
      checkedIn: true,
      checkedInAt: Date.now()
    }

    setGuests(updatedGuests)
    localStorage.setItem('guests', JSON.stringify(updatedGuests))
    // Firestore에 업데이트 (비동기로 처리) - 'all' 문서 ID로 배열 저장
    setFirestoreData('guests' as any, { guests: updatedGuests }, 'all').catch((error) => {
      console.error('Firestore 게스트 업데이트 오류:', error)
    })

    // 마지막 체크인 게스트 정보 업데이트 (알림용)
    const guestName = guest.name || guest['이름'] || guest.Name || ''
    setLastCheckedInGuest({
      name: guestName,
      timestamp: Date.now()
    })

    console.log('체크인 성공:', {
      입장번호: newEntryNumber,
      게스트이름: guestName
    })

    return { success: true, entryNumber: newEntryNumber }
  }

  const generateCheckInCode = (): string => {
    // 체크인 코드를 "0215"로 고정
    return '0215'
  }

  const setCheckInCode = (code: string) => {
    setCheckInCodeState(code)
    localStorage.setItem('checkInCode', code)
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('current' as any, { checkInCode: code }, 'auth').catch((error) => {
      console.error('Firestore 체크인 코드 저장 오류:', error)
    })
  }

  const verifyCheckInCode = (code: string): boolean => {
    const trimmedCode = code.trim()
    // checkInCode가 null이면 기본값 '0215' 사용
    const currentCode = checkInCode || '0215'
    const isValid = currentCode === trimmedCode
    
    // 디버깅용 로그
    console.log('체크인 코드 검증:', {
      입력코드: trimmedCode,
      저장된코드: currentCode,
      일치여부: isValid
    })
    
    return isValid
  }

  const clearGuests = () => {
    setGuests([])
    localStorage.removeItem('guests')
    // Firestore에서도 삭제
    setFirestoreData('guests' as any, { guests: [] }, 'all').catch((error) => {
      console.error('Firestore 게스트 초기화 오류:', error)
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
      checkInCode,
      bookingInfo,
      eventsEnabled,
      lastCheckedInGuest,
      uploadGuests, 
      addWalkInGuest,
      toggleGuestPayment,
      setPerformanceData,
      setBookingInfo,
      addGuestbookMessage,
      checkInGuest,
      generateCheckInCode,
      setCheckInCode,
      verifyCheckInCode,
      clearGuests,
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

