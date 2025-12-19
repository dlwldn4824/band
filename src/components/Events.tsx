import './Events.css'

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
    <div className="events">
      <div className="events-header">
        <h2>타임라인</h2>
      </div>
      <div className="events-content">
        <div className="events-list">
          {events.map((event, index) => (
            <div key={index} className="event-card">
              <div className="event-header">
                <h3 className="event-title">{event.title}</h3>
                {event.time && (
                  <span className="event-time">{event.time}</span>
                )}
              </div>
              {event.description && (
                <p className="event-description">{event.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Events

