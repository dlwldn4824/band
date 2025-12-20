import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import TicketTransition from '../components/TicketTransition'
import './Login.css'

const Login = () => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [showTicket, setShowTicket] = useState(false)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [walkInStep, setWalkInStep] = useState<'payment' | 'info'>('payment')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [walkInError, setWalkInError] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [nickname, setNickname] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isSettingProfile, setIsSettingProfile] = useState(false)
  const { login, setNickname: saveNickname } = useAuth()
  const { guests, addWalkInGuest, bookingInfo } = useData()
  const navigate = useNavigate()

  useEffect(() => {
    // 세로 모드에서 스크롤 방지 (입력 필드와 버튼은 제외)
    const preventScroll = (e: TouchEvent) => {
      // 세로 모드인지 확인
      const isPortraitMode = window.innerHeight > window.innerWidth
      if (!isPortraitMode) {
        return
      }

      // 입력 필드, 버튼, 또는 그 부모 요소인 경우 터치 이벤트 허용
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('input') ||
        target.closest('button') ||
        target.closest('textarea') ||
        target.closest('.login-container')
      ) {
        return
      }

      e.preventDefault()
    }

    // body와 html 스크롤 방지
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalBodyWidth = document.body.style.width
    const originalBodyHeight = document.body.style.height
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.documentElement.style.overflow = 'hidden'

    window.addEventListener('touchmove', preventScroll, { passive: false })

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.body.style.width = originalBodyWidth
      document.body.style.height = originalBodyHeight
      document.documentElement.style.overflow = originalHtmlOverflow
      window.removeEventListener('touchmove', preventScroll)
    }
  }, [])

  // 닉네임 확인 및 네비게이션 로직 (공통 함수)
  const checkNicknameAndNavigate = async (currentUser: any) => {
    // Firestore에서 닉네임 확인
    try {
      const userId = `${currentUser.name}_${currentUser.phone}`
      const userProfileRef = doc(db, 'userProfiles', userId)
      const userProfileSnap = await getDoc(userProfileRef)
      
      const profileData = userProfileSnap.exists() ? userProfileSnap.data() : null
      const hasNickname = profileData?.nickname && profileData.nickname.trim() !== ''
      
      // Firestore에 닉네임이 있으면 바로 대시보드로
      if (hasNickname) {
        // 로컬스토리지도 업데이트
        const updatedUser = { ...currentUser, nickname: profileData.nickname }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        navigate('/dashboard')
      } else {
        // Firestore에 닉네임이 없으면 첫 로그인으로 간주하고 프로필 설정 모달 표시
        console.log('닉네임이 없어서 프로필 설정 모달 표시')
        setShowProfileModal(true)
      }
    } catch (error) {
      // Firestore 연결 실패 시 로컬스토리지 확인
      console.warn('Firestore 닉네임 확인 실패, 로컬스토리지 확인:', error)
      const hasLocalNickname = currentUser?.nickname && currentUser.nickname.trim() !== ''
      if (hasLocalNickname) {
        navigate('/dashboard')
      } else {
        console.log('로컬스토리지에도 닉네임이 없어서 프로필 설정 모달 표시')
        setShowProfileModal(true)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !phone.trim()) {
      setError('이름과 전화번호를 입력해주세요.')
      return
    }

    // 포커스 강제 해제 (iOS 자동 줌 방지)
    const blurActiveElement = () => {
      const el = document.activeElement as HTMLElement | null
      el?.blur?.()
    }

    blurActiveElement()
    window.scrollTo(0, 0)

    // Firestore의 guests 배열 사용 (서버 상태 기반)
    const success = login(name.trim(), phone.trim(), guests)
    if (success) {
      // Firestore에서 티켓 애니메이션 표시 여부 확인
      setTimeout(async () => {
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
        if (!currentUser) {
          setError('사용자 정보를 불러올 수 없습니다.')
          return
        }

        try {
          const userId = `${currentUser.name}_${currentUser.phone}`
          const userProfileRef = doc(db, 'userProfiles', userId)
          const userProfileSnap = await getDoc(userProfileRef)
          
          // 티켓 애니메이션을 이미 본 경우 건너뛰기
          if (userProfileSnap.exists() && userProfileSnap.data().ticketShown) {
            // 티켓 애니메이션 없이 바로 닉네임 확인 로직으로
            checkNicknameAndNavigate(currentUser)
          } else {
            // 티켓 애니메이션 표시
            setShowTicket(true)
          }
        } catch (error) {
          // Firestore 연결 실패 시 티켓 애니메이션 표시 (안전하게)
          console.warn('Firestore 티켓 확인 실패, 티켓 애니메이션 표시:', error)
          setShowTicket(true)
        }
      }, 150)
    } else {
      setError('등록된 정보가 없습니다. 이름과 전화번호를 확인해주세요.')
    }
  }

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setWalkInError('')

    if (!walkInName.trim() || !walkInPhone.trim()) {
      setWalkInError('이름과 전화번호를 입력해주세요.')
      return
    }

    // 포커스 강제 해제 (iOS 자동 줌 방지)
    const blurActiveElement = () => {
      const el = document.activeElement as HTMLElement | null
      el?.blur?.()
    }

    blurActiveElement()
    window.scrollTo(0, 0)

    // 현장 구매자 등록
    const result = addWalkInGuest(walkInName.trim(), walkInPhone.trim())
    
    if (result.success) {
      // 등록 성공 후 새 게스트를 포함한 배열로 로그인 처리
      const newGuest = {
        name: walkInName.trim(),
        phone: walkInPhone.trim().replace(/[-\s()]/g, ''),
        checkedIn: false
      }
      const updatedGuests = [...guests, newGuest]
      
      // 등록 성공 후 바로 로그인 처리
      const loginSuccess = login(walkInName.trim(), walkInPhone.trim(), updatedGuests)
      
      if (loginSuccess) {
        setShowWalkInModal(false)
        setWalkInName('')
        setWalkInPhone('')
        setName(walkInName.trim())
        setPhone(walkInPhone.trim())
        
        // Firestore에서 티켓 애니메이션 표시 여부 확인
        setTimeout(async () => {
          const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
          if (!currentUser) {
            setWalkInError('사용자 정보를 불러올 수 없습니다.')
            return
          }

          try {
            const userId = `${currentUser.name}_${currentUser.phone}`
            const userProfileRef = doc(db, 'userProfiles', userId)
            const userProfileSnap = await getDoc(userProfileRef)
            
            // 티켓 애니메이션을 이미 본 경우 건너뛰기
            if (userProfileSnap.exists() && userProfileSnap.data().ticketShown) {
              // 티켓 애니메이션 없이 바로 닉네임 확인 로직으로
              checkNicknameAndNavigate(currentUser)
            } else {
              // 티켓 애니메이션 표시
              setShowTicket(true)
            }
          } catch (error) {
            // Firestore 연결 실패 시 티켓 애니메이션 표시 (안전하게)
            console.warn('Firestore 티켓 확인 실패, 티켓 애니메이션 표시:', error)
            setShowTicket(true)
          }
        }, 150)
      } else {
        setWalkInError('등록은 완료되었지만 로그인에 실패했습니다. 다시 시도해주세요.')
      }
    } else {
      setWalkInError(result.message || '등록에 실패했습니다.')
    }
  }

  return (
    <div className="login-page">
      {showTicket ? (
        <TicketTransition
          ticketImageUrl="/assets/배경/입장전티켓.png"
          info={{
            name: name,
            date: new Date().toLocaleDateString(),
            seat: 'STANDING',
          }}
          onDone={async () => {
            // 포커스 해제 및 스크롤 초기화
            const el = document.activeElement as HTMLElement | null
            el?.blur?.()
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
            
            // 티켓 애니메이션 숨기기
            setShowTicket(false)
            
            // Firestore에 티켓 애니메이션을 본 기록 저장
            const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
            if (currentUser) {
              try {
                const userId = `${currentUser.name}_${currentUser.phone}`
                const userProfileRef = doc(db, 'userProfiles', userId)
                await setDoc(userProfileRef, {
                  name: currentUser.name,
                  phone: currentUser.phone,
                  ticketShown: true,
                  updatedAt: new Date()
                }, { merge: true })
              } catch (error) {
                console.warn('Firestore 티켓 기록 저장 실패:', error)
              }
            }
            
            // 닉네임 확인 및 네비게이션
            setTimeout(() => {
              if (currentUser) {
                checkNicknameAndNavigate(currentUser)
              } else {
                navigate('/dashboard')
              }
            }, 200)
          }}
        />
      ) : (
        <div className="login-container">
          <div className="login-header">
            <h1>사전 예약자 체크인</h1>
            <p>이름과 전화번호를 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">전화번호</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                autoComplete="tel"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button">
              공연 입장하기
            </button>

            <div className="walk-in-section">
              <div className="divider">
                <span>또는</span>
              </div>
              <button 
                type="button" 
                className="walk-in-button"
                onClick={() => setShowWalkInModal(true)}
              >
                현장 구매
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 현장 구매 모달 */}
      {showWalkInModal && (
        <div className="modal-overlay" onClick={() => {
          setShowWalkInModal(false)
          setWalkInStep('payment')
          setPaymentConfirmed(false)
          setWalkInName('')
          setWalkInPhone('')
          setWalkInError('')
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>현장 구매</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowWalkInModal(false)
                  setWalkInStep('payment')
                  setPaymentConfirmed(false)
                  setWalkInName('')
                  setWalkInPhone('')
                  setWalkInError('')
                }}
              >
                ×
              </button>
            </div>

            {walkInStep === 'payment' ? (
              <div className="walk-in-payment-step">
                <div className="payment-info">
                  <h3>입금 안내</h3>
                  <div className="payment-details">
                    <div className="payment-item">
                      <span className="payment-label">입금 계좌:</span>
                      <span className="payment-value">
                        {bookingInfo?.accountName || '(미설정)'}{' '}
                        {bookingInfo?.bankName && (
                          <span className="bank-name">{bookingInfo.bankName}</span>
                        )}{' '}
                        {bookingInfo?.accountNumber && (
                          <span 
                            className="account-number"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(bookingInfo.accountNumber)
                                alert('계좌번호가 복사되었습니다!')
                              } catch (err) {
                                // 클립보드 API 실패 시 fallback
                                const textArea = document.createElement('textarea')
                                textArea.value = bookingInfo.accountNumber
                                textArea.style.position = 'fixed'
                                textArea.style.opacity = '0'
                                document.body.appendChild(textArea)
                                textArea.select()
                                try {
                                  document.execCommand('copy')
                                  alert('계좌번호가 복사되었습니다!')
                                } catch (e) {
                                  alert('계좌번호 복사에 실패했습니다.')
                                }
                                document.body.removeChild(textArea)
                              }
                            }}
                            title="클릭하여 복사"
                          >
                            {bookingInfo.accountNumber}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="copy-hint">계좌번호를 클릭하면 복사됩니다</p>
                    <div className="payment-item">
                      <span className="payment-label">현장 예매 가격:</span>
                      <span className="payment-value">{bookingInfo?.walkInPrice || '(미설정)'}</span>
                    </div>
                    <div className="payment-item">
                      <span className="payment-label">환불 정책:</span>
                      <span className="payment-value">{bookingInfo?.refundPolicy || '(미설정)'}</span>
                    </div>
                    {bookingInfo?.contactPhone && (
                      <div className="payment-item">
                        <span className="payment-label">문의 전화:</span>
                        <span className="payment-value">{bookingInfo.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="payment-confirm">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={paymentConfirmed}
                      onChange={(e) => setPaymentConfirmed(e.target.checked)}
                      className="payment-checkbox"
                    />
                    <span>입금을 완료했습니다.</span>
                  </label>
                </div>

                {walkInError && <div className="error-message">{walkInError}</div>}

                <button
                  type="button"
                  onClick={() => {
                    if (!paymentConfirmed) {
                      setWalkInError('입금 확인을 체크해주세요.')
                      return
                    }
                    setWalkInStep('info')
                    setWalkInError('')
                  }}
                  className="login-button"
                  disabled={!paymentConfirmed}
                >
                  다음 단계
                </button>
              </div>
            ) : (
              <form onSubmit={handleWalkInSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="walkInName">이름</label>
                  <input
                    type="text"
                    id="walkInName"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="walkInPhone">전화번호</label>
                  <input
                    type="tel"
                    id="walkInPhone"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    autoComplete="tel"
                  />
                </div>

                {walkInError && <div className="error-message">{walkInError}</div>}

                <div className="walk-in-buttons">
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInStep('payment')
                      setWalkInError('')
                    }}
                    className="back-button"
                  >
                    이전
                  </button>
                  <button type="submit" className="login-button">
                    등록하고 입장하기
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 프로필 설정 모달 */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={(e) => {
          // 모달 외부 클릭으로 닫기 방지 (닉네임 설정 필수)
          e.stopPropagation()
        }}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>프로필 설정</h2>
            </div>
            
            <div className="profile-form">
              <p className="profile-description">
                채팅에서 사용할 닉네임을 설정해주세요.
                <br />
                <span className="profile-hint">(나중에 변경할 수 있습니다)</span>
              </p>
              
              <div className="form-group">
                <label htmlFor="nickname">닉네임</label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    setProfileError('')
                  }}
                  placeholder="닉네임을 입력하세요"
                  maxLength={20}
                  autoFocus
                  disabled={isSettingProfile}
                />
                <p className="input-hint">최대 20자까지 입력 가능합니다</p>
              </div>

              {profileError && <div className="error-message">{profileError}</div>}

              <button
                type="button"
                onClick={async () => {
                  if (!nickname.trim()) {
                    setProfileError('닉네임을 입력해주세요.')
                    return
                  }

                  if (nickname.trim().length < 2) {
                    setProfileError('닉네임은 최소 2자 이상이어야 합니다.')
                    return
                  }

                  setIsSettingProfile(true)
                  setProfileError('')

                  try {
                    await saveNickname(nickname.trim())
                    setShowProfileModal(false)
                    setTimeout(() => {
                      navigate('/dashboard')
                    }, 150)
                  } catch (error) {
                    console.error('닉네임 저장 오류:', error)
                    setProfileError('닉네임 저장에 실패했습니다. 다시 시도해주세요.')
                    setIsSettingProfile(false)
                  }
                }}
                className="login-button"
                disabled={isSettingProfile || !nickname.trim()}
              >
                {isSettingProfile ? '저장 중...' : '완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login

