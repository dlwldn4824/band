import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
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
  isLoading: boolean
  refreshUserStatus: (guests: any[]) => void
  isAdmin: boolean
  setAdmin: (isAdmin: boolean, adminName?: string) => void
  adminName: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [adminName, setAdminName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true) // 로딩 상태 추가

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true) // 로딩 시작
      
      try {
        // 운영진 상태 먼저 로드 (user와 독립적)
        const savedAdmin = localStorage.getItem('isAdmin')
        const savedAdminName = localStorage.getItem('adminName')
        if (savedAdmin === 'true' && savedAdminName) {
          setIsAdmin(true)
          setAdminName(savedAdminName)
          
          // 운영자인데 user가 없으면 user 객체 생성
          const savedUser = localStorage.getItem('user')
          if (!savedUser) {
            const adminUser = {
              name: savedAdminName,
              phone: 'admin',
              nickname: savedAdminName
            }
            setUser(adminUser)
            localStorage.setItem('user', JSON.stringify(adminUser))
          }
        }
        
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          
          // Firestore에서 nickname 로드 시도 (실패해도 로컬 데이터로 계속 진행)
          if (userData.phone) {
            try {
              const userId = `${userData.name}_${userData.phone}`
              const userProfileRef = doc(db, 'userProfiles', userId)
              const userProfileSnap = await getDoc(userProfileRef)
              
              if (userProfileSnap.exists()) {
                const profileData = userProfileSnap.data()
                // Firestore에 닉네임이 있고, 로컬에 없거나 다르면 업데이트
                if (profileData.nickname && (!userData.nickname || profileData.nickname !== userData.nickname)) {
                  const updatedUser = { ...userData, nickname: profileData.nickname }
                  setUser(updatedUser)
                  localStorage.setItem('user', JSON.stringify(updatedUser))
                }
              }
            } catch (error) {
              // Firestore 연결 실패해도 로컬 데이터로 계속 진행
              console.warn('Firestore 닉네임 로드 실패 (로컬 데이터 사용):', error)
            }
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
      } finally {
        setIsLoading(false) // 로딩 완료 (성공/실패 관계없이)
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
      // 일반 사용자 로그인 시 운영진 상태 초기화 (중요!)
      setIsAdmin(false)
      setAdminName(null)
      localStorage.removeItem('isAdmin')
      localStorage.removeItem('adminName')
      
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
      
      // Firestore에서 닉네임 로드 (비동기, 실패해도 계속 진행)
      const loadNickname = async () => {
        try {
          const userId = `${guestName}_${guestPhone}`
          const userProfileRef = doc(db, 'userProfiles', userId)
          const userProfileSnap = await getDoc(userProfileRef)
          
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data()
            if (profileData.nickname && profileData.nickname.trim() !== '') {
              const updatedUser = { ...userData, nickname: profileData.nickname }
              setUser(updatedUser)
              localStorage.setItem('user', JSON.stringify(updatedUser))
            }
          }
        } catch (error) {
          // Firestore 연결 실패해도 로그인은 성공으로 처리
          console.warn('Firestore 닉네임 로드 실패 (로그인은 성공):', error)
        }
      }
      loadNickname()
      
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
    setIsAdmin(false)
    setAdminName(null)
    localStorage.removeItem('user')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('adminName')
  }

  const setAdmin = (admin: boolean, name?: string) => {
    setIsAdmin(admin)
    if (admin && name) {
      setAdminName(name)
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('adminName', name)
    } else {
      setAdminName(null)
      localStorage.removeItem('isAdmin')
      localStorage.removeItem('adminName')
    }
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const setNickname = async (nickname: string) => {
    if (!user) {
      throw new Error('사용자 정보가 없습니다. 다시 로그인해주세요.')
    }
    
    const trimmedNickname = nickname.trim()
    
    // 중복 닉네임 체크
    try {
      const userProfilesRef = collection(db, 'userProfiles')
      const querySnapshot = await getDocs(userProfilesRef)
      
      const currentUserId = `${user.name}_${user.phone}`
      
      // 현재 사용자의 기존 닉네임과 동일하면 중복 체크 통과
      const isSameAsCurrent = user.nickname && user.nickname.trim() === trimmedNickname
      
      if (!isSameAsCurrent) {
        // 다른 사용자가 같은 닉네임을 사용하는지 확인
        const duplicateNickname = querySnapshot.docs.find((docSnapshot) => {
          const data = docSnapshot.data()
          const docUserId = docSnapshot.id
          // 현재 사용자가 아니고, 닉네임이 동일한 경우
          return docUserId !== currentUserId && data.nickname && data.nickname.trim() === trimmedNickname
        })
        
        if (duplicateNickname) {
          throw new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.')
        }
      }
    } catch (error: any) {
      // 네트워크 오류가 아닌 중복 오류인 경우에만 에러 던지기
      if (error.message && error.message.includes('이미 사용 중인 닉네임')) {
        throw error
      }
      // 네트워크 오류 등은 경고만 출력하고 계속 진행 (오프라인 환경 대응)
      console.warn('닉네임 중복 체크 실패 (계속 진행):', error)
    }
    
    const updatedUser = { ...user, nickname: trimmedNickname }
    
    // 로컬스토리지에 먼저 저장 (항상 성공)
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    
    // Firestore에 저장 시도 (실패해도 계속 진행)
    try {
      const userId = `${user.name}_${user.phone}`
      const userProfileRef = doc(db, 'userProfiles', userId)
      
      await setDoc(userProfileRef, {
        name: user.name,
        phone: user.phone,
        nickname: trimmedNickname,
        updatedAt: new Date()
      }, { merge: true })
    } catch (error: any) {
      // Firestore 저장 실패해도 로컬스토리지는 이미 저장되었으므로 계속 진행
      console.warn('Firestore 닉네임 저장 실패 (로컬스토리지에는 저장됨):', error)
      // 서버 연결이 안 되어 있어도 로컬에서 작동하도록 에러를 던지지 않음
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      setNickname, 
      isAuthenticated: !!user, 
      isLoading,
      refreshUserStatus,
      isAdmin,
      setAdmin,
      adminName
    }}>
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

