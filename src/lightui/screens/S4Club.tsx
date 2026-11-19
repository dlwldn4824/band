import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import MoreMenu from '../components/MoreMenu'
import { P } from '../paths'
import { useRole } from '../auth/role'
import { copyLink, shareBySms } from '../share/share'
import { clubDetail as c } from '../../mocks/bandyLight'
import './S4Club.css'

/** S4 동아리 상세 — Figma 207:2 */
const S4Club = () => {
  const navigate = useNavigate()
  const { isManager } = useRole()
  const [following, setFollowing] = useState(false)
  const link = `${window.location.origin}${P.club('melodic')}`

  return (
    <Phone>
      <div className="lui-body">
        <div className="s4__hero">
          <img src={c.cover} alt="" />
          <button type="button" className="s4__round" onClick={() => navigate(-1)} aria-label="뒤로">
            <Icon name="chevron-left" size={20} />
          </button>
          <div className="s4__hero-right">
            <MoreMenu
              className="s4__round"
              icon="share"
              label="공유하기"
              title="동아리 공유"
              items={[
                { label: '링크 복사', sub: link, onSelect: () => void copyLink(link) },
                {
                  label: '문자로 보내기',
                  onSelect: () => shareBySms(`${c.name} 동아리 구경해 봐!`, link),
                },
              ]}
            />
            <MoreMenu
              className="s4__round"
              items={[
                { label: '대화 열기', to: P.chat('melodic') },
                {
                  label: '신고하기',
                  danger: true,
                  note: '신고 내용은 운영팀만 봅니다. 상대 동아리에는 누가 신고했는지 전해지지 않습니다.',
                },
              ]}
            />
          </div>
        </div>

        <div className="s4__body">
          <div className="s4__avatar">{c.initial}</div>
          <div className="s4__gap-14" />
          <h1 className="s4__name">{c.name}</h1>
          <p className="s4__sub">{c.sub}</p>

          <div className="s4__gap-26" />
          <div className="lui-card s4__stats">
            {c.stats.map((s) => (
              <div key={s.k} className="s4__stat">
                <span className="s4__stat-k">{s.k}</span>
                <span className="s4__stat-v">{s.v}</span>
              </div>
            ))}
          </div>

          <div className="s4__gap-14" />
          <div className="s4__actions">
            {/* 규칙 1 — 이 화면의 기본 버튼은 팔로우 하나 */}
            <Button
              variant={following ? 'ghost' : 'primary'}
              aria-pressed={following}
              onClick={() => setFollowing((v) => !v)}
            >
              {following ? '팔로잉' : '팔로우'}
            </Button>
            {/* 교류 제안은 운영진 일입니다 */}
            {isManager && (
              <Button variant="ghost" onClick={() => navigate(P.chat('melodic'))}>
                교류 제안
              </Button>
            )}
          </div>

          <div className="s4__gap-26" />
          <SectionHeader title="소개" />
          <p className="s4__about">{c.about}</p>

          <div className="s4__gap-26" />
          <SectionHeader title="다가오는 공연" aside="1" />
          <div className="lui-card s4__upcoming">
            <ListRow
              avatar={<img src={c.upcoming.thumb} alt="" />}
              title={c.upcoming.title}
              sub={c.upcoming.sub}
              chevron
              onClick={() => navigate(P.show('glow'))}
            />
          </div>

          <div className="s4__gap-26" />
          <SectionHeader title="지난 공연" aside={String(c.pastCount)} />
          <div className="lui-card s4__past">
            {c.past.map((show) => (
              <ListRow
                key={show.title}
                title={show.title}
                sub={show.sub}
                chevron
                onClick={() => navigate(P.show('glow'))}
              />
            ))}
          </div>
        </div>
      </div>
      <TabBar active="club" />
    </Phone>
  )
}

export default S4Club
