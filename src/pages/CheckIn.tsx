import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import QRScanner from '../components/QRScanner'
import './CheckIn.css'

const CheckIn = () => {
  const [showScanner, setShowScanner] = useState(false)
  const [result, setResult] = useState<{ success: boolean; entryNumber?: number; message?: string } | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)
  const { checkInGuest, verifyCheckInCode } = useData()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const handleScanSuccess = (data: { name: string; phone: string }) => {
    setShowScanner(false)
    const checkInResult = checkInGuest(data.name, data.phone)
    setResult(checkInResult)
    
    if (checkInResult.success && checkInResult.entryNumber) {
      // 사용자 정보 업데이트
      const guests = JSON.parse(localStorage.getItem('guests') || '[]')
      const normalizedInputPhone = data.phone.replace(/[-\s()]/g, '')
      const normalizedInputName = data.name.trim()
      
      const foundGuest = guests.find((guest: any) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const nameMatch = guestName.trim() === normalizedInputName
        
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
        const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
        const phoneMatch = normalizedGuestPhone === normalizedInputPhone
        
        return nameMatch && phoneMatch
      })

      if (foundGuest) {
        updateUser({
          name: foundGuest.name || foundGuest['이름'] || data.name,
          phone: foundGuest.phone || foundGuest['전화번호'] || data.phone,
          entryNumber: checkInResult.entryNumber,
          checkedIn: true,
          checkedInAt: Date.now()
        })
      }

      // 3초 후 대시보드로 이동
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    }
  }

  const handleManualCheckIn = () => {
    setShowScanner(true)
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (codeInput.length !== 4) {
      setResult({ success: false, message: '4자리 코드를 입력해주세요.' })
      return
    }

    if (!user) {
      setResult({ success: false, message: '로그인이 필요합니다.' })
      setTimeout(() => {
        navigate('/login')
      }, 2000)
      return
    }

    const trimmedCode = codeInput.trim()
    console.log('체크인 시도:', { 입력코드: trimmedCode, 사용자: user.name })
    
    if (verifyCheckInCode(trimmedCode)) {
      // 로그인한 사용자 정보로 체크인 처리
      const checkInResult = checkInGuest(user.name, user.phone)
      setResult(checkInResult)
      
      if (checkInResult.success && checkInResult.entryNumber) {
        // 사용자 정보 업데이트 (서버 상태 반영)
        updateUser({
          ...user,
          entryNumber: checkInResult.entryNumber,
          checkedIn: true,
          checkedInAt: Date.now()
        })

        // 3초 후 대시보드로 이동 (서버 상태가 반영된 후)
        setTimeout(() => {
          navigate('/dashboard')
        }, 3000)
      }
    } else {
      setResult({ success: false, message: '올바른 체크인 코드가 아닙니다.' })
      setCodeInput('')
    }
  }

  return (
    <div className="checkin-page">
      <div className="checkin-container">
        <div className="checkin-header">
          <h1>현장 체크인</h1>
          <p>체크인 방법을 선택해주세요</p>
        </div>

        {result && (
          <div className={`checkin-result ${result.success ? 'success' : 'error'}`}>
            {result.success ? (
              <>
                <div className="result-icon">✓</div>
                <h2>체크인 완료!</h2>
                <p className="entry-number">입장 번호: <strong>{result.entryNumber}번</strong></p>
                <div className="stamp">✓</div>
                <p className="result-message">대시보드로 이동합니다...</p>
              </>
            ) : (
              <>
                <div className="result-icon">✕</div>
                <h2>체크인 실패</h2>
                <p className="result-message">{result.message}</p>
                {result.entryNumber && (
                  <p className="entry-number">입장 번호: <strong>{result.entryNumber}번</strong></p>
                )}
                <button onClick={() => setResult(null)} className="retry-button">
                  다시 시도
                </button>
              </>
            )}
          </div>
        )}

        {!result && !showCodeInput && (
          <div className="checkin-actions">
            <button onClick={handleManualCheckIn} className="checkin-button">
              📷 카메라 켜기
            </button>
            <button onClick={() => setShowCodeInput(true)} className="checkin-button code-button">
              👤 관리자 확인 받기
            </button>
          </div>
        )}

        {showCodeInput && !result && (
          <div className="code-input-section">
            <form onSubmit={handleCodeSubmit} className="code-input-form">
              <label htmlFor="checkin-code" className="code-input-label">
                관리자에게 받은 4자리 체크인 코드를 입력하세요
              </label>
              {user && (
                <p className="code-user-info">
                  체크인 대상: {user.name} ({user.phone})
                </p>
              )}
              <input
                type="text"
                id="checkin-code"
                value={codeInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setCodeInput(value)
                }}
                className="code-input"
                placeholder="0000"
                maxLength={4}
                autoFocus
              />
              <div className="code-input-buttons">
                <button type="submit" className="code-submit-button" disabled={codeInput.length !== 4 || !user}>
                  확인
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCodeInput(false)
                    setCodeInput('')
                    setResult(null)
                  }} 
                  className="code-cancel-button"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {showScanner && (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  )
}

export default CheckIn

