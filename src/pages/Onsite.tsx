import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { QRCodeSVG } from 'qrcode.react'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { normalizePhone, normalizeName } from '../utils/guestUtils'
import { checkGuest, onsitePayment } from '../services/guestsApi'
import './Login.css'
import './Onsite.css'

const Onsite = () => {
  const { bookingInfo } = useData()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showAccount, setShowAccount] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [personalLoginLink, setPersonalLoginLink] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPhoneDuplicateModal, setShowPhoneDuplicateModal] = useState(false)
  const [duplicateGuestName, setDuplicateGuestName] = useState('')

  const handleCheck = async () => {
    if (!name.trim() || !phone.trim()) {
      alert('이름과 전화번호를 입력해주세요.')
      return
    }

    const normalizedPhone = normalizePhone(phone)
    const normalizedName = normalizeName(name)

    const check = await checkGuest(normalizedPhone, normalizedName)
    if (check.exists && check.exactMatch === false && check.name) {
      const existingName = normalizeName(check.name)
      if (existingName !== normalizedName) {
        setDuplicateGuestName(existingName)
        setShowPhoneDuplicateModal(true)
        return
      }
    }

    setShowAccount(true)
  }

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
      const normalizedPhone = normalizePhone(phone)
      const normalizedName = normalizeName(name)

      const result = await onsitePayment({ name: normalizedName, phone: normalizedPhone })
      if (!result.success) {
        alert(result.message || '결제 처리에 실패했습니다.')
        return
      }

      const combinedData = `${normalizedName}|${normalizedPhone}`
      const base64Token = btoa(encodeURIComponent(combinedData))
      const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      const loginLink = `${window.location.origin}/t/${urlSafeToken}`

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
    const bankName = bookingInfo?.bankName || '카카오뱅크'
    const accountNumber = bookingInfo?.accountNumber || '3333254015574'
    const accountName = bookingInfo?.accountName || '이지우'
    const walkInPrice = bookingInfo?.walkInPrice || '6천원'

    const copyAccountNumber = async () => {
      if (!accountNumber) return
      try {
        await navigator.clipboard.writeText(accountNumber)
        alert('계좌번호가 복사되었습니다!')
      } catch {
        const textArea = document.createElement('textarea')
        textArea.value = accountNumber
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          alert('계좌번호가 복사되었습니다!')
        } catch {
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
        <form onSubmit={(e) => { e.preventDefault(); void handleCheck(); }} className="login-form">
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
