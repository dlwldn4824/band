import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import TicketTransition from '../components/TicketTransition'
import ticketImage from '../assets/배경/티켓_최종.png'
import { validatePhoneNumber, formatPhoneDisplay } from '../utils/phoneFormat'
import './Login.css'

const Login = () => {
  const [showTicket, setShowTicket] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  
  // 예매 폼 상태
  const [bookingName, setBookingName] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [bookingError, setBookingError] = useState('')
  
  // 정보 수정 모드
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')
  const [editedEmail, setEditedEmail] = useState('')
  
  const { login } = useAuth()
  const { guests, addWalkInGuest, updateGuest, bookingInfo } = useData()
  const navigate = useNavigate()
  const location = window.location

  // URL 파라미터에서 토큰 기반 자동 로그인 처리
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const token = searchParams.get('token')

    if (token && guests.length > 0) {
      // 토큰으로 게스트 정보 조회
      const handleTokenLogin = async () => {
        try {
          const tokenRef = doc(db, 'loginTokens', token)
          const tokenSnap = await getDoc(tokenRef)
          
          if (tokenSnap.exists()) {
            const tokenData = tokenSnap.data()
            const name = tokenData.name
            const phone = tokenData.phone
            const expiresAt = tokenData.expiresAt?.toDate()
            
            // 토큰 만료 확인
            if (expiresAt && expiresAt < new Date()) {
              console.warn('토큰이 만료되었습니다.')
              const newUrl = window.location.pathname
              window.history.replaceState({}, '', newUrl)
              return
            }
            
            // 자동 로그인 시도
            const loginSuccess = login(name, phone, guests)
            
            if (loginSuccess) {
              // 로그인 성공 시 대시보드로 이동
              setTimeout(() => {
                navigate('/dashboard')
              }, 200)
              
              // URL에서 토큰 제거
              const newUrl = window.location.pathname
              window.history.replaceState({}, '', newUrl)
            } else {
              // 로그인 실패 시 URL 파라미터 제거
              const newUrl = window.location.pathname
              window.history.replaceState({}, '', newUrl)
            }
          } else {
            // 토큰이 존재하지 않음
            console.warn('유효하지 않은 토큰입니다.')
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
          }
        } catch (error) {
          console.error('토큰 로그인 오류:', error)
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
      
      handleTokenLogin()
    }
  }, [location.search, guests, login, navigate])

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

  // 네비게이션 로직 (닉네임 확인 없이 바로 대시보드로)
  const checkNicknameAndNavigate = async () => {
    navigate('/dashboard')
  }

  // 페이지 로드 시 이미 등록된 게스트인지 확인
  useEffect(() => {
    const checkExistingBooking = async () => {
      // localStorage에서 예매 신청 정보 확인
      const savedBooking = localStorage.getItem('pendingBooking')
      if (savedBooking) {
        try {
          const booking = JSON.parse(savedBooking)
          if (booking.name && booking.phone && booking.email) {
            // Firestore에서 승인 상태 확인
            const normalizedPhone = booking.phone.replace(/\D/g, '')
            const userId = `${booking.name}_${normalizedPhone}`
            const bookingRef = doc(db, 'bookings', userId)
            
            try {
              const bookingSnap = await getDoc(bookingRef)
              if (bookingSnap.exists()) {
                const bookingData = bookingSnap.data()
                // 이미 승인되었다면 로그인 처리
                if (bookingData.approved === true) {
                  const updatedGuests = [...guests]
                  const loginSuccess = login(booking.name, normalizedPhone, updatedGuests)
                  if (loginSuccess) {
                    localStorage.removeItem('pendingBooking')
                    setTimeout(() => {
                      checkNicknameAndNavigate()
                    }, 200)
                    return
                  }
                }
              }
            } catch (error) {
              console.error('Firestore 예매 정보 확인 실패:', error)
            }
            
            // 승인되지 않았거나 예매 정보가 없는 경우 확인 화면 표시
            setBookingName(booking.name)
            setBookingPhone(booking.phone)
            setEditedName(booking.name)
            setEditedPhone(booking.phone)
            setEditedEmail(booking.email)
            setShowBookingConfirmation(true)
          }
        } catch (error) {
          console.error('저장된 예매 정보 로드 실패:', error)
        }
      }
    }
    
    checkExistingBooking()
  }, [guests, login])

  // 예매 신청 승인 상태 확인
  useEffect(() => {
    if (!showBookingConfirmation || !bookingName || !bookingPhone) return

    const userId = `${bookingName}_${bookingPhone.replace(/\D/g, '')}`
    const bookingRef = doc(db, 'bookings', userId)

    const unsubscribe = onSnapshot(bookingRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingData = snapshot.data()
        if (bookingData.approved === true) {
          // 승인 완료 시 로그인 처리
          const normalizedPhone = bookingPhone.replace(/\D/g, '')
          const updatedGuests = [...guests]
          const loginSuccess = login(bookingName, normalizedPhone, updatedGuests)
          
          if (loginSuccess) {
            // localStorage에서 예매 정보 삭제
            localStorage.removeItem('pendingBooking')
            setShowBookingConfirmation(false)
            setTimeout(() => {
              checkNicknameAndNavigate()
            }, 200)
          }
        }
      }
    })

    return () => unsubscribe()
  }, [showBookingConfirmation, bookingName, bookingPhone, guests, login])

  // 예매 신청하기 핸들러
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingError('')

    if (!bookingName.trim() || !bookingPhone.trim() || !bookingEmail.trim()) {
      setBookingError('모든 항목을 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(bookingEmail.trim())) {
      setBookingError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    // 전화번호 검증
    const phoneValidation = validatePhoneNumber(bookingPhone.trim())
    if (!phoneValidation.valid) {
      setBookingError(phoneValidation.message || '전화번호 형식이 올바르지 않습니다.')
      return
    }

    // 포커스 강제 해제 (iOS 자동 줌 방지)
    const blurActiveElement = () => {
      const el = document.activeElement as HTMLElement | null
      el?.blur?.()
    }
    blurActiveElement()
    window.scrollTo(0, 0)

    // 전화번호에서 하이픈 제거하여 저장
    const normalizedPhone = bookingPhone.trim().replace(/\D/g, '')
    
    try {
      // 이미 등록된 게스트인지 확인
      const normalizedName = bookingName.trim()
      const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
      const existingGuest = guests.find((guest) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
        return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
      })

      if (existingGuest) {
        // 입금 확인이 완료된 게스트인 경우 바로 로그인 처리
        if (existingGuest.paymentConfirmed === true) {
          const updatedGuests = [...guests]
          const loginSuccess = login(bookingName.trim(), normalizedPhone, updatedGuests)
          if (loginSuccess) {
            localStorage.removeItem('pendingBooking')
            setTimeout(() => {
              checkNicknameAndNavigate()
            }, 200)
            return
          }
        }
        
        // 이미 등록된 게스트인 경우 Firestore에서 예매 정보 가져오기
        const userId = `${bookingName.trim()}_${normalizedPhone}`
        const bookingRef = doc(db, 'bookings', userId)
        
        try {
          const bookingSnap = await getDoc(bookingRef)
          let savedEmail = bookingEmail.trim()
          
          if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data()
            // Firestore에 저장된 이메일이 있으면 사용
            if (bookingData.email) {
              savedEmail = bookingData.email
            }
            
            // 이미 승인되었다면 로그인 처리
            if (bookingData.approved === true) {
              const updatedGuests = [...guests]
              const loginSuccess = login(bookingName.trim(), normalizedPhone, updatedGuests)
              if (loginSuccess) {
                localStorage.removeItem('pendingBooking')
                setTimeout(() => {
                  checkNicknameAndNavigate()
                }, 200)
                return
              }
            }
          }
          
          // 승인되지 않았거나 예매 정보가 없는 경우 확인 화면 표시
          setBookingName(bookingName.trim())
          setBookingPhone(bookingPhone.trim())
          setEditedName(bookingName.trim())
          setEditedPhone(bookingPhone.trim())
          setEditedEmail(savedEmail)
          
          // localStorage에 예매 정보 저장 (페이지 재접근 시 확인 화면 표시용)
          localStorage.setItem('pendingBooking', JSON.stringify({
            name: bookingName.trim(),
            phone: bookingPhone.trim(),
            email: savedEmail
          }))
          
          // 확인 화면 표시
          setShowBookingConfirmation(true)
          return
        } catch (error) {
          console.error('Firestore 예매 정보 확인 실패:', error)
          setBookingError('예매 정보를 확인하는 중 오류가 발생했습니다. 다시 시도해주세요.')
          return
        }
      }

      // 새로운 게스트인 경우 예매 신청 처리
      // Firestore에 예매 신청 정보 저장
      const userId = `${bookingName.trim()}_${normalizedPhone}`
      const bookingRef = doc(db, 'bookings', userId)
      
      await setDoc(bookingRef, {
        name: bookingName.trim(),
        phone: normalizedPhone,
        email: bookingEmail.trim(),
        approved: false, // 관리자 승인 전까지 false
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true })

      // 사전 예약 등록 (입금 확인 대기 상태이므로 isWalkIn: false)
      const result = addWalkInGuest(bookingName.trim(), normalizedPhone, false, bookingEmail.trim())
      
      if (result.success) {
        // 정보 수정용 상태 설정
        setEditedName(bookingName.trim())
        setEditedPhone(bookingPhone.trim())
        setEditedEmail(bookingEmail.trim())
        
        // localStorage에 예매 정보 저장 (페이지 재접근 시 확인 화면 표시용)
        localStorage.setItem('pendingBooking', JSON.stringify({
          name: bookingName.trim(),
          phone: bookingPhone.trim(),
          email: bookingEmail.trim()
        }))
        
        // 확인 화면 표시
        setShowBookingConfirmation(true)
      } else {
        setBookingError(result.message || '등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('예매 신청 처리 오류:', error)
      setBookingError('예매 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  // 정보 수정 핸들러
  const handleInfoUpdate = async () => {
    if (isUpdatingInfo) return // 이미 업데이트 중이면 무시
    
    if (!editedName.trim() || !editedPhone.trim() || !editedEmail.trim()) {
      setBookingError('모든 항목을 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editedEmail.trim())) {
      setBookingError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    // 전화번호 검증
    const phoneValidation = validatePhoneNumber(editedPhone.trim())
    if (!phoneValidation.valid) {
      setBookingError(phoneValidation.message || '전화번호 형식이 올바르지 않습니다.')
      return
    }

    setIsUpdatingInfo(true)
    setBookingError('')

    try {
      const normalizedPhone = editedPhone.trim().replace(/\D/g, '')
      const updatedName = editedName.trim()
      const updatedEmail = editedEmail.trim()
      
      // 원래 이름과 전화번호 (게스트 찾기용)
      const originalNormalizedPhone = bookingPhone.trim().replace(/\D/g, '').replace(/[-\s()]/g, '')
      const originalName = bookingName.trim()
      
      // Firestore bookings 업데이트 (새로운 userId로)
      const newUserId = `${updatedName}_${normalizedPhone}`
      const bookingRef = doc(db, 'bookings', newUserId)
      
      // 기존 booking이 있으면 삭제하고 새로 생성 (이름이나 전화번호가 변경된 경우)
      if (originalName !== updatedName || originalNormalizedPhone !== normalizedPhone) {
        const oldUserId = `${originalName}_${originalNormalizedPhone}`
        const oldBookingRef = doc(db, 'bookings', oldUserId)
        try {
          const oldBookingSnap = await getDoc(oldBookingRef)
          if (oldBookingSnap.exists()) {
            // 기존 booking 데이터 가져오기
            const oldBookingData = oldBookingSnap.data()
            // 새 booking에 기존 데이터 병합
            await setDoc(bookingRef, {
              ...oldBookingData,
              name: updatedName,
              phone: normalizedPhone,
              email: updatedEmail,
              updatedAt: new Date()
            }, { merge: true })
            // 기존 booking 삭제
            await setDoc(oldBookingRef, { deleted: true }, { merge: true })
          } else {
            // 기존 booking이 없으면 새로 생성
            await setDoc(bookingRef, {
              name: updatedName,
              phone: normalizedPhone,
              email: updatedEmail,
              approved: false,
              createdAt: new Date(),
              updatedAt: new Date()
            }, { merge: true })
          }
        } catch (error) {
          console.warn('기존 booking 처리 오류:', error)
          // 오류가 나도 새 booking은 생성
          await setDoc(bookingRef, {
            name: updatedName,
            phone: normalizedPhone,
            email: updatedEmail,
            updatedAt: new Date()
          }, { merge: true })
        }
      } else {
        // 이름과 전화번호가 같으면 그냥 업데이트
        await setDoc(bookingRef, {
          name: updatedName,
          phone: normalizedPhone,
          email: updatedEmail,
          updatedAt: new Date()
        }, { merge: true })
      }

      // 게스트 리스트에서 기존 게스트 찾기 (원래 이름과 전화번호로)
      const guestIndex = guests.findIndex((guest) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
        return guestName.trim() === originalName && guestPhone === originalNormalizedPhone
      })

      // 게스트 리스트 업데이트
      if (guestIndex !== -1) {
        const updatedGuest = {
          ...guests[guestIndex],
          name: updatedName,
          phone: normalizedPhone,
          '이름': updatedName,
          '전화번호': normalizedPhone,
          Name: updatedName,
          Phone: normalizedPhone,
          email: updatedEmail
        }
        updateGuest(guestIndex, updatedGuest)
      }

      // 상태 업데이트
      setBookingName(updatedName)
      setBookingPhone(editedPhone.trim()) // 하이픈 포함된 형태 유지
      setBookingEmail(updatedEmail)
      
      // localStorage의 pendingBooking도 업데이트 (새로고침 시 수정된 정보 유지)
      localStorage.setItem('pendingBooking', JSON.stringify({
        name: updatedName,
        phone: editedPhone.trim(), // 하이픈 포함된 형태 유지
        email: updatedEmail
      }))
      
      setIsEditingInfo(false)
      setBookingError('')
    } catch (error) {
      console.error('정보 수정 실패:', error)
      setBookingError('정보 수정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsUpdatingInfo(false)
    }
  }

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    if (!bookingInfo?.accountNumber) return
    
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
  }

  return (
    <div className="login-page">
      {showBookingConfirmation ? (
        <div className="login-container booking-confirmation">
          <button 
            className="booking-close-button"
            onClick={() => {
              setShowBookingConfirmation(false)
              setBookingName('')
              setBookingPhone('')
              setBookingEmail('')
              setEditedName('')
              setEditedPhone('')
              setEditedEmail('')
              setBookingError('')
              localStorage.removeItem('pendingBooking')
            }}
            aria-label="닫기"
          >
          </button>
          <div className="confirmation-header">
            <h1>신청이 완료되었습니다!</h1>
          </div>

          {/* 내 정보 박스 */}
          <div className="info-box">
            <div className="info-box-header">
              <h3>내 정보</h3>
              <button 
                className="edit-info-button"
                onClick={() => {
                  if (isEditingInfo) {
                    handleInfoUpdate()
                  } else {
                    setIsEditingInfo(true)
                    setEditedName(bookingName)
                    setEditedPhone(bookingPhone)
                    setEditedEmail(bookingEmail)
                  }
                }}
                disabled={isUpdatingInfo}
              >
                {isUpdatingInfo ? '저장 중...' : (isEditingInfo ? '저장' : '내 정보 확인/수정')}
              </button>
            </div>
            
            {isEditingInfo ? (
              <div className="info-edit-form">
                <div className="form-group">
                  <label>이름</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="이름"
                  />
                </div>
                <div className="form-group">
                  <label>연락처</label>
                  <input
                    type="tel"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    maxLength={13}
                  />
                </div>
                <div className="form-group">
                  <label>이메일</label>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <button 
                  className="cancel-edit-button"
                  onClick={() => setIsEditingInfo(false)}
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="info-content">
                <div className="info-item">
                  <span className="info-label">이름</span>
                  <span className="info-value">{bookingName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">연락처</span>
                  <span className="info-value">{formatPhoneDisplay(bookingPhone)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">이메일</span>
                  <span className="info-value">{bookingEmail}</span>
                </div>
              </div>
            )}
            
            {!isEditingInfo && (
              <p className="info-notice">
                입금 전에 정보가 맞는지 확인해주세요. 수정 시 기존 예약이 업데이트됩니다.
              </p>
            )}
          </div>

          {/* 결제 정보 박스 */}
          {bookingInfo && (
            <div className="payment-box">
              <div className="payment-item payment-item-row">
                <span className="payment-label">입금 계좌:</span>
                <div className="payment-value account-info-row">
                  {bookingInfo.bankName && (
                    <span className="bank-name">{bookingInfo.bankName}</span>
                  )}
                  {bookingInfo.accountNumber && (
                    <span 
                      className="account-number"
                      onClick={copyAccountNumber}
                      title="클릭하여 복사"
                      style={{ cursor: 'pointer' }}
                    >
                      {bookingInfo.accountNumber}
                    </span>
                  )}
                  {!bookingInfo.bankName && !bookingInfo.accountNumber && (
                    <span>(미설정)</span>
                  )}
                </div>
              </div>
              {bookingInfo.accountNumber && (
                <p className="copy-hint">입금주: 이지우 계좌번호를 클릭하면 복사됩니다</p>
              )}
              <div className="payment-item payment-item-row">
                <span className="payment-label">입금하실 금액:</span>
                <span className="payment-amount">{bookingInfo.walkInPrice || '(미설정)'}</span>
              </div>
            </div>
          )}

          {/* 안내 문구 */}
          <div className="instructions">
            <p>위 계좌로 10분 이내에 입금해 주세요.</p>
            <p>시스템이 입금을 확인하면 자동으로 이메일로 티켓을 보내드립니다. 이메일이 보이지 않으면 메일함에서 dlwldn4824@naver.com을 검색해 주세요.</p>
            <p className="important-notice">
              반드시 신청하신 "{bookingName}" 입금자명으로 입금해 주세요.
            </p>
          </div>

          {bookingError && <div className="error-message">{bookingError}</div>}
        </div>
      ) : showTicket ? (
        <TicketTransition
          ticketImageUrl={ticketImage}
          info={{
            name: bookingName || '',
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
            
            // 네비게이션
            setTimeout(() => {
              checkNicknameAndNavigate()
            }, 200)
          }}
        />
      ) : (
        <div className="login-container">
          <div className="login-header">
            <h1>공연 예매하기</h1>
            <p>입력하신 이메일로 안내가 전송되니<br/> 정확히 작성해 주세요.</p>
          </div>

          <form onSubmit={handleBookingSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="bookingName">성함 (입금자명)</label>
                <input
                  type="text"
                  id="bookingName"
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="예: 홍길동"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bookingPhone">연락처</label>
                <input
                  type="tel"
                  id="bookingPhone"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="예: 01012345678"
                  autoComplete="tel"
                  maxLength={13}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bookingEmail">이메일</label>
                <input
                  type="email"
                  id="bookingEmail"
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  placeholder="예: user@example.com"
                  autoComplete="email"
                />
              </div>

              {bookingError && <div className="error-message">{bookingError}</div>}

              <button type="submit" className="login-button">
                예매 신청하기
              </button>
          </form>

          {/* 운영자 로그인 링크 */}
          <div className="admin-login-link" style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/admin/login" className="admin-login-text">
              운영자 로그인 &gt;
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}

export default Login

