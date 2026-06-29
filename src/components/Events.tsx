import { useNavigate, useLocation } from 'react-router-dom'
import { trackEvent } from '../analytics'
import './Events.css'
import {
  getOrderedTimelineEvents,
  getStoragePartForSectionTitle,
} from '../utils/performanceEvents'
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
  const orderedEvents = getOrderedTimelineEvents(events)
  
  const isAdminPage = location.pathname.startsWith('/admin')
  
  const handleEventClick = (displayIndex: number) => {
    if (displayIndex === 0) return

    const event = orderedEvents[displayIndex]
    const storagePart = getStoragePartForSectionTitle(event?.title || '', events)
    void trackEvent('timeline_event_clicked', {
      event_index: displayIndex,
      event_title: event?.title || '',
      target_part: String(storagePart),
    })
    void trackEvent('cta_clicked', { cta_name: 'timeline_footer', source_page: location.pathname })

    const path = isAdminPage ? '/admin/performances' : '/performances'
    navigate(path, { state: { part: storagePart } })
  }

  const handleSetlistClick = () => {
    void trackEvent('cta_clicked', { cta_name: 'setlist_link', source_page: location.pathname })
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
          
          {orderedEvents.map((event, index) => {
            const isGuestEntry = index === 0
            const isClickable = index > 0
            
            return (
              <div key={index} className="timeline-row">
                <div className="timeline-rail-item">
                  <div 
                    className={`timeline-dot ${isGuestEntry ? 'no-hover' : ''}`}
                    style={{ cursor: isClickable ? 'pointer' : 'default' }}
                    onClick={() => isClickable && handleEventClick(index)}
                  >
                    {index}
                  </div>
                </div>
                <div className="timeline-item">
                  <div 
                    className={`timeline-content ${isGuestEntry ? 'no-hover' : ''}`}
                    style={{ cursor: isClickable ? 'pointer' : 'default' }}
                    onClick={() => isClickable && handleEventClick(index)}
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
            )
          })}
        </div>
        <p className="timeline-footer-text" onClick={handleSetlistClick}>
          타임라인의 텍스트를 클릭하면 공연정보에서 <br/> 셋리스트를 확인할 수 있습니다
        </p>
      </div>
    </>
  )
}

export default Events
