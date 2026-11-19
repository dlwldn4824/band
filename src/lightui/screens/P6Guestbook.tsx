import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import Button from '../components/Button'
import { P } from '../paths'
import ReportMenu from '../safety/ReportMenu'
import { guestbook as g } from '../../mocks/bandyLight'
import './P6Guestbook.css'

const WHO = ['이름 공개', '익명'] as const

/** P6 방명록 — Figma 298:2 */
const P6Guestbook = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [text, setText] = useState('')
  const [who, setWho] = useState<string>(WHO[0])
  const [reporting, setReporting] = useState(false)

  return (
    <Phone time="18:42">
      <TopBar
        title="방명록"
        right={
          <MoreMenu
            items={[
              { label: '같이 온 사람들', to: P.livePeople() },
              {
                label: '신고 · 차단',
                danger: true,
                onSelect: () => setReporting(true),
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="p6">
          <div className="p6__gap-14" />
          <h1 className="p6__title">{g.title}</h1>

          <div className="p6__gap-14" />
          <p className="p6__lead">{g.lead}</p>

          <div className="p6__gap-14" />
          <textarea
            className="lui-input p6__input"
            placeholder={g.placeholder}
            maxLength={g.maxLength}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="p6__gap-14" />
          <div className="p6__opts">
            <div className="p6__who" role="group" aria-label="이름 공개 여부">
              {WHO.map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={w === who}
                  className={`p6-who${w === who ? ' p6-who--on' : ''}`}
                  onClick={() => setWho(w)}
                >
                  {w}
                </button>
              ))}
            </div>
            <span className="p6__count">
              {text.length} / {g.maxLength}
            </span>
          </div>

          <div className="p6__gap-26" />
          <SectionHeader title="남겨진 말" aside={g.count} />
          <div className="p6__entries">
            {g.entries.map((entry, i) => (
              <div key={i} className="lui-card p6-entry">
                <div className="p6-entry__head">
                  <span className="p6-entry__avatar">{entry.initial}</span>
                  <span className="p6-entry__name">{entry.name}</span>
                  <span className="p6-entry__at">{entry.at}</span>
                </div>
                <p className="p6-entry__text">{entry.text}</p>
              </div>
            ))}
          </div>

          <div className="p6__gap-26" />
          <p className="p6__notice">{g.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar">
        <Button block disabled={text.trim().length === 0} onClick={() => navigate(P.live(showId))}>
          남기기
        </Button>
      </div>
      <ReportMenu
        kind="guestbook"
        targetId={`guestbook:${showId}`}
        targetName="이 방명록"
        openedFromOutside={reporting}
        onOutsideClose={() => setReporting(false)}
      />
    </Phone>
  )
}

export default P6Guestbook
