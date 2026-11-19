import { Link } from 'react-router-dom'
import Icon from './Icon'
import { P } from '../paths'

/** 규칙 4 — 탭 5개, solid 아이콘 26px + 라벨 11px */
export type TabKey = 'home' | 'map' | 'ticket' | 'club' | 'my'

const TABS: { key: TabKey; label: string; to: string }[] = [
  { key: 'home', label: '홈', to: P.home },
  { key: 'map', label: '지도', to: P.map },
  { key: 'ticket', label: '내 티켓', to: P.tickets },
  { key: 'club', label: '동아리', to: P.clubs },
  { key: 'my', label: '마이', to: P.me },
]

const TabBar = ({ active }: { active: TabKey }) => (
  <nav className="lui-tabbar">
    {TABS.map((tab) => {
      const on = tab.key === active
      return (
        <Link
          key={tab.key}
          to={tab.to}
          className={`lui-tabbar__item${on ? ' lui-tabbar__item--on' : ''}`}
          aria-current={on ? 'page' : undefined}
        >
          <Icon name={`tab-${tab.key}`} size={26} />
          <span className="lui-tabbar__label">{tab.label}</span>
        </Link>
      )
    })}
  </nav>
)

export default TabBar
