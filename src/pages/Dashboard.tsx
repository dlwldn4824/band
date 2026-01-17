import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Events from '../components/Events'
import ticketImage from '../assets/배경/렉사_연합공연_티켓.png'
import editIcon from '../assets/배경/수정_아이콘.png'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import posterImage from '../assets/배경/연합공연_최종포스터.jpeg'
import './Dashboard.css'

const Dashboard = () => {
  // ✅ 모든 Hook은 최상단에서 조건 없이 호출
  const { user, setNickname, isAdmin, adminName, isLoading } = useAuth()
  const { performanceData, guests } = useData()
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nickname, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
  const [showGuestList, setShowGuestList] = useState(false)
  const [userNicknames, setUserNicknames] = useState<Record<string, string>>({}) // userId -> nickname 매핑
  const [adminList, setAdminList] = useState<Array<{ name: string; nickname: string }>>([])
  const [sortBy, setSortBy] = useState<'name' | null>(null)
  const location = useLocation()
  
  // location이 변경될 때마다 리렌더링 트리거
  useEffect(() => {
    // location이 변경되면 컴포넌트가 리렌더링됨
  }, [location.pathname, location.state])

  // ✅ Hook 호출 완료 후 조건부 return
  // 인증 로딩 중일 때는 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="dashboard">
        <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }


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


  // userProfiles에서 닉네임 로드 (admin일 때만)
  useEffect(() => {
    if (!isAdmin) return

    const loadNicknames = async () => {
      try {
        const userProfilesRef = collection(db, 'userProfiles')
        const snapshot = await getDocs(userProfilesRef)
        const nicknameMap: Record<string, string> = {}
        const admins: Array<{ name: string; nickname: string }> = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.nickname && data.nickname.trim() !== '') {
            nicknameMap[doc.id] = data.nickname
          }
          
          // 운영진 정보 수집 (phone이 'admin'인 경우)
          if (data.phone === 'admin' && data.name) {
            admins.push({
              name: data.name,
              nickname: data.nickname || '-'
            })
          }
        })
        
        setUserNicknames(nicknameMap)
        setAdminList(admins)
      } catch (error) {
        console.error('닉네임 로드 오류:', error)
      }
    }

    loadNicknames()
  }, [isAdmin])


  // 렌더링 조건 디버깅

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>안녕하세요, {isAdmin ? adminName : user?.name}님!</h1>
          <p>{isAdmin ? '운영진 대시보드' : '내 티켓과 이벤트 정보를 확인하세요'}</p>
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
                loading="eager"
                decoding="async"
              />
              {user?.entryNumber && (() => {
                const guestInfo = guests.find((g) => {
                  const guestName = g.name || g['이름'] || g.Name || ''
                  const guestPhone = String(g.phone || g['전화번호'] || g.Phone || '').replace(/[-\s()]/g, '')
                  const userName = user.name || ''
                  const userPhone = String(user.phone || '').replace(/[-\s()]/g, '')
                  return guestName === userName && guestPhone === userPhone
                })
                const isWalkIn = guestInfo?.isWalkIn === true
                return (
                  <div className="ticket-entry-stamp">
                    <div className="ticket-entry-stamp-type">{isWalkIn ? '현장예약' : '사전예약'}</div>
                    <div className="ticket-entry-stamp-title">입장번호 {user.entryNumber}번!</div>
                  </div>
                )
              })()}
            </div>
          </section>
        )}




        {isAdmin && (
          <section className="dashboard-section">
            <div className="checkin-card" style={{ background: '#000000', border: '2px solid #444', color: '#ffffff' }}>
              <h3>운영진 전용 기능</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#111', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#fff' }}>현재 통계</p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#fff' }}>총 게스트: {guests.length}명</p>
                </div>
                <button
                  onClick={() => setShowGuestList(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#FF4C4C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#E63E3E'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#FF4C4C'}
                >
                  게스트 리스트 확인하기
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
                <h2>게스트 리스트</h2>
                <button
                  className="guest-list-modal-close"
                  onClick={() => setShowGuestList(false)}
                >
                  ✕
                </button>
              </div>
              <div className="guest-list-modal-content">
                {guests.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSortBy(sortBy === 'name' ? null : 'name')}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: sortBy === 'name' ? '#FF4C4C' : '#f5f5f5',
                          color: sortBy === 'name' ? '#ffffff' : '#333',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: sortBy === 'name' ? '600' : '400'
                        }}
                      >
                        이름 순
                      </button>
                    </div>
                    <div className="guest-list-table">
                      <table>
                        <thead>
                          <tr>
                            <th>번호</th>
                            <th>이름</th>
                            <th>닉네임</th>
                            <th>전화번호</th>
                            <th>예매 유형</th>
                            <th>입금 확인</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let sortedGuests = [...guests]
                            
                            if (sortBy === 'name') {
                              sortedGuests.sort((a, b) => {
                                const nameA = (a.name || a['이름'] || a.Name || '').trim()
                                const nameB = (b.name || b['이름'] || b.Name || '').trim()
                                return nameA.localeCompare(nameB, 'ko')
                              })
                            }
                            
                            return sortedGuests.map((guest, index) => {
                          const guestName = guest.name || guest['이름'] || guest.Name || ''
                          const guestPhoneRaw = guest.phone || guest['전화번호'] || guest.Phone || ''
                          const guestPhone = formatPhoneDisplay(guestPhoneRaw)
                          const isWalkIn = guest.isWalkIn === true
                          // userId 생성 (닉네임 조회용)
                          const userId = `${guestName}_${guestPhoneRaw}`
                          const guestNickname = userNicknames[userId] || '-'
                          return (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{guestName}</td>
                              <td>{guestNickname}</td>
                              <td>{guestPhone}</td>
                              <td>
                                <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                                  {isWalkIn ? '현장 예매' : '사전 예매'}
                                </span>
                              </td>
                              <td>
                                {isWalkIn ? (
                                  <span className={guest.paymentConfirmed ? 'payment-confirmed' : 'payment-pending'}>
                                    {guest.paymentConfirmed ? '확인완료' : '대기중'}
                                  </span>
                                ) : (
                                  <span className="not-applicable">-</span>
                                )}
                              </td>
                            </tr>
                            )
                          })
                        })()}
                          {/* 운영진 정보 표시 (관리자일 때만, 항상 맨 아래) */}
                          {isAdmin && adminList.map((admin, adminIndex) => (
                            <tr key={`admin-${adminIndex}`} style={{ backgroundColor: '#1a1a1a' }}>
                              <td style={{ color: '#ffffff' }}>운영</td>
                              <td style={{ color: '#ffffff' }}>{admin.name}</td>
                              <td style={{ color: '#ffffff' }}>{admin.nickname}</td>
                              <td>-</td>
                              <td>
                                <span className="pre-booking-badge">운영진</span>
                              </td>
                              <td>
                                <span className="not-applicable">-</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    등록된 게스트가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {performanceData?.events && performanceData.events.length > 0 && (
          <section className="dashboard-section">
            <Events events={performanceData.events} />
          </section>
        )}

        <section className="dashboard-section">
          <div className="poster-section">
            <img 
              src={posterImage} 
              alt="공연 포스터" 
              className="poster-image"
              loading="lazy"
              decoding="async"
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
                  } catch (error: any) {
                    console.error('닉네임 저장 오류:', error)
                    // 에러 메시지가 있으면 그대로 표시, 없으면 기본 메시지
                    setNicknameError(error?.message || '닉네임 저장에 실패했습니다. 다시 시도해주세요.')
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

