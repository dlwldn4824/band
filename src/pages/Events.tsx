import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import RockPaperScissorsTournament from '../components/games/RockPaperScissorsTournament'
import RouletteMirror from '../components/games/RouletteMirror'
import EntryNumberDrawMirror from '../components/games/EntryNumberDrawMirror'
import './Events.css'

type GameType = 'menu' | 'rps' | 'roulette' | 'draw'

const Events = () => {
  const [currentGame, setCurrentGame] = useState<GameType>('menu')
  const { isAdmin } = useAuth()
  const { eventsEnabled, setEventsEnabled } = useData()
  const navigate = useNavigate()

  // 운영진이 아니고 이벤트가 활성화되지 않았으면 접근 차단
  useEffect(() => {
    if (!isAdmin && !eventsEnabled) {
      navigate('/dashboard')
    }
  }, [isAdmin, eventsEnabled, navigate])

  // 운영진이 게임을 시작하면 이벤트 활성화
  const handleGameStart = (gameId: GameType) => {
    if (isAdmin && !eventsEnabled) {
      setEventsEnabled(true)
    }
    setCurrentGame(gameId)
  }

  const games = [
    { id: 'rps', name: '가위바위보', icon: '✂️', description: isAdmin ? '관객들과 토너먼트!' : '관객들과 가위바위보 대결!' },
    { id: 'roulette', name: '룰렛', icon: '🎰', description: '룰렛을 돌려서 상품을 받아보세요!' },
    { id: 'draw', name: '입장 번호 추첨', icon: '🎲', description: '체크인 완료된 관객 중 1명 추첨!' },
  ]

  if (currentGame !== 'menu') {
    return (
      <div className="events-page">
        <div className="events-header">
          <button onClick={() => setCurrentGame('menu')} className="back-button">
            ← 게임 선택으로 돌아가기
          </button>
        </div>
        <div className="events-content">
          {currentGame === 'rps' && <RockPaperScissorsTournament />}
          {currentGame === 'roulette' && <RouletteMirror />}
          {currentGame === 'draw' && <EntryNumberDrawMirror />}
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

