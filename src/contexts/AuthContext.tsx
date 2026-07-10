import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { normalizePhone, makeGuestKey } from '../utils/guestUtils'
import { trackEvent } from '../analytics'
import { hashGuestId } from '../analytics/hashUserId'
import { getUtmProperties } from '../analytics/utm'
import { guestLogin, getGuestStatus } from '../services/guestsApi'

export interface User {
  name: string
  phone: string
  nickname?: string // 채팅에서 사용할 닉네임
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
  paymentConfirmed?: boolean // 입금 확인 여부
  isWalkIn?: boolean // 현장 예매 여부
}

interface AuthContextType {
  user: User | null
  login: (name: string, phone: string, loginMethod?: 'name_phone' | 'token') => Promise<boolean>
  logout: () => void
  updateUser: (userData: User) => void
  setNickname: (nickname: string) => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
  refreshUserStatus: () => Promise<void>
  isAdmin: boolean
  setAdmin: (isAdmin: boolean, adminName?: string) => void
  adminName: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getLoginRetryCount(): number {
  const count = Number(sessionStorage.getItem('login_retry_count') || '0') + 1
  sessionStorage.setItem('login_retry_count', String(count))
  return count
}

function clearLoginRetryCount(): void {
  sessionStorage.removeItem('login_retry_count')
}

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
          
          // 서버 API에서 paymentConfirmed 등 최신 상태 동기화
          if (userData.phone && userData.phone !== 'admin') {
            try {
              const status = await getGuestStatus(normalizePhone(userData.phone), userData.name)
              if (status) {
                userData.paymentConfirmed = status.paymentConfirmed
                userData.checkedIn = status.checkedIn
                userData.checkedInAt = status.checkedInAt ?? undefined
                userData.entryNumber = status.entryNumber ?? undefined
                userData.isWalkIn = status.isWalkIn
              }
            } catch {
              // API 실패 시 로컬 데이터 유지
            }
          }
          
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
          
          // Firestore에서 nickname 로드 시도 (실패해도 로컬 데이터로 계속 진행)
          if (userData.phone && userData.phone !== 'admin') {
            try {
              // ✅ userId는 전화번호만 사용
              const userId = makeGuestKey(userData.name, userData.phone)
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
            }
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
        // 오류 발생 시에도 익명 사용자 생성
        const anonymousUser = {
          name: '게스트',
          phone: `guest_${Date.now()}`,
          checkedIn: false
        }
        setUser(anonymousUser)
        localStorage.setItem('user', JSON.stringify(anonymousUser))
      } finally {
        setIsLoading(false) // 로딩 완료 (성공/실패 관계없이)
      }
    }
    loadUser()
  }, [])

  const refreshUserStatus = useCallback(async () => {
    if (!user || user.phone === 'admin') return

    const status = await getGuestStatus(normalizePhone(user.phone), user.name)
    if (!status) return

    const hasChanges =
      user.checkedIn !== status.checkedIn ||
      user.checkedInAt !== (status.checkedInAt ?? undefined) ||
      user.paymentConfirmed !== status.paymentConfirmed ||
      user.entryNumber !== (status.entryNumber ?? undefined) ||
      user.isWalkIn !== status.isWalkIn

    if (hasChanges) {
      const updatedUser = {
        ...user,
        checkedIn: status.checkedIn,
        checkedInAt: status.checkedInAt ?? undefined,
        paymentConfirmed: status.paymentConfirmed,
        entryNumber: status.entryNumber ?? undefined,
        isWalkIn: status.isWalkIn,
      }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }, [user])

  // 로그인 사용자 상태 주기적 갱신 (서버 API)
  useEffect(() => {
    if (!user || user.phone === 'admin') return

    refreshUserStatus()
    const interval = setInterval(() => {
      void refreshUserStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [user?.name, user?.phone, refreshUserStatus])

  const login = async (
    name: string,
    phone: string,
    loginMethod: 'name_phone' | 'token' = 'name_phone'
  ): Promise<boolean> => {
    void trackEvent('login_attempted', {
      login_method: loginMethod,
      has_token: loginMethod === 'token',
      ...getUtmProperties(),
    })

    const normalizedInputPhone = normalizePhone(phone)
    const normalizedInputName = name.trim()
    const verifyName =
      normalizedInputName && normalizedInputName !== '게스트' ? normalizedInputName : undefined

    const result = await guestLogin(normalizedInputPhone, verifyName)

    if (!result.ok || !result.guest) {
      const failReason =
        result.reason === 'name_mismatch'
          ? 'phone_mismatch'
          : (result.reason || 'not_found')
      void trackEvent('login_failed', {
        fail_reason: failReason as 'not_found' | 'phone_mismatch' | 'deleted' | 'empty_guests',
        retry_count: getLoginRetryCount(),
        ...getUtmProperties(),
      })
      return false
    }

    const g = result.guest

    setIsAdmin(false)
    setAdminName(null)
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('adminName')

    const guestName = g.name || normalizedInputName
    const guestPhone = normalizedInputPhone
    const entryNumber = g.entryNumber ?? undefined
    const isPaymentConfirmed = g.paymentConfirmed === true
    const didCheckInNow = result.didCheckInNow === true

    const userData: User = {
      name: guestName,
      phone: guestPhone,
      entryNumber,
      checkedIn: g.checkedIn,
      checkedInAt: g.checkedInAt ?? undefined,
      paymentConfirmed: isPaymentConfirmed,
      isWalkIn: g.isWalkIn,
    }

    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))

    const loadNickname = async () => {
      try {
        const userId = makeGuestKey(guestName, guestPhone)
        const userProfileRef = doc(db, 'userProfiles', userId)
        const userProfileSnap = await getDoc(userProfileRef)

        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data()
          if (profileData.nickname && profileData.nickname.trim() !== '') {
            const updatedUser = { ...userData, nickname: profileData.nickname }
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
          } else {
            const autoNickname = guestName
            const updatedUser = { ...userData, nickname: autoNickname }
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            await setDoc(userProfileRef, {
              name: guestName,
              phone: guestPhone,
              nickname: autoNickname,
              updatedAt: new Date(),
            }, { merge: true })
          }
        } else {
          const autoNickname = guestName
          const updatedUser = { ...userData, nickname: autoNickname }
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))
          await setDoc(userProfileRef, {
            name: guestName,
            phone: guestPhone,
            nickname: autoNickname,
            updatedAt: new Date(),
          }, { merge: true })
        }
      } catch {
        const autoNickname = guestName
        const updatedUser = { ...userData, nickname: autoNickname }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
    }
    void loadNickname()

    clearLoginRetryCount()
    void trackEvent('login_succeeded', {
      has_entry_number: entryNumber !== undefined,
      payment_confirmed: isPaymentConfirmed,
      is_walk_in: g.isWalkIn,
      ...getUtmProperties(),
    })
    if (didCheckInNow) {
      void hashGuestId(guestPhone).then((guestIdHash) => {
        void trackEvent('checkin_completed', { guest_id_hash: guestIdHash, is_walk_in: g.isWalkIn })
      })
    }

    return true
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
      
      const currentUserId = makeGuestKey(user.name, user.phone)
      
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
    }
    
    const updatedUser = { ...user, nickname: trimmedNickname }
    
    // 로컬스토리지에 먼저 저장 (항상 성공)
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    
    // Firestore에 저장 시도 (실패해도 계속 진행)
    try {
      // ✅ userId는 전화번호만 사용
      const userId = makeGuestKey(user.name, user.phone)
      const userProfileRef = doc(db, 'userProfiles', userId)
      
      await setDoc(userProfileRef, {
        name: user.name,
        phone: user.phone,
        nickname: trimmedNickname,
        updatedAt: new Date()
      }, { merge: true })
    } catch (error: any) {
      // Firestore 저장 실패해도 로컬스토리지는 이미 저장되었으므로 계속 진행
      // 서버 연결이 안 되어 있어도 로컬에서 작동하도록 에러를 던지지 않음
    }

    void trackEvent('nickname_set', { nickname_length: trimmedNickname.length })
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

