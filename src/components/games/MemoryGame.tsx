import { useState, useEffect } from 'react'
import './Game.css'

const emojis = ['🎸', '🎵', '🎤', '🥁', '🎹', '🎺', '🎻', '🎷']

const MemoryGame = () => {
  const [cards, setCards] = useState<string[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    if (gameStarted && matched.length === cards.length && cards.length > 0) {
      setTimeout(() => {
        alert(`🎉 축하합니다! ${moves}번의 시도로 완료했습니다!`)
      }, 500)
    }
  }, [matched, cards.length, moves])

  const startGame = () => {
    const cardPairs = [...emojis, ...emojis]
    const shuffled = cardPairs.sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setGameStarted(true)
  }

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return
    }

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1)
      const [first, second] = newFlipped
      if (cards[first] === cards[second]) {
        setMatched(prev => [...prev, first, second])
        setFlipped([])
      } else {
        setTimeout(() => {
          setFlipped([])
        }, 1000)
      }
    }
  }

  return (
    <div className="game-container">
      <h2>🧠 메모리 게임</h2>
      
      <div className="game-info">
        <div>시도 횟수: {moves}</div>
        <div>맞춘 카드: {matched.length / 2} / {emojis.length}</div>
      </div>

      <div className="memory-grid">
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || matched.includes(index)
          return (
            <div
              key={index}
              className={`memory-card ${isFlipped ? 'flipped' : ''}`}
              onClick={() => handleCardClick(index)}
            >
              <div className="card-front">?</div>
              <div className="card-back">{card}</div>
            </div>
          )
        })}
      </div>

      {!gameStarted && (
        <button onClick={startGame} className="game-button">
          게임 시작
        </button>
      )}

      {gameStarted && matched.length === cards.length && (
        <button onClick={startGame} className="game-button">
          다시 시작
        </button>
      )}
    </div>
  )
}

export default MemoryGame

