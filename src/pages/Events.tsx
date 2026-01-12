import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import RouletteMirror from '../components/games/RouletteMirror'
import EntryNumberDrawMirror from '../components/games/EntryNumberDrawMirror'
import LEDBoard from '../components/games/LEDBoard'
import directionsImage from '../assets/배경/라디오가가_지도.png'
import './Events.css'

import shopIcon from '../assets/icons/shop.png'
import mapIcon from '../assets/icons/map.png'
import randomIcon from '../assets/icons/random.png'
import boardIcon from '../assets/icons/board.png'


type GameType = 'menu' | 'roulette' | 'draw' | 'ledboard'

const Events = () => {
  // ✅ 모든 Hook은 최상단에서 조건 없이 호출
  const [currentGame, setCurrentGame] = useState<GameType>('menu')
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [showDrinkModal, setShowDrinkModal] = useState(false)
  const [beerQuantity, setBeerQuantity] = useState(0)
  const [mojitoQuantity, setMojitoQuantity] = useState(0)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [purchasedBeerQuantity, setPurchasedBeerQuantity] = useState(0)
  const [purchasedMojitoQuantity, setPurchasedMojitoQuantity] = useState(0)
  const [additionalOrderConfirmed, setAdditionalOrderConfirmed] = useState(false)
  const [purchaseHistory, setPurchaseHistory] = useState<Array<{
    beerQuantity: number
    mojitoQuantity: number
    createdAt: any
    provided?: boolean
    providedAt?: any
  }>>([])
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null)
  
  // 할인 기간 종료 시간: 2026년 1월 26일 23:59:59
  const discountEndDate = new Date('2026-01-26T23:59:59')
  const DISCOUNT_AMOUNT = 500
  const ORIGINAL_PRICE = 3500
  const DISCOUNTED_PRICE = ORIGINAL_PRICE - DISCOUNT_AMOUNT
  const { isAdmin, user, isLoading } = useAuth()
  const { eventsEnabled, setEventsEnabled, bookingInfo } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  
  // 현재 경로가 /events인지 확인 (admin이 아닌 일반 사용자 페이지)
  const isPublicEventsPage = location.pathname === '/events'

  // 디버깅: Events 페이지 렌더링 상태 로그
  useEffect(() => {
    console.log('=== Events 페이지 렌더링 상태 ===')
    console.log('isAdmin:', isAdmin)
    console.log('user:', user)
    console.log('eventsEnabled:', eventsEnabled)
    console.log('currentGame:', currentGame)
    console.log('================================')
  }, [isAdmin, user, eventsEnabled, currentGame])

  // 운영진이 아니고 이벤트가 활성화되지 않았으면 접근 차단
  useEffect(() => {
    console.log('[Events] 접근 권한 체크:', { isAdmin, eventsEnabled })
    if (!isAdmin && !eventsEnabled) {
      console.log('[Events] 접근 차단 → /dashboard로 리다이렉트')
      navigate('/dashboard')
    } else {
      console.log('[Events] 접근 허용')
    }
  }, [isAdmin, eventsEnabled, navigate])

  // 구매 모달의 수량은 항상 0부터 시작
  // 내 구매 정보 섹션은 Firestore의 주문 정보를 기반으로 별도로 표시
  useEffect(() => {
    if (!user) {
      setPurchasedBeerQuantity(0)
      setPurchasedMojitoQuantity(0)
      return
    }

    const loadPurchasedDrinks = async () => {
      try {
        const userId = `${user.name}_${user.phone}`
        const orderRef = doc(db, 'drinkOrders', userId)
        const orderSnap = await getDoc(orderRef)

        if (orderSnap.exists()) {
          const orderData = orderSnap.data()
          if (orderData.confirmed) {
            setPurchasedBeerQuantity(orderData.beerQuantity || 0)
            setPurchasedMojitoQuantity(orderData.mojitoQuantity || 0)
            
            // 구매 이력 로드 (orderHistory 배열이 있으면 사용, 없으면 기존 데이터로 생성)
            if (orderData.orderHistory && Array.isArray(orderData.orderHistory)) {
              setPurchaseHistory(orderData.orderHistory)
            } else {
              // 기존 데이터가 있으면 이력 생성
              if (orderData.beerQuantity > 0 || orderData.mojitoQuantity > 0) {
                setPurchaseHistory([{
                  beerQuantity: orderData.beerQuantity || 0,
                  mojitoQuantity: orderData.mojitoQuantity || 0,
                  createdAt: orderData.createdAt || orderData.updatedAt || Timestamp.now(),
                  provided: orderData.provided || false,
                  providedAt: orderData.providedAt
                }])
              } else {
                setPurchaseHistory([])
              }
            }
          } else {
            setPurchasedBeerQuantity(0)
            setPurchasedMojitoQuantity(0)
            setPurchaseHistory([])
          }
        } else {
          setPurchasedBeerQuantity(0)
          setPurchasedMojitoQuantity(0)
          setPurchaseHistory([])
        }
      } catch (error) {
        console.error('구매 정보 불러오기 실패:', error)
        setPurchasedBeerQuantity(0)
        setPurchasedMojitoQuantity(0)
        setPurchaseHistory([])
      }
    }

    loadPurchasedDrinks()
  }, [user])

  // 결제 모달이 열릴 때 추가 주문 확인란 초기화
  useEffect(() => {
    if (!showPaymentModal) {
      setAdditionalOrderConfirmed(false)
    }
  }, [showPaymentModal])

  // 주류 구매 모달이 닫힐 때 수량 초기화
  useEffect(() => {
    if (!showDrinkModal) {
      setBeerQuantity(0)
      setMojitoQuantity(0)
    }
  }, [showDrinkModal])

  // 할인 기간 카운트다운
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date()
      const diff = discountEndDate.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeRemaining(null)
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeRemaining({ days, hours, minutes })
    }
    
    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000) // 1분마다 업데이트
    
    return () => clearInterval(interval)
  }, [])
  
  // 할인 적용 여부 확인
  const isDiscountActive = timeRemaining !== null
  const currentPrice = isDiscountActive ? DISCOUNTED_PRICE : ORIGINAL_PRICE

  // ✅ Hook 호출 완료 후 조건부 return
  // 인증 로딩 중일 때는 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="events-page">
        <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  // 운영진이 게임을 시작하면 이벤트 활성화
  const handleGameStart = (gameId: GameType) => {
    if (isAdmin && !eventsEnabled) {
      setEventsEnabled(true)
    }
    setCurrentGame(gameId)
  }

  // 예약한 사람인지 확인 (entryNumber가 있거나 checkedIn이 true)
  const isBookedUser = user && (user.entryNumber !== undefined || user.checkedIn === true)
  
  console.log('[Events] isBookedUser:', isBookedUser, {
    hasUser: !!user,
    entryNumber: user?.entryNumber,
    checkedIn: user?.checkedIn
  })

  // 운영진은 모든 게임 보임, 예약한 사람은 LED Board만 보임
  const allGames = [
    // { id: 'roulette', name: '룰렛', icon: '🎰', description: ['룰렛을 돌려서', '상품을 받아보세요!'] }, // 룰렛 비활성화
    { id: 'draw', name: '입장 번호 추첨', icon: randomIcon, description: ['체크인 완료된 관객 중', '1명 추첨!'] },
    { id: 'ledboard', name: '전광판 만들기', icon: boardIcon ,description: ['전광판을 만들어', '응원하세요!'] },
  ]

  // 게임 목록 필터링
  // /events 페이지는 추첨과 전광판 보임 (isPublicEventsPage가 true면 draw와 ledboard만, isAdmin 상태와 무관)
  // /admin/events 페이지는 운영진은 모든 게임, 일반 사용자는 룰렛 제외
  // 룰렛은 모든 페이지에서 비활성화됨
  // 로딩 중이거나 상태가 불안정할 때는 빈 배열 반환하여 깜빡임 방지
  // isPublicEventsPage를 먼저 체크하여 /events 페이지에서는 draw와 ledboard만 보이도록 보장
  const games = isLoading
    ? []
    : isPublicEventsPage
      ? allGames.filter(game => game.id === 'draw' || game.id === 'ledboard') // /events 페이지는 draw와 ledboard만 (isAdmin과 무관)
      : isAdmin 
        ? allGames 
        : allGames.filter(game => game.id !== 'roulette') // /admin/events에서 일반 사용자는 룰렛 제외

  console.log('[Events] 게임 목록:', {
    isAdmin,
    isBookedUser,
    gamesCount: games.length,
    games: games.map(g => g.id)
  })

  if (currentGame !== 'menu') {
    console.log('[Events] 게임 플레이 모드:', currentGame)
    return (
      <div className="events-page">
        <div className="events-content">
          {currentGame === 'roulette' && <RouletteMirror />}
          {currentGame === 'draw' && <EntryNumberDrawMirror />}
          {currentGame === 'ledboard' && <LEDBoard />}
        </div>
      </div>
    )
  }

  const handleDirections = () => {
    setShowDirectionsModal(true)
  }

  const handleKakaoMap = () => {
    // 카카오맵에서 주소 검색
    const address = encodeURIComponent('서울특별시 마포구 독막로7길 20 지하')
    const kakaoMapUrl = `https://map.kakao.com/link/search/${address}`
    window.open(kakaoMapUrl, '_blank')
  }

  return (
    <div className="events-page">
      <div className="events-content">
        {/* 내 구매 정보 */}
        {(purchasedBeerQuantity > 0 || purchasedMojitoQuantity > 0) && (
          <div className="purchase-info">
            <div 
              className="purchase-info-content"
              onClick={() => setShowPurchaseHistory(!showPurchaseHistory)}
              style={{ cursor: 'pointer' }}
            >
              <span className="purchase-info-title">내 구매 정보:</span>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                {purchasedBeerQuantity > 0 && (
                  <span className="purchase-name">캔 맥주 x {purchasedBeerQuantity}</span>
                )}
                {purchasedMojitoQuantity > 0 && (
                  <span className="purchase-name">산토리 하이볼 x {purchasedMojitoQuantity}</span>
                )}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#999', flexShrink: 0, marginLeft: '0.25rem' }}>
                {showPurchaseHistory ? '▼' : '▶'}
              </span>
            </div>
            
            {/* 구매 이력 */}
            {showPurchaseHistory && purchaseHistory.length > 0 && (
              <div className="purchase-history">
                {(() => {
                  // 오래된 순으로 정렬하여 번호 부여
                  const sortedByOldest = [...purchaseHistory].sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                    return aTime - bTime // 오래된 것부터
                  })
                  
                  // 번호 매핑 생성 (오래된 것부터 1, 2, 3...)
                  const numberMap = new Map<number, number>()
                  sortedByOldest.forEach((history, index) => {
                    const historyKey = history.createdAt?.toDate ? history.createdAt.toDate().getTime() : index
                    numberMap.set(historyKey, index + 1)
                  })
                  
                  // 최신 순으로 정렬하여 표시
                  const sortedByNewest = [...purchaseHistory].sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                    return bTime - aTime // 최신 것부터
                  })
                  
                  return sortedByNewest.map((history, index) => {
                    const historyKey = history.createdAt?.toDate ? history.createdAt.toDate().getTime() : index
                    const orderNumber = numberMap.get(historyKey) || index + 1
                    
                    return (
                      <div 
                        key={index} 
                        className={`purchase-history-item ${history.provided ? 'provided' : 'not-provided'}`}
                      >
                        <div className="purchase-history-content">
                          <div className="purchase-history-header">
                            <span className="purchase-history-number">주문 번호: {orderNumber}</span>
                            <div className="purchase-history-items">
                              {history.beerQuantity > 0 && (
                                <span className="purchase-name">캔 맥주 x {history.beerQuantity}</span>
                              )}
                              {history.mojitoQuantity > 0 && (
                                <span className="purchase-name">산토리 하이볼 x {history.mojitoQuantity}</span>
                              )}
                            </div>
                          </div>
                          <div className="purchase-history-meta">
                            <span className="purchase-history-time">
                              {history.createdAt?.toDate ? 
                                new Date(history.createdAt.toDate()).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                            </span>
                            <span className={`purchase-history-status ${history.provided ? 'provided' : 'not-provided'}`}>
                              {history.provided ? '✓ 제공완료' : '대기중'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        )}

        <div className="games-grid">
        {/* <div
          className="game-card"
          onClick={() => navigate('/products')}
        >
          <div className="game-icon">
            <img src={shopIcon} alt="상품 소개" />
          </div>

          <h3>상품 소개</h3>
          <p>공연 기념품을 <br/>확인하세요</p>
          <button className="play-button">확인하기</button>
        </div> */}
        <div
          className="game-card"
          onClick={() => setShowDrinkModal(true)}
        >
          <div className="game-icon">
            <img src={shopIcon} alt="주류 사전 구매" />
          </div>

          <h3>주류 사전 구매</h3>
          <p>캔 맥주, 산토리 하이볼 <br/>사전 구매하기</p>
          <button className="play-button">구매하기</button>
        </div>
        <div
          className="game-card"
          onClick={handleDirections}
        >
          <div className="game-icon map-icon">
            <img src={mapIcon} alt="길찾기" />
          </div>

          <h3>길찾기</h3>
          <p>공연장 위치를 <br/>확인하세요</p>
          <button className="play-button">확인하기</button>
        </div>
        {games.map((game) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => handleGameStart(game.id as GameType)}
          >
            <div className="game-icon">
              <img src={game.icon} alt={game.name}/>
            </div>
            <h3>{game.name}</h3>
            <p>
              {Array.isArray(game.description) ? (
                <>
                  {game.description[0]}
                  <br />
                  {game.description[1]}
                </>
              ) : (
                game.description
              )}
            </p>
            <button className="play-button">시작하기</button>
          </div>
        ))}
        </div>
      </div>

      {/* 주류 사전 구매 모달 */}
      {showDrinkModal && (
        <div 
          className="directions-modal-overlay"
          onClick={() => setShowDrinkModal(false)}
        >
          <div 
            className="directions-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="directions-modal-close"
              onClick={() => setShowDrinkModal(false)}
            >
            </button>
            <div className="directions-modal-content">
              <h2 className="directions-modal-title">주류 사전 구매</h2>
              
              {isDiscountActive && timeRemaining && (
                <div className="drink-discount-banner">
                  <div className="drink-discount-info">
                    <span className="drink-discount-badge">사전구매 500원 할인</span>
                    <span className="drink-discount-time">
                      남은 시간: {timeRemaining.days}일 {timeRemaining.hours}시간 {timeRemaining.minutes}분
                    </span>
                  </div>
                  <p className="drink-discount-period">할인 기간: ~2026년 1월 26일 자정까지</p>
                </div>
              )}
              
              <div className="drink-notice">
                <p className="drink-notice-text">
                  ⚠️ 외부 주류 반입은 불가합니다
                </p>
              </div>

              <div className="drink-list">
                <div className="drink-item">
                  <div className="drink-info">
                    <h3 className="drink-name">캔 맥주</h3>
                    <div className="drink-price-container">
                      {isDiscountActive ? (
                        <>
                          <span className="drink-price-original">3,500원</span>
                          <span className="drink-price-discounted">{currentPrice.toLocaleString()}원</span>
                        </>
                      ) : (
                        <span className="drink-price">{currentPrice.toLocaleString()}원</span>
                      )}
                    </div>
                  </div>
                  <div className="drink-quantity-controls">
                    <button 
                      className="quantity-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setBeerQuantity(Math.max(0, beerQuantity - 1))
                      }}
                    >-</button>
                    <span className="quantity-value">{beerQuantity}</span>
                    <button 
                      className="quantity-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setBeerQuantity(beerQuantity + 1)
                      }}
                    >+</button>
                  </div>
                </div>
                <div className="drink-item">
                  <div className="drink-info">
                    <h3 className="drink-name">산토리 하이볼</h3>
                    <div className="drink-price-container">
                      {isDiscountActive ? (
                        <>
                          <span className="drink-price-original">3,500원</span>
                          <span className="drink-price-discounted">{currentPrice.toLocaleString()}원</span>
                        </>
                      ) : (
                        <span className="drink-price">{currentPrice.toLocaleString()}원</span>
                      )}
                    </div>
                  </div>
                  <div className="drink-quantity-controls">
                    <button 
                      className="quantity-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMojitoQuantity(Math.max(0, mojitoQuantity - 1))
                      }}
                    >-</button>
                    <span className="quantity-value">{mojitoQuantity}</span>
                    <button 
                      className="quantity-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMojitoQuantity(mojitoQuantity + 1)
                      }}
                    >+</button>
                  </div>
                </div>
              </div>

              {(beerQuantity > 0 || mojitoQuantity > 0) && (
                <button 
                  className="drink-purchase-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPaymentModal(true)
                  }}
                >
                  구매하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 주류 구매 계좌 안내 모달 */}
      {showPaymentModal && (
        <div 
          className="directions-modal-overlay"
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="directions-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="directions-modal-close"
              onClick={() => {
                setShowPaymentModal(false)
                setPaymentConfirmed(false)
                setAdditionalOrderConfirmed(false)
              }}
            >
            </button>
            <div className="directions-modal-content">
              <h2 className="directions-modal-title">주류 구매 결제 안내</h2>
              
              <div className="drink-order-summary">
                {beerQuantity > 0 && (
                  <div className={`order-item ${mojitoQuantity === 0 ? 'last-order-item' : ''}`}>
                    <span className="order-name">캔 맥주 x {beerQuantity}</span>
                    <span className="order-price">{beerQuantity * currentPrice}원</span>
                  </div>
                )}
                {mojitoQuantity > 0 && (
                  <div className="order-item last-order-item">
                    <span className="order-name">산토리 하이볼 x {mojitoQuantity}</span>
                    <span className="order-price">{mojitoQuantity * currentPrice}원</span>
                  </div>
                )}
                <div className="order-total">
                  <span className="total-label">총 금액</span>
                  <span className="total-price">{(beerQuantity * currentPrice) + (mojitoQuantity * currentPrice)}원</span>
                </div>
              </div>

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
                          onClick={(e) => {
                            e.stopPropagation()
                            const accountNumber = bookingInfo.accountNumber
                            navigator.clipboard.writeText(accountNumber).then(() => {
                              alert('계좌번호가 복사되었습니다!')
                            }).catch(() => {
                              alert('계좌번호 복사에 실패했습니다.')
                            })
                          }}
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
                </div>
              )}

              {/* 안내 문구 */}
                <div className="instructions">
                  <p>위 계좌로 입금해 주세요.</p>
                  <p>입금이 확인되면 공연 당일 주류를 준비해드립니다</p>
                  <p className="refund-warning">확인하기 버튼을 누르면 구매가 확정되며 환불은 불가합니다</p>
                </div>

              <div className="payment-confirm">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="payment-checkbox"
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  />
                  <span>입금을 완료했습니다</span>
                </label>
              </div>

              {(purchasedBeerQuantity > 0 || purchasedMojitoQuantity > 0) && (
                <div className="payment-confirm">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="payment-checkbox"
                      checked={additionalOrderConfirmed}
                      onChange={(e) => setAdditionalOrderConfirmed(e.target.checked)}
                    />
                    <span>구매이력이 있습니다. 추가 주문하시겠습니까?</span>
                  </label>
                </div>
              )}

              <button
                className="drink-confirm-button"
                disabled={!paymentConfirmed}
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!user || !paymentConfirmed) return

                  try {
                    // 사용자 ID 생성 (name_phone)
                    const userId = `${user.name}_${user.phone}`
                    const orderRef = doc(db, 'drinkOrders', userId)
                    
                    // 기존 주문 내역 가져오기
                    const orderSnap = await getDoc(orderRef)
                    let existingBeerQuantity = 0
                    let existingMojitoQuantity = 0
                    
                    if (orderSnap.exists()) {
                      const orderData = orderSnap.data()
                      existingBeerQuantity = orderData.beerQuantity || 0
                      existingMojitoQuantity = orderData.mojitoQuantity || 0
                    }
                    
                    // 기존 수량에 새로 주문한 수량 추가
                    const totalBeerQuantity = existingBeerQuantity + beerQuantity
                    const totalMojitoQuantity = existingMojitoQuantity + mojitoQuantity
                    const totalAmount = (totalBeerQuantity * currentPrice) + (totalMojitoQuantity * currentPrice)
                    
                    // 기존 구매 이력 가져오기
                    let existingHistory: Array<{
                      beerQuantity: number
                      mojitoQuantity: number
                      createdAt: any
                      provided?: boolean
                      providedAt?: any
                    }> = []
                    
                    if (orderSnap.exists()) {
                      const orderData = orderSnap.data()
                      if (orderData.orderHistory && Array.isArray(orderData.orderHistory)) {
                        existingHistory = orderData.orderHistory
                      }
                    }
                    
                    // 새 구매 이력 추가
                    const newHistoryItem = {
                      beerQuantity: beerQuantity,
                      mojitoQuantity: mojitoQuantity,
                      createdAt: Timestamp.now(),
                      provided: false,
                      providedAt: null
                    }
                    
                    const updatedHistory = [...existingHistory, newHistoryItem]
                    
                    // Firestore에 주문 정보 저장 (기존 수량에 추가)
                    await setDoc(orderRef, {
                      userId,
                      name: user.name,
                      phone: user.phone,
                      beerQuantity: totalBeerQuantity,
                      mojitoQuantity: totalMojitoQuantity,
                      totalAmount,
                      confirmed: true,
                      createdAt: orderSnap.exists() ? orderSnap.data().createdAt : Timestamp.now(),
                      updatedAt: Timestamp.now(),
                      orderHistory: updatedHistory
                    }, { merge: true })

                    // 구매 정보 업데이트
                    setPurchasedBeerQuantity(totalBeerQuantity)
                    setPurchasedMojitoQuantity(totalMojitoQuantity)
                  } catch (error) {
                    console.error('주문 저장 실패:', error)
                    alert('주문 저장에 실패했습니다. 다시 시도해주세요.')
                  } finally {
                    // 모달 닫기 및 상태 초기화 (성공/실패 관계없이 항상 실행)
                    setShowPaymentModal(false)
                    setShowDrinkModal(false)
                    setPaymentConfirmed(false)
                    setAdditionalOrderConfirmed(false)
                    setBeerQuantity(0)
                    setMojitoQuantity(0)
                  }
                }}
              >
                확인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 길찾기 모달 */}
      {showDirectionsModal && (
        <div 
          className="directions-modal-overlay"
          onClick={() => setShowDirectionsModal(false)}
        >
          <div 
            className="directions-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="directions-modal-close"
              onClick={() => setShowDirectionsModal(false)}
            >
            </button>
            <div className="directions-modal-content">
              <h2 className="directions-modal-title">공연장 위치</h2>
              
              {/* 길 안내 이미지 */}
              <div className="directions-image-container">
                <img 
                  src={directionsImage} 
                  alt="길 안내" 
                  className="directions-image"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              {/* 주소 */}
              <div className="directions-address">
                <p className="directions-address-title">
                 얼라이브 홀
                </p>
                <p className="directions-address-text">
                  서울특별시 마포구 독막로7길 20 지하
                </p>
              </div>

              {/* 카카오맵 연결 버튼 */}
              <button
                className="directions-kakao-button"
                onClick={handleKakaoMap}
              >
                카카오맵에서 길찾기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Events

