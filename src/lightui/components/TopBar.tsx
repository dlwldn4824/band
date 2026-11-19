import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

/**
 * 가운데 제목 상단 바 — Figma D2 184:10 / D3 185:10 / D4 186:10
 * 규칙 3 — 사진 위가 아니라서 원형 배경 없이 아이콘만 둡니다.
 */
const TopBar = ({
  title,
  back = true,
  right,
}: {
  title: string
  back?: boolean | string
  right?: ReactNode
}) => {
  const navigate = useNavigate()
  return (
    <div className="lui-topbar">
      <button
        type="button"
        className="lui-topbar__side"
        onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        aria-label="뒤로"
      >
        {back !== false && <Icon name="chevron-left" size={20} />}
      </button>
      <p className="lui-topbar__title">{title}</p>
      <div className="lui-topbar__side">{right}</div>
    </div>
  )
}

export default TopBar
