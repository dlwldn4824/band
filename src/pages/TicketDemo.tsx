import { useState, useEffect } from 'react'
import TicketTransition from '../components/TicketTransition'
import ticketImage from '../assets/배경/입장전티켓.png'
import './TicketDemo.css'

const TicketDemo = () => {
  const [showTicket, setShowTicket] = useState(true)
  const [animationCount, setAnimationCount] = useState(0)

  useEffect(() => {
    // 페이지 로드 시 자동으로 애니메이션 시작
    setShowTicket(true)
  }, [])

  const handleAnimationDone = () => {
    // 애니메이션이 끝나면 잠시 후 다시 시작
    setShowTicket(false)
    setTimeout(() => {
      setAnimationCount(prev => prev + 1)
      setShowTicket(true)
    }, 500) // 0.5초 후 다시 시작
  }

  return (
    <div className="ticket-demo-page">
      <div className="ticket-demo-header">
        <h1>티켓 애니메이션 데모</h1>
        <p>애니메이션 재생 횟수: {animationCount}</p>
        <button 
          onClick={() => {
            setShowTicket(false)
            setTimeout(() => {
              setAnimationCount(0)
              setShowTicket(true)
            }, 300)
          }}
          className="reset-button"
        >
          리셋
        </button>
      </div>

      {showTicket && (
        <TicketTransition
          key={animationCount}
          ticketImageUrl={ticketImage}
          info={{
            name: '데모 사용자',
            date: new Date().toLocaleDateString(),
            seat: 'STANDING',
          }}
          onDone={handleAnimationDone}
        />
      )}
    </div>
  )
}

export default TicketDemo

