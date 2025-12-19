import { useState } from 'react'
import { useData, GuestbookMessage } from '../contexts/DataContext'
import './Guestbook.css'

const ORNAMENT_POSITIONS = [
  { x: 50, y: 26 },
  { x: 42, y: 32 },
  { x: 58, y: 32 },
  { x: 35, y: 40 },
  { x: 65, y: 40 },
  { x: 45, y: 48 },
  { x: 55, y: 48 },
]

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

    const position =
      ORNAMENT_POSITIONS[
        guestbookMessages.length % ORNAMENT_POSITIONS.length
      ]

    addGuestbookMessage({
      id: Date.now().toString(),
      name,
      message,
      timestamp: Date.now(),
      ornamentType: selectedType,
      position,
    })

    setName('')
    setMessage('')
    setSelectedType(null)
    setWriteOpen(false)
  }

  return (
    <div className="guestbook-page">
      <div className="tree-container">
        {guestbookMessages.map((msg) => (
          <div
            key={msg.id}
            className={`ornament ${msg.ornamentType}`}
            style={{
              left: `${msg.position?.x ?? 50}%`,
              top: `${msg.position?.y ?? 50}%`,
            }}
            onClick={() => setViewMessage(msg)}
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

