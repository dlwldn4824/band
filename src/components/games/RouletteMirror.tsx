import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import './Game.css'
import { useNavigate } from 'react-router-dom'

interface RouletteState {
  isSpinning: boolean
  rotation: number
  result: string
  items: string[]
  startTime?: any
}

const RouletteMirror = () => {
  const { isAdmin } = useAuth()
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<string>('')
  const [rotation, setRotation] = useState(0)
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null)
  const gameRef = doc(db, 'roulette', 'current')
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startRotationRef = useRef(0)
  const isFirstSnapshotRef = useRef(true)
  const navigate = useNavigate()



  const items = [
    '상품 1',
    '상품 2',
    '상품 3',
    '상품 4',
    '상품 5',
    '상품 6',
    '상품 7',
    '상품 8',
  ]

  useEffect(() => {
    // 실시간 게임 상태 구독
    unsubscribeRef.current = onSnapshot(
      gameRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as RouletteState
          setIsSpinning(data.isSpinning || false)
        setResult(data.result || '')
        
        if(isFirstSnapshotRef.current){
          isFirstSnapshotRef.current=false
          setIsSpinning(false)
          setAnimationStartTime(null)
          setResult('')
          return
        }
        if (data.isSpinning && data.startTime) {
          // 회전 시작 시간이 있으면 애니메이션 시작
          const startTime = data.startTime.toMillis()
          startRotationRef.current = data.rotation || 0
          setAnimationStartTime(startTime)
        } else {
          setRotation(data.rotation || 0)
          setAnimationStartTime(null)
        }
      } else {
        // 초기화
        setIsSpinning(false)
        setResult('')
        setRotation(0)
        setAnimationStartTime(null)
      }
    },
    (error) => {
      console.error('[RouletteMirror] 게임 상태 구독 오류:', error)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // 애니메이션 프레임 업데이트
  useEffect(() => {
    if (isSpinning || !animationStartTime) return

      const duration = 3000
      const targetRotation = startRotationRef.current

      const animate = () => {
        const now = Date.now()
        const elapsed = now - animationStartTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1- progress, 3)

        setRotation(targetRotation * easeOut)

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animate()

    }, [isSpinning, animationStartTime])

  // 운영진: 룰렛 돌리기
  const spin = async () => {
    if (isSpinning) return

    // 랜덤한 각도 계산 (최소 5바퀴 이상 회전)
    const baseRotation = 360 * 5
    const randomAngle = Math.random() * 360
    const totalRotation = rotation + baseRotation + randomAngle
    const finalRotation = totalRotation

    // Firestore에 상태 저장
    await setDoc(gameRef, {
      isSpinning: true,
      rotation: finalRotation,
      result: '',
      items: items,
      startTime: serverTimestamp()
    })

    // 회전이 끝난 후 결과 계산
    setTimeout(async () => {
      const normalizedAngle = (360 - (finalRotation % 360)) % 360
      const itemIndex = Math.floor((normalizedAngle / 360) * items.length)
      const selectedItem = items[itemIndex]
      
      await setDoc(gameRef, {
        isSpinning: false,
        rotation: finalRotation,
        result: selectedItem,
        items: items
      }, { merge: true })
    }, 3000) // 3초 회전 애니메이션
  }

  const itemAngle = 360 / items.length

  return (
    <div className="game-container">
      <div
        className="page-back-button"
        style={{left:'30px'}}
        onClick={() => navigate('/admin/events?tab=기타',{replace:true})}
      >
        ←
      </div>
      <div className="roulette-header">
        <h2>룰렛</h2>
      </div>
      
      <div className="roulette-body">
        <div className="roulette-container">
          <div 
            className={`roulette-wheel ${isSpinning ? 'spinning' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {items.map((item, index) => {
              const angle = index * itemAngle
              return (
                <div
                  key={index}
                  className="roulette-item"
                  style={{['--angle' as any]: `${angle}deg`}}
                >
                  <div
                    className="roulette-item-content"
                  >
                    {item}
                  </div>
                </div>
              )
            })}

            <div className='roulette-center'>Luck</div>
          </div>
          <div className="roulette-pointer"></div>
        </div>
      </div>

      <div className="roulette-footer">
        {!isSpinning && result && (
          <div className="roulette-result">
            <div className="result-text">결과: {result}</div>
          </div>
        )}

        {isAdmin && (
          <div className="game-controls">
            <button 
              onClick={spin} 
              className="game-button" 
              disabled={isSpinning}
            >
              {isSpinning ? '회전 중...' : '룰렛 돌리기'}
            </button>
          </div>
        )}
        {!isAdmin && isSpinning && (
          <div className="game-controls">
            <div className="game-button" style={{ background: '#ccc', cursor: 'default' }}>
              회전 중...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RouletteMirror



