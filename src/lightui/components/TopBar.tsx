import { ReactNode } from 'react'
import Icon from './Icon'
import { useGoBack } from '../useGoBack'

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
  const goBack = useGoBack()
  return (
    <div className="lui-topbar">
      {/* back={false} 일 때 버튼을 두면 아이콘만 없는 투명한 버튼이 남습니다 */}
      {back === false ? (
        <span className="lui-topbar__side" />
      ) : (
        <button
          type="button"
          className="lui-topbar__side"
          onClick={() => goBack(typeof back === 'string' ? back : undefined)}
          aria-label="뒤로"
        >
          <Icon name="chevron-left" size={20} />
        </button>
      )}
      <p className="lui-topbar__title">{title}</p>
      <div className="lui-topbar__side">{right}</div>
    </div>
  )
}

export default TopBar
