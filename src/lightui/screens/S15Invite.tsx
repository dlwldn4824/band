import { useEffect, useRef, useState } from 'react'
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
import { renderTicketImage, type TicketTheme } from '../share/ticketImage'
import { copyLink, downloadStoryImage, shareByKakao, shareBySms } from '../share/share'
import inviteTicket from '../assets/invite-ticket.png'
import './S15Invite.css'

const TICKET_THEMES: { key: TicketTheme; label: string }[] = [
  { key: 'dark', label: '검정' },
  { key: 'light', label: '흰색' },
  { key: 'poster', label: '포스터' },
]

/** S15 초대 보내기 — Figma 235:2 */
const S15Invite = () => {
  const navigate = useNavigate()
  const [message, setMessage] = useState(iv.message)
  const [preview, setPreview] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [theme, setTheme] = useState<TicketTheme>('dark')
  /** 직접 올린 포스터 — 올리면 티켓 그림이 이걸 씁니다 */
  const [poster, setPoster] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const ticket = {
    title: iv.title,
    when: iv.ticketWhen,
    venue: iv.venue,
    poster: poster ?? iv.poster,
    link: iv.link,
    theme,
  }

  const pickPoster = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return say('이미지 파일만 올릴 수 있어요')
    // 큰 사진은 그리는 데 오래 걸립니다
    if (file.size > 8 * 1024 * 1024) return say('8MB 보다 작은 이미지로 올려 주세요')
    setPoster((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
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
  }, [theme, poster])

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
          <SectionHeader title="티켓 디자인" aside={poster ? '올린 사진' : '기본 포스터'} />
          <div className="s15__themes">
            {TICKET_THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={t.key === theme}
                className={`s15-theme${t.key === theme ? ' s15-theme--on' : ''}`}
                onClick={() => setTheme(t.key)}
              >
                <span className={`s15-theme__chip s15-theme__chip--${t.key}`} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="s15__gap-14" />
          <button type="button" className="s15__upload" onClick={() => fileRef.current?.click()}>
            <Icon name="plus" size={18} />
            {poster ? '다른 포스터로 바꾸기' : '포스터 직접 올리기'}
          </button>
          {poster && (
            <button
              type="button"
              className="s15__upload-undo"
              onClick={() => {
                URL.revokeObjectURL(poster)
                setPoster(null)
              }}
            >
              올린 사진 지우기
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickPoster(e.target.files?.[0])
              // 같은 파일을 다시 골라도 바뀌게
              e.target.value = ''
            }}
          />

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
