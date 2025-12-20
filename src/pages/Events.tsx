import { useState } from 'react'
import RockPaperScissors from '../components/games/RockPaperScissors'
import Roulette from '../components/games/Roulette'
import './Events.css'

type GameType = 'menu' | 'rps' | 'roulette'

const Events = () => {
  const [currentGame, setCurrentGame] = useState<GameType>('menu')

  const games = [
    { id: 'rps', name: '가위바위보', icon: '✂️', description: '컴퓨터와 가위바위보 대결!' },
    { id: 'roulette', name: '룰렛', icon: '🎰', description: '룰렛을 돌려서 상품을 받아보세요!' },
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
          {currentGame === 'rps' && <RockPaperScissors />}
          {currentGame === 'roulette' && <Roulette />}
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
            onClick={() => setCurrentGame(game.id as GameType)}
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

