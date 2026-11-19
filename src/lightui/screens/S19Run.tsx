import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import Button from '../components/Button'
import Sheet from '../components/Sheet'
import { P } from '../paths'
import { showRun as r } from '../../mocks/bandyLight'
import { buildTimeline, DEFAULT_OPTIONS, type TimelineOptions } from '../timeline'
import './S19Run.css'

/**
 * S19 공연 당일 운영 — 타임라인과 공지를 한자리에서.
 *
 * 주최 동아리와 참여 동아리가 할 수 있는 일이 다릅니다. 주최는 타임라인을
 * 짜고 공지를 올리고, 참여는 봅니다 — 대신 자기 팀 순서와 리허설 시각이
 * 눈에 띄게 표시됩니다.
 *
 * 타임라인은 손으로 칸을 채우는 대신 조건을 넣으면 계산합니다. 리허설 순서,
 * 셋 체인지, 쿨링타임, 지연 허용까지 한 번에 맞물려서 손으로 짜면 꼭 하나를
 * 빠뜨립니다. 계산 근거는 아래에 그대로 적어 둡니다 (timeline.ts).
 */

const NUM: { key: keyof TimelineOptions; label: string; unit: string; hint?: string }[] = [
  { key: 'minutesPerSong', label: '곡 하나', unit: '분', hint: '멘트 포함' },
  { key: 'talkMinutes', label: '팀당 인사·멘트', unit: '분' },
  { key: 'changeMinutes', label: '무대 교체', unit: '분' },
  { key: 'rehearsalMinutes', label: '팀당 리허설', unit: '분', hint: '0 이면 리허설 없음' },
  { key: 'doorsBefore', label: '입장 시작', unit: '분 전' },
  { key: 'breakEvery', label: '쿨링타임 간격', unit: '팀마다', hint: '0 이면 쉬지 않음' },
  { key: 'breakMinutes', label: '쿨링타임', unit: '분' },
  { key: 'bufferPerTeam', label: '지연 허용', unit: '분/팀' },
]

const S19Run = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [params] = useSearchParams()
  const [opt, setOpt] = useState<TimelineOptions>(DEFAULT_OPTIONS)
  const [tune, setTune] = useState(false)
  const [notice, setNotice] = useState<(typeof r.notices)[number] | null>(null)
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState({ title: '', body: '' })
  const [extra, setExtra] = useState<typeof r.notices>([])

  // 주최인지 참여인지는 라인업이 정합니다.
  // MOCK: 참여 쪽 화면을 보려면 ?as=guest — 계정이 붙으면 지웁니다.
  const asGuest = params.get('as') === 'guest'
  const isHost = !asGuest && r.lineup.some((team) => team.id === r.myClubId && team.host)
  // 참여 쪽 화면을 볼 때는 우리 팀도 참여 팀으로 바꿔 봐야 제대로 읽힙니다
  const myClubId = asGuest
    ? (r.lineup.find((team) => !team.host)?.id ?? r.myClubId)
    : r.myClubId
  const result = useMemo(() => buildTimeline(r.lineup, opt), [opt])
  const notices = [...extra, ...r.notices]

  const set = (key: keyof TimelineOptions, raw: string) => {
    const v = parseInt(raw, 10)
    setOpt((o) => ({ ...o, [key]: Number.isFinite(v) && v >= 0 ? v : 0 }))
  }

  const post = () => {
    if (!draft.title.trim()) return
    setExtra((list) => [
      {
        id: `new-${list.length}`,
        at: '방금',
        by: '멜로딕 (주최)',
        title: draft.title.trim(),
        body: draft.body.trim(),
      },
      ...list,
    ])
    setDraft({ title: '', body: '' })
    setWriting(false)
  }

  return (
    <Phone>
      <TopBar title="공연 당일" />
      <div className="lui-body">
        <div className="s19">
          <p className="s19__show">{r.title}</p>
          <div className="s19__gap-6" />
          <p className="s19__when">{r.when}</p>

          <div className="s19__gap-14" />
          {/* 내가 어느 쪽인지 — 할 수 있는 일이 다릅니다 */}
          <div className={`s19-role${isHost ? ' s19-role--host' : ''}`}>
            <span className="s19-role__tag">{isHost ? r.roleLabels.host : r.roleLabels.guest}</span>
            <span className="s19-role__text">{isHost ? r.hostCan : r.guestCan}</span>
          </div>

          <div className="s19__gap-26" />
          <SectionHeader
            title="타임라인"
            aside={isHost ? '조건 바꾸기' : `${result.callTime} 집합`}
            onAside={isHost ? () => setTune(true) : undefined}
          />
          <div className="lui-card s19__plan">
            <div className="s19-sum">
              <span className="s19-sum__item">
                <em>{result.callTime}</em>
                집합
              </span>
              <span className="s19-sum__item">
                <em>{result.startAt}</em>
                시작
              </span>
              <span className="s19-sum__item">
                <em>{result.endAt}</em>
                종료
              </span>
            </div>
            <div className="s19__line" />
            {result.slots.map((slot, i) => {
              const mine = slot.teamId === myClubId
              return (
                <div
                  key={`${slot.kind}-${i}`}
                  className={`s19-slot s19-slot--${slot.kind}${mine ? ' s19-slot--mine' : ''}`}
                >
                  <span className="s19-slot__at">{slot.at}</span>
                  <span className="s19-slot__main">
                    <span className="s19-slot__title">
                      {slot.title}
                      {mine && <span className="s19-slot__mine">우리 팀</span>}
                    </span>
                    {slot.sub && <span className="s19-slot__sub">{slot.sub}</span>}
                  </span>
                  {slot.dur > 0 && <span className="s19-slot__dur">{slot.dur}분</span>}
                </div>
              )
            })}
          </div>

          <div className="s19__gap-14" />
          <div className="s19__why">
            {result.notes.map((note) => (
              <p key={note} className="s19__why-line">
                {note}
              </p>
            ))}
          </div>

          <div className="s19__gap-26" />
          <SectionHeader
            title="공지"
            aside={isHost ? '공지 쓰기' : `${notices.length}개`}
            onAside={isHost ? () => setWriting(true) : undefined}
          />
          <div className="lui-card s19__notices">
            {notices.length === 0 && <p className="s19__empty">{r.empty}</p>}
            {notices.map((n) => (
              <button
                key={n.id}
                type="button"
                className="s19-notice"
                onClick={() => setNotice(n)}
              >
                <span className="s19-notice__head">
                  {n.pinned && <span className="s19-notice__pin">고정</span>}
                  <span className="s19-notice__title">{n.title}</span>
                </span>
                <span className="s19-notice__meta">
                  {n.by} · {n.at}
                </span>
              </button>
            ))}
          </div>

          <div className="s19__gap-26" />
        </div>
      </div>

      {/* 조건 바꾸기 — 주최만 */}
      <Sheet open={tune} title="타임라인 조건" onClose={() => setTune(false)}>
        <p className="lui-menu__note">
          라인업 {r.lineup.length}팀 기준으로 다시 계산합니다. 리허설은 공연 순서의 역순으로
          잡히고, 지연 허용은 교체 시간에 얹힙니다.
        </p>
        <div className="s19-tune">
          <label className="s19-tune__row">
            <span className="s19-tune__label">본공연 시작</span>
            <input
              className="lui-input s19-tune__input"
              type="time"
              value={opt.startAt}
              onChange={(e) => setOpt((o) => ({ ...o, startAt: e.target.value || '19:00' }))}
            />
          </label>
          {NUM.map((f) => (
            <label key={f.key} className="s19-tune__row">
              <span className="s19-tune__label">
                {f.label}
                {f.hint && <em>{f.hint}</em>}
              </span>
              <span className="s19-tune__field">
                <input
                  className="lui-input s19-tune__input"
                  type="number"
                  min={0}
                  value={String(opt[f.key])}
                  onChange={(e) => set(f.key, e.target.value)}
                />
                <span className="s19-tune__unit">{f.unit}</span>
              </span>
            </label>
          ))}
        </div>
        <Button block onClick={() => setTune(false)}>
          이대로 쓰기
        </Button>
        <button type="button" className="s19-tune__reset" onClick={() => setOpt(DEFAULT_OPTIONS)}>
          기본값으로 되돌리기
        </button>
      </Sheet>

      {/* 공지 쓰기 — 주최만 */}
      <Sheet open={writing} title="공지 쓰기" onClose={() => setWriting(false)}>
        <input
          className="lui-input"
          placeholder="한 줄 제목"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          maxLength={40}
        />
        <div className="s19__gap-6" />
        <textarea
          className="lui-input s19__body"
          placeholder="참여 동아리에 전할 내용"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        />
        <div className="s19__gap-6" />
        <p className="lui-menu__note">올리면 참여 동아리 모두에게 알림이 갑니다.</p>
        <Button block disabled={!draft.title.trim()} onClick={post}>
          공지 올리기
        </Button>
      </Sheet>

      <Sheet open={!!notice} title={notice?.title ?? ''} onClose={() => setNotice(null)}>
        <p className="s19__notice-meta">
          {notice?.by} · {notice?.at}
        </p>
        <p className="lui-menu__note">{notice?.body}</p>
        <Button block onClick={() => setNotice(null)}>
          확인
        </Button>
      </Sheet>

      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.live(showId))}>
          관객에게 보이는 화면
        </Button>
      </div>
      <TabBar active="club" />
    </Phone>
  )
}

export default S19Run
