import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { QRCodeSVG } from 'qrcode.react'
import { setFirestoreData } from '../services/firestoreService'
import { formatPhoneDisplay } from '../utils/phoneFormat'
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

  const handleCheck = () => {
    if (!name.trim() || !phone.trim()) {
      alert('이름과 전화번호를 입력해주세요.')
      return
    }
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
        const result = addWalkInGuest(normalizedName, normalizedPhone, true, '')
        if (!result.success) {
          alert(result.message || '게스트 등록에 실패했습니다.')
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
          updatedGuestList = JSON.parse(localStorage.getItem('guests') || '[]')
          updatedGuestList[guestIndex] = {
            ...updatedGuestList[guestIndex],
            paymentConfirmed: true,
            paymentConfirmedAt: Date.now()
          }
          // DataContext의 updateGuest를 사용하여 업데이트
          updateGuest(guestIndex, updatedGuestList[guestIndex])
        }
      }

      // Firestore의 'guests' 문서 업데이트 (DataContext와 동일한 형식)
      await setFirestoreData('guests' as any, { guests: updatedGuestList }, 'all')

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

  const copyAccountNumber = async () => {
    if (!bookingInfo?.accountNumber) return
    
    try {
      await navigator.clipboard.writeText(bookingInfo.accountNumber)
      alert('계좌번호가 복사되었습니다!')
    } catch (err) {
      // 클립보드 API가 실패한 경우 대체 방법
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
          <button
            className="booking-confirm-button"
            onClick={handleBackToHome}
          >
            현장 결제 홈으로 가기
          </button>
        </div>
      </div>
    )
  }

  if (showAccount) {
    return (
      <div className="login-page onsite-page">
        <div className="login-container booking-confirmation onsite-container">
          <div className="confirmation-header">
            <h1>계좌 정보</h1>
          </div>

          {/* 내 정보 박스 */}
          <div className="info-box">
            <div className="info-box-header">
              <h3>내 정보</h3>
            </div>
            <div className="info-content">
              <div className="info-item">
                <span className="info-label">이름</span>
                <span className="info-value">{name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">연락처</span>
                <span className="info-value">{formatPhoneDisplay(phone)}</span>
              </div>
            </div>
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
                <p className="copy-hint">입금주: {bookingInfo.accountName || '이지우'} 계좌번호를 클릭하면 복사됩니다</p>
              )}
              <div className="payment-item payment-item-row">
                <span className="payment-label">입금하실 금액:</span>
                <span className="payment-amount">{bookingInfo.walkInPrice || '(미설정)'}</span>
              </div>
            </div>
          )}

          <button
            className="booking-confirm-button"
            onClick={handlePaymentComplete}
            disabled={isProcessing}
          >
            {isProcessing ? '처리 중...' : '결제완료'}
          </button>
          <button
            className="back-button"
            onClick={() => setShowAccount(false)}
          >
            뒤로가기
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

