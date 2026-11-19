import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import Sheet from './Sheet'
import Button from './Button'

/**
 * 상단바 「⋯」 더보기 — 누르면 액션 시트가 올라옵니다.
 *
 * 화면마다 할 수 있는 일이 달라서 항목은 밖에서 넘깁니다.
 * 줄 게 없으면 이 컴포넌트를 아예 쓰지 마세요 — 눌러도 아무 일 없는 ⋯ 가 제일 나쁩니다.
 *
 * 항목은 셋 중 하나입니다.
 *   to      다른 화면으로 이동
 *   onSelect 그 자리에서 실행 (시트는 닫힙니다)
 *   note    아직 화면이 없는 동작 — 안내만 보여 줍니다 (MOCK)
 */

export interface MoreItem {
  label: string
  /** 한 줄 설명 (선택) */
  sub?: string
  to?: string
  onSelect?: () => void
  /** MOCK: 서버가 붙기 전까지 안내 문구만 */
  note?: string
  /** 되돌리기 어려운 동작 — 빨강 (규칙 7) */
  danger?: boolean
}

interface MoreMenuProps {
  items: MoreItem[]
  title?: string
  /** 사진 위 원형 버튼으로 쓸 때 (S4 등) */
  className?: string
  label?: string
  /** 같은 시트를 공유 버튼으로도 씁니다 */
  icon?: string
}

const MoreMenu = ({
  items,
  title = '더보기',
  className,
  label = '더보기',
  icon = 'more',
}: MoreMenuProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<{ label: string; text: string } | null>(null)

  if (items.length === 0) return null

  const pick = (item: MoreItem) => {
    setOpen(false)
    if (item.note) {
      setNote({ label: item.label, text: item.note })
      return
    }
    if (item.onSelect) item.onSelect()
    if (item.to) navigate(item.to)
  }

  return (
    <>
      <button
        type="button"
        className={className ?? 'lui-topbar__side'}
        aria-label={label}
        aria-haspopup="menu"
        onClick={() => setOpen(true)}
      >
        <Icon name={icon} size={18} />
      </button>

      <Sheet open={open} title={title} onClose={() => setOpen(false)}>
        <div className="lui-menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`lui-menu__item${item.danger ? ' lui-menu__item--danger' : ''}`}
              onClick={() => pick(item)}
            >
              <span className="lui-menu__label">{item.label}</span>
              {item.sub && <span className="lui-menu__sub">{item.sub}</span>}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!note} title={note?.label} onClose={() => setNote(null)}>
        <p className="lui-menu__note">{note?.text}</p>
        <Button block onClick={() => setNote(null)}>
          확인
        </Button>
      </Sheet>
    </>
  )
}

export default MoreMenu
