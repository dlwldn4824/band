import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import TicketTransition from '../components/TicketTransition'
import ticketDemoImage from '../assets/배경/티켓데모.png'
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
  const { login } = useAuth()
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
      // 키보드가 내려갈 시간을 주고 티켓 표시
      setTimeout(() => {
        setShowTicket(true)
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
        // 키보드가 내려갈 시간을 주고 티켓 표시
        setTimeout(() => {
          setShowTicket(true)
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
          ticketImageUrl={ticketDemoImage}
          info={{
            name: name,
            date: new Date().toLocaleDateString(),
            seat: 'STANDING',
          }}
          onDone={() => {
            // 포커스 해제 및 스크롤 초기화
            const el = document.activeElement as HTMLElement | null
            el?.blur?.()
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
            
            // iOS에서 키보드 내려가는 시간을 주고 이동
            setTimeout(() => {
              navigate('/dashboard')
            }, 150)
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
                    <p className="copy-hint">💡 계좌번호를 클릭하면 복사됩니다</p>
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
    </div>
  )
}

export default Login

