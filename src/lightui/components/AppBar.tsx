import { ReactNode } from 'react'
import Icon from './Icon'
import { useGoBack } from '../useGoBack'

/**
 * 뒤로가기 · 제목 · 우측 슬롯.
 *
 * 규칙 3 — 사진 위(`over`)가 아니면 아이콘 뒤에 원형 배경을 깔지 않습니다.
 */

interface AppBarProps {
  title?: string
  /** 사진 위에 얹는 경우 (D1 포스터 등) */
  over?: boolean
  /** 뒤로가기 목적지. 없으면 history back */
  back?: string | false
  right?: ReactNode
}

const AppBar = ({ title, over, back, right }: AppBarProps) => {
  const back0 = useGoBack()
  const goBack = () => back0(typeof back === 'string' ? back : undefined)
  return (
    <div className={`lui-appbar${over ? ' lui-appbar--over' : ''}`}>
      {back !== false && (
        <button type="button" className="lui-appbar__back" onClick={goBack} aria-label="뒤로">
          <Icon name="chevron-left" size={20} />
        </button>
      )}
      {title && <span className="lui-appbar__title">{title}</span>}
      <span className="lui-appbar__spacer" />
      {right}
    </div>
  )
}

export default AppBar
