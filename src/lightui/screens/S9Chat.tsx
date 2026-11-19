import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { chat } from '../../mocks/bandyLight'
import sendButton from '../assets/send-button.svg'
import './S9Chat.css'

/** 「오후 2:14」 처럼 목 데이터와 같은 꼴로 */
function nowLabel() {
  return new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

/** S9 대화 — Figma 212:2 */
const S9Chat = () => {
  const navigate = useNavigate()
  const [lines, setLines] = useState(chat.lines)
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setLines((prev) => [...prev, { side: 'me' as const, text, at: nowLabel() }])
    setDraft('')
  }

  return (
    <Phone>
      <TopBar
        title={chat.title}
        right={
          <MoreMenu
            items={[
              { label: '상대 동아리 보기', to: P.club() },
              { label: '제안 내용 다시 보기', to: P.proposal('1') },
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
        <div className="s9">
          <div className="s9__gap-14" />

          <div className="s9__thread">
            <div className="s9__day">
              <span>{chat.day}</span>
            </div>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className={`s9__row${line.side === 'me' ? ' s9__row--me' : ''}`}>
                  <p className="s9__bubble">{line.text}</p>
                </div>
                <div className={`s9__row${line.side === 'me' ? ' s9__row--me' : ''}`}>
                  <span className="s9__at">{line.at}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="s9__gap-26" />

          <div className="lui-card s9__joint">
            <div className="s9__joint-head">
              <span className="s9__joint-main">
                <span className="s9__joint-title">{chat.joint.title}</span>
                <span className="s9__joint-sub">{chat.joint.sub}</span>
              </span>
              <button
                type="button"
                className="s9__joint-link"
                onClick={() => navigate(P.proposal('1'))}
              >
                {chat.joint.link}
              </button>
            </div>
            {/* 규칙 1 — 이 화면의 유일한 기본 버튼 */}
            <Button onClick={() => navigate(P.showNew)}>{chat.joint.cta}</Button>
          </div>
        </div>
      </div>

      <div className="lui-bottombar s9__composer">
        <input
          className="lui-input"
          placeholder={chat.inputPlaceholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button
          type="button"
          className="s9__send"
          aria-label="보내기"
          disabled={!draft.trim()}
          onClick={send}
        >
          <img src={sendButton} alt="" />
        </button>
      </div>
    </Phone>
  )
}

export default S9Chat
