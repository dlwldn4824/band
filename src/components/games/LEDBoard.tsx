import { useState, useEffect } from 'react'
import './LEDBoard.css'

const LEDBoard = () => {
  const [text, setText] = useState('응원 메시지를 입력하세요!')
  const backgroundColor = '#000000' // 검정 고정
  const [textColor, setTextColor] = useState('#FFFF00')
  const [fontSize, setFontSize] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(0) // 0 = 고정, 1-10 = 이동 속도

  // 텍스트 색상 옵션 (5가지)
  const textColorOptions = [
    { name: '노란색', value: '#FFFF00' },
    { name: '빨간색', value: '#FF0000' },
    { name: '초록색', value: '#00FF00' },
    { name: '파란색', value: '#0000FF' },
    { name: '분홍색', value: '#FF00FF' },
  ]

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('ledBoard')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setText(data.text || '응원 메시지를 입력하세요!')
        setTextColor(data.textColor || '#FFFF00')
        setFontSize(data.fontSize || 100)
        setAnimationSpeed(data.animationSpeed || 0)
      } catch (e) {
        console.error('Failed to load LED board data', e)
      }
    }
  }, [])

  // 자동 저장 (설정 변경 시)
  useEffect(() => {
    const data = {
      text,
      backgroundColor: '#000000', // 검정 고정
      textColor,
      fontSize,
      animationSpeed
    }
    localStorage.setItem('ledBoard', JSON.stringify(data))
  }, [text, textColor, fontSize, animationSpeed])

  const handleFullscreen = () => {
    setIsFullscreen(true)
  }

  const exitFullscreen = () => {
    setIsFullscreen(false)
  }

  if (isFullscreen) {
    // 애니메이션 duration 계산 (속도가 빠를수록 duration이 짧아짐)
    // 0 = 고정, 1-25 = 이동 속도 (1이 가장 느리고 25가 가장 빠름)
    const animationDuration = animationSpeed > 0 ? `${30 - animationSpeed * 0.8}s` : 'none'
    const displayText = text || '응원 메시지를 입력하세요!'
    
    return (
      <div 
        className="led-board-fullscreen"
        style={{
          backgroundColor,
        }}
        onClick={exitFullscreen}
      >
        <div 
          className={`led-board-text ${animationSpeed > 0 ? 'animated' : ''}`}
          style={{
            color: textColor,
            fontSize: `${fontSize}px`,
            animationDuration: animationDuration
          }}
        >
          {animationSpeed > 0 ? (
            <>
              <span className="led-text-item">{displayText}</span>
              <span className="led-text-item">{displayText}</span>
            </>
          ) : (
            displayText
          )}
        </div>
        <div className="led-board-controls-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="speed-control">
            <label>이동 속도: {animationSpeed}</label>
            <input
              type="range"
              min="0"
              max="25"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="speed-slider"
            />
          </div>
          <button className="led-board-exit" onClick={exitFullscreen}>
            ✕ 닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="led-board-container">
      <div className="led-board-preview">
        <div 
          className="led-board-display"
          style={{
            backgroundColor,
            color: textColor,
            fontSize: `${fontSize}px`
          }}
        >
          {text || '응원 메시지를 입력하세요!'}
        </div>
      </div>

      <div className="led-board-controls">
        <div className="control-group">
          <label>메시지</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="응원 메시지를 입력하세요"
            className="led-input"
            maxLength={50}
          />
        </div>

        <div className="control-group">
          <label>텍스트 색상</label>
          <div className="color-options">
            {textColorOptions.map((option) => (
              <button
                key={option.value}
                className={`color-option ${textColor === option.value ? 'selected' : ''}`}
                style={{ backgroundColor: option.value }}
                onClick={() => setTextColor(option.value)}
                title={option.name}
              >
                {textColor === option.value && '✓'}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>폰트 크기: {fontSize}px</label>
          <input
            type="range"
            min="100"
            max="150"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="font-size-slider"
          />
          <div className="font-size-info">
            <span>100px</span>
            <span>150px</span>
          </div>
        </div>

        <div className="control-buttons">
          <button onClick={handleFullscreen} className="fullscreen-button">
            전광판 보기
          </button>
        </div>
      </div>
    </div>
  )
}

export default LEDBoard

