import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import DirectionsSheet from '../components/DirectionsSheet'
import { P } from '../paths'
import { useGoBack } from '../useGoBack'
import { showDetail as s } from '../../mocks/bandyLight'
import mapVenue from '../assets/map-venue.svg'
import './D1Show.css'

/** D1 공연 상세 — Figma 183:2 */
const D1Show = () => {
  const navigate = useNavigate()
  const goBack = useGoBack()
  const [liked, setLiked] = useState(false)
  const [dirs, setDirs] = useState(false)

  return (
    <Phone>
      <div className="lui-body">
        <div className="d1__hero">
          <img src={s.hero} alt="" />
          <button type="button" className="d1__round" onClick={() => goBack()} aria-label="뒤로">
            <Icon name="chevron-left" size={20} />
          </button>
          <div className="d1__hero-right">
            <button
              type="button"
              className={`d1__round${liked ? ' d1__round--on' : ''}`}
              aria-label="찜하기"
              aria-pressed={liked}
              onClick={() => setLiked((v) => !v)}
            >
              <Icon name="heart" size={18} />
            </button>
            <button
              type="button"
              className="d1__round"
              onClick={() => navigate(P.invite)}
              aria-label="공유하기"
            >
              <Icon name="share" size={18} />
            </button>
          </div>
        </div>

        <div className="d1__body">
          <div className="d1__gap-20" />

          <div className="d1__badges">
            {s.badges.map((b, i) => (
              <span key={b} className={`d1-badge${i === 0 ? ' d1-badge--accent' : ''}`}>
                {b}
              </span>
            ))}
          </div>

          <div className="d1__gap-14" />
          <h1 className="d1__title">
            {s.titleLines[0]}
            <br />
            {s.titleLines[1]}
          </h1>

          <div className="d1__gap-14" />
          <p className="d1__host">{s.host}</p>

          <div className="d1__gap-26" />
          <div className="d1__info">
            {s.info.map((row) => (
              <div key={row.k} className="d1__info-row">
                <span className="d1__info-k">{row.k}</span>
                <span className="d1__info-v">{row.v}</span>
              </div>
            ))}
          </div>

          <div className="d1__gap-26" />
          <SectionHeader title="출연 팀" aside={`${s.lineup.length}팀`} />
          <div className="lui-card d1__lineup">
            {s.lineup.map((team) => (
              <ListRow
                key={team.name}
                avatar={team.initial}
                title={team.name}
                sub={team.sub}
                chevron
                onClick={() => navigate(P.club(team.name))}
              />
            ))}
          </div>

          <div className="d1__gap-26" />
          <SectionHeader title="공연 소개" />
          <p className="d1__about">{s.about.join('\n')}</p>

          <div className="d1__gap-26" />
          <SectionHeader title="공연장" aside="길찾기" onAside={() => setDirs(true)} />
          <div className="lui-card d1__venue">
            <div className="d1__venue-map">
              <img src={mapVenue} alt="" />
            </div>
            <ListRow
              title={s.venue.name}
              sub={s.venue.address}
              chevron
              onClick={() => setDirs(true)}
            />
          </div>

          <div className="d1__gap-26" />
          <p className="d1__notice">{s.notice}</p>
        </div>
      </div>

      <DirectionsSheet venue={s.venue} open={dirs} onClose={() => setDirs(false)} />

      <div className="lui-bottombar">
        <div className="lui-bottombar__info">
          <span className="lui-bottombar__value">{s.price}</span>
          <span className="lui-bottombar__label">{s.remain}</span>
        </div>
        <Button onClick={() => navigate(P.book(s.id))}>예매하기</Button>
      </div>
    </Phone>
  )
}

export default D1Show
