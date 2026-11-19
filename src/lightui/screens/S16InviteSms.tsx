import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { P } from '../paths'
import { inviteSms as m } from '../../mocks/bandyLight'
import inviteTicket from '../assets/invite-ticket.png'
import './S16InviteSms.css'

/** S16 문자로 받은 모습 — Figma 236:2 */
const S16InviteSms = () => {
  const navigate = useNavigate()
  const [replies, setReplies] = useState<string[]>([])
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setReplies((prev) => [...prev, text])
    setDraft('')
  }

  return (
    <Phone>
      <TopBar
        title={m.from}
        right={
          <MoreMenu
            items={[
              { label: '다른 방법으로 초대', to: P.invite },
              { label: '초대 카드 미리 보기', to: P.inviteCard() },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s16">
          <p className="s16__at">{m.at}</p>

          <button type="button" className="s16__card" onClick={() => navigate(P.inviteCard())}>
            <img src={inviteTicket} alt="" />
            <span className="s16__card-body">
              <span className="s16__card-title">{m.card.title}</span>
              <span className="s16__card-sub">{m.card.when}</span>
              <span className="s16__card-host">{m.card.host}</span>
            </span>
          </button>

          <p className="s16__bubble">{m.text}</p>
          <p className="s16__sender">{m.sender}</p>

          <div className="s16__gap" />
          <div className="s16__row-right">
            <p className="s16__bubble--me">{m.reply}</p>
          </div>
          <div className="s16__row-right">
            <span className="s16__read">{m.replyState}</span>
          </div>
          {replies.map((text, i) => (
            <div key={i} className="s16__row-right">
              <p className="s16__bubble--me">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lui-bottombar s16__composer">
        <input
          className="lui-input"
          placeholder="메시지"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button
          type="button"
          className="s16__send"
          aria-label="보내기"
          disabled={!draft.trim()}
          onClick={send}
        >
          <Icon name="send" size={19} />
        </button>
      </div>
    </Phone>
  )
}

export default S16InviteSms
