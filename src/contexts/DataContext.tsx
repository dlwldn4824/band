import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  const [checkInCode, setCheckInCodeState] = useState<string | null>(null)

  useEffect(() => {
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
    }
  }, [])

  const uploadGuests = (newGuests: Guest[]) => {
    setGuests(newGuests)
    localStorage.setItem('guests', JSON.stringify(newGuests))
  }

  const setPerformanceData = (data: PerformanceData) => {
    setPerformanceDataState(data)
    localStorage.setItem('performanceData', JSON.stringify(data))
  }

  const addGuestbookMessage = (message: GuestbookMessage) => {
    const newMessages = [...guestbookMessages, message]
    setGuestbookMessages(newMessages)
    localStorage.setItem('guestbookMessages', JSON.stringify(newMessages))
  }

  const checkInGuest = (name: string, phone: string): { success: boolean; entryNumber?: number; message?: string } => {
    const normalizedInputPhone = phone.replace(/[-\s()]/g, '')
    const normalizedInputName = name.trim()
    
    // guests 배열에서 해당 게스트 찾기
    const guestIndex = guests.findIndex((guest) => {
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      return nameMatch && phoneMatch
    })

    if (guestIndex === -1) {
      return { success: false, message: '등록된 정보가 없습니다.' }
    }

    const guest = guests[guestIndex]

    // 이미 체크인한 경우
    if (guest.checkedIn) {
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

    return { success: true, entryNumber: newEntryNumber }
  }

  const generateCheckInCode = (): string => {
    // 4자리 숫자 코드 생성 (1000-9999)
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    return code
  }

  const setCheckInCode = (code: string) => {
    setCheckInCodeState(code)
    localStorage.setItem('checkInCode', code)
  }

  const verifyCheckInCode = (code: string): boolean => {
    return checkInCode !== null && checkInCode === code.trim()
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

