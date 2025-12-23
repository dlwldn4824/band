import { useState, useEffect } from 'react'
import { useData, SetlistItem } from '../contexts/DataContext'
import demoImage from '../assets/배경/데모 이미지.png'
import vocalIcon from '../assets/배경/보컬.png'
import guitarIcon from '../assets/배경/기타.png'
import bassIcon from '../assets/배경/베이스.png'
import keyboardIcon from '../assets/배경/키보드.png'
import drumIcon from '../assets/배경/드럼.png'
import './Performances.css'

// ===== 곡 소개 이미지 =====
import img1 from '../assets/곡소개/1_비틀비틀짝짝꿍.jpg'
import img2 from '../assets/곡소개/2_대화가필요해.jpeg'
import img3 from '../assets/곡소개/3_눈이오잖아.jpeg'
import img4 from '../assets/곡소개/4_밤이깊었네.jpeg'
import img5 from '../assets/곡소개/5_무희.jpeg'
import img6 from '../assets/곡소개/6_각자의밤.jpeg'
import img7 from '../assets/곡소개/7_지금부터.jpeg'
import img8 from '../assets/곡소개/8_드라우닝.png'
import img9 from '../assets/곡소개/9_하이라이트.jpeg'
import img10 from '../assets/곡소개/10_안티프리즈.png'
import img11 from '../assets/곡소개/11_검을현.jpeg'
import img12 from '../assets/곡소개/12_Oddities.jpeg'
import img13 from '../assets/곡소개/13_용의자.png'
import img14 from '../assets/곡소개/14_ditto.jpeg'
import img16 from '../assets/곡소개/16_itsmylife.jpeg'
import img19 from '../assets/곡소개/19_아지랑이.jpeg'

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

  // 이미지 매핑 (import된 이미지 사용)
  const imageMap: { [key:string]:string } = {
    '비틀비틀짝짝꿍': img1,
    '비틀비틀짝짜꿍': img1, // 혹시 데이터에 오타로 들어온 경우 대비

    '대화가필요해': img2,
    '눈이오잖아': img3,
    '밤이깊었네': img4,
    '무희': img5,
    '각자의밤': img6,
    '지금부터': img7,
    '드라우닝': img8,
    'drowning' : img8,
    '하이라이트': img9,
    'highlight' : img9,
    '안티프리즈': img10,
    'antifreeze' : img10,
    '검을현': img11,

    'Oddities': img12,
    'oddities': img12,

    '용의자': img13,

    'ditto': img14,
    'Ditto': img14,

    'itsmylife': img16,
    'its my life': img16,

    '아지랑이': img19,
  }

  // 곡 이름에 맞는 이미지 반환 (import 기반)
  const getSongImage = (songName: string): string | undefined => {
    if (!songName) return undefined

    const normalize = (str: string) =>
      str.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '').toLowerCase()

    const normalizedSongName = normalize(songName)

    // 1) 정규화된 곡 이름으로 정확 매칭
    for (const [key, path] of Object.entries(imageMap)) {
      if (normalize(key) === normalizedSongName) {
        return path
      }
    }

    // 2) 정확 매칭이 안 되면 부분 매칭
    for (const [key, path] of Object.entries(imageMap)) {
      const nk = normalize(key)
      if (normalizedSongName.includes(nk) || nk.includes(normalizedSongName)) {
        return path
      }
    }

    return undefined
  }

  const getSessionInfo = (item: SetlistItem) => {
    const sessions: { [key: string]: string[] } = {
      '보컬': [],
      '기타': [],
      '베이스': [],
      '키보드': [],
      '드럼': [],
    }

    const extractMembers = (members: string | undefined, sessionName: string) => {
      if (!members || !members.trim() || members.trim() === '-') return
      members
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m && m !== '-')
        .forEach((member) => {
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
            {/* 타임라인 레일 (라인) */}
            <div className="timeline-rail">
              <div className="timeline-line" />
            </div>

            {/* 각 행: dot + 카드 */}
            {displaySongs.map((item, index) => {
              const globalIndex = startIndex + index
              return (
                <div key={globalIndex} className="timeline-row">
                  <div className="timeline-rail-item">
                    <div className="timeline-dot">{globalIndex + 1}</div>
                  </div>
                  <div className="timeline-item">
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
                          return artist && artist !== '-' && <div className="song-item-artist">{artist}</div>
                        })()}
                      </div>
                      <div className="song-item-arrow">›</div>
                    </button>
                  </div>
                </div>
              )
            })}
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

              {/* 이미지 배너 */}
              <div className="song-image-container">
                <img
                  src={getSongImage(selectedSong.songName) || selectedSong.image || demoImage}
                  alt={`${selectedSong.songName} 이미지`}
                  className="song-image"
                  onError={(e) => {
                    e.currentTarget.src = demoImage
                  }}
                />
              </div>

              {/* 곡 정보 섹션 */}
              <div className="song-info-section">
                <div className="song-info-content">
                  <div className="song-info-header">
                    <button className="song-part-button">
                      {(() => {
                        const totalSongs2 = performanceData.setlist.length
                        const currentNumber = selectedSongIndex + 1
                        const part1Count2 = Math.ceil(totalSongs2 / 2)
                        const part = currentNumber <= part1Count2 ? 1 : 2
                        const partNumber = part === 1 ? currentNumber : currentNumber - part1Count2
                        return `${part}부 ${partNumber}번째 곡`
                      })()}
                    </button>
                    <span className="song-number-display">
                      {selectedSongIndex + 1}/{performanceData.setlist.length}
                    </span>
                  </div>

                  <h2 className="song-title">{selectedSong.songName}</h2>
                  {selectedSong.artist && <p className="song-artist">{selectedSong.artist}</p>}

                  {/* 이전/다음 곡 버튼 */}
                  <button
                    className="song-nav-arrow song-nav-prev"
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
                    className="song-nav-arrow song-nav-next"
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
              </div>

              {/* 세션 정보 */}
              <div className="session-info">
                <h3 className="session-title">세션 정보</h3>
                <div className="session-list">
                  {(() => {
                    const sessionInfo = getSessionInfo(selectedSong)
                    const sessionOrder = [
                      { name: '보컬', icon: vocalIcon },
                      { name: '기타', icon: guitarIcon },
                      { name: '베이스', icon: bassIcon },
                      { name: '키보드', icon: keyboardIcon },
                      { name: '드럼', icon: drumIcon },
                    ]
                    return sessionOrder.map((session) => {
                      const members = sessionInfo[session.name] || []
                      if (members.length === 0) return null
                      return (
                        <div key={session.name} className="session-item">
                          <div className="session-label-wrapper">
                            <img src={session.icon} alt={session.name} className="session-icon" />
                            <span className="session-label">{session.name}</span>
                          </div>
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
