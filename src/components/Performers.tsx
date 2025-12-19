import { useState } from 'react'
import './Performers.css'
import { SetlistItem } from '../contexts/DataContext'

interface PerformersProps {
  performers: string[]
  setlist: SetlistItem[]
}

const Performers = ({ performers, setlist }: PerformersProps) => {
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  // 세션별로 공연진 그룹화
  const groupPerformersBySession = () => {
    const sessionGroups: { [key: string]: string[] } = {
      '보컬': [],
      '기타': [],
      '베이스': [],
      '키보드': [],
      '드럼': []
    }

    performers.forEach((performerName) => {
      setlist.forEach((item) => {
        const extractMembers = (members: string | undefined) => {
          if (!members || !members.trim() || members.trim() === '-') return []
          return members.split(',').map(m => m.trim()).filter(m => m && m !== '-')
        }
        
        if (extractMembers(item.vocal).includes(performerName)) {
          if (!sessionGroups['보컬'].includes(performerName)) {
            sessionGroups['보컬'].push(performerName)
          }
        }
        if (extractMembers(item.guitar).includes(performerName)) {
          if (!sessionGroups['기타'].includes(performerName)) {
            sessionGroups['기타'].push(performerName)
          }
        }
        if (extractMembers(item.bass).includes(performerName)) {
          if (!sessionGroups['베이스'].includes(performerName)) {
            sessionGroups['베이스'].push(performerName)
          }
        }
        if (extractMembers(item.keyboard).includes(performerName)) {
          if (!sessionGroups['키보드'].includes(performerName)) {
            sessionGroups['키보드'].push(performerName)
          }
        }
        if (extractMembers(item.drum).includes(performerName)) {
          if (!sessionGroups['드럼'].includes(performerName)) {
            sessionGroups['드럼'].push(performerName)
          }
        }
      })
    })

    // 각 세션별로 정렬
    Object.keys(sessionGroups).forEach(session => {
      sessionGroups[session].sort()
    })

    return sessionGroups
  }

  const sessionGroups = groupPerformersBySession()
  const sessionEmojis: { [key: string]: string } = {
    '보컬': '🎤',
    '기타': '🎸',
    '베이스': '🎸',
    '키보드': '🎹',
    '드럼': '🥁'
  }

  const sessions = ['보컬', '기타', '베이스', '키보드', '드럼']

  return (
    <div className="performers">
      <div className="performers-header">
        <h2>공연진</h2>
        <div className="performers-filters">
          <button
            className={`filter-button ${selectedSession === null ? 'active' : ''}`}
            onClick={() => setSelectedSession(null)}
          >
            전체
          </button>
          {sessions.map(session => (
            <button
              key={session}
              className={`filter-button ${selectedSession === session ? 'active' : ''}`}
              onClick={() => setSelectedSession(selectedSession === session ? null : session)}
            >
              {sessionEmojis[session]} {session}
            </button>
          ))}
        </div>
      </div>
      <div className="performers-content">
        {sessions.map(session => {
          const performersInSession = sessionGroups[session]
          if (performersInSession.length === 0) return null
          if (selectedSession !== null && selectedSession !== session) return null

          return (
            <div key={session} className="performers-session-group">
              <div className="session-header">
                <span className="session-emoji">{sessionEmojis[session]}</span>
                <span className="session-label">{session}:</span>
                <span className="session-members">
                  {performersInSession.join(', ')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Performers

