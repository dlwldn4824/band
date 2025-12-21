import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Events from '../components/Events'
import QRScanner from '../components/QRScanner'
import ticketImage from '../assets/배경/티켓_최종.png'
import './Dashboard.css'

const Dashboard = () => {
  const { user, updateUser, setNickname, isAdmin, adminName } = useAuth()
  const { performanceData, checkInGuest, guests } = useData()
  const [showScanner, setShowScanner] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<'loading' | 'notYet' | 'done'>('loading')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nickname, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
  const navigate = useNavigate()

  // 대시보드 페이지에서는 body 스크롤 허용
  useEffect(() => {
    const originalBodyPosition = document.body.style.position
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    document.body.style.position = 'relative'
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    
    return () => {
      document.body.style.position = originalBodyPosition
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  // Firestore에서 체크인 상태 확인 (서버 상태 기반)
  useEffect(() => {
    if (!user) {
      setCheckInStatus('notYet')
      return
    }

    // guests가 아직 로드되지 않았으면 대기
    if (guests.length === 0) {
      setCheckInStatus('loading')
      return
    }

    setCheckInStatus('loading')
    
    // Firestore의 guests 배열에서 현재 사용자의 체크인 상태 확인
    const normalizedInputPhone = user.phone.replace(/[-\s()]/g, '')
    const normalizedInputName = user.name.trim()
    
    const foundGuest = guests.find((guest) => {
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const nameMatch = guestName.trim() === normalizedInputName
      
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
      const phoneMatch = normalizedGuestPhone === normalizedInputPhone
      
      return nameMatch && phoneMatch
    })

    if (foundGuest && foundGuest.checkedIn) {
      setCheckInStatus('done')
      // localStorage의 user 정보도 서버 상태와 동기화
      if (!user.checkedIn || user.entryNumber !== foundGuest.entryNumber) {
        updateUser({
          ...user,
          checkedIn: true,
          entryNumber: foundGuest.entryNumber,
          checkedInAt: foundGuest.checkedInAt
        })
      }
    } else {
      setCheckInStatus('notYet')
      // 서버에서 체크인 안 된 상태면 localStorage도 업데이트
      if (user.checkedIn) {
        updateUser({
          ...user,
          checkedIn: false,
          entryNumber: undefined,
          checkedInAt: undefined
        })
      }
    }
  }, [user, guests, updateUser])

  const handleScanSuccess = (data: { name: string; phone: string }) => {
    setShowScanner(false)
    const checkInResult = checkInGuest(data.name, data.phone)
    
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
        // 체크인 상태 업데이트 (서버 상태 반영)
        setCheckInStatus('done')
      }
    } else {
      alert(checkInResult.message || '체크인에 실패했습니다.')
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>안녕하세요, {isAdmin ? adminName : user?.name}님!</h1>
          <p>{isAdmin ? '운영진 대시보드' : '내 티켓과 이벤트 정보를 확인하세요'}</p>
          {isAdmin && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#D88676', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}>
              ⚙️ 운영진 모드
            </div>
          )}
          {!isAdmin && (
            <div className="nickname-section">
              {user?.nickname ? (
                <>
                  <span className="nickname-label">채팅 닉네임:</span>
                  <span className="nickname-value">{user.nickname}</span>
                  <button 
                    onClick={() => {
                      setNicknameInput(user.nickname || '')
                      setNicknameError('')
                      setShowNicknameModal(true)
                    }}
                    className="edit-nickname-button"
                  >
                    수정
                  </button>
                </>
              ) : (
                <>
                  <span className="nickname-label">채팅 닉네임이 설정되지 않았습니다</span>
                  <button 
                    onClick={() => {
                      setNicknameInput('')
                      setNicknameError('')
                      setShowNicknameModal(true)
                    }}
                    className="edit-nickname-button"
                  >
                    닉네임 설정
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {!isAdmin && (
          <section className="dashboard-section">
            <div className="ticket-image-section">
              <img 
                src={ticketImage} 
                alt="티켓" 
                className="ticket-image"
              />
              {checkInStatus === 'done' && user?.entryNumber && (
                <div className="ticket-stamp">
                  <div className="ticket-stamp-text">
                    입장번호 {user.entryNumber}번<br />
                    체크인 완료
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {checkInStatus === 'loading' && (
          <section className="dashboard-section">
            <div className="checkin-card">
              <p>체크인 상태 확인 중...</p>
            </div>
          </section>
        )}

        {checkInStatus === 'done' && !isAdmin && (
          <section className="dashboard-section">
            <div className="checkin-card">
              <h3>체크인 완료</h3>
              <p>입장 번호: {user?.entryNumber}번</p>
            </div>
          </section>
        )}

        {checkInStatus === 'notYet' && user && !isAdmin && (
          <section className="dashboard-section">
            <div className="checkin-card">
              <h3>햔장 체크인</h3>
              <p>공연장 도착 후 반드시 QR 코드 또는 현장 코드를 통해 체크인해 주세요.
              체크인 완료 시에만 입장 팔찌 수령 및 이벤트 참여가 가능합니다.</p>
              <div className="checkin-buttons">
                <button onClick={() => setShowScanner(true)} className="camera-button">
                  QR 촬영하기
                </button>
                <button onClick={() => navigate('/checkin')} className="code-entry-button">
                  현장 코드로 입장하기
                </button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="dashboard-section">
            <div className="checkin-card" style={{ background: '#f0f0f0', border: '2px solid #D88676' }}>
              <h3>⚙️ 운영진 전용 기능</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>현재 통계</p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>총 게스트: {guests.length}명</p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                    체크인 완료: {guests.filter(g => g.checkedIn).length}명
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {performanceData?.events && performanceData.events.length > 0 && (
          <section className="dashboard-section">
            <Events events={performanceData.events} />
          </section>
        )}

        <section className="dashboard-section">
          <div className="poster-section">
            <img 
              src="/assets/배경/최종_포스터.PNG" 
              alt="공연 포스터" 
              className="poster-image"
            />
          </div>
        </section>

        {!performanceData && (
          <div className="empty-state">
            <p>공연 정보가 아직 설정되지 않았습니다.</p>
            <p>관리자 페이지에서 공연 정보를 설정해주세요.</p>
          </div>
        )}
      </div>

      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 닉네임 수정 모달 */}
      {showNicknameModal && (
        <div className="modal-overlay" onClick={() => setShowNicknameModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{user?.nickname ? '닉네임 수정' : '닉네임 설정'}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowNicknameModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="profile-form">
              <p className="profile-description">
                채팅에서 사용할 닉네임을 수정해주세요.
              </p>
              
              <div className="form-group">
                <label htmlFor="edit-nickname">닉네임</label>
                <input
                  type="text"
                  id="edit-nickname"
                  value={nickname}
                  onChange={(e) => {
                    setNicknameInput(e.target.value)
                    setNicknameError('')
                  }}
                  placeholder="닉네임을 입력하세요"
                  maxLength={20}
                  autoFocus
                  disabled={isUpdatingNickname}
                />
                <p className="input-hint">최대 20자까지 입력 가능합니다</p>
              </div>

              {nicknameError && <div className="error-message">{nicknameError}</div>}

              <button
                type="button"
                onClick={async () => {
                  if (!nickname.trim()) {
                    setNicknameError('닉네임을 입력해주세요.')
                    return
                  }

                  if (nickname.trim().length < 2) {
                    setNicknameError('닉네임은 최소 2자 이상이어야 합니다.')
                    return
                  }

                  setIsUpdatingNickname(true)
                  setNicknameError('')

                  try {
                    await setNickname(nickname.trim())
                    setShowNicknameModal(false)
                    setNicknameInput('')
                  } catch (error) {
                    console.error('닉네임 저장 오류:', error)
                    setNicknameError('닉네임 저장에 실패했습니다. 다시 시도해주세요.')
                    setIsUpdatingNickname(false)
                  }
                }}
                className="login-button"
                disabled={isUpdatingNickname || !nickname.trim()}
              >
                {isUpdatingNickname ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

