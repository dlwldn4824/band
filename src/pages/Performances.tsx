import { useState, useEffect } from 'react'
import { useData, SetlistItem } from '../contexts/DataContext'
import demoImage from '../assets/배경/데모 이미지.png'
import './Performances.css'

const Performances = () => {
  const { performanceData } = useData()
  const [selectedSong, setSelectedSong] = useState<SetlistItem | null>(null)
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null)
  const [selectedPart, setSelectedPart] = useState<1 | 2>(1)

  // 셋리스트 페이지에서만 body 스크롤 활성화
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    // 스크롤 활성화
    document.body.style.overflow = 'auto'
    document.body.style.position = 'relative'
    document.documentElement.style.overflow = 'auto'
    
    return () => {
      // 컴포넌트 언마운트 시 원래대로 복구
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

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

  // 1부/2부 구분
  const totalSongs = performanceData.setlist.length
  const part1Count = Math.ceil(totalSongs / 2)
  const part1Songs = performanceData.setlist.slice(0, part1Count)
  const part2Songs = performanceData.setlist.slice(part1Count)

  // 선택된 부에 따라 표시할 곡 목록
  const displaySongs = selectedPart === 1 ? part1Songs : part2Songs
  const startIndex = selectedPart === 1 ? 0 : part1Count

  return (
    <div className="performances-page">
      <div className="performances-content">
        {/* 1부/2부 선택 버튼 */}
        <div className="part-selector">
          <button
            className={`part-button ${selectedPart === 1 ? 'active' : ''}`}
            onClick={() => setSelectedPart(1)}
          >
            1부
          </button>
          <button
            className={`part-button ${selectedPart === 2 ? 'active' : ''}`}
            onClick={() => setSelectedPart(2)}
            disabled={part2Songs.length === 0}
          >
            2부
          </button>
        </div>

        {/* 셋리스트 리스트 */}
        <div className="setlist-list-section">
          <div className="timeline">
            {/* 타임라인 레일 (라인 + dot) */}
            <div className="timeline-rail">
              <div className="timeline-line"></div>
              {displaySongs.map((_, index) => {
                const globalIndex = startIndex + index
                return (
                  <div key={globalIndex} className="timeline-dot">
                    {globalIndex + 1}
                  </div>
                )
              })}
            </div>
            
            {/* 카드 콘텐츠 영역 */}
            <div className="timeline-content">
              {displaySongs.map((item, index) => {
                const globalIndex = startIndex + index
                return (
                  <div key={globalIndex} className="timeline-item">
                    <button
                      className={`song-item ${selectedSong === item ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSong(item)
                        setSelectedSongIndex(globalIndex)
                      }}
                    >
                      <div className="song-item-content">
                        <div className="song-item-title">{item.songName}</div>
                        {(() => {
                          const artist = (item.artist ?? '').trim()
                          return artist && artist !== '-' && (
                            <div className="song-item-artist">{artist}</div>
                          )
                        })()}
                      </div>
                      <div className="song-item-arrow">›</div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 선택된 곡 정보 표시 */}
        {selectedSong && selectedSongIndex !== null && performanceData?.setlist && (
          <div className="song-detail-modal">
            <div className="song-detail-content">
              <button 
                className="song-detail-close"
                onClick={() => {
                  setSelectedSong(null)
                  setSelectedSongIndex(null)
                }}
              >
                ×
              </button>

              {/* 이전/다음 곡 버튼 */}
              <div className="song-navigation">
                <button
                  className="song-nav-button song-nav-prev"
                  onClick={() => {
                    if (selectedSongIndex > 0 && performanceData.setlist) {
                      const prevIndex = selectedSongIndex - 1
                      setSelectedSong(performanceData.setlist[prevIndex])
                      setSelectedSongIndex(prevIndex)
                    }
                  }}
                  disabled={selectedSongIndex === 0}
                >
                  ‹
                </button>
                <button
                  className="song-nav-button song-nav-next"
                  onClick={() => {
                    if (performanceData.setlist && selectedSongIndex < performanceData.setlist.length - 1) {
                      const nextIndex = selectedSongIndex + 1
                      setSelectedSong(performanceData.setlist[nextIndex])
                      setSelectedSongIndex(nextIndex)
                    }
                  }}
                  disabled={!performanceData.setlist || selectedSongIndex === performanceData.setlist.length - 1}
                >
                  ›
                </button>
              </div>

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
                <div className="song-number-info">
                  {(() => {
                    const totalSongs = performanceData.setlist.length
                    const currentNumber = selectedSongIndex + 1
                    // 1부/2부 구분 (대략 절반 기준)
                    const part1Count = Math.ceil(totalSongs / 2)
                    const part = currentNumber <= part1Count ? 1 : 2
                    const partNumber = part === 1 ? currentNumber : currentNumber - part1Count
                    return (
                      <span className="song-part-info">
                        {part}부 {partNumber}번째 곡 ({currentNumber}/{totalSongs})
                      </span>
                    )
                  })()}
                </div>
                <h2 className="song-title">{selectedSong.songName}</h2>
                {selectedSong.artist && (
                  <p className="song-artist">{selectedSong.artist}</p>
                )}
              </div>

              {/* 세션 정보 */}
              <div className="session-info">
                <h3 className="session-title">세션 정보</h3>
                <div className="session-list">
                  {(() => {
                    const sessionInfo = getSessionInfo(selectedSong)
                    const sessionOrder = ['보컬', '기타', '베이스', '키보드', '드럼']
                    return sessionOrder.map((session) => {
                      const members = sessionInfo[session] || []
                      if (members.length === 0) return null
                      return (
                        <div key={session} className="session-item">
                          <span className="session-label">{session}</span>
                          <div className="session-members">
                            {members.map((member, idx) => (
                              <span key={idx} className="session-chip">
                                {member}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
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
