import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import Logo from '../components/Logo'
import { P } from '../paths'
import { inviteCard as c } from '../../mocks/bandyLight'
import inviteTicket from '../assets/invite-ticket.png'
import './S17InviteCard.css'

/** S17 초대장 (링크 열면) — Figma 237:2 */
const S17InviteCard = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <div className="lui-body">
        <div className="s17">
          <div className="s17__head">
            <Logo kind="mark" className="s17__mark" />
            <h1 className="s17__title">
              {c.headline[0]}
              <br />
              {c.headline[1]}
            </h1>
            <p className="s17__host">{c.host}</p>
          </div>

          <img className="s17__ticket" src={inviteTicket} alt="" />

          <div className="s17__gap-14" />
          <SummaryBox items={c.facts} />

          <div className="s17__gap-26" />
          <div className="s17__sender">
            <span className="s17__sender-avatar">{c.sender.initial}</span>
            <span className="s17__sender-main">
              <span className="s17__sender-name">{c.sender.name}</span>
              <span className="s17__sender-role">{c.sender.role}</span>
            </span>
          </div>

          <div className="s17__gap-14" />
          <p className="s17__quote">{c.message}</p>

          <div className="s17__gap-26" />
          <span className="s17__social">{c.social}</span>

          <div className="s17__gap-26" />
          <p className="s17__notice">{c.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar lui-bottombar--stack">
        {/* 규칙 1 — 기본 버튼 하나. Figma 가 평평하게 그린 버튼입니다 */}
        <Button flat onClick={() => navigate(P.book('glow'))}>
          초대 받고 예매하기
        </Button>
        <Button variant="ghost" onClick={() => navigate(P.show('glow'))}>
          공연 정보 먼저 보기
        </Button>
      </div>
    </Phone>
  )
}

export default S17InviteCard
