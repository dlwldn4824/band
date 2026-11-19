import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import DirectionsSheet from '../components/DirectionsSheet'
import { P } from '../paths'
import { showLive as s } from '../../mocks/bandyLight'
import './P1ShowLive.css'

/** P1 공연 정보 (예매 후) — Figma 293:2 */
const P1ShowLive = () => {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [dirs, setDirs] = useState(false)
  const { showId = 'glow' } = useParams()

  const go = (to: string) => {
    if (to === 'people') navigate(P.livePeople(showId))
    if (to === 'store') navigate(P.liveStore(showId))
    if (to === 'guestbook') navigate(P.liveGuestbook(showId))
  }

  return (
    <Phone time="18:42">
      <div className="lui-body">
        <div className="p1__hero">
          <img src={s.hero} alt="" />
          <button type="button" className="p1__round" onClick={() => navigate(-1)} aria-label="뒤로">
            <Icon name="chevron-left" size={20} />
          </button>
          <div className="p1__hero-right">
            <button
              type="button"
              className={`p1__round${liked ? ' p1__round--on' : ''}`}
              aria-label="찜하기"
              aria-pressed={liked}
              onClick={() => setLiked((v) => !v)}
            >
              <Icon name="heart" size={16} />
            </button>
            <button
              type="button"
              className="p1__round"
              onClick={() => navigate(P.invite)}
              aria-label="공유하기"
            >
              <Icon name="share" size={18} />
            </button>
          </div>
        </div>

        <div className="p1">
          <div className="p1__gap-14" />
          <div className="p1__badges">
            {s.badges.map((b) => (
              <span key={b.label} className={`lui-pill${b.tone === 'ink' ? ' lui-pill--ink' : ''}`}>
                {b.label}
              </span>
            ))}
          </div>

          <div className="p1__gap-14" />
          <h1 className="p1__title">
            {s.titleLines[0]}
            <br />
            {s.titleLines[1]}
          </h1>

          <div className="p1__gap-14" />
          <p className="p1__when">{s.when}</p>

          <div className="p1__gap-26" />
          <div className="lui-card p1__entry">
            <ListRow
              avatar="QR"
              title={s.entry.title}
              sub={s.entry.sub}
              chevron
              onClick={() => navigate(P.ticket(showId))}
            />
          </div>

          <div className="p1__gap-26" />
          <SectionHeader title="오늘 순서" aside={`${s.timeline.length}팀`} />
          <div className="lui-card p1__timeline">
            {s.timeline.map((slot) => (
              <div key={slot.at} className="p1-slot">
                <span className="p1-slot__time">
                  <span className="p1-slot__at">{slot.at}</span>
                  <span className="p1-slot__dur">{slot.dur}</span>
                </span>
                <span className="p1-slot__main">
                  {'now' in slot && slot.now && <span className="p1-slot__now">지금 무대</span>}
                  <span className="p1-slot__title">{slot.title}</span>
                  <span className="p1-slot__sub">{slot.sub}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="p1__gap-26" />
          <SectionHeader title="셋리스트" aside={s.setlistOwner} />
          <div className="lui-card p1__setlist">
            {s.setlist.map((song) => (
              <div key={song.no} className="p1-song">
                <span className="p1-song__no">{song.no}</span>
                <span className="p1-song__title">{song.title}</span>
                <span className="p1-song__who">{song.who}</span>
              </div>
            ))}
          </div>

          <div className="p1__gap-26" />
          <SectionHeader title="이 공연에서 할 수 있는 것" />
          <div className="lui-card p1__cando">
            {s.canDo.map((row) => {
              const lock = 'lock' in row ? row.lock : undefined
              return (
                <ListRow
                  key={row.title}
                  avatar={row.initial}
                  title={row.title}
                  sub={row.sub}
                  className={lock ? 'lui-row--locked' : undefined}
                  slot={lock ? <span className="lui-pill lui-pill--soft">{lock}</span> : undefined}
                  chevron={!lock}
                  onClick={lock ? undefined : () => go(row.to)}
                />
              )
            })}
          </div>

          <div className="p1__gap-26" />
          <SectionHeader title="공연장" aside="길찾기" onAside={() => setDirs(true)} />
          <div className="lui-card p1__venue">
            <ListRow
              title={s.venue.name}
              sub={s.venue.address}
              chevron
              onClick={() => setDirs(true)}
            />
          </div>

          <div className="p1__gap-26" />
          <p className="p1__notice">{s.notice}</p>
        </div>
      </div>

      <DirectionsSheet venue={s.venue} open={dirs} onClose={() => setDirs(false)} />

      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.ticket(showId))}>
          입장 코드 열기
        </Button>
      </div>
    </Phone>
  )
}

export default P1ShowLive
