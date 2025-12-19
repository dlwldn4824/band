import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'

export interface Guest {
  name: string
  phone: string
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
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

interface DataContextType {
  guests: Guest[]
  performanceData: PerformanceData | null
  guestbookMessages: GuestbookMessage[]
  checkInCode: string | null
  uploadGuests: (guests: Guest[]) => void
  setPerformanceData: (data: PerformanceData) => void
  addGuestbookMessage: (message: GuestbookMessage) => void
  checkInGuest: (name: string, phone: string) => { success: boolean; entryNumber?: number; message?: string }
  generateCheckInCode: () => string
  setCheckInCode: (code: string) => void
  verifyCheckInCode: (code: string) => boolean
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [guests, setGuests] = useState<Guest[]>([])
  const [performanceData, setPerformanceDataState] = useState<PerformanceData | null>(null)
  const [guestbookMessages, setGuestbookMessages] = useState<GuestbookMessage[]>([])
  const [checkInCode, setCheckInCodeState] = useState<string | null>('0215')

  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
      try {
        // 게스트 데이터 로드
        const firestoreGuests = await getFirestoreData('guests' as any)
        if (firestoreGuests && Array.isArray(firestoreGuests) && firestoreGuests.length > 0) {
          setGuests(firestoreGuests)
        } else {
          // Firestore에 없으면 localStorage에서 로드
          const savedGuests = localStorage.getItem('guests')
          if (savedGuests) {
            const parsedGuests = JSON.parse(savedGuests)
            setGuests(parsedGuests)
            // Firestore에 동기화
            if (parsedGuests.length > 0) {
              await setFirestoreData('guests' as any, parsedGuests)
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
            const parsedData = JSON.parse(savedPerformanceData)
            setPerformanceDataState(parsedData)
            await setFirestoreData('performanceData' as any, parsedData, 'main')
          }
        }

        // 방명록 메시지 로드
        const firestoreMessages = await getFirestoreData('messages' as any)
        if (firestoreMessages && Array.isArray(firestoreMessages) && firestoreMessages.length > 0) {
          setGuestbookMessages(firestoreMessages)
        } else {
          const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
          if (savedGuestbookMessages) {
            const parsedMessages = JSON.parse(savedGuestbookMessages)
            setGuestbookMessages(parsedMessages)
            if (parsedMessages.length > 0) {
              await setFirestoreData('messages' as any, parsedMessages)
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
      } catch (error) {
        console.error('Firestore 로드 오류:', error)
        // 오류 발생 시 localStorage에서 로드
        const savedGuests = localStorage.getItem('guests')
        const savedPerformanceData = localStorage.getItem('performanceData')
        const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
        const savedCheckInCode = localStorage.getItem('checkInCode')
        
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
      }
    }

    loadFirestoreData()
  }, [])

  const uploadGuests = (newGuests: Guest[]) => {
    setGuests(newGuests)
    localStorage.setItem('guests', JSON.stringify(newGuests))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('guests' as any, newGuests).catch((error) => {
      console.error('Firestore 게스트 저장 오류:', error)
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
      게스트수: guests.length
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
      console.error('게스트를 찾을 수 없습니다. 등록된 게스트 목록:', guests.map(g => ({
        이름: g.name || g['이름'] || g.Name,
        전화번호: g.phone || g['전화번호'] || g.Phone
      })))
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
    // Firestore에 업데이트 (비동기로 처리)
    setFirestoreData('guests' as any, updatedGuests).catch((error) => {
      console.error('Firestore 게스트 업데이트 오류:', error)
    })

    console.log('체크인 성공:', {
      입장번호: newEntryNumber,
      게스트이름: guest.name || guest['이름'] || guest.Name
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

  return (
    <DataContext.Provider value={{ 
      guests, 
      performanceData, 
      guestbookMessages,
      checkInCode,
      uploadGuests, 
      setPerformanceData,
      addGuestbookMessage,
      checkInGuest,
      generateCheckInCode,
      setCheckInCode,
      verifyCheckInCode
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

