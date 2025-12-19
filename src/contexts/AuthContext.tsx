import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  name: string
  phone: string
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
}

interface AuthContextType {
  user: User | null
  login: (name: string, phone: string) => boolean
  logout: () => void
  updateUser: (userData: User) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = (name: string, phone: string): boolean => {
    const guests = JSON.parse(localStorage.getItem('guests') || '[]')
    
    if (guests.length === 0) {
      return false
    }

    const normalizedInputPhone = phone.replace(/[-\s()]/g, '')
    const normalizedInputName = name.trim()
    
    const foundGuest = guests.find((guest: any) => {
      // 이름 매칭 (한글 키 또는 영문 키 지원)
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      // 전화번호 매칭 (한글 키 또는 영문 키 지원, 하이픈/공백 제거 후 비교)
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      return nameMatch && phoneMatch
    })

    if (foundGuest) {
      const guestName = foundGuest.name || foundGuest['이름'] || name
      const guestPhone = foundGuest.phone || foundGuest['전화번호'] || phone
      const userData = { 
        name: guestName, 
        phone: guestPhone,
        entryNumber: foundGuest.entryNumber,
        checkedIn: foundGuest.checkedIn || false,
        checkedInAt: foundGuest.checkedInAt
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

