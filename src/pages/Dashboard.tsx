import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Events from '../components/Events'
import VenueDirections from '../components/VenueDirections'
import ticketImage from '../assets/배경/렉사_연합공연_티켓.png'
import editIcon from '../assets/배경/수정_아이콘.png'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { normalizePhone } from '../utils/guestUtils'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import posterImage from '../assets/배경/연합공연_최종포스터.jpeg'
import Login from './Login'
import './Dashboard.css'
import { trackEvent, useBannerImpression } from '../analytics'

const Dashboard = () => {
  // ✅ 모든 Hook은 최상단에서 조건 없이 호출
  const { user, setNickname, isAdmin, adminName, isLoading } = useAuth()
  const { performanceData, guests, bookingInfo, eventsFeatures } = useData()
  const { token: tokenFromParams } = useParams<{ token?: string }>()
  const [searchParams] = useSearchParams()
  const tokenFromQuery = searchParams.get('token')
  // URL 파라미터의 토큰이 우선, 없으면 쿼리 스트링의 토큰 사용
  const token = tokenFromParams || tokenFromQuery || undefined
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nickname, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
  const [showGuestList, setShowGuestList] = useState(false)
  const [userNicknames, setUserNicknames] = useState<Record<string, string>>({}) // userId -> nickname 매핑
  const [adminList, setAdminList] = useState<Array<{ name: string; nickname: string }>>([])
  const [sortBy, setSortBy] = useState<'name' | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const drinkBannerRef = useRef<HTMLDivElement>(null)
  const paymentBannerTrackedRef = useRef(false)
  useBannerImpression(drinkBannerRef, 'drink_promo', 'dashboard', !!(user && eventsFeatures.drinkPurchase))

  useEffect(() => {
    if (!user || isAdmin || paymentBannerTrackedRef.current) return
    const guestInfo = guests.find((g) => {
      const guestPhone = String(g.phone || g['전화번호'] || g.Phone || '').replace(/[-\s()]/g, '')
      const userPhone = String(user.phone || '').replace(/[-\s()]/g, '')
      return guestPhone === userPhone && guestPhone !== ''
    })
    const isPaymentConfirmed = guestInfo?.paymentConfirmed === true || user.paymentConfirmed === true
    if (!isPaymentConfirmed && bookingInfo?.accountNumber) {
      paymentBannerTrackedRef.current = true
      void trackEvent('banner_impression', {
        banner_id: 'payment_pending',
        placement: 'dashboard',
      })
    }
  }, [user, isAdmin, guests, bookingInfo?.accountNumber])
  
  // localStorage에서 user를 확인하여 로그인 상태 체크 (상태 업데이트 지연 대응)
  const savedUser = localStorage.getItem('user')
  let parsedUser = null
  try {
    if (savedUser && savedUser !== 'null' && savedUser !== '') {
      parsedUser = JSON.parse(savedUser)
    }
  } catch (e) {
    console.warn('[Dashboard] Error parsing savedUser:', e)
  }
  
  const hasUser = user !== null || (parsedUser !== null && parsedUser.name && parsedUser.phone)
  
  // ✅ 모든 Hook은 조건부 return 전에 호출 (Hook 순서 보장)

  useEffect(() => {
    if (!hasUser && isLoading) return
    void trackEvent('dashboard_viewed', {
      has_nickname: !!user?.nickname,
      payment_status: user?.paymentConfirmed === true,
      ticket_received: user?.checkedIn === true,
    })
  }, [])
  
  // 로그인 후 개인 링크 경로 확인
  useEffect(() => {
    // 로그인 되었고 token이 있을 때만 동작
    if (!token || !user) return

    // 쿼리 스트링에서 토큰을 읽은 경우 `/t/:token` 경로로 리다이렉트
    if (tokenFromQuery && location.pathname !== `/t/${token}`) {
      console.log('[Dashboard] Redirecting from query string to personal link path:', `/t/${token}`)
      navigate(`/t/${token}`, { replace: true })
      return
    }

    // URL 파라미터의 토큰이 있고 경로가 맞지 않으면 수정
    if (tokenFromParams && location.pathname !== `/t/${token}`) {
      console.log('[Dashboard] User logged in but pathname is not personal link, current:', location.pathname, 'expected:', `/t/${token}`)
      navigate(`/t/${token}`, { replace: true })
      return
    }
  }, [token, tokenFromQuery, tokenFromParams, user, location.pathname, navigate])

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

  // ✅ 이제부터 조건부 return (모든 Hook 호출 완료 후)
  
  // 인증 로딩 중일 때는 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="dashboard">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>로딩 중...</div>
      </div>
    )
  }
  
  // 개인 링크 토큰이 있고 아직 로그인되지 않았으면 Login 컴포넌트 렌더링
  // 단, localStorage에 user가 있으면 로그인된 것으로 간주하여 Dashboard 표시
  if (token && !hasUser) {
    console.log('[Dashboard] Rendering Login component - token:', token, 'user:', user, 'savedUser:', savedUser, 'parsedUser:', parsedUser, 'hasUser:', hasUser, 'pathname:', location.pathname)
    return <Login />
  }
  
  // 사용자가 없고 토큰도 없으면 로그인 페이지로 리다이렉트
  if (!hasUser && !token) {
    return (
      <div className="dashboard">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          로그인이 필요합니다. 잠시 후 로그인 페이지로 이동합니다...
        </div>
      </div>
    )
  }
  
  // hasUser가 true이면 Dashboard 렌더링 계속

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
          
          {/* 주류 홍보 문구 및 개인 접속 링크 */}
          {user && (
            <div style={{ marginTop: '1.5rem', width: '90%', maxWidth: '90%', marginLeft: 'auto', marginRight: 'auto' }}>
              {/* 주류 홍보 문구 */}
              {eventsFeatures.drinkPurchase && (
              <div 
                ref={drinkBannerRef}
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #FF4C4C 0%, #E63E3E 100%)',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(255, 76, 76, 0.3)',
                  width: '100%'
                }}
                onClick={() => {
                  void trackEvent('cta_clicked', {
                    cta_name: 'drink_banner',
                    source_page: '/dashboard',
                    banner_id: 'drink_promo',
                    placement: 'dashboard',
                  })
                  navigate('/events', { state: { openDrinkModal: true } })
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 76, 76, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 76, 76, 0.3)'
                }}
              >
                <h3 style={{ 
                  margin: '0 0 0.5rem 0', 
                  color: '#ffffff', 
                  fontSize: '1.125rem',
                  fontWeight: '700'
                }}>
                  주류 구매 바로가기
                </h3>
                
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  color: '#ffffff', 
                  fontSize: '0.8rem',
                  opacity: 0.9
                }}>
                  {isAdmin ? '운영진 구매 1500원 할인!' : '수제 레몬 하이볼과 캔맥주 마시면서 공연 관람하자!'}
                </p>
              </div>
              )}
              
              {/* 입금 미확인자에게 입금 계좌 정보 표시 (Admin/운영진에는 미표시) */}
              {(() => {
                if (isAdmin) return null
                // 입금 미확인 상태 확인
                const guestInfo = guests.find((g) => {
                  const guestName = g.name || g['이름'] || g.Name || ''
                  const guestPhone = String(g.phone || g['전화번호'] || g.Phone || '').replace(/[-\s()]/g, '')
                  const userName = user?.name || ''
                  const userPhone = String(user?.phone || '').replace(/[-\s()]/g, '')
                  return guestName === userName && guestPhone === userPhone
                })
                const isPaymentConfirmed = guestInfo?.paymentConfirmed === true || user?.paymentConfirmed === true
                
                // 입금 미확인 상태이고 bookingInfo가 있으면 계좌 정보 표시
                if (!isPaymentConfirmed && bookingInfo && bookingInfo.accountNumber) {
                  const price = bookingInfo.walkInPrice
                  const copyAccountNumber = async () => {
                    if (!bookingInfo.accountNumber) return
                    try {
                      await navigator.clipboard.writeText(bookingInfo.accountNumber)
                      alert('계좌번호가 복사되었습니다!')
                    } catch (err) {
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
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      marginTop: '0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      textAlign: 'center'
                    }}>
                      <p style={{
                        margin: '0 0 0.5rem 0',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        아직 입금이 확인 되지 않았습니다!
                      </p>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}>
                        {/* 첫 번째 행: 은행명 + 계좌번호 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {bookingInfo.bankName && (
                            <span style={{
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {bookingInfo.bankName}
                            </span>
                          )}
                          {bookingInfo.accountNumber && (
                            <span
                              onClick={copyAccountNumber}
                              style={{
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted'
                              }}
                              title="클릭하여 복사"
                            >
                              {bookingInfo.accountNumber}
                            </span>
                          )}
                        </div>
                        {/* 두 번째 행: 입금주 + 가격 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {bookingInfo.accountName && (
                            <span style={{
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              opacity: 0.9
                            }}>
                              입금주: {bookingInfo.accountName}
                            </span>
                          )}
                          <span style={{
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            가격: {price}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
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
                const paymentConfirmed = guestInfo?.paymentConfirmed === true || user.paymentConfirmed === true
                
                // 현장 예매는 항상 표시, 사전 예매는 입금 확인 여부에 따라 표시
                if (isWalkIn) {
                  return (
                    <div className="ticket-entry-stamp">
                      <div className="ticket-entry-stamp-type">현장예약</div>
                      <div className="ticket-entry-stamp-title">입장번호 {user.entryNumber}번!</div>
                    </div>
                  )
                } else if (!isWalkIn) {
                  // 사전 예매인 경우
                  if (paymentConfirmed) {
                    // 입금 확인 완료
                    return (
                      <div className="ticket-entry-stamp">
                        <div className="ticket-entry-stamp-type">사전예약</div>
                        <div className="ticket-entry-stamp-title">입장번호 {user.entryNumber}번!</div>
                      </div>
                    )
                  } else {
                    // 입금 확인 미완료
                    return (
                      <div className="ticket-entry-stamp">
                        <div className="ticket-entry-stamp-type" style={{ color: '#ff4444' }}>
                          입금 미확인<br/>확인 대기 중..
                        </div>
                      </div>
                    )
                  }
                }
                return null
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
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#fff' }}>
                      총 게스트: {guests.filter(g => !g.isDeleted).length}명
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#fff' }}>
                      실 관객: {guests.filter(g => g.paymentConfirmed === true && !g.isDeleted).length}명
                    </p>
                  </div>
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
                {guests.filter(g => !g.isDeleted).length > 0 ? (
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
                            // 삭제된 게스트는 필터링 (admin에서는 보이지 않음)
                            let sortedGuests = guests.filter(g => !g.isDeleted)
                            
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
                          // 전화번호 뒷자리 마스킹 처리 (admin에서만) - 010-1234-5678 -> 010-1234-****
                          const maskedPhone = guestPhone.replace(/-(\d{4})$/, '-****')
                          const isWalkIn = guest.isWalkIn === true
                          // ✅ userId 생성 (닉네임 조회용, 전화번호만 사용)
                          const userId = normalizePhone(guestPhoneRaw)
                          const guestNickname = userNicknames[userId] || '-'
                          return (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{guestName}</td>
                              <td>{guestNickname}</td>
                              <td>{maskedPhone}</td>
                              <td>
                                <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                                  {isWalkIn ? '현장 예매' : '사전 예매'}
                                </span>
                              </td>
                              <td>
                                <span className={guest.paymentConfirmed ? 'payment-confirmed' : 'payment-pending'}>
                                  {guest.paymentConfirmed ? '확인완료' : '대기중'}
                                </span>
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

        <VenueDirections />

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

