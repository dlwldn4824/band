import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { P } from '../paths'
import { invite as iv } from '../../mocks/bandyLight'
import { renderTicketImage } from '../share/ticketImage'
import { copyLink, downloadStoryImage, shareByKakao, shareBySms } from '../share/share'
import inviteTicket from '../assets/invite-ticket.png'
import './S15Invite.css'

/** S15 초대 보내기 — Figma 235:2 */
const S15Invite = () => {
  const navigate = useNavigate()
  const [message, setMessage] = useState(iv.message)
  const [preview, setPreview] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const ticket = {
    title: iv.title,
    when: iv.ticketWhen,
    venue: iv.venue,
    poster: iv.poster,
    link: iv.link,
  }

  /**
   * 「보낼 모습」 미리보기.
   * MOCK: 서버(/api/og/:eventId)가 붙기 전까지 같은 레이아웃을 브라우저에서 그립니다.
   */
  useEffect(() => {
    let url: string | null = null
    let alive = true
    renderTicketImage(ticket, 'og')
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setPreview(url)
      })
      .catch(() => {
        /* 못 그리면 아래에서 기본 티켓 이미지를 보여 줍니다 */
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const say = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 1800)
  }

  const onChannel = async (id: string) => {
    if (id === 'sms') return void shareBySms(message, iv.fullLink)
    if (id === 'kakao') return void shareByKakao(message, iv.fullLink)
    if (id === 'link') {
      const r = await copyLink(iv.fullLink)
      return say(r === 'copied' ? '링크를 복사했어요' : '복사가 막혀 있어요. 주소를 길게 눌러 복사해 주세요')
    }
    if (id === 'story') {
      say('스토리 이미지를 만들고 있어요…')
      const r = await downloadStoryImage(ticket)
      return say(r === 'downloaded' ? '이미지를 저장했어요. 인스타에 올려 주세요' : '이미지를 만들지 못했어요')
    }
  }

  return (
    <Phone>
      <TopBar
        title="초대하기"
        right={
          <MoreMenu
            items={[
              { label: '문자로 초대', to: P.inviteSms },
              { label: '초대 카드 미리 보기', to: P.inviteCard() },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s15">
          <div className="s15__gap-14" />
          <SectionHeader title="보낼 모습" aside="미리보기" />
          <div className="lui-card s15__preview">
            <img src={preview ?? inviteTicket} alt="문자로 보낼 때 보이는 티켓 모습" />
            <div className="s15__meta">
              <span className="s15__title">{iv.title}</span>
              <span className="s15__when">{iv.when}</span>
              <span className="s15__link">{iv.link}</span>
            </div>
          </div>

          <div className="s15__gap-26" />
          <SectionHeader title="같이 보낼 말" aside="기본 문구" />
          <textarea
            className="lui-input s15__message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="s15__gap-26" />
          <SectionHeader title="어디로 보낼까요" />
          {/* 규칙 5 — 56px 원형 아이콘 버튼 + 아래 라벨, 카카오톡만 #FEE500 */}
          <div className="lui-share">
            {iv.channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                className="lui-share__item"
                onClick={() => onChannel(ch.id)}
              >
                <span
                  className={`lui-share__circle${ch.id === 'kakao' ? ' lui-share__circle--kakao' : ''}`}
                >
                  <Icon name={ch.icon} size={23} />
                </span>
                <span className="lui-share__label">{ch.label}</span>
              </button>
            ))}
          </div>

          <div className="s15__gap-26" />
          <SectionHeader title="내 초대 현황" aside="이번 공연" />
          <SummaryBox items={iv.stats} />

          <div className="s15__gap-14" />
          <p className="s15__notice">{iv.notice}</p>
        </div>
      </div>

      {toast && <div className="s15__toast">{toast}</div>}

      <div className="lui-bottombar">
        <Button block flat onClick={() => { shareBySms(message, iv.fullLink); navigate(P.inviteSms) }}>
          문자로 초대 보내기
        </Button>
      </div>
    </Phone>
  )
}

export default S15Invite
