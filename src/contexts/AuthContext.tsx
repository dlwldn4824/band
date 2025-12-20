import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

interface User {
  name: string
  phone: string
  nickname?: string // 채팅에서 사용할 닉네임
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
}

interface AuthContextType {
  user: User | null
  login: (name: string, phone: string, guests?: any[]) => boolean
  logout: () => void
  updateUser: (userData: User) => void
  setNickname: (nickname: string) => Promise<void>
  isAuthenticated: boolean
  refreshUserStatus: (guests: any[]) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        
        // Firestore에서 nickname 로드
        if (userData.phone) {
          try {
            const userId = `${userData.name}_${userData.phone}`
            const userProfileRef = doc(db, 'userProfiles', userId)
            const userProfileSnap = await getDoc(userProfileRef)
            
            if (userProfileSnap.exists()) {
              const profileData = userProfileSnap.data()
              if (profileData.nickname && profileData.nickname !== userData.nickname) {
                const updatedUser = { ...userData, nickname: profileData.nickname }
                setUser(updatedUser)
                localStorage.setItem('user', JSON.stringify(updatedUser))
              }
            }
          } catch (error) {
            console.error('닉네임 로드 오류:', error)
          }
        }
      }
    }
    loadUser()
  }, [])

  const login = (name: string, phone: string, guests?: any[]): boolean => {
    // guests가 제공되지 않으면 localStorage에서 로드 (하위 호환성)
    const guestList = guests || JSON.parse(localStorage.getItem('guests') || '[]')
    
    if (guestList.length === 0) {
      return false
    }

    const normalizedInputPhone = phone.replace(/[-\s()]/g, '')
    const normalizedInputName = name.trim()
    
    const foundGuest = guestList.find((guest: any) => {
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
      // Firestore의 최신 체크인 상태 사용 (서버 상태 기반)
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

  // Firestore의 guests 배열을 기반으로 사용자 상태 갱신
  const refreshUserStatus = (guests: any[]) => {
    if (!user) return

    const normalizedInputPhone = user.phone.replace(/[-\s()]/g, '')
    const normalizedInputName = user.name.trim()
    
    const foundGuest = guests.find((guest: any) => {
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      return nameMatch && phoneMatch
    })

    if (foundGuest) {
      // 서버 상태와 다르면 업데이트
      if (
        user.checkedIn !== foundGuest.checkedIn ||
        user.entryNumber !== foundGuest.entryNumber ||
        user.checkedInAt !== foundGuest.checkedInAt
      ) {
        updateUser({
          ...user,
          checkedIn: foundGuest.checkedIn || false,
          entryNumber: foundGuest.entryNumber,
          checkedInAt: foundGuest.checkedInAt
        })
      }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const setNickname = async (nickname: string) => {
    if (!user) return
    
    try {
      const userId = `${user.name}_${user.phone}`
      const userProfileRef = doc(db, 'userProfiles', userId)
      
      await setDoc(userProfileRef, {
        name: user.name,
        phone: user.phone,
        nickname: nickname.trim(),
        updatedAt: new Date()
      }, { merge: true })
      
      const updatedUser = { ...user, nickname: nickname.trim() }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error) {
      console.error('닉네임 저장 오류:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, setNickname, isAuthenticated: !!user, refreshUserStatus }}>
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

