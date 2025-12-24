import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useData, GuestbookMessage } from '../contexts/DataContext'
import './Guestbook.css'

// 메모지 디자인 타입
type MemoDesign = 'yellow' | 'pink' | 'blue' | 'green' | 'purple'

interface MemoNote extends GuestbookMessage {
  design: MemoDesign
  rotation: number // 회전 각도 (-15 ~ 15도)
  position: { x: number; y: number } // 메모지 위치
}

const MEMO_DESIGNS: Array<{ id: MemoDesign; name: string; color: string }> = [
  { id: 'yellow', name: '노란색', color: '#FFF9C4' },
  { id: 'pink', name: '분홍색', color: '#FFE0E6' },
  { id: 'blue', name: '파란색', color: '#E3F2FD' },
  { id: 'green', name: '초록색', color: '#E8F5E9' },
  { id: 'purple', name: '보라색', color: '#F3E5F5' },
]

const MEMOS_PER_PAGE = 12 // 한 페이지당 메모지 개수

const Guestbook = () => {
  const { guestbookMessages, addGuestbookMessage } = useData()
  const location = useLocation()
  const [writeOpen, setWriteOpen] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<MemoDesign>('yellow')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMessage, setViewMessage] = useState<MemoNote | null>(null)
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  
  // location이 변경될 때마다 리렌더링 트리거
  useEffect(() => {
    // location이 변경되면 컴포넌트가 리렌더링됨
  }, [location.pathname, (location.state as any)])

  // 메시지 ID를 기반으로 결정적인 랜덤 값 생성 (0~1 사이)
  const seededRandom = (seed: string): number => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit 정수로 변환
    }
    // 0~1 사이의 값으로 정규화
    return Math.abs(hash) / 2147483647
  }

  // 메모지로 변환 (현재 페이지만 처리)
  const memoNotes: MemoNote[] = useMemo(() => {
    const processedMemos: MemoNote[] = []
    
    // 현재 페이지의 메모지만 처리
    const startIndex = (currentPage - 1) * MEMOS_PER_PAGE
    const endIndex = currentPage * MEMOS_PER_PAGE
    const memosForCurrentPage = guestbookMessages.slice(startIndex, endIndex)
    
    return memosForCurrentPage.map((msg, localIndex) => {
      // 기존 메시지에 design이 없으면 결정적으로 할당
      const design = (msg as any).design || MEMO_DESIGNS[localIndex % MEMO_DESIGNS.length].id
      
      // 기존 메시지에 rotation이 없으면 메시지 ID 기반으로 결정적으로 생성
      let rotation: number
      if ((msg as any).rotation !== undefined) {
        rotation = (msg as any).rotation
      } else {
        // 메시지 ID를 기반으로 결정적인 rotation 생성 (-15 ~ 15도)
        const seed = msg.id || msg.name || String(localIndex)
        rotation = (seededRandom(seed) * 30 - 15)
      }
      
      // 기존 메시지에 position이 없으면 자동 배치 (겹침 방지)
      let position: { x: number; y: number }
      if ((msg as any).position) {
        position = (msg as any).position
      } else {
        // 현재 페이지 내에서의 상대적 인덱스로 위치 계산
        const existingMemos = processedMemos.map(memo => ({
          position: memo.position,
          rotation: memo.rotation
        }))
        
        // 페이지 내 상대적 인덱스로 위치 계산 (메시지 ID 기반으로 결정적)
        position = calculateMemoPosition(localIndex, existingMemos, msg.id || msg.name || String(localIndex))
      }
      
      const memoNote: MemoNote = {
        ...msg,
        design,
        rotation,
        position,
      }
      
      processedMemos.push(memoNote)
      return memoNote
    })
  }, [guestbookMessages, currentPage])

  // 메모지 실제 크기 계산 함수
  function getMemoDimensions() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
    const isTablet = typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerWidth > 480
    
    let memoWidthPercent: number
    let memoHeightPx: number
    
    if (isMobile) {
      memoWidthPercent = 45 // 모바일 2열: 각 메모지가 약 45% 너비
      memoHeightPx = 100
    } else if (isTablet) {
      memoWidthPercent = 40 // 태블릿 2열: 각 메모지가 약 40% 너비
      memoHeightPx = 170
    } else {
      memoWidthPercent = 25 // 데스크톱 3열: 각 메모지가 약 25% 너비
      memoHeightPx = 180
    }
    
    return { memoWidthPercent, memoHeightPx }
  }

  // 회전된 메모지의 실제 경계 상자 크기 계산
  function getRotatedBounds(rotation: number, memoWidthPercent: number, memoHeightPercent: number) {
    const rad = (rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    
    const width = memoWidthPercent * cos + memoHeightPercent * sin
    const height = memoHeightPercent * cos + memoWidthPercent * sin
    
    return { width, height }
  }

  // 메모지 충돌 감지 (회전 각도 고려)
  function checkCollision(
    newPos: { x: number; y: number },
    newRotation: number,
    existingMemos: Array<{ position: { x: number; y: number }; rotation: number }>
  ): boolean {
    const { memoWidthPercent, memoHeightPx } = getMemoDimensions()
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 667
    const memoHeightPercent = (memoHeightPx / screenHeight) * 100
    
    // 회전된 메모지의 경계 상자 계산
    const rad = (newRotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    
    // 회전된 메모지의 실제 경계 상자 크기
    const newWidth = memoWidthPercent * cos + memoHeightPercent * sin
    const newHeight = memoHeightPercent * cos + memoWidthPercent * sin
    
    const padding = 2 // % 여유 공간
    
    for (const memo of existingMemos) {
      const existingRad = (memo.rotation * Math.PI) / 180
      const existingCos = Math.abs(Math.cos(existingRad))
      const existingSin = Math.abs(Math.sin(existingRad))
      
      const existingWidth = memoWidthPercent * existingCos + memoHeightPercent * existingSin
      const existingHeight = memoHeightPercent * existingCos + memoWidthPercent * existingSin
      
      // 두 메모지 중심 간 거리
      const distanceX = Math.abs(newPos.x - memo.position.x)
      const distanceY = Math.abs(((newPos.y - memo.position.y) / screenHeight) * 100)
      
      // 충돌 감지: 두 경계 상자가 겹치는지 확인
      const minDistanceX = (newWidth + existingWidth) / 2 + padding
      const minDistanceY = (newHeight + existingHeight) / 2 + padding
      
      if (distanceX < minDistanceX && distanceY < minDistanceY) {
        return true // 충돌 발생
      }
    }
    
    return false
  }

  // 메모지 위치 계산 (롤링페이퍼 스타일, 겹침 방지)
  function calculateMemoPosition(
    index: number,
    existingMemos: Array<{ position: { x: number; y: number }; rotation: number }>,
    seed: string = String(index)
  ): { x: number; y: number } {
    // seed 기반 결정적인 랜덤 값 생성
    const seededRandom = (s: string): number => {
      let hash = 0
      for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return Math.abs(hash) / 2147483647
    }
    // 화면 크기에 따라 메모지 크기와 배치 조정
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
    const isTablet = typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerWidth > 480
    
    let memoHeight: number
    let gapY: number
    let memosPerRow: number
    
    if (isMobile) {
      memoHeight = 100 // px
      gapY = 20 // px
      memosPerRow = 2 // 한 줄에 2개
    } else if (isTablet) {
      memoHeight = 170 // px
      gapY = 22 // px
      memosPerRow = 2 // 한 줄에 2개
    } else {
      memoHeight = 180 // px
      gapY = 25 // px
      memosPerRow = 3 // 한 줄에 3개
    }
    
    const maxAttempts = 50 // 최대 시도 횟수
    
    // 기본 그리드 위치 계산
    // 페이지네이션을 고려: 각 페이지 내에서의 상대적 인덱스 계산
    const pageIndex = index % MEMOS_PER_PAGE
    const baseRow = Math.floor(pageIndex / memosPerRow)
    const baseCol = pageIndex % memosPerRow
    
    // 중앙 기준 배치 (가로 잘림 방지)
    const colCenters = isMobile ? [25, 75] : isTablet ? [25, 75] : [17, 50, 83]
    const baseX = colCenters[baseCol] || 50
    
    // seed 기반 결정적인 회전 각도 생성
    const rotation = seededRandom(seed + '_rotation') * 30 - 15 // -15 ~ 15도
    
    // 헤더 높이 고려 (회전된 메모지의 상단이 헤더에 가려지지 않도록)
    // 헤더 높이는 대략 140-180px (제목 + 버튼 영역)
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 667
    const headerHeight = isMobile ? 160 : 150 // px
    const headerHeightPercent = (headerHeight / screenHeight) * 100
    
    // 회전된 메모지의 상단 여유 공간 계산
    // 회전 시 상단이 더 올라갈 수 있으므로 충분한 여유 공간 추가
    // 회전 각도 최대 15도, 메모지 높이를 고려한 추가 여유 공간
    const rotationMargin = (memoHeight * Math.sin(15 * Math.PI / 180)) / screenHeight * 100
    const topMargin = headerHeightPercent + rotationMargin + 20 // 헤더 높이 + 회전 여유 + 추가 여유 (20%로 증가)
    
    // 각 페이지의 첫 번째 메모지는 더 아래에 배치하여 잘림 방지
    const isFirstInPage = pageIndex === 0
    const firstRowOffset = (baseRow === 0 && isFirstInPage) ? 30 : 0 // 각 페이지의 첫 번째 줄만 추가 오프셋
    const baseY = topMargin + firstRowOffset + baseRow * (memoHeight + gapY)
    
    // 메모지 크기 정보 가져오기 (반응형 고려)
    const { memoWidthPercent, memoHeightPx } = getMemoDimensions()
    const memoHeightPercent = (memoHeightPx / screenHeight) * 100
    
    // 회전된 메모지의 실제 경계 상자 계산
    const rotatedBounds = getRotatedBounds(rotation, memoWidthPercent, memoHeightPercent)
    
    // 회전된 메모지의 반폭/반높이를 고려한 최소/최대 x 위치
    const halfRotatedWidth = rotatedBounds.width / 2
    const minX = halfRotatedWidth + 2 // 좌우 여유 공간 2%
    const maxX = 100 - halfRotatedWidth - 2 // 좌우 여유 공간 2%
    
    // 기본 위치에서 시작 (중앙 기준, 회전 고려) - seed 기반 결정적
    const xRange = isMobile ? 2 : 3 // 모바일은 더 작은 범위
    let x = baseX + (seededRandom(seed + '_x') * xRange * 2 - xRange) // ±2~3% 결정적 오프셋
    let y = baseY + (seededRandom(seed + '_y') * 15 - 7.5) // ±7.5px 결정적 오프셋
    
    // 경계 체크 및 조정 (회전된 메모지가 화면 밖으로 나가지 않도록)
    x = Math.max(minX, Math.min(maxX, x))
    y = Math.max(topMargin, y) // 헤더에 가려지지 않도록 최소값 조정
    
    // 충돌 감지 및 위치 조정
    let attempts = 0
    while (checkCollision({ x, y }, rotation, existingMemos) && attempts < maxAttempts) {
      // 다른 위치 시도 (seed 기반 결정적)
      const attemptSeed = seed + '_attempt_' + attempts
      const offsetX = (seededRandom(attemptSeed + '_x') * 8 - 4) * (attempts + 1) // 시도할수록 더 멀리
      const offsetY = (seededRandom(attemptSeed + '_y') * 30 - 15) * (attempts + 1)
      
      x = baseX + offsetX
      y = baseY + offsetY
      
      // 경계 체크 (회전된 메모지가 화면 밖으로 나가지 않도록)
      x = Math.max(minX, Math.min(maxX, x))
      // 헤더에 가려지지 않도록 최소값 조정
      y = Math.max(topMargin, y)
      
      attempts++
    }
    
    // 여전히 충돌하면 그리드 위치로 강제 배치
    if (attempts >= maxAttempts) {
      x = baseX
      y = baseY
    }
    
    return { x, y }
  }

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(guestbookMessages.length / MEMOS_PER_PAGE))
  const currentMemos = memoNotes // memoNotes 자체가 현재 페이지의 메모를 담고 있음

  // 현재 페이지가 유효한 범위를 벗어나면 마지막 페이지로 이동
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleSubmit = () => {
    if (!name.trim() || !message.trim()) {
      alert('이름과 메시지를 모두 입력해주세요.')
      return
    }

    // 현재 페이지의 메모지 개수 확인
    const currentPageStartIndex = (currentPage - 1) * MEMOS_PER_PAGE
    const currentPageMemos = guestbookMessages.slice(currentPageStartIndex, currentPageStartIndex + MEMOS_PER_PAGE)
    
    // 현재 페이지가 가득 찼으면 다음 페이지로 이동
    let targetPage = currentPage
    if (currentPageMemos.length >= MEMOS_PER_PAGE) {
      targetPage = currentPage + 1
    }

    // 현재 페이지 내에서의 인덱스 계산
    const localIndex = currentPageMemos.length
    const existingMemos = currentMemos.map(memo => ({
      position: memo.position,
      rotation: memo.rotation
    }))
    
    const rotation = Math.random() * 30 - 15 // -15 ~ 15도
    const position = calculateMemoPosition(localIndex, existingMemos)

    addGuestbookMessage({
      id: Date.now().toString(),
      name,
      message,
      timestamp: Date.now(),
      design: selectedDesign,
      rotation,
      position,
    } as any)

    // 페이지가 가득 찼으면 다음 페이지로 이동
    if (targetPage > currentPage) {
      setCurrentPage(targetPage)
    }

    setName('')
    setMessage('')
    setSelectedDesign('yellow')
    setWriteOpen(false)
  }

  return (
    <div className="guestbook-page">
      <div className="guestbook-header">
        <h2>방명록</h2>
        <div className="header-buttons">
          <button
            className="view-all-button"
            onClick={() => setViewAllOpen(true)}
          >
            모아서 보기
          </button>
          <button
            className="add-message-button"
            onClick={() => setWriteOpen(true)}
          >
            메모지 붙이기
          </button>
        </div>
      </div>

      <div className="memo-container">
        {currentMemos.length === 0 ? (
          <div className="empty-memos">
            <p>아직 메모지가 없습니다.</p>
            <p>첫 번째 메모지를 붙여보세요!</p>
          </div>
        ) : (
          <div 
            className="memo-wall"
            style={{
              minHeight: currentMemos.length > 0 
                ? `${Math.max(...currentMemos.map(m => m.position.y)) + 250}px`
                : 'auto'
            }}
          >
            {currentMemos.map((memo) => (
              <div
                key={memo.id}
                className={`memo-note memo-${memo.design}`}
                style={{
                  left: `${memo.position.x}%`,
                  top: `${memo.position.y}px`,
                  transform: `translateX(-50%) rotate(${memo.rotation}deg)`,
                  '--memo-rotation': `${memo.rotation}deg`,
                } as React.CSSProperties}
                onClick={() => setViewMessage(memo)}
              >
                <div className="memo-header">
                  <span className="memo-name">{memo.name}</span>
                </div>
                <div className="memo-content">
                  <p>{memo.message}</p>
                </div>
                <div className="memo-tape"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </button>
          <span className="page-info">
            {currentPage} / {Math.max(1, Math.ceil(guestbookMessages.length / MEMOS_PER_PAGE))}
          </span>
          <button
            className="page-button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </button>
        </div>
      )}

      {/* 작성 모달 */}
      {writeOpen && (
        <div className="modal-overlay" onClick={() => setWriteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>메모지 디자인 선택</h3>

            <div className="design-select">
              {MEMO_DESIGNS.map((design) => (
                <div
                  key={design.id}
                  className={`design-option ${selectedDesign === design.id ? 'selected' : ''}`}
                  style={{ backgroundColor: design.color }}
                  onClick={() => setSelectedDesign(design.id)}
                >
                  <span>{design.name}</span>
                </div>
              ))}
            </div>

            <input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
            <textarea
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={5}
            />
            <div className="char-count">
              {message.length} / 200
            </div>

            <div className="form-buttons">
              <button className="submit-button" onClick={handleSubmit}>
                붙이기
              </button>
              <button
                className="cancel-button"
                onClick={() => setWriteOpen(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메시지 보기 모달 */}
      {viewMessage && (
        <div
          className="modal-overlay"
          onClick={() => setViewMessage(null)}
        >
          <div className="modal modal-view" onClick={(e) => e.stopPropagation()}>
            <div className={`memo-preview memo-${viewMessage.design}`}>
              <div className="memo-header">
                <span className="memo-name">{viewMessage.name}</span>
              </div>
              <div className="memo-content">
                <p>{viewMessage.message}</p>
              </div>
              <div className="memo-tape"></div>
            </div>
            <button
              className="close-button"
              onClick={() => setViewMessage(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {viewAllOpen && (
        <div
          className="modal-overlay"
          onClick={() => setViewAllOpen(false)}
        >
          <div className="modal modal-view-all" onClick={(e) => e.stopPropagation()}>
            <h3>방명록 모아보기</h3>
            <div className="sort-controls">
              <button
                className={`sort-button ${sortBy === 'date' ? 'active' : ''}`}
                onClick={() => setSortBy('date')}
              >
                날짜순
              </button>
              <button
                className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                이름순
              </button>
            </div>
            <div className="all-memos-list">
              {[...memoNotes]
                .sort((a, b) => {
                  if (sortBy === 'date') {
                    return b.timestamp - a.timestamp
                  } else {
                    return a.name.localeCompare(b.name, 'ko')
                  }
                })
                .map((memo) => (
                  <div
                    key={memo.id}
                    className={`all-memo-item memo-${memo.design}`}
                    onClick={() => {
                      setViewAllOpen(false)
                      setViewMessage(memo)
                    }}
                  >
                    <div className="all-memo-header">
                      <span className="all-memo-name">{memo.name}</span>
                      <span className="all-memo-date">
                        {new Date(memo.timestamp).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="all-memo-content">
                      <p>{memo.message}</p>
                    </div>
                  </div>
                ))}
              {memoNotes.length === 0 && (
                <div className="empty-all-memos">
                  <p>아직 메모지가 없습니다.</p>
                </div>
              )}
            </div>
            <button
              className="close-button"
              onClick={() => setViewAllOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Guestbook
