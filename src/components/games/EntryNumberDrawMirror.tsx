import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import './Game.css'
import { useNavigate } from 'react-router-dom'

interface DrawState {
  isDrawing: boolean
  currentNumber: number | null
  selectedGuest: { name: string; entryNumber: number } | null
  startTime?: any
  eligibleGuests: Array<{ name: string; entryNumber: number }>
}

const EntryNumberDrawMirror = () => {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { guests } = useData()
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [eligibleGuests, setEligibleGuests] = useState<Array<{ name: string; entryNumber: number }>>([])
  const gameRef = doc(db, 'entryDraw', 'current')
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    // 실시간 게임 상태 구독
    unsubscribeRef.current = onSnapshot(
      gameRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as DrawState
          setIsDrawing(data.isDrawing || false)
          setCurrentNumber(data.currentNumber ?? null)
          
          if (data.isDrawing && data.startTime) {
            // 애니메이션 시작
            const startTime = data.startTime.toMillis()
            const minDuration = 2000
            const maxDuration = 4000
            const duration = minDuration + Math.random() * (maxDuration - minDuration)
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
                if (data.eligibleGuests.length > 0) {
                  const randomIndex = Math.floor(Math.random() * data.eligibleGuests.length)
                  setCurrentNumber(data.eligibleGuests[randomIndex].entryNumber)
                }

                animationRef.current = setTimeout(animate, interval)
              } else {
                // 최종 결과
                if (data.selectedGuest) {
                  setCurrentNumber(data.selectedGuest.entryNumber)
                }
                setIsDrawing(false)
              }
            }

            animate()
          }
        } else {
          // 초기화
          setIsDrawing(false)
          setCurrentNumber(null)
        }
      },
      (error) => {
        console.error('[EntryNumberDraw] 게임 상태 구독 오류:', error)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [])

  // 운영진: 추첨 시작
  const draw = async () => {
    if (isDrawing || eligibleGuests.length === 0) return

    // 랜덤으로 선택할 게스트
    const randomIndex = Math.floor(Math.random() * eligibleGuests.length)
    const winner = eligibleGuests[randomIndex]

    // 최소 2초, 최대 4초 동안 애니메이션
    const minDuration = 2000
    const maxDuration = 4000
    const duration = minDuration + Math.random() * (maxDuration - minDuration)

    // Firestore에 상태 저장
    await setDoc(gameRef, {
      isDrawing: true,
      currentNumber: null,
      selectedGuest: null,
      startTime: serverTimestamp(),
      eligibleGuests: eligibleGuests
    })

    // 애니메이션 종료 후 결과 저장
    setTimeout(async () => {
      await setDoc(gameRef, {
        isDrawing: false,
        currentNumber: winner.entryNumber,
        selectedGuest: winner,
        eligibleGuests: eligibleGuests
      }, { merge: true })
    }, duration)
  }

  return (
    <div className="game-container">
      <div
        className="page-back-button"
        style={{left:'30px'}}
        onClick={()=> navigate('/admin/events?tab=기타',{replace:true})}
      >
        ←
      </div>
      <div className="roulette-header">
        <div className="draw-header-title">
          <span className="draw-dice-icon">🎲</span>
          <h2>입장 번호 추첨</h2>
          <span className="draw-dice-icon">🎲</span>
        </div>
      </div>

      <div className="roulette-body">
        <div className="draw-container">
          <div className="draw-info">
            <p className="draw-count">
              체크인 완료: <strong>{eligibleGuests.length}명</strong>
            </p>
            {eligibleGuests.length > 0 && (
              <p className="draw-range">
                *입장 번호 범위: <strong className="draw-range-number">{eligibleGuests[0].entryNumber}번 ~ {eligibleGuests[eligibleGuests.length - 1].entryNumber}번</strong>
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

            {currentNumber !== null && (() => {
              // currentNumber에 해당하는 게스트 찾기
              const matchedGuest = eligibleGuests.find(g => g.entryNumber === currentNumber)
              if (matchedGuest) {
                return (
                  <div className="draw-result">
                    <div className="result-name-container">
                      <div className="result-name">{matchedGuest.name}님</div>
                    </div>
                    <div className="result-number">입장 번호: {currentNumber}번</div>
                  </div>
                )
              }
              return null
            })()}
          </div>
        </div>
      </div>

      <div className="roulette-footer">
        {isAdmin && (
          <div className="game-controls">
            <button 
              onClick={draw} 
              className="game-button" 
              disabled={isDrawing || eligibleGuests.length === 0}
            >
              {isDrawing ? '추첨 중...' : eligibleGuests.length === 0 ? '체크인된 게스트가 없습니다' : '추첨 시작'}
            </button>
          </div>
        )}
        {!isAdmin && isDrawing && (
          <div className="game-controls">
            <div className="game-button" style={{ background: '#ccc', cursor: 'default' }}>
              추첨 중...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EntryNumberDrawMirror



