import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import { P } from '../paths'
import { proposal as pr } from '../../mocks/bandyLight'
import './S6Proposal.css'

/** S6 받은 제안 상세 — Figma 209:2 */
const S6Proposal = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <TopBar
        title="받은 제안"
        right={
          <MoreMenu
            items={[
              { label: '대화 열기', to: P.chat('1') },
              { label: '상대 동아리 보기', to: P.club() },
              {
                label: '신고하기',
                danger: true,
                note: '신고 내용은 운영팀만 봅니다. 상대 동아리에는 누가 신고했는지 전해지지 않습니다.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s6">
          <div className="s6__gap-14" />

          <div className="lui-card s6__from">
            <div className="s6__from-row">
              <span className="s6__from-avatar">{pr.from.initial}</span>
              <span className="s6__from-main">
                <span className="s6__from-name">{pr.from.name}</span>
                <span className="s6__from-sub">{pr.from.sub}</span>
              </span>
              <span className="lui-pill s6__badge">{pr.from.badge}</span>
            </div>
          </div>

          <div className="s6__gap-26" />
          <SectionHeader title="보낸 말" />
          <div className="lui-card s6__message">{pr.message}</div>

          <div className="s6__gap-26" />
          <SectionHeader title="제안 조건" />
          <SummaryBox items={pr.terms} />

          <div className="s6__gap-26" />
          <SectionHeader title="하모닉의 지난 공연" aside={String(pr.pastCount)} />
          <div className="lui-card s6__past">
            {pr.past.map((row) => (
              <ListRow
                key={row.title}
                title={row.title}
                sub={row.sub}
                chevron
                onClick={() => navigate(P.show('glow'))}
              />
            ))}
          </div>

          <div className="s6__gap-26" />
          <p className="s6__notice">{pr.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar s6__bottom">
        {/* 규칙 1 — 기본 버튼은 「수락」 하나, 나머지는 외곽선 */}
        <Button variant="ghost" onClick={() => navigate(P.clubs)}>
          거절
        </Button>
        <Button variant="ghost" onClick={() => navigate(P.chat('harmonic'))}>
          대화
        </Button>
        <Button onClick={() => navigate(P.clubs)}>수락</Button>
      </div>
    </Phone>
  )
}

export default S6Proposal
