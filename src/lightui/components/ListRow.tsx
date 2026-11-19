import { ReactNode } from 'react'
import Icon from './Icon'

/** 아바타 + 2줄 + 우측 슬롯 + chevron */
interface ListRowProps {
  avatar?: ReactNode
  title: ReactNode
  sub?: ReactNode
  slot?: ReactNode
  chevron?: boolean
  onClick?: () => void
  className?: string
  /**
   * 슬롯 안에 또 버튼이 있을 때 (팔로우 토글 등).
   * 버튼 안에 버튼은 넣을 수 없어서, 행을 div 로 두고 앞쪽만 버튼으로 만듭니다.
   */
  slotInteractive?: boolean
}

const ListRow = ({
  avatar,
  title,
  sub,
  slot,
  chevron,
  onClick,
  className,
  slotInteractive,
}: ListRowProps) => {
  if (onClick && slotInteractive) {
    return (
      <div className={`lui-row${className ? ` ${className}` : ''}`}>
        <button type="button" className="lui-row__hit" onClick={onClick}>
          {avatar !== undefined && <span className="lui-row__avatar">{avatar}</span>}
          <span className="lui-row__main">
            <span className="lui-row__title">{title}</span>
            {sub !== undefined && <span className="lui-row__sub">{sub}</span>}
          </span>
        </button>
        {slot !== undefined && <span className="lui-row__slot">{slot}</span>}
        {chevron && <Icon name="chevron-right" size={18} className="lui-row__chev" />}
      </div>
    )
  }

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`lui-row${className ? ` ${className}` : ''}`}
    >
      {avatar !== undefined && <span className="lui-row__avatar">{avatar}</span>}
      <span className="lui-row__main">
        <span className="lui-row__title">{title}</span>
        {sub !== undefined && <span className="lui-row__sub">{sub}</span>}
      </span>
      {slot !== undefined && <span className="lui-row__slot">{slot}</span>}
      {chevron && <Icon name="chevron-right" size={18} className="lui-row__chev" />}
    </Tag>
  )
}

export default ListRow
