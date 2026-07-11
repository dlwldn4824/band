import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useData, SetlistItem } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { addSongComment } from '../services/songCommentsApi'
import vocalIcon from '../assets/배경/마이크.png'
import guitarIcon from '../assets/배경/기타.png'
import bassIcon from '../assets/배경/베이스.png'
import keyboardIcon from '../assets/배경/키보드.png'
import drumIcon from '../assets/배경/드럼.png'
import './Performances.css'
import {
  filterSetlistForSection,
  getDisplayPartForSectionTitle,
  getDisplayPartForStoragePart,
  getOrderedPerformanceSections,
  getSetlistSongSectionMeta,
} from '../utils/performanceEvents'
import { trackEvent, getDaysSinceSetlistUpload } from '../analytics'

interface SongComment {
  id: string
  songName: string
  userName: string
  userNickname?: string
  message: string
  timestamp: any
}

const Performances = () => {
  const location = useLocation()
  const { performanceData } = useData()
  const { user } = useAuth()
  const [selectedSong, setSelectedSong] = useState<SetlistItem | null>(null)
  const [songComments, setSongComments] = useState<SongComment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  
  // location이 변경될 때마다 리렌더링 트리거
  useEffect(() => {
    // location이 변경되면 컴포넌트가 리렌더링됨
  }, [location.pathname, location.state])
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null)
  const [selectedPart, setSelectedPart] = useState(1)
  const appliedTimelineNavKeyRef = useRef<string | null>(null)
  const performanceSections = getOrderedPerformanceSections(performanceData?.events)

  // 타임라인(홈)에서 클릭한 섹션으로 이동 — location.key당 1회만 적용
  useEffect(() => {
    const navState = location.state as { part?: number; sectionTitle?: string } | null
    if (!navState) return

    const navKey = location.key
    if (appliedTimelineNavKeyRef.current === navKey) return

    let displayPart: number | null = null
    if (navState.sectionTitle) {
      displayPart = getDisplayPartForSectionTitle(navState.sectionTitle, performanceData?.events)
    } else if (typeof navState.part === 'number') {
      displayPart = getDisplayPartForStoragePart(navState.part, performanceData?.events)
    }

    if (displayPart !== null && performanceSections.some((section) => section.part === displayPart)) {
      appliedTimelineNavKeyRef.current = navKey
      setSelectedPart(displayPart)
    }
  }, [location.key, location.state, performanceSections, performanceData?.events])

  useEffect(() => {
    if (
      performanceSections.length > 0 &&
      !performanceSections.some((section) => section.part === selectedPart)
    ) {
      setSelectedPart(performanceSections[0].part)
    }
  }, [performanceSections, selectedPart])

  useEffect(() => {
    const section = performanceSections.find((item) => item.part === selectedPart)
    void trackEvent('performances_viewed', {
      selected_part: String(selectedPart),
      section_title: section?.title,
      days_since_setlist_upload: getDaysSinceSetlistUpload(),
    })
    if (!performanceData?.setlist?.length) {
      void trackEvent('performances_empty_state_viewed', {})
    }
  }, [selectedPart, performanceSections, performanceData?.setlist?.length])

  // 선택된 곡의 응원 메시지 가져오기
  useEffect(() => {
    if (!selectedSong) {
      setSongComments([])
      return
    }

    // 인덱스 없이도 작동하도록 쿼리 순서 조정
    // where와 orderBy를 함께 사용할 때는 복합 인덱스가 필요하므로
    // 먼저 모든 데이터를 가져온 후 클라이언트에서 필터링하거나
    // 인덱스를 생성해야 합니다
    // 임시로 orderBy만 사용하고 클라이언트에서 필터링
    const commentsQuery = query(
      collection(db, 'songComments'),
      orderBy('timestamp', 'desc'),
      limit(100) // 더 많이 가져와서 필터링
    )

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const comments: SongComment[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // 클라이언트에서 songName으로 필터링 (인덱스 없이 작동)
          if (data.songName === selectedSong.songName) {
            comments.push({
              ...data,
              id: doc.id
            } as SongComment)
          }
        })
        // 최신순으로 정렬 (이미 orderBy로 정렬되어 있지만 확실히)
        comments.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.()?.getTime() || 0
          const bTime = b.timestamp?.toDate?.()?.getTime() || 0
          return bTime - aTime
        })
        setSongComments(comments.slice(0, 50)) // 최대 50개만 표시
      },
      (error) => {
        console.error('[Performances] 응원 메시지 구독 오류:', error)
        // 인덱스 에러인 경우 더 자세한 안내
        if (error.code === 'failed-precondition') {
          console.error('[Performances] Firestore 인덱스가 필요합니다. Firebase 콘솔에서 인덱스를 생성해주세요.')
        }
        setSongComments([])
      }
    )

    return () => unsubscribe()
  }, [selectedSong])

  // 모달에서 곡 이동 시 해당 팀 탭과 동기화
  useEffect(() => {
    if (selectedSongIndex === null || !performanceData?.setlist?.length) return
    const song = performanceData.setlist[selectedSongIndex]
    if (!song) return

    const meta = getSetlistSongSectionMeta(
      song,
      performanceData.setlist,
      performanceData.events,
      performanceSections,
      selectedSongIndex
    )
    if (meta && performanceSections.some((section) => section.part === meta.displayPart)) {
      setSelectedPart(meta.displayPart)
    }
  }, [selectedSongIndex, performanceData?.setlist, performanceData?.events, performanceSections])

  // 응원 메시지 추가
  const handleAddComment = async () => {
    if (!selectedSong || !commentInput.trim() || !user) {
      console.error('[Performances] 응원 메시지 추가 실패:', {
        hasSelectedSong: !!selectedSong,
        hasCommentInput: !!commentInput.trim(),
        hasUser: !!user,
        selectedSong: selectedSong,
        commentInput: commentInput,
        user: user
      })
      return
    }

    try {
      const ok = await addSongComment({
        name: user.name || '익명',
        phone: user.phone || '',
        songName: selectedSong.songName,
        message: commentInput.trim(),
        nickname: user.nickname,
      })

      if (!ok) {
        alert('응원 메시지 등록에 실패했습니다. 다시 시도해주세요.')
        return
      }

      void trackEvent('song_comment_posted', {
        song_name: selectedSong.songName,
        message_length: commentInput.trim().length,
      })
      setCommentInput('')
      setShowCommentInput(false)
    } catch (error: any) {
      console.error('[Performances] 응원 메시지 추가 오류:', error)
      console.error('[Performances] 오류 상세:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      })
      alert(`응원 메시지 등록에 실패했습니다: ${error?.message || '알 수 없는 오류'}. 다시 시도해주세요.`)
    }
  }

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

  // 모달이 열릴 때 배경 스크롤 막기
  useEffect(() => {
    if (selectedSong) {
      // 모달이 열릴 때 배경 스크롤 막기
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'
    } else {
      // 모달이 닫힐 때 배경 스크롤 복구
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      // cleanup
      if (!selectedSong) {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [selectedSong])

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

  const sectionCount = Math.max(performanceSections.length, 2)
  const songsWithoutPart = performanceData.setlist.filter((song) => !song.part)
  const hasPartData = songsWithoutPart.length !== performanceData.setlist.length

  const selectedSection =
    performanceSections.find((section) => section.part === selectedPart) ?? performanceSections[0]

  let displaySongs: SetlistItem[]
  let startIndex: number

  if (selectedSection && hasPartData) {
    displaySongs = filterSetlistForSection(
      performanceData.setlist,
      selectedSection,
      performanceData?.events
    ) as SetlistItem[]
    startIndex =
      displaySongs.length > 0
        ? performanceData.setlist.findIndex((song) => song === displaySongs[0])
        : 0
    if (startIndex < 0) startIndex = 0
  } else {
    const sectionIndex = performanceSections.findIndex((section) => section.part === selectedPart)
    const songsPerSection = Math.ceil(performanceData.setlist.length / sectionCount)
    const sectionStart = Math.max(0, sectionIndex) * songsPerSection
    displaySongs = performanceData.setlist.slice(sectionStart, sectionStart + songsPerSection)
    startIndex = sectionStart
  }

  const selectedSectionTitle = selectedSection?.title || `${selectedPart}부`

  const selectedSongMeta =
    selectedSong && performanceData?.setlist && selectedSongIndex !== null
      ? getSetlistSongSectionMeta(
          selectedSong,
          performanceData.setlist,
          performanceData.events,
          performanceSections,
          selectedSongIndex
        )
      : null

  return (
    <div className="performances-page">
      <div className="performances-content">
        <div className="part-selector">
          {(performanceSections.length > 0
            ? performanceSections
            : [
                { title: '1부', description: '', time: '', part: 1 },
                { title: '2부', description: '', time: '', part: 2 },
              ]
          ).map((section) => {
            const partNumber = section.part
            const sectionSongCount = hasPartData
              ? filterSetlistForSection(
                  performanceData.setlist ?? [],
                  section,
                  performanceData?.events
                ).length
              : Math.ceil((performanceData.setlist ?? []).length / sectionCount)

            return (
              <button
                key={`${section.title}-${partNumber}`}
                className={`part-button ${selectedPart === partNumber ? 'active' : ''}`}
                onClick={() => setSelectedPart(partNumber)}
                disabled={sectionSongCount === 0}
              >
                {section.title}
              </button>
            )
          })}
        </div>

        {/* 셋리스트 리스트 */}
        <div className="setlist-list-section">
          <div className="timeline">
            {displaySongs.map((item, index) => {
              const globalIndex = startIndex + index
              const prevItem = index > 0 ? displaySongs[index - 1] : null
              // 첫 번째 곡이거나 이전 곡과 팀이 다를 때 팀 구분선 표시
              const showTeamDivider = item.team && item.team.trim() !== '' && (index === 0 || !prevItem?.team || item.team !== prevItem.team)

              return (
                <React.Fragment key={globalIndex}>
                  <div className={`timeline-row ${showTeamDivider ? 'has-team-row' : ''}`}>
                    <div className="timeline-rail-item">
                      <div className="timeline-dot">{globalIndex + 1}</div>
                    </div>
                    <div className={`timeline-item ${showTeamDivider ? 'has-team-label' : ''}`} style={{ position: 'relative' }}>
                      {/* 팀명 표시 (첫 번째 곡 버튼 왼쪽 위) */}
                      {showTeamDivider && (
                        <span className="team-name-label">{item.team}</span>
                      )}
                      <button
                        className={`song-item ${selectedSong === item ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedSong(item)
                          setSelectedSongIndex(globalIndex)
                          void trackEvent('song_detail_opened', {
                            song_name: item.songName,
                            part: item.part,
                            song_index: globalIndex,
                          })
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
                </React.Fragment>
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
                aria-label="닫기"
                type="button"
              >
                <svg className="song-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>

              {selectedSong.image?.trim() && (
                <div className="song-image-container">
                  <img
                    src={selectedSong.image.trim()}
                    alt={`${selectedSong.songName} 이미지`}
                    className="song-image"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}

              {/* 곡 정보 및 세션 정보, 응원하기 스크롤 영역 */}
              <div className="song-detail-scrollable">
                {/* 곡 정보 섹션 */}
                <div className="song-info-section">
                  <div className="song-info-nav-row">
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
                      aria-label="이전 곡"
                      type="button"
                    >
                      <svg className="song-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <div className="song-info-content">
                      <div className="song-info-header">
                        <button className="song-part-button">
                          {selectedSongMeta && selectedSongMeta.numberInSection > 0
                            ? `${selectedSongMeta.sectionTitle} ${selectedSongMeta.numberInSection}번째 곡`
                            : selectedSongMeta?.sectionTitle ?? selectedSectionTitle}
                        </button>
                        <span className="song-number-display">
                          {(selectedSongMeta?.globalIndex ?? selectedSongIndex ?? 0) + 1}/
                          {performanceData.setlist.length}
                        </span>
                      </div>

                      <h2 className="song-title">{selectedSong.songName}</h2>
                      {selectedSong.artist && <p className="song-artist">{selectedSong.artist}</p>}
                    </div>

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
                      aria-label="다음 곡"
                      type="button"
                    >
                      <svg className="song-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* 세션 정보 */}
                <div className="session-info">
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
                              <img src={session.icon} alt={session.name} className="session-icon" loading="lazy" decoding="async" />
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

                {/* 응원하기 섹션 */}
                <div className="song-comments-section">
                <div className="song-comments-header">
                  <h3 className="song-comments-title">응원하기</h3>
                  {user && !showCommentInput && (
                    <button 
                      className="song-comment-add-button"
                      onClick={() => setShowCommentInput(!showCommentInput)}
                    >
                      응원하기
                    </button>
                  )}
                  {user && showCommentInput && (
                    <div className="song-comment-buttons">
                      <button
                        className="song-comment-cancel-button"
                        onClick={() => {
                          setShowCommentInput(false)
                          setCommentInput('')
                        }}
                      >
                        취소
                      </button>
                      <button
                        className="song-comment-submit-button"
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                      >
                        등록하기
                      </button>
                    </div>
                  )}
                </div>

                {/* 응원 메시지 입력 */}
                {user && showCommentInput && (
                  <div className="song-comment-input-section">
                    <textarea
                      className="song-comment-input"
                      placeholder="이 곡에 대한 응원 메시지를 입력하세요..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      maxLength={200}
                      rows={3}
                    />
                  </div>
                )}

                {/* 응원 메시지 목록 */}
                <div className="song-comments-list">
                  {songComments.length === 0 ? (
                    <p className="song-comments-empty">아직 응원 메시지가 없습니다.</p>
                  ) : (
                    songComments.map((comment) => (
                      <div key={comment.id} className="song-comment-item">
                        <div className="song-comment-header">
                          <span className="song-comment-author">
                            {comment.userNickname || comment.userName || '익명'}
                          </span>
                          <span className="song-comment-time">
                            {comment.timestamp?.toDate 
                              ? new Date(comment.timestamp.toDate()).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="song-comment-message">{comment.message}</p>
                      </div>
                    ))
                  )}
                </div>
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
