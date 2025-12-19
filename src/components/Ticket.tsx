import { useAuth } from '../contexts/AuthContext'
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

  return (
    <div className="ticket">
      <div className="ticket-header">
        <h2>🎫 티켓</h2>
      </div>
      <div className="ticket-content">
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
            <span className="ticket-label">공연장</span>
            <span className="ticket-value">{ticket.venue || '미정'}</span>
          </div>
          {(ticket.seat || user?.entryNumber) && (
            <div className="ticket-fields-with-stamp">
              <div className="ticket-stamp-area">
                {user?.checkedIn && (
                  <img 
                    src="src/assets/배경/실링왁스.png" 
                    alt="체크인 도장" 
                    className="ticket-stamp"
                  />
                )}
              </div>
              <div className="ticket-fields-group">
                {ticket.seat && (
                  <div className="ticket-field ticket-field-in-group">
                    <span className="ticket-label">좌석</span>
                    <span className="ticket-value">{ticket.seat}</span>
                  </div>
                )}
                {user?.entryNumber && (
                  <div className="ticket-field ticket-field-in-group">
                    <span className="ticket-label">입장 순서</span>
                    <span className="ticket-value">{user.entryNumber}번</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ticket

