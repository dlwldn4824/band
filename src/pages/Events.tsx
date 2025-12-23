import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import RouletteMirror from '../components/games/RouletteMirror'
import EntryNumberDrawMirror from '../components/games/EntryNumberDrawMirror'
import LEDBoard from '../components/games/LEDBoard'
import './Events.css'

type GameType = 'menu' | 'roulette' | 'draw' | 'ledboard'

const Events = () => {
  // ✅ 모든 Hook은 최상단에서 조건 없이 호출
  const [currentGame, setCurrentGame] = useState<GameType>('menu')
  const { isAdmin, user, isLoading } = useAuth()
  const { eventsEnabled, setEventsEnabled } = useData()
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
    { id: 'roulette', name: '룰렛', icon: '🎰', description: '룰렛을 돌려서 상품을 받아보세요!' },
    { id: 'draw', name: '입장 번호 추첨', icon: '🎲', description: '체크인 완료된 관객 중 1명 추첨!' },
    { id: 'ledboard', name: '전광판 만들기', icon: '📺', description: '나만의 전광판을 만들어 응원하세요!' },
  ]

  // 게임 목록 필터링
  // /events 페이지는 전광판만 보임
  // /admin/events 페이지는 운영진은 모든 게임, 일반 사용자는 예약한 경우 전광판만
  const games = isPublicEventsPage
    ? allGames.filter(game => game.id === 'ledboard')
    : isAdmin 
      ? allGames 
      : isBookedUser 
        ? allGames.filter(game => game.id === 'ledboard')
        : allGames

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

  return (
    <div className="events-page">
      <div className="games-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => handleGameStart(game.id as GameType)}
          >
            <div className="game-icon">{game.icon}</div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <button className="play-button">플레이</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Events

