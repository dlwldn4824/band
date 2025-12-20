import { useState } from 'react'
import { useData, SetlistItem } from '../contexts/DataContext'
import demoImage from '../assets/배경/데모 이미지.png'
import './Performances.css'

const Performances = () => {
  const { performanceData } = useData()
  const [selectedSong, setSelectedSong] = useState<SetlistItem | null>(null)

  const getSessionInfo = (item: SetlistItem) => {
    const sessions: { [key: string]: string[] } = {
      '보컬': [],
      '기타': [],
      '베이스': [],
      '키보드': [],
      '드럼': []
    }

    const extractMembers = (members: string | undefined, sessionName: string) => {
      if (!members || !members.trim() || members.trim() === '-') return
      members.split(',').map(m => m.trim()).filter(m => m && m !== '-').forEach(member => {
        if (!sessions[sessionName].includes(member)) {
          sessions[sessionName].push(member)
        }
      })
    }

    extractMembers(item.vocal, '보컬')
    extractMembers(item.guitar, '기타')
    extractMembers(item.bass, '베이스')
    extractMembers(item.keyboard, '키보드')
    extractMembers(item.drum, '드럼')

    return sessions
  }

  if (!performanceData?.setlist || performanceData.setlist.length === 0) {
    return (
      <div className="performances-page">
        <div className="empty-state">
          <p>공연 정보가 아직 설정되지 않았습니다.</p>
          <p>관리자 페이지에서 공연 정보를 설정해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="performances-page">
      <div className="performances-content">
        {/* 곡 버튼 그리드 */}
        <div className="setlist-grid-section">
          <div className="setlist-grid-header">전체 셋리스트</div>
          <div className="setlist-grid">
            {performanceData.setlist.map((item, index) => (
              <button
                key={index}
                className={`song-button ${selectedSong === item ? 'selected' : ''}`}
                onClick={() => setSelectedSong(item)}
              >
                <div className="song-button-number">{index + 1}</div>
                <div className="song-button-info">
                  <div className="song-button-title">{item.songName}</div>
                  {item.artist && (
                    <div className="song-button-artist">{item.artist}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 선택된 곡 정보 표시 */}
        {selectedSong && (
          <div className="song-detail-modal">
            <div className="song-detail-content">
              <button 
                className="song-detail-close"
                onClick={() => setSelectedSong(null)}
              >
                ×
              </button>

              {/* 데모 이미지 */}
              <div className="song-image-container">
                <img 
                  src={selectedSong.image || demoImage} 
                  alt={`${selectedSong.songName} 이미지`}
                  className="song-image"
                />
              </div>

              {/* 곡 정보 */}
              <div className="song-info">
                <h2 className="song-title">{selectedSong.songName}</h2>
                {selectedSong.artist && (
                  <p className="song-artist">{selectedSong.artist}</p>
                )}
              </div>

              {/* 세션 정보 */}
              <div className="session-info">
                <h3 className="session-title">세션 정보</h3>
                <div className="session-list">
                  {Object.entries(getSessionInfo(selectedSong)).map(([session, members]) => {
                    if (members.length === 0) return null
                    return (
                      <div key={session} className="session-item">
                        <span className="session-label">{session}</span>
                        <span className="session-members">{members.join(', ')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Performances
