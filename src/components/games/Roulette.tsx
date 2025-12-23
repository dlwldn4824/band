import { useState } from 'react'
import './Game.css'

const Roulette = () => {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<string>('')
  const [rotation, setRotation] = useState(0)

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

  const spin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setResult('')

    // 랜덤한 각도 계산 (최소 5바퀴 이상 회전)
    const baseRotation = 360 * 5
    const randomAngle = Math.random() * 360
    const totalRotation = baseRotation + randomAngle
    const finalRotation = rotation + totalRotation

    setRotation(finalRotation)

    // 회전이 끝난 후 결과 계산
    setTimeout(() => {
      const normalizedAngle = (360 - (finalRotation % 360)) % 360
      const itemIndex = Math.floor((normalizedAngle / 360) * items.length)
      const selectedItem = items[itemIndex]
      
      setResult(selectedItem)
      setIsSpinning(false)
    }, 3000) // 3초 회전 애니메이션
  }

  const itemAngle = 360 / items.length

  return (
    <div className="game-container">
      <div className="roulette-header">
        <h2>🎰 룰렛</h2>
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
                  style={{
                    transform: `rotate(${angle}deg)`,
                    '--item-angle': `${itemAngle}deg`,
                    '--item-rotation': `${-angle}deg`,
                  } as React.CSSProperties}
                >
                  <div className="roulette-item-content">
                    {item}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="roulette-pointer"></div>
        </div>
      </div>

      <div className="roulette-footer">
        {result && (
          <div className="roulette-result">
            <div className="result-text">결과: {result}</div>
          </div>
        )}

        <div className="game-controls">
          <button 
            onClick={spin} 
            className="game-button" 
            disabled={isSpinning}
          >
            {isSpinning ? '회전 중...' : '룰렛 돌리기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Roulette

