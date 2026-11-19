import { ReactNode } from 'react'

/** 규칙 2 — 제목 아래 12px, 우측 보조문구는 오른쪽 정렬 · 베이스라인 맞춤 */
const SectionHeader = ({
  title,
  aside,
  onAside,
  style,
}: {
  title: ReactNode
  aside?: ReactNode
  onAside?: () => void
  style?: React.CSSProperties
}) => (
  <div className="lui-sec" style={style}>
    <span className="lui-sec__title">{title}</span>
    {aside !== undefined &&
      (onAside ? (
        <button type="button" className="lui-sec__aside lui-sec__aside--link" onClick={onAside}>
          {aside}
        </button>
      ) : (
        <span className="lui-sec__aside">{aside}</span>
      ))}
  </div>
)

export default SectionHeader
