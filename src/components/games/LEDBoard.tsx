import { useState, useEffect, useRef } from 'react'
import './LEDBoard.css'
import { useNavigate } from 'react-router-dom'


const LEDBoard = () => {
  const navigate = useNavigate()
  const [text, setText] = useState('응원 메시지를 입력하세요!')
  const backgroundColor = '#000000'
  const [textColor, setTextColor] = useState('#FFFF00')
  const fontSize = 130 // 고정값
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const previewTextRef = useRef<HTMLDivElement | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const [loopText, setLoopText] = useState('')
  const [previewFontSize, setPreviewFontSize] = useState(130)

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
        animationSpeed,
      })
    )
  }, [text, textColor, animationSpeed])

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
  const speed = animationSpeed * 0.4
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

  /* 3️⃣ 미리보기에서 텍스트가 div를 넘어가지 않도록 폰트 크기 자동 조정 */
  useEffect(() => {
    if (!previewTextRef.current || !previewContainerRef.current) return
    if (isFullscreen) return // 전광판 보기 모드에서는 실행하지 않음
    
    const textElement = previewTextRef.current
    const containerElement = previewContainerRef.current
    
    // 텍스트 위치 초기화 (가운데 정렬 보장)
    textElement.style.transform = 'none'
    textElement.style.left = 'auto'
    textElement.style.right = 'auto'
    textElement.style.top = 'auto'
    textElement.style.bottom = 'auto'
    
    // 초기 폰트 크기 설정
    let currentFontSize = fontSize
    
    // 텍스트가 컨테이너를 넘어가는지 확인하고 조정
    const adjustFontSize = () => {
      // 전광판 보기 모드가 아니고 요소가 존재할 때만 실행
      if (isFullscreen || !textElement || !containerElement) return
      
      // 텍스트 위치 초기화
      textElement.style.transform = 'none'
      textElement.style.left = 'auto'
      textElement.style.right = 'auto'
      textElement.style.top = 'auto'
      textElement.style.bottom = 'auto'
      
      textElement.style.fontSize = `${currentFontSize}px`
      
      // 텍스트의 실제 너비와 높이
      const textWidth = textElement.scrollWidth
      const textHeight = textElement.scrollHeight
      
      // 컨테이너의 사용 가능한 너비와 높이 (패딩 제외)
      const containerWidth = containerElement.offsetWidth - 64 // padding 2rem * 2 = 64px
      const containerHeight = containerElement.offsetHeight - 64
      
      // 텍스트가 컨테이너를 넘어가면 폰트 크기 줄이기
      while ((textWidth > containerWidth || textHeight > containerHeight) && currentFontSize > 20) {
        currentFontSize -= 2
        textElement.style.fontSize = `${currentFontSize}px`
        
        // 다시 측정
        const newTextWidth = textElement.scrollWidth
        const newTextHeight = textElement.scrollHeight
        
        if (newTextWidth <= containerWidth && newTextHeight <= containerHeight) {
          break
        }
      }
      
      setPreviewFontSize(currentFontSize)
    }
    
    // 약간의 지연 후 조정 (레이아웃이 완전히 렌더링된 후)
    const timeoutId = setTimeout(() => {
      adjustFontSize()
    }, 150)
    
    // 리사이즈 이벤트 리스너
    const resizeObserver = new ResizeObserver(() => {
      if (!isFullscreen) {
        adjustFontSize()
      }
    })
    resizeObserver.observe(containerElement)
    
    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [text, fontSize, textColor, isFullscreen])


  const fullscreenRef = useRef<HTMLDivElement | null>(null)

  const handleFullscreen = async () => {
    // 전광판 보기 모드로 들어갈 때 속도를 0으로 초기화
    setAnimationSpeed(0)
    setIsFullscreen(true)
    
    // Fullscreen API를 사용하여 브라우저 UI 숨기기
    if (fullscreenRef.current) {
      try {
        if (fullscreenRef.current.requestFullscreen) {
          await fullscreenRef.current.requestFullscreen()
        } else if ((fullscreenRef.current as any).webkitRequestFullscreen) {
          await (fullscreenRef.current as any).webkitRequestFullscreen()
        } else if ((fullscreenRef.current as any).mozRequestFullScreen) {
          await (fullscreenRef.current as any).mozRequestFullScreen()
        } else if ((fullscreenRef.current as any).msRequestFullscreen) {
          await (fullscreenRef.current as any).msRequestFullscreen()
        }
      } catch (error) {
        console.log('Fullscreen API not supported or failed:', error)
      }
    }
  }

  const exitFullscreen = async () => {
    setIsFullscreen(false)
    
    // Fullscreen API 종료
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
    } catch (error) {
      console.log('Exit fullscreen failed:', error)
    }
  }

  // 풀스크린 모드일 때 body에 클래스 추가/제거
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('led-board-fullscreen-active')
    } else {
      document.body.classList.remove('led-board-fullscreen-active')
    }
    
    return () => {
      document.body.classList.remove('led-board-fullscreen-active')
    }
  }, [isFullscreen])

  // Fullscreen API 이벤트 리스너 (사용자가 ESC 키로 나갈 때 처리)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      
      if (!isCurrentlyFullscreen && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isFullscreen])

  if (isFullscreen) {
    return (
      <div
        ref={fullscreenRef}
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

        {/* 닫기 버튼 - 왼쪽 상단 */}
        <div
          className="led-board-exit-container"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="led-board-exit" onClick={exitFullscreen}>
            ✕ 닫기
          </button>
        </div>

        {/* 이동 속도 조절 - 오른쪽 상단 */}
        <div
          className="led-board-speed-control-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="speed-control">
            <label>이동 속도: {animationSpeed}</label>
            <input
              type="range"
              min="0"
              max="10"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="speed-slider"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="led-board-container">
      <div
        className="page-back-button"
        style={{left:'40px', top:'40px'}}
        onClick={() => navigate('/admin/events?tab=기타',{replace:true})}
      >
        ←
      </div>
      <div className="led-board-preview" ref={previewContainerRef}>
        <div
          ref={previewTextRef}
          className="led-board-display"
          style={{
            backgroundColor,
            color: textColor,
            fontSize: `${previewFontSize}px`,
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
