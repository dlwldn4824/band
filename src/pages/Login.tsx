import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import TicketTransition from '../components/TicketTransition'
import ticketImage from '../assets/배경/렉사_연합공연_티켓.png'
import { validatePhoneNumber, formatPhoneDisplay } from '../utils/phoneFormat'
import './Login.css'

const Login = () => {
  const [showTicket, setShowTicket] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  
  // 예매 폼 상태
  const [bookingName, setBookingName] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingInfoConfirmed, setBookingInfoConfirmed] = useState(false)
  
  // 정보 수정 모드
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')
  
  // 전화번호 중복 확인 모달
  const [showPhoneDuplicateModal, setShowPhoneDuplicateModal] = useState(false)
  const [duplicateGuestName, setDuplicateGuestName] = useState('')
  
  const { login } = useAuth()
  const { guests, addWalkInGuest, updateGuest, bookingInfo } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useParams<{ token?: string }>()
  const [isProcessingAutoLogin, setIsProcessingAutoLogin] = useState(false)

  // URL 경로에서 자동 로그인 처리 (암호화된 토큰 기반)
  useEffect(() => {
    // 경로 파라미터에서 토큰 가져오기 (/t/토큰 형식)
    const tokenParam = token

    if (tokenParam && !isProcessingAutoLogin) {
      // base64 디코딩
      const handleAutoLogin = async () => {
        setIsProcessingAutoLogin(true)
        
        try {
          let decodedData: string
          
          try {
            // URL-safe base64 디코딩 (+ -> -, / -> _, = 제거)
            const urlSafeToken = tokenParam.replace(/-/g, '+').replace(/_/g, '/')
            // 패딩 추가
            const paddedToken = urlSafeToken + '='.repeat((4 - urlSafeToken.length % 4) % 4)
            decodedData = decodeURIComponent(atob(paddedToken))
          } catch (e) {
            console.warn('URL 파라미터 디코딩 실패:', e)
            navigate('/login', { replace: true })
            return
          }
          
          // 데이터 형식: "이름|전화번호"
          const parts = decodedData.split('|')
          if (parts.length !== 2) {
            console.warn('잘못된 토큰 형식')
            navigate('/login', { replace: true })
            return
          }
          
          const decodedName = parts[0]
          const decodedPhone = parts[1]
          
          // 전화번호 정규화
          const normalizedPhone = decodedPhone.replace(/\D/g, '')
          
          // guests가 로드될 때까지 대기 (최대 5초)
          let attempts = 0
          const maxAttempts = 50 // 5초 (100ms * 50)
          
          const waitForGuests = () => {
            return new Promise<any[]>((resolve) => {
              const checkGuests = () => {
                attempts++
                
                // localStorage에서 guests 로드 시도
                const savedGuests = localStorage.getItem('guests')
                let guestList: any[] = []
                
                if (savedGuests) {
                  try {
                    guestList = JSON.parse(savedGuests)
                  } catch (e) {
                    console.warn('guests 파싱 실패:', e)
                  }
                }
                
                // guests가 있거나 최대 시도 횟수에 도달하면 종료
                if (guests.length > 0 || guestList.length > 0 || attempts >= maxAttempts) {
                  resolve(guests.length > 0 ? guests : guestList)
                } else {
                  setTimeout(checkGuests, 100)
                }
              }
              checkGuests()
            })
          }
          
          const availableGuests = await waitForGuests()
          console.log('[Login] 자동 로그인 - availableGuests:', availableGuests.length, '명')
          
          if (availableGuests.length === 0) {
            console.error('[Login] 자동 로그인 실패 - guests가 없습니다')
            navigate('/login', { replace: true })
            return
          }
          
          // 자동 로그인 시도
          const loginSuccess = login(decodedName, normalizedPhone, availableGuests)
          console.log('[Login] 자동 로그인 결과:', loginSuccess)
          
          if (loginSuccess) {
            // 로그인 성공 확인
            const loggedInUser = JSON.parse(localStorage.getItem('user') || 'null')
            console.log('[Login] 자동 로그인 성공 - user:', loggedInUser)
            
            // localStorage에서 예매 정보 삭제
            localStorage.removeItem('pendingBooking')
            
            // 로딩 상태 해제 후 티켓 애니메이션 표시
            setIsProcessingAutoLogin(false)
            setBookingName(decodedName)
            // 전화번호 포맷팅
            const formattedPhone = formatPhoneDisplay(decodedPhone)
            setBookingPhone(formattedPhone)
            setShowTicket(true)
          } else {
            console.error('[Login] 자동 로그인 실패 - 게스트를 찾을 수 없습니다')
            setIsProcessingAutoLogin(false)
            navigate('/login', { replace: true })
          }
        } catch (error) {
          console.error('자동 로그인 오류:', error)
          setIsProcessingAutoLogin(false)
          navigate('/login', { replace: true })
        }
      }
      
      handleAutoLogin()
    }
  }, [token, guests, login, navigate, isProcessingAutoLogin])

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

  // 개인 로그인 링크 생성 함수
  const generatePersonalLoginLink = (name: string, phone: string): string => {
    const normalizedPhone = phone.replace(/\D/g, '')
    const combinedData = `${name}|${normalizedPhone}`
    const base64Token = btoa(encodeURIComponent(combinedData))
    const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return urlSafeToken
  }

  // 네비게이션 로직 (닉네임 확인 없이 바로 대시보드로)
  const checkNicknameAndNavigate = async () => {
    console.log('[Login] checkNicknameAndNavigate - token:', token, 'location.pathname:', location.pathname)
    // 개인 링크 토큰이 있으면 개인 링크 URL 유지
    if (token) {
      // 이미 개인 링크 경로에 있으면 navigate 호출하지 않음 (URL 유지)
      const targetPath = `/t/${token}`
      console.log('[Login] checkNicknameAndNavigate - targetPath:', targetPath, 'current:', location.pathname)
      if (location.pathname !== targetPath) {
        console.log('[Login] checkNicknameAndNavigate - navigating to:', targetPath)
        navigate(targetPath, { replace: true })
      } else {
        console.log('[Login] checkNicknameAndNavigate - already on target path, skipping navigate')
      }
    } else {
      // 일반 로그인: 개인 링크 토큰을 생성하여 쿼리 스트링으로 추가
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
      if (currentUser && currentUser.name && currentUser.phone && currentUser.phone !== 'admin') {
        const personalToken = generatePersonalLoginLink(currentUser.name, currentUser.phone)
        const url = `/dashboard?token=${encodeURIComponent(personalToken)}`
        console.log('[Login] checkNicknameAndNavigate - navigating to:', url)
        navigate(url, { replace: true })
      } else {
        // 토큰이 없고 현재 경로가 /dashboard가 아니면 이동
        if (location.pathname !== '/dashboard') {
          console.log('[Login] checkNicknameAndNavigate - navigating to /dashboard')
          navigate('/dashboard')
        } else {
          console.log('[Login] checkNicknameAndNavigate - already on /dashboard, skipping navigate')
        }
      }
    }
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
                    // 티켓 애니메이션 표시
                    setBookingName(booking.name)
                    // 전화번호 포맷팅
                    const formattedPhone = formatPhoneDisplay(booking.phone)
                    setBookingPhone(formattedPhone)
                    setShowTicket(true)
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
            setBookingConfirmed(false)
            setBookingInfoConfirmed(false)
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
            // 티켓 애니메이션 표시
            setShowTicket(true)
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

    if (!bookingName.trim() || !bookingPhone.trim()) {
      setBookingError('모든 항목을 입력해주세요.')
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

    try {
      // 전화번호 정규화
      const normalizedPhone = bookingPhone.trim().replace(/\D/g, '')
      const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
      const normalizedName = bookingName.trim()
      
      // 같은 전화번호로 다른 이름이 이미 등록되어 있는지 확인
      const duplicateGuest = guests.find((guest) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
        // 전화번호는 같지만 이름이 다른 경우
        return guestPhone === normalizedPhoneForCompare && guestName.trim() !== normalizedName
      })
      
      if (duplicateGuest) {
        // 중복된 전화번호 발견 - 확인 모달 표시
        const existingName = duplicateGuest.name || duplicateGuest['이름'] || duplicateGuest.Name || ''
        setDuplicateGuestName(existingName)
        setShowPhoneDuplicateModal(true)
        return
      }
      
      // 이미 등록된 게스트(삭제되지 않은)인지 확인
      const existingGuest = guests.find((guest) => {
        // 삭제된 게스트는 제외
        if (guest.isDeleted === true) {
          return false
        }
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
        return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
      })
      
      // 이미 등록된 게스트면 바로 로그인하고 홈으로 이동 (티켓 애니메이션 없이)
      if (existingGuest) {
        const loginSuccess = login(normalizedName, normalizedPhone, guests)
        if (loginSuccess) {
          // localStorage에서 pendingBooking 제거
          localStorage.removeItem('pendingBooking')
          
          // 로그인 성공 시 홈으로 이동 (약간의 지연을 두어 상태 업데이트 완료 대기)
          setTimeout(() => {
            checkNicknameAndNavigate()
          }, 100)
          return
        }
      }
      
      // 새로운 게스트만 확인 화면 표시
      // 명단 추가는 "확인하고 입장하기" 버튼을 눌렀을 때만 수행
      
      // 정보 수정용 상태 설정
      setEditedName(bookingName.trim())
      setEditedPhone(bookingPhone.trim())
      
      // localStorage에 예매 정보 저장 (페이지 재접근 시 확인 화면 표시용)
      localStorage.setItem('pendingBooking', JSON.stringify({
        name: bookingName.trim(),
        phone: bookingPhone.trim(),
        email: ''
      }))
      
      // 확인 화면 표시
      setBookingConfirmed(false)
      setBookingInfoConfirmed(false)
      setShowBookingConfirmation(true)
    } catch (error) {
      console.error('예매 신청 처리 오류:', error)
      setBookingError('예매 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }
  
  // 전화번호 중복 확인 후 계속하기
  const handleContinueWithDuplicatePhone = () => {
    setShowPhoneDuplicateModal(false)
    
    // 정보 수정용 상태 설정
    setEditedName(bookingName.trim())
    setEditedPhone(bookingPhone.trim())
    
    // localStorage에 예매 정보 저장 (페이지 재접근 시 확인 화면 표시용)
    localStorage.setItem('pendingBooking', JSON.stringify({
      name: bookingName.trim(),
      phone: bookingPhone.trim(),
      email: ''
    }))
    
    // 확인 화면 표시
    setBookingConfirmed(false)
    setBookingInfoConfirmed(false)
    setShowBookingConfirmation(true)
  }

  // 정보 수정 핸들러
  const handleInfoUpdate = async () => {
    if (isUpdatingInfo) return // 이미 업데이트 중이면 무시
    
    if (!editedName.trim() || !editedPhone.trim()) {
      setBookingError('모든 항목을 입력해주세요.')
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
      const updatedEmail = ''
      
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

  // 자동 로그인 처리 중일 때 로딩 화면 표시 (티켓 애니메이션이 표시되지 않을 때만)
  if (isProcessingAutoLogin && !showTicket) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="auto-login-loading">
            <div className="loading-spinner"></div>
            <p className="loading-text">로그인 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      {showPhoneDuplicateModal ? (
        <div className="login-container booking-confirmation">
          <div className="confirmation-header">
            <h1>전화번호 중복 확인</h1>
          </div>
          <div className="info-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
            <p style={{ textAlign: 'center', color: '#fff', margin: 0 }}>
              같은 전화번호 <strong>{duplicateGuestName}</strong> 님이 이미 등록되어 있습니다.<br/>
              계속 예매하시겠습니까?
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
            <button
              className="booking-confirm-button"
              onClick={() => {
                setShowPhoneDuplicateModal(false)
                setBookingName('')
                setBookingPhone('')
                setBookingError('')
              }}
              style={{ width: 'auto', flex: '0 1 auto', minWidth: '150px', maxWidth: '200px', marginTop: '1rem', background: '#666666' }}
            >
              돌아가기
            </button>
            <button
              className="booking-confirm-button"
              onClick={handleContinueWithDuplicatePhone}
              style={{ width: 'auto', flex: '0 1 auto', minWidth: '150px', maxWidth: '200px', marginTop: '1rem' }}
            >
              계속하기
            </button>
          </div>
        </div>
      ) : showBookingConfirmation ? (
        <div className="login-container booking-confirmation">
          <button 
            className="booking-close-button"
            onClick={() => {
              setShowBookingConfirmation(false)
              setBookingName('')
              setBookingPhone('')
              setEditedName('')
              setEditedPhone('')
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
                <span className="payment-amount">
                  {(() => {
                    // 기존 게스트인지 확인 (사전예약인지 현장예매인지)
                    const normalizedPhone = bookingPhone.replace(/[-\s()]/g, '')
                    const existingGuest = guests.find((guest: any) => {
                      const guestName = guest.name || guest['이름'] || guest.Name || ''
                      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
                      return guestName.trim() === bookingName.trim() && guestPhone === normalizedPhone
                    })
                    
                    // 사전예약인 경우 preBookingPrice, 현장예매인 경우 walkInPrice 표시
                    if (existingGuest && existingGuest.isWalkIn === true) {
                      return bookingInfo.walkInPrice || '(미설정)'
                    } else {
                      return bookingInfo.preBookingPrice || bookingInfo.walkInPrice || '(미설정)'
                    }
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* 안내 문구 */}
          <div className="instructions">
            <p>위 계좌로 10분 이내에 입금해 주세요.</p>
            <p className="important-notice">
              반드시 신청하신 "{bookingName}" 입금자명으로 입금해 주세요.
            </p>
          </div>

          <div className="booking-confirm-wrapper">
            <label className="booking-confirm-checkbox-label">
              <input
                type="checkbox"
                className="booking-confirm-checkbox"
                checked={bookingConfirmed}
                onChange={(e) => setBookingConfirmed(e.target.checked)}
              />
              <span>입금 완료 하셨습니까?</span>
            </label>
          </div>

          <div className="booking-confirm-wrapper">
            <label className="booking-confirm-checkbox-label">
              <input
                type="checkbox"
                className="booking-confirm-checkbox"
                checked={bookingInfoConfirmed}
                onChange={(e) => setBookingInfoConfirmed(e.target.checked)}
              />
              <span>예매정보 확인해주세요.<br/>이후로 수정이 불가합니다.</span>
            </label>
          </div>

          <button
            className="booking-confirm-button"
            disabled={!bookingConfirmed || !bookingInfoConfirmed}
            onClick={async () => {
                try {
                  const normalizedPhone = bookingPhone.replace(/\D/g, '')
                  const normalizedName = bookingName.trim()
                  
                  // 기존 게스트인지 확인 (삭제되지 않은 게스트만)
                  const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
                  const existingGuest = guests.find((guest) => {
                    // 삭제된 게스트는 제외
                    if (guest.isDeleted === true) {
                      return false
                    }
                    const guestName = guest.name || guest['이름'] || guest.Name || ''
                    const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
                    return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
                  })

                  // 기존 게스트가 아닌 경우에만 명단에 추가
                  if (!existingGuest) {
                    // Firestore에 예매 신청 정보 저장
                    const userId = `${normalizedName}_${normalizedPhone}`
                    const bookingRef = doc(db, 'bookings', userId)
                    
                    await setDoc(bookingRef, {
                      name: normalizedName,
                      phone: normalizedPhone,
                      email: '',
                      approved: false, // 관리자 승인 전까지 false
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }, { merge: true })

                    // 사전 예약 등록 (입금 확인 대기 상태이므로 isWalkIn: false)
                    const result = addWalkInGuest(normalizedName, normalizedPhone, false, '')
                    
                    if (!result.success) {
                      setBookingError(result.message || '등록에 실패했습니다.')
                      return
                    }
                  }

                  // 로그인 시도
                  const updatedGuests = [...guests]
                  const loginSuccess = login(normalizedName, normalizedPhone, updatedGuests)
                  
                  if (!loginSuccess) {
                    setBookingError('로그인에 실패했습니다. 이름과 전화번호를 확인해주세요.')
                    return
                  }

                  // localStorage에서 pendingBooking 제거
                  localStorage.removeItem('pendingBooking')
                  
                  // 이미 등록된 게스트면 티켓 애니메이션 없이 바로 홈으로 이동
                  if (existingGuest) {
                    setShowBookingConfirmation(false)
                    setTimeout(() => {
                      checkNicknameAndNavigate()
                    }, 100)
                  } else {
                    // 새로운 게스트는 티켓 애니메이션 표시
                    setShowBookingConfirmation(false)
                    setShowTicket(true)
                  }
                } catch (error) {
                  console.error('링크 생성 실패:', error)
                  setBookingError('링크 생성에 실패했습니다. 다시 시도해주세요.')
                }
              }}
            >
              확인하고 입장하기
            </button>

          {bookingError && <div className="error-message">{bookingError}</div>}
        </div>
      ) : showTicket ? (
        <TicketTransition
          ticketImageUrl={ticketImage}
          info={(() => {
            const normalizedPhone = bookingPhone.replace(/\D/g, '')
            const existingGuest = guests.find((g) => {
              const gName = g.name || g['이름'] || g.Name || ''
              const gPhone = String(g.phone || g['전화번호'] || g.Phone || '').replace(/[-\s()]/g, '')
              return gName.trim() === bookingName.trim() && gPhone === normalizedPhone
            })
            console.log('[Login] TicketTransition - existingGuest:', existingGuest)
            console.log('[Login] TicketTransition - entryNumber:', existingGuest?.entryNumber)
            return {
              name: bookingName || '',
              date: new Date().toLocaleDateString(),
              seat: 'STANDING',
              entryNumber: existingGuest?.entryNumber,
              isWalkIn: existingGuest?.isWalkIn === true,
              paymentConfirmed: existingGuest?.paymentConfirmed === true,
            }
          })()}
          onDone={async () => {
            // 포커스 해제 및 스크롤 초기화
            const el = document.activeElement as HTMLElement | null
            el?.blur?.()
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
            
            // 티켓 애니메이션 숨기기
            setShowTicket(false)
            
            // 로그인 상태 확인
            const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
            console.log('[Login] TicketTransition onDone - currentUser:', currentUser)
            console.log('[Login] TicketTransition onDone - bookingName:', bookingName)
            console.log('[Login] TicketTransition onDone - bookingPhone:', bookingPhone)
            
            // 이미 로그인된 상태이거나 로그인 성공 시 대시보드로 이동
            if (currentUser && currentUser.name && currentUser.phone) {
              console.log('[Login] TicketTransition onDone - 이미 로그인됨, 대시보드로 이동')
              localStorage.removeItem('pendingBooking')
              
              // Firestore에 티켓 애니메이션을 본 기록 저장
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
              
              // 대시보드로 이동
              setTimeout(() => {
                checkNicknameAndNavigate()
              }, 100)
            } else {
              console.error('[Login] TicketTransition onDone - 로그인되지 않음, 다시 로그인 시도')
              // 로그인되지 않은 경우 다시 로그인 페이지로
              navigate('/login', { replace: true })
            }
          }}
        />
      ) : (
        <div className="login-container">
          <div className="login-header">
            <h1>공연 예매하기</h1>
            <p>최초 예매 후 해당 페이지에서<br/> 로그인 하시면 웹으로 접속됩니다.</p>
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

              {bookingError && <div className="error-message">{bookingError}</div>}

            <button type="submit" className="login-button">
              공연 입장하기
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

