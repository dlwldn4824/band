import { ReactNode, useEffect } from 'react'

/**
 * 아래에서 올라오는 시트.
 *
 * 닫는 길은 세 가지입니다 — 뒷배경 누르기, Esc, 시트 안의 닫기 버튼.
 * 손잡이(grip)는 장식이 아니라 「끌어내릴 수 있는 것」 이라는 표시입니다.
 */
const Sheet = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="lui-sheet__scrim" onClick={onClose} role="presentation">
      <div
        className="lui-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lui-sheet__grip" />
        {title && <p className="lui-sheet__title">{title}</p>}
        {children}
      </div>
    </div>
  )
}

export default Sheet
