import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { setFirestoreData } from '../services/firestoreService'

export interface User {
  name: string
  phone: string
  nickname?: string // 채팅에서 사용할 닉네임
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
  paymentConfirmed?: boolean // 입금 확인 여부
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
          
          // guests 데이터에서 paymentConfirmed 상태 확인 및 업데이트
          if (userData.phone && userData.phone !== 'admin') {
            try {
              // localStorage에서 guests 로드
              const savedGuests = localStorage.getItem('guests')
              if (savedGuests) {
                const guests = JSON.parse(savedGuests)
                if (Array.isArray(guests) && guests.length > 0) {
                  const normalizedInputPhone = userData.phone.replace(/[-\s()]/g, '')
                  const normalizedInputName = userData.name.trim()
                  
                  const foundGuest = guests.find((guest: any) => {
                    // 삭제된 게스트는 제외
                    if (guest.isDeleted === true) {
                      return false
                    }
                    
                    const guestName = guest.name || guest['이름'] || guest.Name || ''
                    const nameMatch = guestName.trim() === normalizedInputName
                    
                    const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
                    const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
                    const phoneMatch = normalizedGuestPhone === normalizedInputPhone
                    
                    return nameMatch && phoneMatch
                  })
                  
                  if (foundGuest) {
                    // paymentConfirmed 상태가 다르면 업데이트
                    const paymentConfirmed = foundGuest.paymentConfirmed === true
                    if (userData.paymentConfirmed !== paymentConfirmed) {
                      userData.paymentConfirmed = paymentConfirmed
                      console.log('[AuthContext] loadUser - paymentConfirmed 상태 업데이트:', paymentConfirmed)
                    }
                    
                    // checkedIn 상태도 업데이트
                    if (userData.checkedIn !== foundGuest.checkedIn) {
                      userData.checkedIn = foundGuest.checkedIn || false
                    }
                    if (userData.checkedInAt !== foundGuest.checkedInAt) {
                      userData.checkedInAt = foundGuest.checkedInAt
                    }
                    if (userData.entryNumber !== foundGuest.entryNumber) {
                      userData.entryNumber = foundGuest.entryNumber
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('guests 데이터 확인 실패:', error)
            }
          }
          
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
          
          // Firestore에서 nickname 로드 시도 (실패해도 로컬 데이터로 계속 진행)
          if (userData.phone && userData.phone !== 'admin') {
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

  // guests 데이터 변경 시 사용자 상태 자동 갱신
  useEffect(() => {
    if (!user || user.phone === 'admin') return

    const checkGuestsUpdate = () => {
      try {
        const savedGuests = localStorage.getItem('guests')
        if (!savedGuests) return

        const guests = JSON.parse(savedGuests)
        if (!Array.isArray(guests) || guests.length === 0) return

        // 현재 user 상태를 클로저로 캡처하여 사용
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
        if (!currentUser || !currentUser.name || !currentUser.phone) return

        const normalizedInputPhone = currentUser.phone.replace(/[-\s()]/g, '')
        const normalizedInputName = currentUser.name.trim()
        
        const foundGuest = guests.find((guest: any) => {
          // 삭제된 게스트는 제외
          if (guest.isDeleted === true) {
            return false
          }
          
          const guestName = guest.name || guest['이름'] || guest.Name || ''
          const nameMatch = guestName.trim() === normalizedInputName
          
          const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
          const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
          const phoneMatch = normalizedGuestPhone === normalizedInputPhone
          
          return nameMatch && phoneMatch
        })
        
        if (foundGuest) {
          // paymentConfirmed 상태가 다르면 업데이트
          const paymentConfirmed = foundGuest.paymentConfirmed === true
          const checkedIn = foundGuest.checkedIn || false
          const checkedInAt = foundGuest.checkedInAt
          const entryNumber = foundGuest.entryNumber
          
          // 실제로 변경된 것이 있는지 확인
          const hasChanges = 
            currentUser.paymentConfirmed !== paymentConfirmed ||
            currentUser.checkedIn !== checkedIn ||
            currentUser.checkedInAt !== checkedInAt ||
            currentUser.entryNumber !== entryNumber
          
          if (hasChanges) {
            const updatedUser = {
              ...currentUser,
              paymentConfirmed: paymentConfirmed,
              checkedIn: checkedIn,
              checkedInAt: checkedInAt,
              entryNumber: entryNumber
            }
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            console.log('[AuthContext] guests 변경 감지 - 상태 업데이트:', {
              paymentConfirmed,
              checkedIn,
              entryNumber
            })
          }
        }
      } catch (error) {
        console.warn('guests 변경 확인 실패:', error)
      }
    }

    // 초기 확인
    checkGuestsUpdate()

    // localStorage 변경 감지 (storage 이벤트는 다른 탭에서만 발생하므로 polling 사용)
    const interval = setInterval(checkGuestsUpdate, 2000) // 2초마다 확인

    return () => clearInterval(interval)
  }, [user?.name, user?.phone]) // user 객체 전체가 아닌 name과 phone만 의존성으로 사용

  const login = (name: string, phone: string, guests?: any[]): boolean => {
    // guests가 제공되지 않으면 localStorage에서 로드 (하위 호환성)
    const guestList = guests || JSON.parse(localStorage.getItem('guests') || '[]')
    
    if (guestList.length === 0) {
      return false
    }

    const normalizedInputPhone = phone.replace(/[-\s()]/g, '')
    const normalizedInputName = name.trim()
    
    const foundGuestIndex = guestList.findIndex((guest: any) => {
      // 삭제된 게스트는 제외
      if (guest.isDeleted === true) {
        return false
      }
      
      // 이름 매칭 (한글 키 또는 영문 키 지원)
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      // 전화번호 매칭 (한글 키 또는 영문 키 지원, 하이픈/공백 제거 후 비교)
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      return nameMatch && phoneMatch
    })

    if (foundGuestIndex !== -1) {
      const foundGuest = guestList[foundGuestIndex]
      
      // 일반 사용자 로그인 시 운영진 상태 초기화 (중요!)
      setIsAdmin(false)
      setAdminName(null)
      localStorage.removeItem('isAdmin')
      localStorage.removeItem('adminName')
      
      const guestName = foundGuest.name || foundGuest['이름'] || name
      const guestPhone = foundGuest.phone || foundGuest['전화번호'] || phone
      
      // 입장번호가 없으면 로그인 순서대로 할당 (항상 할당)
      let entryNumber = foundGuest.entryNumber
      if (!entryNumber) {
        // 이미 입장번호가 있는 게스트들의 최대값 찾기
        const guestsWithEntryNumber = guestList.filter((g: any) => g.entryNumber !== undefined && g.entryNumber !== null)
        const maxEntryNumber = guestsWithEntryNumber.length > 0
          ? Math.max(...guestsWithEntryNumber.map((g: any) => g.entryNumber || 0))
          : 0
        entryNumber = maxEntryNumber + 1
        
        // 게스트 정보에 입장번호 할당
        const updatedGuestList = [...guestList]
        updatedGuestList[foundGuestIndex] = {
          ...foundGuest,
          entryNumber: entryNumber,
          checkedIn: true,
          checkedInAt: Date.now()
        }
        
        // localStorage 업데이트
        localStorage.setItem('guests', JSON.stringify(updatedGuestList))
        
        // Firestore 업데이트 (비동기)
        setFirestoreData('guests' as any, { guests: updatedGuestList }, 'all').catch((error: any) => {
          console.error('Firestore 입장번호 업데이트 오류:', error)
        })
      }
      
      // 입장번호가 항상 userData에 포함되도록 보장
      if (!entryNumber) {
        entryNumber = 1 // 기본값 (이론적으로는 발생하지 않아야 함)
      }
      
      // Firestore의 최신 체크인 상태 사용 (서버 상태 기반)
      const userData = { 
        name: guestName, 
        phone: guestPhone,
        entryNumber: entryNumber,
        checkedIn: foundGuest.checkedIn !== false,
        checkedInAt: foundGuest.checkedInAt || Date.now(),
        paymentConfirmed: foundGuest.paymentConfirmed === true
      }
      
      // 디버깅용 콘솔 로그
      console.log('[AuthContext] login - entryNumber:', entryNumber)
      console.log('[AuthContext] login - userData:', userData)
      console.log('[AuthContext] login - foundGuest:', foundGuest)
      
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // localStorage 저장 확인
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null')
      console.log('[AuthContext] localStorage 저장 후 확인:', savedUser)
      
      // Firestore에서 닉네임 로드 및 자동 설정 (비동기, 실패해도 계속 진행)
      const loadNickname = async () => {
        try {
          const userId = `${guestName}_${guestPhone}`
          const userProfileRef = doc(db, 'userProfiles', userId)
          const userProfileSnap = await getDoc(userProfileRef)
          
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data()
            if (profileData.nickname && profileData.nickname.trim() !== '') {
              // 기존 닉네임이 있으면 사용
              const updatedUser = { ...userData, nickname: profileData.nickname }
              setUser(updatedUser)
              localStorage.setItem('user', JSON.stringify(updatedUser))
            } else {
              // 닉네임이 없으면 이름을 닉네임으로 자동 설정
              const autoNickname = guestName
              const updatedUser = { ...userData, nickname: autoNickname }
              setUser(updatedUser)
              localStorage.setItem('user', JSON.stringify(updatedUser))
              
              // Firestore에 저장
              await setDoc(userProfileRef, {
                name: guestName,
                phone: guestPhone,
                nickname: autoNickname,
                updatedAt: new Date()
              }, { merge: true })
            }
          } else {
            // userProfile이 없으면 이름을 닉네임으로 자동 설정하고 생성
            const autoNickname = guestName
            const updatedUser = { ...userData, nickname: autoNickname }
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            
            // Firestore에 저장
            await setDoc(userProfileRef, {
              name: guestName,
              phone: guestPhone,
              nickname: autoNickname,
              updatedAt: new Date()
            }, { merge: true })
          }
        } catch (error) {
          // Firestore 연결 실패 시에도 로컬에 이름을 닉네임으로 설정
          console.warn('Firestore 닉네임 로드 실패, 로컬에 이름을 닉네임으로 설정:', error)
          const autoNickname = guestName
          const updatedUser = { ...userData, nickname: autoNickname }
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))
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
        user.checkedInAt !== foundGuest.checkedInAt ||
        user.paymentConfirmed !== (foundGuest.paymentConfirmed === true)
      ) {
        updateUser({
          ...user,
          checkedIn: foundGuest.checkedIn || false,
          checkedInAt: foundGuest.checkedInAt,
          paymentConfirmed: foundGuest.paymentConfirmed === true
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

