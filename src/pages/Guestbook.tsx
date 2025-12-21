import { useState } from 'react'
import { useData, GuestbookMessage } from '../contexts/DataContext'
import './Guestbook.css'

// 층별 오너먼트 위치 생성 함수 (트리 삼각형 형태에 맞춤)
const generateOrnamentPositions = () => {
  const positions: Array<{ x: number; y: number; scale: number; layer: 'back' | 'front' }> = []
  
  // 층 정의: [y 위치, 개수, 좌우 폭 범위(%), 크기 범위, 레이어]
  const layers = [
    // 1층 (맨 위) - 1~2개, 좁게
    { y: 22, count: 1, widthRange: 8, scaleRange: [0.65, 0.75], layer: 'back' as const },
    { y: 25, count: 1, widthRange: 10, scaleRange: [0.7, 0.8], layer: 'front' as const },
    
    // 2층 - 3개
    { y: 30, count: 1, widthRange: 12, scaleRange: [0.7, 0.8], layer: 'back' as const },
    { y: 35, count: 2, widthRange: 15, scaleRange: [0.85, 0.95], layer: 'front' as const },
    
    // 3층 - 4개
    { y: 40, count: 2, widthRange: 18, scaleRange: [0.7, 0.8], layer: 'back' as const },
    { y: 45, count: 2, widthRange: 20, scaleRange: [0.9, 1.0], layer: 'front' as const },
    
    // 4층 - 5개
    { y: 45, count: 2, widthRange: 22, scaleRange: [0.65, 0.75], layer: 'back' as const },
    { y: 50, count: 3, widthRange: 25, scaleRange: [0.85, 1.0], layer: 'front' as const },
    
    // 5층 - 6개
    { y: 55, count: 3, widthRange: 28, scaleRange: [0.7, 0.8], layer: 'back' as const },
    { y: 60, count: 3, widthRange: 30, scaleRange: [0.9, 1.05], layer: 'front' as const },
    
    // 6층 - 7개
    { y: 65, count: 3, widthRange: 32, scaleRange: [0.65, 0.75], layer: 'back' as const },
    { y: 70, count: 4, widthRange: 35, scaleRange: [0.85, 1.0], layer: 'front' as const },
   
  ]
  
  layers.forEach(({ y, count, widthRange, scaleRange, layer }) => {
    const centerX = 50 // 트리 중앙
    const spacing = widthRange / (count + 1)
    
    for (let i = 0; i < count; i++) {
      // 중앙 기준 좌우로 흔들기 (±widthRange의 0.35~0.45)
      const offset = (i + 1) * spacing - widthRange / 2
      const x = centerX + offset
      
      // 크기 랜덤 (scaleRange 내)
      const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0])
      
      positions.push({ x, y, scale, layer })
    }
  })
  
  return positions
}

const ORNAMENT_POSITIONS = generateOrnamentPositions()

const ORNAMENT_TYPES = ['guitar', 'bass', 'mic', 'drum', 'keyboard']

const Guestbook = () => {
  const { guestbookMessages, addGuestbookMessage } = useData()

  const [writeOpen, setWriteOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [viewMessage, setViewMessage] =
    useState<GuestbookMessage | null>(null)

  const handleSubmit = () => {
    if (!selectedType || !name.trim() || !message.trim()) {
      alert('모두 입력해주세요.')
      return
    }

    const posIndex = guestbookMessages.length % ORNAMENT_POSITIONS.length
    const pos = ORNAMENT_POSITIONS[posIndex]

    addGuestbookMessage({
      id: Date.now().toString(),
      name,
      message,
      timestamp: Date.now(),
      ornamentType: selectedType,
      position: { x: pos.x, y: pos.y },
    })

    setName('')
    setMessage('')
    setSelectedType(null)
    setWriteOpen(false)
  }

  // 데모: 최대 개수까지 오너먼트 표시
  const demoOrnaments = ORNAMENT_POSITIONS.slice(guestbookMessages.length).map((pos, index) => ({
    id: `demo-${guestbookMessages.length + index}`,
    position: { x: pos.x, y: pos.y },
    ornamentType: ORNAMENT_TYPES[(guestbookMessages.length + index) % ORNAMENT_TYPES.length],
    name: `데모 ${guestbookMessages.length + index + 1}`,
    message: `데모 메시지 ${guestbookMessages.length + index + 1}`,
    timestamp: Date.now() - (guestbookMessages.length + index) * 1000,
    scale: pos.scale,
    layer: pos.layer,
  }))

  // 실제 메시지와 데모 오너먼트 합치기 (데모용)
  const allOrnaments = [
    ...guestbookMessages.map((msg, idx) => ({
      ...msg,
      scale: ORNAMENT_POSITIONS[idx]?.scale ?? 1,
      layer: ORNAMENT_POSITIONS[idx]?.layer ?? 'front',
    })),
    ...demoOrnaments,
  ]

  return (
    <div className="guestbook-page">
      <div className="tree-container">
        {/* 뒤 레이어 (트리 뒤에) */}
        {allOrnaments
          .filter((msg) => msg.layer === 'back')
          .map((msg) => (
            <div
              key={msg.id}
              className={`ornament ornament-back ${msg.ornamentType}`}
              style={{
                left: `${msg.position?.x ?? 50}%`,
                top: `${msg.position?.y ?? 50}%`,
                transform: `scale(${msg.scale ?? 1})`,
              }}
              onClick={() => {
                if (!msg.id.startsWith('demo-')) {
                  setViewMessage(msg as GuestbookMessage)
                }
              }}
            />
          ))}
        
        {/* 앞 레이어 (트리 위에) */}
        {allOrnaments
          .filter((msg) => msg.layer === 'front')
          .map((msg) => (
            <div
              key={msg.id}
              className={`ornament ornament-front ${msg.ornamentType}`}
              style={{
                left: `${msg.position?.x ?? 50}%`,
                top: `${msg.position?.y ?? 50}%`,
                transform: `scale(${msg.scale ?? 1})`,
              }}
              onClick={() => {
                if (!msg.id.startsWith('demo-')) {
                  setViewMessage(msg as GuestbookMessage)
                }
              }}
            />
          ))}

        <button
          className="add-message-button"
          onClick={() => setWriteOpen(true)}
        >
          방명록 작성하기
        </button>
      </div>

      {/* 작성 모달 */}
      {writeOpen && (
        <div className="modal-overlay" onClick={() => setWriteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>오너먼트 선택</h3>

            <div className="ornament-select">
              {ORNAMENT_TYPES.map((type) => (
                <div
                  key={type}
                  className={`select-box ${type} ${
                    selectedType === type ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedType(type)}
                />
              ))}
            </div>

            <input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              placeholder="메시지"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="form-buttons">
              <button className="submit-button" onClick={handleSubmit}>
                완료
              </button>
              <button
                className="cancel-button"
                onClick={() => setWriteOpen(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메시지 보기 모달 */}
      {viewMessage && (
        <div
          className="modal-overlay"
          onClick={() => setViewMessage(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>{viewMessage.name}</h4>
            <p>{viewMessage.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Guestbook

