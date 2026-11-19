import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TabBar from '../components/TabBar'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Toggle from '../components/Toggle'
import { P } from '../paths'
import PushRow from '../push/PushRow'
import { notifications as n } from '../../mocks/bandyLight'
import './S8Notifications.css'

const dest: Record<string, string> = {
  proposal: P.proposal('1'),
  ticket: P.ticket('glow'),
  venue: P.venue,
  show: P.show('glow'),
}

/** S8 알림 — Figma 211:2 */
const S8Notifications = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(n.settings)
  // 「모두 읽음으로」 를 누르면 안 읽음 점을 전부 지웁니다
  const [allRead, setAllRead] = useState(false)

  return (
    <Phone>
      <TopBar
        title="알림"
        right={
          <MoreMenu
            items={[
              { label: '모두 읽음으로', onSelect: () => setAllRead(true) },
              { label: '알림 설정', note: '아래 토글에서 종류별로 끄고 켤 수 있어요.' },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s8">
          <div className="s8__gap-14" />
          <SectionHeader title="오늘" />
          <div className="lui-card s8__list">
            {n.today.map((item) => (
              <ListRow
                key={item.title}
                avatar={item.initial}
                title={item.title}
                sub={item.sub}
                slot={item.unread && !allRead ? <span className="lui-unread" /> : undefined}
                chevron={!item.unread || allRead}
                onClick={() => item.to && navigate(dest[item.to])}
              />
            ))}
          </div>

          <div className="s8__gap-26" />
          <SectionHeader title="이번 주" />
          <div className="lui-card s8__list">
            {n.thisWeek.map((item) => (
              <ListRow
                key={item.title}
                avatar={item.initial}
                title={item.title}
                sub={item.sub}
                chevron
                onClick={() => navigate(dest[item.to])}
              />
            ))}
          </div>

          <div className="s8__gap-26" />
          {/* 「받을 수 있는지」 와 「무엇을 받을지」 는 다른 이야기라 카드를 나눕니다 */}
          <SectionHeader title="알림 받기" />
          <PushRow />

          <div className="s8__gap-26" />
          <SectionHeader title="무엇을 받을지" />
          <div className="lui-card s8__list">
            {settings.map((row) => (
              <ListRow
                key={row.id}
                title={row.title}
                sub={row.sub}
                slot={
                  <Toggle
                    on={row.on}
                    label={row.title}
                    onChange={(next) =>
                      setSettings((prev) =>
                        prev.map((it) => (it.id === row.id ? { ...it, on: next } : it)),
                      )
                    }
                  />
                }
              />
            ))}
          </div>
        </div>
      </div>
      <TabBar active="my" />
    </Phone>
  )
}

export default S8Notifications
