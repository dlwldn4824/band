import { useState, useMemo } from 'react'
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
  const [writeOpen, setWriteOpen] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<MemoDesign>('yellow')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMessage, setViewMessage] = useState<MemoNote | null>(null)

  // 메모지로 변환 (기존 메시지도 메모지 형식으로)
  const memoNotes: MemoNote[] = useMemo(() => {
    const processedMemos: MemoNote[] = []
    
    return guestbookMessages.map((msg, index) => {
      // 기존 메시지에 design이 없으면 랜덤으로 할당
      const design = (msg as any).design || MEMO_DESIGNS[index % MEMO_DESIGNS.length].id
      // 기존 메시지에 rotation이 없으면 랜덤으로 생성
      const rotation = (msg as any).rotation || (Math.random() * 30 - 15) // -15 ~ 15도
      
      // 기존 메시지에 position이 없으면 자동 배치 (겹침 방지)
      let position: { x: number; y: number }
      if ((msg as any).position) {
        position = (msg as any).position
      } else {
        // 이미 처리된 메모지들의 위치 정보 사용
        const existingMemos = processedMemos.map(memo => ({
          position: memo.position,
          rotation: memo.rotation
        }))
        position = calculateMemoPosition(index, existingMemos)
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
  }, [guestbookMessages])

  // 메모지 충돌 감지 (회전 각도 고려)
  function checkCollision(
    newPos: { x: number; y: number },
    newRotation: number,
    existingMemos: Array<{ position: { x: number; y: number }; rotation: number }>
  ): boolean {
    // 화면 크기에 따라 메모지 크기 조정
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
    const isTablet = typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerWidth > 480
    
    let memoWidthPercent: number
    let memoHeightPx: number
    
    // CSS에서 실제 width는 min(320px, 80vw) 등으로 결정되므로
    // 충돌 감지 시 보수적으로 계산 (최대값 기준)
    if (isMobile) {
      memoWidthPercent = 80 // CSS: min(250px, 80vw) -> 최대 80% 가정
      memoHeightPx = 160
    } else if (isTablet) {
      memoWidthPercent = 45
      memoHeightPx = 170
    } else {
      memoWidthPercent = 30 // CSS: min(320px, 80vw) -> 데스크톱에서 약 30% 가정
      memoHeightPx = 180
    }
    
    // 화면 크기 기준으로 픽셀 변환 (대략적인 계산)
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
    existingMemos: Array<{ position: { x: number; y: number }; rotation: number }>
  ): { x: number; y: number } {
    // 화면 크기에 따라 메모지 크기와 배치 조정
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
    const isTablet = typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerWidth > 480
    
    let memoHeight: number
    let gapY: number
    let memosPerRow: number
    
    if (isMobile) {
      memoHeight = 100 // px
      gapY = 20 // px
      memosPerRow = 1 // 한 줄에 1개
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
    const baseRow = Math.floor(index / memosPerRow)
    const baseCol = index % memosPerRow
    
    // 중앙 기준 배치 (가로 잘림 방지)
    const colCenters = isMobile ? [50] : isTablet ? [25, 75] : [17, 50, 83]
    const baseX = colCenters[baseCol] || 50
    const baseY = 10 + baseRow * (memoHeight + gapY)
    
    // 랜덤 회전 각도 생성
    const rotation = Math.random() * 30 - 15 // -15 ~ 15도
    
    // 기본 위치에서 시작 (중앙 기준)
    let x = baseX + (Math.random() * 6 - 3) // ±3% 랜덤 오프셋
    let y = baseY + (Math.random() * 15 - 7.5) // ±7.5px 랜덤 오프셋
    
    // 경계 체크 및 조정 (가장자리 여유 공간 확보)
    x = Math.max(8, Math.min(92, x)) // 8~92% 범위로 제한
    y = Math.max(5, y) // 최소값 조정
    
    // 충돌 감지 및 위치 조정
    let attempts = 0
    while (checkCollision({ x, y }, rotation, existingMemos) && attempts < maxAttempts) {
      // 다른 위치 시도
      const offsetX = (Math.random() * 8 - 4) * (attempts + 1) // 시도할수록 더 멀리
      const offsetY = (Math.random() * 30 - 15) * (attempts + 1)
      
      x = baseX + offsetX
      y = baseY + offsetY
      
      // 경계 체크 (가장자리 여유 공간 확보)
      x = Math.max(8, Math.min(92, x))
      y = Math.max(5, y)
      
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
  const totalPages = Math.ceil(memoNotes.length / MEMOS_PER_PAGE)
  const currentMemos = memoNotes.slice(
    (currentPage - 1) * MEMOS_PER_PAGE,
    currentPage * MEMOS_PER_PAGE
  )

  const handleSubmit = () => {
    if (!name.trim() || !message.trim()) {
      alert('이름과 메시지를 모두 입력해주세요.')
      return
    }

    const newIndex = guestbookMessages.length
    // 기존 메모지들의 위치와 회전 정보 추출
    const existingMemos = memoNotes.map(memo => ({
      position: memo.position,
      rotation: memo.rotation
    }))
    
    const rotation = Math.random() * 30 - 15 // -15 ~ 15도
    const position = calculateMemoPosition(newIndex, existingMemos)

    addGuestbookMessage({
      id: Date.now().toString(),
      name,
      message,
      timestamp: Date.now(),
      design: selectedDesign,
      rotation,
      position,
    } as any)

    setName('')
    setMessage('')
    setSelectedDesign('yellow')
    setWriteOpen(false)
  }

  return (
    <div className="guestbook-page">
      <div className="guestbook-header">
        <h2>방명록</h2>
        <button
          className="add-message-button"
          onClick={() => setWriteOpen(true)}
        >
          메모지 붙이기
        </button>
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
                }}
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
            {currentPage} / {totalPages}
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
    </div>
  )
}

export default Guestbook
