import { useAuth } from '../contexts/AuthContext'
import { useEffect, useRef } from 'react'
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

  // 디버깅용 콘솔 로그
  useEffect(() => {
    console.log('=== [Ticket] 컴포넌트 렌더링 ===')
    console.log('[Ticket] user 전체 객체:', user)
    console.log('[Ticket] user 존재 여부:', !!user)
    console.log('[Ticket] user?.entryNumber 값:', user?.entryNumber)
    console.log('[Ticket] user?.entryNumber 타입:', typeof user?.entryNumber)
    console.log('[Ticket] user?.entryNumber === undefined:', user?.entryNumber === undefined)
    console.log('[Ticket] user?.entryNumber === null:', user?.entryNumber === null)
    console.log('[Ticket] user?.entryNumber === 0:', user?.entryNumber === 0)
    console.log('[Ticket] user?.entryNumber truthy 체크:', !!user?.entryNumber)
    console.log('[Ticket] 조건문 결과 (user?.entryNumber):', user?.entryNumber)
    console.log('[Ticket] 스탬프 표시 여부:', !!user?.entryNumber)
    
    // DOM 요소 확인
    if (stampRef.current) {
      console.log('[Ticket] ✅ 스탬프 DOM 요소 존재:', stampRef.current)
      console.log('[Ticket] 스탬프 computed style:', window.getComputedStyle(stampRef.current))
      console.log('[Ticket] 스탬프 display:', window.getComputedStyle(stampRef.current).display)
      console.log('[Ticket] 스탬프 visibility:', window.getComputedStyle(stampRef.current).visibility)
      console.log('[Ticket] 스탬프 opacity:', window.getComputedStyle(stampRef.current).opacity)
      console.log('[Ticket] 스탬프 z-index:', window.getComputedStyle(stampRef.current).zIndex)
      console.log('[Ticket] 스탬프 position:', window.getComputedStyle(stampRef.current).position)
      console.log('[Ticket] 스탬프 top:', window.getComputedStyle(stampRef.current).top)
      console.log('[Ticket] 스탬프 right:', window.getComputedStyle(stampRef.current).right)
    } else {
      console.log('[Ticket] ❌ 스탬프 DOM 요소 없음 - 조건문이 false였거나 렌더링 안됨')
    }
    console.log('================================')
  }, [user])

  // 렌더링 시점 로그
  console.log('[Ticket] 렌더링 시점 - user?.entryNumber:', user?.entryNumber)
  console.log('[Ticket] 렌더링 시점 - 조건문 평가:', user?.entryNumber ? 'TRUE (스탬프 렌더링)' : 'FALSE (스탬프 숨김)')

  return (
    <div className="ticket">
      <div className="ticket-header">
        <h2>🎫 티켓</h2>
      </div>
      <div className="ticket-content">
        {(() => {
          const shouldShowStamp = !!user?.entryNumber
          if (!shouldShowStamp) {
            console.log('[Ticket] ⚠️ 스탬프 렌더링 안됨 - user?.entryNumber가 falsy:', user?.entryNumber)
          }
          return shouldShowStamp ? (
            <div 
              ref={stampRef}
              className="ticket-entry-stamp"
              style={{ 
                border: '4px solid #d32f2f',
                display: 'block'
              }}
            >
              <div className="ticket-entry-stamp-title">입장번호</div>
              <div className="ticket-entry-stamp-number">{user.entryNumber}</div>
              <div className="ticket-entry-stamp-subtitle">번</div>
            </div>
          ) : null
        })()}
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

