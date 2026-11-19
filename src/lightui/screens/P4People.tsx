import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Icon from '../components/Icon'
import { P } from '../paths'
import ReportMenu from '../safety/ReportMenu'
import { useBlocked } from '../safety/report'
import { nearbyPeople as np } from '../../mocks/bandyLight'
import './P4People.css'

/**
 * P4 현장 네트워킹 — Figma 296:2 에서 버튼 구성을 바꿨습니다.
 *
 * 원래는 카드마다 검정 「인사하기」 가 있고 아래에도 검정 「휴대폰 맞대서 연결하기」 가 있어서
 * 한 화면에 똑같이 생긴 검정 버튼이 셋이었고, 셋 다 같은 P5 로 갔습니다.
 * 지금은 ① 맨 위 한 줄 = 아무나와 맞대기, ② 사람 카드 = 그 사람과 맞대기 로 나누고
 * 채운 버튼은 하나도 쓰지 않습니다. 카드 자체가 누르는 자리입니다.
 */
const P4People = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const { isBlocked } = useBlocked()
  // 차단은 「안 보이게」 가 핵심이라 목록에서 빼 줍니다
  const people = np.people.filter((person) => !isBlocked(person.id))

  const tapWith = (name?: string) =>
    navigate(name ? `${P.liveTap(showId)}?with=${encodeURIComponent(name)}` : P.liveTap(showId))

  return (
    <Phone time="18:42">
      <TopBar
        title="오늘 여기 온 사람"
        right={
          <MoreMenu
            items={[
              { label: '방명록 보기', to: P.liveGuestbook(showId) },
              {
                label: '내 프로필 숨기기',
                note: '숨기면 이 공연 동안 다른 관객 목록에 뜨지 않습니다. 공연이 끝나면 저절로 풀립니다.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="p4">
          <div className="p4__gap-14" />
          <h1 className="p4__headline">
            {np.headline[0]}
            <br />
            {np.headline[1]}
          </h1>

          <div className="p4__gap-14" />
          <p className="p4__lead">{np.lead}</p>

          <div className="p4__gap-18" />
          {/* 아무나와 바로 — 채운 버튼 대신 한 줄 */}
          <button type="button" className="p4-nfc" onClick={() => tapWith()}>
            <span className="p4-nfc__glyph" aria-hidden>
              <span />
              <span />
            </span>
            <span className="p4-nfc__main">
              <span className="p4-nfc__title">{np.tapRow.title}</span>
              <span className="p4-nfc__sub">{np.tapRow.sub}</span>
            </span>
            <Icon name="chevron-right" size={18} className="p4-nfc__chev" />
          </button>

          <div className="p4__gap-18" />
          <div className="p4__list">
            {people.map((person) => (
              <div key={person.id} className="lui-card p4-person">
                {/* 모르는 사람을 실제로 만나게 하는 화면이라 신고·차단이 카드마다 붙습니다 */}
                <div className="p4-person__report">
                  <ReportMenu
                    kind="profile"
                    targetId={person.id}
                    targetName={person.name}
                    compact
                  />
                </div>
                <button
                  type="button"
                  className="p4-person__tap"
                  onClick={() => tapWith(person.name)}
                >
                <span className="p4-person__head">
                  <span className="p4-person__avatar">{person.initial}</span>
                  <span className="p4-person__who">
                    <span className="p4-person__name">{person.name}</span>
                    <span className="p4-person__sub">{person.sub}</span>
                  </span>
                  <span className={`lui-pill${person.strong ? '' : ' lui-pill--soft'}`}>
                    {person.overlap}
                  </span>
                </span>

                <span className="p4-person__tags">
                  {person.tags.map((tag) => (
                    <span key={tag.label} className={`p4-tag${tag.on ? ' p4-tag--on' : ''}`}>
                      {tag.label}
                    </span>
                  ))}
                </span>

                {/* 「대화 미션」 이라는 머리말 없이, 말풍선 모양이 그 뜻을 합니다 */}
                <span className="p4-person__bubble">{person.mission}</span>

                <span className="p4-person__go">
                  맞대서 인사하기
                  <Icon name="chevron-right" size={15} />
                </span>
                </button>
              </div>
            ))}
          </div>

          <div className="p4__gap-26" />
          <SectionHeader title="오늘 남긴 연결" aside={np.madeCount} />
          <div className="lui-card p4__made">
            {np.made.map((row) => (
              <ListRow
                key={row.name}
                avatar={row.initial}
                title={row.name}
                sub={row.sub}
                slot={<span className="lui-pill lui-pill--soft">{row.badge}</span>}
              />
            ))}
          </div>

          <div className="p4__gap-14" />
          <p className="p4__notice">{np.notice}</p>
          <div className="p4__gap-26" />
        </div>
      </div>
    </Phone>
  )
}

export default P4People
