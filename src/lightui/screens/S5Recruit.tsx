import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Stepper from '../components/Stepper'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import { P } from '../paths'
import { recruitForm as f } from '../../mocks/bandyLight'
import './S5Recruit.css'

const man = (n: number) => `${(n / 10000).toLocaleString('ko-KR')}만 원`

/** S5 모집 글 쓰기 — Figma 208:2 */
const S5Recruit = () => {
  const navigate = useNavigate()
  const [venue, setVenue] = useState(f.venueOptions[0].id)
  const [teams, setTeams] = useState(f.teams.initial)

  const needMore = Math.max(teams - f.teams.joined, 0)

  return (
    <Phone>
      <TopBar title="모집 글 쓰기" />
      <div className="lui-body">
        <div className="s5">
          <div className="s5__gap-14" />

          <span className="s5__label">제목</span>
          <input className="lui-input" defaultValue={f.title} />

          <div className="s5__gap-14" />
          <span className="s5__label">공연 예정일</span>
          <input className="lui-input" placeholder={f.datePlaceholder} />

          <div className="s5__gap-14" />
          <span className="s5__label">공연장</span>
          <div className="lui-radios">
            {f.venueOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`lui-radio${venue === opt.id ? ' lui-radio--on' : ''}`}
                onClick={() => setVenue(opt.id)}
                aria-pressed={venue === opt.id}
              >
                <span className="lui-radio__dot" />
                <span className="lui-radio__main">
                  <span className="lui-radio__title">{opt.title}</span>
                  <span className="lui-radio__sub">{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="s5__gap-14" />
          <span className="s5__label">필요한 팀 수</span>
          <div className="lui-card s5__teams">
            <div className="s5__teams-row">
              <div className="s5__teams-main">
                <span className="s5__teams-title">{f.teams.title}</span>
                <span className="s5__teams-sub">
                  현재 {f.teams.joined}팀 · {needMore}팀 더 필요
                </span>
              </div>
              <Stepper value={teams} min={f.teams.joined} max={8} onChange={setTeams} label="팀" />
            </div>
          </div>

          <div className="s5__gap-14" />
          <span className="s5__label">팀당 비용</span>
          <SummaryBox
            items={[
              { k: '밴디 참가비', v: `팀당 ${man(f.feePerTeam)}` },
              { k: '대관료', v: '0원' },
              {
                k: '예상 합계',
                v: `${teams}팀 × ${man(f.feePerTeam)} = ${man(teams * f.feePerTeam)}`,
                accent: true,
              },
            ]}
          />

          <div className="s5__gap-14" />
          <span className="s5__label">소개</span>
          <textarea className="lui-input" placeholder={f.aboutPlaceholder} />

          <div className="s5__gap-26" />
          <p className="s5__notice">{f.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar s5__bottom">
        {/* 규칙 1 — 기본 버튼은 「올리기」 하나 */}
        <Button variant="ghost">임시 저장</Button>
        <Button onClick={() => navigate(P.clubs)}>올리기</Button>
      </div>
    </Phone>
  )
}

export default S5Recruit
