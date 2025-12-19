import { useState, useEffect } from 'react'
import './Game.css'

const NumberGuess = () => {
  const [target, setTarget] = useState(0)
  const [guess, setGuess] = useState('')
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    startNewGame()
  }, [])

  const startNewGame = () => {
    setTarget(Math.floor(Math.random() * 100) + 1)
    setGuess('')
    setMessage('1부터 100까지 숫자를 맞춰보세요!')
    setAttempts(0)
    setGameStarted(true)
  }

  const handleGuess = () => {
    const num = parseInt(guess)
    if (isNaN(num) || num < 1 || num > 100) {
      setMessage('1부터 100까지의 숫자를 입력하세요!')
      return
    }

    setAttempts(prev => prev + 1)

    if (num === target) {
      setMessage(`🎉 정답입니다! ${attempts + 1}번 만에 맞췄어요!`)
      setGameStarted(false)
    } else if (num < target) {
      setMessage(`📈 더 큰 숫자입니다! (${attempts + 1}번 시도)`)
    } else {
      setMessage(`📉 더 작은 숫자입니다! (${attempts + 1}번 시도)`)
    }
    setGuess('')
  }

  return (
    <div className="game-container">
      <h2>🎯 숫자 맞추기</h2>
      
      <div className="game-area">
        <p className="game-instruction">{message}</p>
        
        <div className="input-group">
          <input
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
            placeholder="1-100"
            min="1"
            max="100"
            disabled={!gameStarted}
            className="number-input"
          />
          <button 
            onClick={handleGuess} 
            disabled={!gameStarted}
            className="game-button"
          >
            확인
          </button>
        </div>

        <div className="game-info">
          <p>시도 횟수: {attempts}</p>
        </div>
      </div>

      <button onClick={startNewGame} className="game-button new-game">
        새 게임 시작
      </button>
    </div>
  )
}

export default NumberGuess

