import { useAuth } from '../contexts/AuthContext'
import { useRef } from 'react'
import './Ticket.css'

interface TicketProps {
  ticket: {
    eventName: string
    date: string
    venue: string
    seat?: string
  }
}

const Ticket = ({ ticket }: TicketProps) => {
  const { user } = useAuth()
  const stampRef = useRef<HTMLDivElement>(null)

  return (
    <div className="ticket">
      <div className="ticket-header">
        <h2>🎫 티켓</h2>
      </div>
      <div className="ticket-content">
        {user?.entryNumber ? (
          <div
            ref={stampRef}
            className="ticket-entry-stamp"
            style={{
              border: '4px solid #d32f2f',
              display: 'block',
            }}
          >
            <div className="ticket-entry-stamp-type">
              {user.isWalkIn ? '현장예약' : '사전예약'}
            </div>
            <div className="ticket-entry-stamp-title">입장번호 {user.entryNumber}번!</div>
          </div>
        ) : null}
        <div className="ticket-info">
          <div className="ticket-field">
            <span className="ticket-label">공연명</span>
            <span className="ticket-value">{ticket.eventName}</span>
          </div>
          <div className="ticket-field">
            <span className="ticket-label">날짜</span>
            <span className="ticket-value">{ticket.date || '미정'}</span>
          </div>
          <div className="ticket-field">
            <span className="ticket-label">장소</span>
            <span className="ticket-value">{ticket.venue}</span>
          </div>
          {ticket.seat && (
            <div className="ticket-field">
              <span className="ticket-label">좌석</span>
              <span className="ticket-value">{ticket.seat}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ticket
