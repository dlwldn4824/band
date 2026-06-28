import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { QRCodeSVG } from 'qrcode.react'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { getGuestsStorageKey } from '../config/firestorePaths'
import './Login.css'
import './Onsite.css'

const Onsite = () => {
  const { bookingInfo, guests, addWalkInGuest, updateGuest } = useData()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showAccount, setShowAccount] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [personalLoginLink, setPersonalLoginLink] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPhoneDuplicateModal, setShowPhoneDuplicateModal] = useState(false)
  const [duplicateGuestName, setDuplicateGuestName] = useState('')

  const handleCheck = () => {
    if (!name.trim() || !phone.trim()) {
      alert('이름과 전화번호를 입력해주세요.')
      return
    }
    
    // 전화번호 정규화
    const normalizedPhone = phone.trim().replace(/\D/g, '')
    const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
    const normalizedName = name.trim()
    
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
    
    setShowAccount(true)
  }
  
  // 전화번호 중복 확인 후 계속하기
  const handleContinueWithDuplicatePhone = () => {
    setShowPhoneDuplicateModal(false)
    setShowAccount(true)
  }

  const handlePaymentComplete = async () => {
    if (!name.trim() || !phone.trim()) {
      alert('이름과 전화번호를 입력해주세요.')
      return
    }

    setIsProcessing(true)

    try {
      const normalizedPhone = phone.replace(/\D/g, '')
      const normalizedName = name.trim()

      // 이미 등록된 게스트인지 확인
      const normalizedPhoneForCompare = normalizedPhone.replace(/[-\s()]/g, '')
      const existingGuest = guests.find((guest) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
        return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
      })

      let guestIndex = -1
      let updatedGuestList = [...guests]

      if (existingGuest) {
        // 기존 게스트인 경우 인덱스 찾기
        guestIndex = guests.findIndex((guest) => {
          const guestName = guest.name || guest['이름'] || guest.Name || ''
          const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
          return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
        })

        // 기존 게스트의 입금 확인 상태 업데이트
        if (guestIndex >= 0) {
          updatedGuestList[guestIndex] = {
            ...updatedGuestList[guestIndex],
            paymentConfirmed: true,
            paymentConfirmedAt: Date.now()
          }
          // DataContext의 updateGuest를 사용하여 업데이트
          updateGuest(guestIndex, updatedGuestList[guestIndex])
        }
      } else {
        // 새로운 게스트 등록 (현장 예매이므로 isWalkIn: true)
        const result = addWalkInGuest(normalizedName, normalizedPhone, true, '', {
          source: 'onsite',
        })
        const addResult = await result
        if (!addResult.success) {
          alert(addResult.message || '게스트 등록에 실패했습니다.')
          setIsProcessing(false)
          return
        }

        // 방금 추가된 게스트의 인덱스 찾기
        const updatedGuests = JSON.parse(localStorage.getItem('guests') || '[]')
        guestIndex = updatedGuests.findIndex((guest: any) => {
          const guestName = guest.name || guest['이름'] || guest.Name || ''
          const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
          return guestName.trim() === normalizedName && guestPhone === normalizedPhoneForCompare
        })

        // 새로 추가된 게스트의 입금 확인 상태 업데이트
        if (guestIndex >= 0) {
          updatedGuestList = JSON.parse(localStorage.getItem(getGuestsStorageKey()) || '[]')
          updatedGuestList[guestIndex] = {
            ...updatedGuestList[guestIndex],
            paymentConfirmed: true,
            paymentConfirmedAt: Date.now()
          }
          // DataContext의 updateGuest를 사용하여 업데이트
          updateGuest(guestIndex, updatedGuestList[guestIndex])
        }
      }

      // 개인 로그인 링크 생성 (암호화된 토큰 사용)
      const combinedData = `${normalizedName}|${normalizedPhone}`
      const base64Token = btoa(encodeURIComponent(combinedData))
      // URL-safe base64로 변환 (+ -> -, / -> _, = 제거)
      const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      const baseUrl = window.location.origin
      // 짧은 경로 형식: /t/토큰
      const loginLink = `${baseUrl}/t/${urlSafeToken}`
      
      setPersonalLoginLink(loginLink)
      setShowQR(true)
    } catch (error) {
      console.error('결제 완료 처리 오류:', error)
      alert('결제 완료 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToHome = () => {
    setName('')
    setPhone('')
    setShowAccount(false)
    setShowQR(false)
    setPersonalLoginLink('')
  }


  if (showPhoneDuplicateModal) {
    return (
      <div className="login-page onsite-page">
        <div className="login-container booking-confirmation onsite-container">
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
                setName('')
                setPhone('')
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
      </div>
    )
  }

  if (showQR) {
    return (
      <div className="login-page onsite-page">
        <div className="login-container booking-confirmation onsite-container">
          <div className="confirmation-header">
            <h1>QR 코드</h1>
          </div>
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={personalLoginLink}
              size={300}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="qr-instruction">QR 코드를 스캔하여 접속하세요</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
            <button
              className="booking-confirm-button"
              onClick={handleBackToHome}
              style={{ width: 'auto', flex: '0 1 auto', minWidth: '150px', maxWidth: '200px', marginTop: '1rem', background: '#666666' }}
            >
              돌아가기
            </button>
            <button
              className="booking-confirm-button"
              onClick={handleBackToHome}
              style={{ width: 'auto', flex: '0 1 auto', minWidth: '150px', maxWidth: '200px', marginTop: '1rem' }}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showAccount) {
    // 표시·복사용 계좌 정보 (bookingInfo 없거나 필드 비었을 때 기본값 사용)
    const bankName = bookingInfo?.bankName || '카카오뱅크'
    const accountNumber = bookingInfo?.accountNumber || '3333254015574'
    const accountName = bookingInfo?.accountName || '이지우'
    const walkInPrice = bookingInfo?.walkInPrice || '6천원'

    const copyAccountNumber = async () => {
      if (!accountNumber) return
      try {
        await navigator.clipboard.writeText(accountNumber)
        alert('계좌번호가 복사되었습니다!')
      } catch (err) {
        const textArea = document.createElement('textarea')
        textArea.value = accountNumber
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
      <div className="login-page onsite-page">
        <div className="onsite-account-modal">
          <div className="onsite-account-header">
            <h1>계좌 정보</h1>
          </div>

          {/* 내 정보 섹션 */}
          <div className="onsite-my-info">
            <h3>내 정보</h3>
            <div className="onsite-info-field">
              <span className="onsite-info-label">이름</span>
              <span className="onsite-info-value">{name}</span>
            </div>
            <div className="onsite-info-field">
              <span className="onsite-info-label">연락처</span>
              <span className="onsite-info-value">{formatPhoneDisplay(phone)}</span>
            </div>
          </div>

          {/* 입금 계좌 섹션 - 항상 표시, bookingInfo 없으면 기본값 사용 */}
          <div className="onsite-deposit-account">
            <span className="onsite-deposit-label">입금 계좌</span>
            <div className="onsite-account-info">
              <span
                className="onsite-account-number"
                onClick={copyAccountNumber}
                style={{ cursor: 'pointer' }}
              >
                {bankName} {accountNumber} (예금주: {accountName})
              </span>
              <p className="onsite-copy-hint">*계좌번호를 클릭하시면 복사됩니다</p>
            </div>
            <div className="onsite-payment-amount">
              <span>입금하실 금액: {walkInPrice}</span>
            </div>
          </div>

          {/* 결제완료 버튼 */}
          <button
            className="onsite-payment-complete-button"
            onClick={handlePaymentComplete}
            disabled={isProcessing}
          >
            {isProcessing ? '처리 중...' : '결제완료'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page onsite-page">
      <div className="login-container onsite-container">
        <div className="login-header">
          <h1>현장 예매</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleCheck(); }} className="login-form">
          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              required
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
              required
            />
          </div>
          <button
            type="submit"
            className="login-button"
            disabled={!name.trim() || !phone.trim()}
          >
            확인하기
          </button>
        </form>
      </div>
    </div>
  )
}

export default Onsite

