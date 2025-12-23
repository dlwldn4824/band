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
                <div className="timeline-dot">{index + 1}</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-content">
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
      </div>
    </>
  )
}

export default Events

