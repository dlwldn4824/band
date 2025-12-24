import { useNavigate, useLocation } from 'react-router-dom'
import './Events.css'
import clockIcon from '../assets/배경/시계이미지.png'

interface Event {
  title: string
  description: string
  time?: string
}

interface EventsProps {
  events: Event[]
}

const Events = ({ events }: EventsProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 현재 경로가 admin인지 일반 사용자인지 확인
  const isAdminPage = location.pathname.startsWith('/admin')
  
  const handleEventClick = (eventTitle: string) => {
    // 1부 또는 2부인지 확인
    if (eventTitle.includes('1부')) {
      const path = isAdminPage ? '/admin/performances' : '/performances'
      navigate(path, { state: { part: 1 } })
    } else if (eventTitle.includes('2부')) {
      const path = isAdminPage ? '/admin/performances' : '/performances'
      navigate(path, { state: { part: 2 } })
    }
  }

  const handleSetlistClick = () => {
    const path = isAdminPage ? '/admin/performances' : '/performances'
    navigate(path)
  }
  
  return (
    <>
      <div className="events-header">
        <h2>타임라인</h2>
      </div>
      <div className="events">
        <div className="timeline">
          <div className="timeline-rail">
            <div className="timeline-line"></div>
          </div>
          
          {events.map((event, index) => (
            <div key={index} className="timeline-row">
              <div className="timeline-rail-item">
                <div 
                  className="timeline-dot"
                  style={{ cursor: event.title.includes('부') ? 'pointer' : 'default' }}
                  onClick={() => handleEventClick(event.title)}
                >
                  {index + 1}
                </div>
              </div>
              <div className="timeline-item">
                <div 
                  className="timeline-content"
                  style={{ cursor: event.title.includes('부') ? 'pointer' : 'default' }}
                  onClick={() => handleEventClick(event.title)}
                >
                  <div className="event-header">
                    <h3 className="event-title">{event.title}</h3>
                    {event.time && (
                      <div className="event-time-box">
                        <img src={clockIcon} alt="시계" className="event-time-icon" />
                        <span className="event-time">{event.time}</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="timeline-footer-text" onClick={handleSetlistClick}>
          타임라인의 텍스트를 클릭하면 공연정보에서 셋리스트를 확인할 수 있습니다
        </p>
      </div>
    </>
  )
}

export default Events

