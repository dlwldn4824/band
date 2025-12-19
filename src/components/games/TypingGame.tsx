import { useState, useEffect, useRef } from 'react'
import './Game.css'

const sentences = [
  '밴드 공연은 정말 멋져요',
  '음악은 마음을 치유합니다',
  '라이브 공연의 감동은 특별해요',
  '음악으로 소통하는 즐거움',
  '함께 만드는 음악의 힘',
  '공연장에서 느끼는 열정',
  '음악은 언어를 초월합니다',
  '밴드 멤버들과의 협연',
  '관객과 함께하는 순간들',
  '음악으로 전하는 메시지'
]

const TypingGame = () => {
  const [sentence, setSentence] = useState('')
  const [input, setInput] = useState('')
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isPlaying && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isPlaying])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (input === sentence && sentence !== '') {
      const words = sentence.split(' ').length
      const minutes = time / 60
      setWpm(Math.round(words / minutes))
      setIsPlaying(false)
    }
  }, [input, sentence, time])

  const startGame = () => {
    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)]
    setSentence(randomSentence)
    setInput('')
    setTime(0)
    setWpm(0)
    setIsPlaying(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlaying) return
    setInput(e.target.value)
  }

  const getInputStyle = () => {
    if (!sentence || !input) return {}
    const isCorrect = sentence.startsWith(input)
    return {
      color: isCorrect ? '#28a745' : '#dc3545',
      borderColor: isCorrect ? '#28a745' : '#dc3545'
    }
  }

  return (
    <div className="game-container">
      <h2>⌨️ 타이핑 게임</h2>
      
      <div className="game-area">
        <div className="typing-sentence">{sentence || '게임을 시작하세요!'}</div>
        
        <div className="input-group">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="위 문장을 타이핑하세요"
            disabled={!isPlaying}
            className="typing-input"
            style={getInputStyle()}
          />
        </div>

        <div className="game-stats">
          <div className="stat-item">시간: {time}초</div>
          {wpm > 0 && <div className="stat-item">속도: {wpm} WPM</div>}
        </div>
      </div>

      <button 
        onClick={startGame} 
        className="game-button"
        disabled={isPlaying}
      >
        {isPlaying ? '게임 중...' : '게임 시작'}
      </button>
    </div>
  )
}

export default TypingGame

