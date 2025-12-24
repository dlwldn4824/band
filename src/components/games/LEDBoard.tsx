import { useState, useEffect, useRef } from 'react'
import './LEDBoard.css'

const LEDBoard = () => {
  const [text, setText] = useState('응원 메시지를 입력하세요!')
  const backgroundColor = '#000000'
  const [textColor, setTextColor] = useState('#FFFF00')
  const [fontSize, setFontSize] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const [loopText, setLoopText] = useState('')

  const textColorOptions = [
    { name: '노란색', value: '#FFFF00' },
    { name: '빨간색', value: '#FF0000' },
    { name: '초록색', value: '#00FF00' },
    { name: '파란색', value: '#0000FF' },
    { name: '분홍색', value: '#FF00FF' },
  ]

  useEffect(() => {
    const saved = localStorage.getItem('ledBoard')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setText(data.text || '응원 메시지를 입력하세요!')
        setTextColor(data.textColor || '#FFFF00')
        setFontSize(data.fontSize || 100)
        setAnimationSpeed(data.animationSpeed || 0)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'ledBoard',
      JSON.stringify({
        text,
        backgroundColor: '#000000',
        textColor,
        fontSize,
        animationSpeed,
      })
    )
  }, [text, textColor, fontSize, animationSpeed])

  /* 1️⃣ 화면보다 길어질 때까지 문자열 실제로 확장 */
  useEffect(() => {
    if (!isFullscreen || animationSpeed === 0) return
    if (!containerRef.current) return

    const base = text || '응원 메시지를 입력하세요!'
    let result = base

    const containerWidth = containerRef.current.offsetWidth
    const approxCharWidth = fontSize * 0.6

    while (result.length * approxCharWidth < containerWidth * 3) {
      result += '   ' + base
    }

    setLoopText(result)
  }, [isFullscreen, animationSpeed, text, fontSize])


  /* 2️⃣ 문자열 자체를 회전시키는 무한 로직 */
  useEffect(() => {
  if (!isFullscreen || animationSpeed === 0) return
  if (!textRef.current) return

  let x = 0
  let rafId: number
  const speed = animationSpeed * 0.7
  const resetPoint = textRef.current.scrollWidth / 2

  const loop = () => {
    x -= speed
    if (Math.abs(x) >= resetPoint) {
      x = 0
    }
    textRef.current!.style.transform = `translate3d(${x}px,0,0)`
    rafId = requestAnimationFrame(loop)
  }

  loop()
  return () => cancelAnimationFrame(rafId)
}, [isFullscreen, animationSpeed])


  const handleFullscreen = () => setIsFullscreen(true)
  const exitFullscreen = () => setIsFullscreen(false)

  if (isFullscreen) {
    return (
      <div
        className="led-board-fullscreen"
        style={{ backgroundColor }}
        onClick={exitFullscreen}
      >
        {animationSpeed > 0 ? (
          <div className="led-board-marquee" ref={containerRef}>
            <div
              ref={textRef}
              className="led-board-track"
              style={{
                color: textColor,
                fontSize: `${fontSize}px`,
              }}
            >
              {loopText}
            </div>
          </div>
        ) : (
          <div
            className="led-board-text"
            style={{ color: textColor, fontSize: `${fontSize}px` }}
          >
            {text}
          </div>
        )}

        {/* ✅ 기존 속도 조절 UI 복구 */}
        <div
          className="led-board-controls-overlay"
          onClick={(e) => e.stopPropagation()}
        >
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
            fontSize: `${fontSize}px`,
          }}
        >
          {text}
        </div>
      </div>

      <div className="led-board-controls">
        <div className="control-group">
          <label>메시지</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
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
                className={`color-option ${
                  textColor === option.value ? 'selected' : ''
                }`}
                style={{ backgroundColor: option.value }}
                onClick={() => setTextColor(option.value)}
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
