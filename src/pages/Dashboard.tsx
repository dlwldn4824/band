import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Events from '../components/Events'
import QRScanner from '../components/QRScanner'
import ticketImage from '../assets/배경/티켓_최종.png'
import editIcon from '../assets/배경/수정아이콘.png'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import './Dashboard.css'

const Dashboard = () => {
  // ✅ 모든 Hook은 최상단에서 조건 없이 호출
  const { user, updateUser, setNickname, isAdmin, adminName, isLoading } = useAuth()
  const { performanceData, checkInGuest, guests, lastCheckedInGuest } = useData()
  const [showScanner, setShowScanner] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<'loading' | 'notYet' | 'done'>('loading')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nickname, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
  const [checkInNotification, setCheckInNotification] = useState<{ name: string; timestamp: number } | null>(null)
  const [showGuestList, setShowGuestList] = useState(false)
  const navigate = useNavigate()

  // ✅ Hook 호출 완료 후 조건부 return
  // 인증 로딩 중일 때는 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="dashboard">
        <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  // 디버깅: 컴포넌트 렌더링 상태 로그
  useEffect(() => {
    console.log('=== Dashboard 렌더링 상태 ===')
    console.log('user:', user)
    console.log('isAdmin:', isAdmin)
    console.log('adminName:', adminName)
    console.log('performanceData:', performanceData)
    console.log('performanceData?.events:', performanceData?.events)
    console.log('performanceData?.events?.length:', performanceData?.events?.length)
    console.log('guests.length:', guests.length)
    console.log('checkInStatus:', checkInStatus)
    console.log('============================')
  }, [user, isAdmin, adminName, performanceData, guests.length, checkInStatus])

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
    console.log('[체크인 상태 확인] 시작')
    console.log('[체크인 상태 확인] user:', user)
    console.log('[체크인 상태 확인] guests.length:', guests.length)
    
    if (!user) {
      console.log('[체크인 상태 확인] user가 없음 → notYet')
      setCheckInStatus('notYet')
      return
    }

    // guests가 아직 로드되지 않았으면 대기
    if (guests.length === 0) {
      console.log('[체크인 상태 확인] guests가 비어있음 → loading')
      setCheckInStatus('loading')
      return
    }

    console.log('[체크인 상태 확인] 체크인 상태 확인 중...')
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
      console.log('[체크인 상태 확인] 체크인 완료:', foundGuest)
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
      console.log('[체크인 상태 확인] 체크인 안 됨:', foundGuest ? '게스트는 찾았지만 체크인 안 됨' : '게스트를 찾지 못함')
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

  // 체크인 알림 표시 (admin 권한이 있을 때만)
  useEffect(() => {
    // admin 권한이 있을 때만 알림 표시
    if (!isAdmin) {
      setCheckInNotification(null)
      return
    }

    if (lastCheckedInGuest) {
      // 이전 알림과 다른 게스트인지 확인 (중복 방지)
      if (checkInNotification?.name !== lastCheckedInGuest.name || 
          checkInNotification?.timestamp !== lastCheckedInGuest.timestamp) {
        setCheckInNotification({
          name: lastCheckedInGuest.name,
          timestamp: lastCheckedInGuest.timestamp
        })
        
        // 5초 후 알림 자동 제거
        const timer = setTimeout(() => {
          setCheckInNotification(null)
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [lastCheckedInGuest, checkInNotification, isAdmin])

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

  // 렌더링 조건 디버깅
  const shouldShowEvents = performanceData?.events && performanceData.events.length > 0
  const shouldShowEmptyState = !performanceData
  
  console.log('[렌더링 조건] shouldShowEvents:', shouldShowEvents)
  console.log('[렌더링 조건] shouldShowEmptyState:', shouldShowEmptyState)
  console.log('[렌더링 조건] performanceData 존재:', !!performanceData)
  console.log('[렌더링 조건] performanceData?.events 존재:', !!performanceData?.events)

  return (
    <div className="dashboard">
      {/* 체크인 알림 (admin 권한이 있을 때만 표시) */}
      {isAdmin && checkInNotification && (
        <div className="checkin-notification">
          <div className="checkin-notification-content">
            <span className="checkin-notification-icon">🎉</span>
            <span className="checkin-notification-text">
              {checkInNotification.name}님이 현장 체크인 하셨습니다
            </span>
            <button 
              className="checkin-notification-close"
              onClick={() => setCheckInNotification(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="dashboard-header">
        <div>
          <h1>안녕하세요, {isAdmin ? adminName : user?.name}님!</h1>
          <p>{isAdmin ? '운영진 대시보드' : '내 티켓과 이벤트 정보를 확인하세요'}</p>
          {isAdmin && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#D88676', color: 'white', borderRadius: '8px', fontSize: '0.9rem' }}>
              운영진 모드
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
                    <img src={editIcon} alt="수정" className="edit-icon" />
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
                    <img src={editIcon} alt="수정" className="edit-icon" />
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


        {checkInStatus === 'notYet' && user && !isAdmin && (
          <section className="dashboard-section">
            <div className="checkin-card">
              <h3>현장 체크인</h3>
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
                <button
                  onClick={() => setShowGuestList(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#D88676',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#C57464'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#D88676'}
                >
                  👥 게스트 입장 여부 확인하기
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 게스트 리스트 모달 */}
        {isAdmin && showGuestList && (
          <div 
            className="guest-list-modal-overlay"
            onClick={() => setShowGuestList(false)}
          >
            <div 
              className="guest-list-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="guest-list-modal-header">
                <h2>게스트 입장 여부</h2>
                <button
                  className="guest-list-modal-close"
                  onClick={() => setShowGuestList(false)}
                >
                  ✕
                </button>
              </div>
              <div className="guest-list-modal-content">
                {guests.length > 0 ? (
                  <div className="guest-list-table">
                    <table>
                      <thead>
                        <tr>
                          <th>번호</th>
                          <th>이름</th>
                          <th>전화번호</th>
                          <th>예매 유형</th>
                          <th>입금 확인</th>
                          <th>입장 여부</th>
                          <th>입장 번호</th>
                          <th>체크인 시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guests.map((guest, index) => {
                          const guestName = guest.name || guest['이름'] || guest.Name || ''
                          const guestPhoneRaw = guest.phone || guest['전화번호'] || guest.Phone || ''
                          const guestPhone = formatPhoneDisplay(guestPhoneRaw)
                          const isWalkIn = guest.isWalkIn === true
                          return (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{guestName}</td>
                              <td>{guestPhone}</td>
                              <td>
                                <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                                  {isWalkIn ? '현장 예매' : '사전 예매'}
                                </span>
                              </td>
                              <td>
                                {isWalkIn ? (
                                  <span className={guest.paymentConfirmed ? 'payment-confirmed' : 'payment-pending'}>
                                    {guest.paymentConfirmed ? '✅ 확인완료' : '⏳ 대기중'}
                                  </span>
                                ) : (
                                  <span className="not-applicable">-</span>
                                )}
                              </td>
                              <td>
                                <span className={guest.checkedIn ? 'checked-in' : 'not-checked-in'}>
                                  {guest.checkedIn ? '✅ 입장 완료' : '❌ 미입장'}
                                </span>
                              </td>
                              <td>{guest.entryNumber ? `${guest.entryNumber}번` : '-'}</td>
                              <td>
                                {guest.checkedInAt 
                                  ? new Date(guest.checkedInAt).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false
                                    })
                                  : '-'
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    등록된 게스트가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {(() => {
          console.log('[렌더링] Events 섹션 체크:', {
            hasPerformanceData: !!performanceData,
            hasEvents: !!performanceData?.events,
            eventsLength: performanceData?.events?.length,
            shouldRender: shouldShowEvents
          })
          return null
        })()}
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

        {(() => {
          console.log('[렌더링] Empty State 체크:', {
            hasPerformanceData: !!performanceData,
            shouldRender: shouldShowEmptyState
          })
          return null
        })()}
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

