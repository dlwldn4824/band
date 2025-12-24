import { useState, useEffect, useRef } from 'react'
import { useData } from '../../contexts/DataContext'
import './Game.css'

const EntryNumberDraw = () => {
  const { guests } = useData()
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<{ name: string; entryNumber: number } | null>(null)
  const [eligibleGuests, setEligibleGuests] = useState<Array<{ name: string; entryNumber: number }>>([])
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)

  // 입장 번호가 있는 게스트들 필터링
  useEffect(() => {
    const checkedInGuests = guests
      .filter(guest => guest.checkedIn && guest.entryNumber !== undefined && guest.entryNumber !== null)
      .map(guest => ({
        name: guest.name || guest['이름'] || guest.Name || '알 수 없음',
        entryNumber: guest.entryNumber!
      }))
      .sort((a, b) => a.entryNumber - b.entryNumber)
    
    setEligibleGuests(checkedInGuests)
  }, [guests])

  const draw = () => {
    if (isDrawing || eligibleGuests.length === 0) return

    setIsDrawing(true)
    setSelectedGuest(null)
    startTimeRef.current = Date.now()

    // 최소 2초, 최대 4초 동안 애니메이션
    const minDuration = 2000
    const maxDuration = 4000
    const duration = minDuration + Math.random() * (maxDuration - minDuration)

    // 랜덤으로 선택할 게스트
    const randomIndex = Math.floor(Math.random() * eligibleGuests.length)
    const winner = eligibleGuests[randomIndex]

    // 애니메이션 시작
    const startAnimation = () => {
      const startTime = Date.now()
      const endTime = startTime + duration

      const animate = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const progress = elapsed / duration

        if (now < endTime) {
          // 빠르게 변하다가 점점 느려지게
          const speed = 1 - progress * 0.9 // 1에서 0.1로 감소
          const interval = Math.max(50, 500 * speed) // 50ms ~ 500ms

          // 랜덤 입장 번호 표시
          const randomIndex = Math.floor(Math.random() * eligibleGuests.length)
          setCurrentNumber(eligibleGuests[randomIndex].entryNumber)

          animationRef.current = setTimeout(animate, interval)
        } else {
          // 최종 결과
          setCurrentNumber(winner.entryNumber)
          setSelectedGuest(winner)
          setIsDrawing(false)
        }
      }

      animate()
    }

    startAnimation()
  }

  // 컴포넌트 언마운트 시 애니메이션 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  return (
    <div className="game-container">
      <div className="roulette-header">
        <h2>입장 번호 추첨</h2>
      </div>

      <div className="roulette-body">
        <div className="draw-container">
          <div className="draw-info">
            <p className="draw-count">
              체크인 완료: <strong>{eligibleGuests.length}명</strong>
            </p>
            {eligibleGuests.length > 0 && (
              <p className="draw-range">
                입장 번호 범위: {eligibleGuests[0].entryNumber}번 ~ {eligibleGuests[eligibleGuests.length - 1].entryNumber}번
              </p>
            )}
          </div>

          <div className="draw-display">
            {currentNumber !== null ? (
              <div className={`draw-number ${isDrawing ? 'drawing' : 'final'}`}>
                {currentNumber}
              </div>
            ) : (
              <div className="draw-number placeholder">
                ?
              </div>
            )}

            {selectedGuest && (
              <div className="draw-result">
                <div className="result-name">🎉 {selectedGuest.name}님</div>
                <div className="result-number">입장 번호: {selectedGuest.entryNumber}번</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="roulette-footer">
        <div className="game-controls">
          <button 
            onClick={draw} 
            className="game-button" 
            disabled={isDrawing || eligibleGuests.length === 0}
          >
            {isDrawing ? '추첨 중...' : eligibleGuests.length === 0 ? '체크인된 게스트가 없습니다' : '추첨 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EntryNumberDraw

