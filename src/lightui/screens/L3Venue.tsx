import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import Sheet from '../components/Sheet'
import { P } from '../paths'
import { venueBoard as v } from '../../mocks/bandyLight'
import './L3Venue.css'

/**
 * L3 공연장 · 팀 찾기 — Figma 175:2
 *
 * 도트 캘린더의 점은 날짜마다 바뀌는 데이터라 Figma 의 원 벡터 대신 CSS 원으로 그립니다.
 * 색·크기(10px, 채움 #E0443F / 빈 #E8E9EC)는 Figma 값 그대로입니다.
 */
const L3Venue = () => {
  const navigate = useNavigate()
  const appsRef = useRef<HTMLDivElement>(null)
  const [weekIndex, setWeekIndex] = useState(1)
  const [open, setOpen] = useState(true)
  const [rejected, setRejected] = useState<string[]>([])
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [note, setNote] = useState<{ title: string; text: string } | null>(null)

  const week = v.weeks[weekIndex]
  const applicants = v.applicants.filter((a) => !rejected.includes(a.id))
  const rejectTarget = v.applicants.find((a) => a.id === rejecting)

  return (
    <Phone>
      <div className="lui-body">
        <div className="l3">
          <div className="l3__head">
            <h1 className="l3__name">{v.name}</h1>
            {/* 공연장 모드에서 빠져나가는 유일한 길 — 그냥 라벨이면 갇힙니다 */}
            <button
              type="button"
              className="lui-pill lui-pill--soft l3__mode"
              onClick={() => navigate(P.home)}
            >
              {v.mode}
            </button>
          </div>

          <p className="l3__lead">
            3월에 비어 있는 날이 <strong>{v.emptyDays}일</strong> 남았어요
          </p>

          <div className="l3__gap-18" />

          <div className="lui-card l3__cal">
            <div className="l3__cal-top">
              <div className="l3__cal-nav">
                <button
                  type="button"
                  className="l3__cal-arrow"
                  aria-label="이전 주"
                  disabled={weekIndex === 0}
                  onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <span className="l3__cal-label">{week.label}</span>
                <button
                  type="button"
                  className="l3__cal-arrow"
                  aria-label="다음 주"
                  disabled={weekIndex === v.weeks.length - 1}
                  onClick={() => setWeekIndex((i) => Math.min(v.weeks.length - 1, i + 1))}
                >
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
              <span className="lui-pill">{week.badge}</span>
            </div>

            <div className="l3__grid">
              <div className="l3__rows">
                <div className="l3__rows-spacer" />
                {v.calendar.rows.map((row) => (
                  <span key={row} className="l3__rowlabel">
                    {row}
                  </span>
                ))}
              </div>
              {week.days.map((day) => (
                <div key={day.date} className={`l3__day${day.accent ? ' l3__day--accent' : ''}`}>
                  <span className="l3__day-head">
                    <span className="l3__dow">{day.dow}</span>
                    <span className="l3__date">{day.date}</span>
                  </span>
                  {day.cells.map((on, i) => (
                    <span key={i} className={`l3__cell${on ? ' l3__cell--on' : ''}`}>
                      <span />
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="l3__legend">
              <span className="l3__legend-item">
                <span className="l3__legend-dot" />
                {v.calendar.legend[0]}
              </span>
              <span className="l3__legend-item">
                <span className="l3__legend-dot l3__legend-dot--off" />
                {v.calendar.legend[1]}
              </span>
              <span className="l3__legend-note">{week.note}</span>
            </div>
          </div>

          <div className="l3__gap-18" />

          <div className="lui-card l3__open">
            <div className="l3__open-top">
              <span className="l3__open-date">{v.openDay.date}</span>
              <span className={`lui-pill${open ? '' : ' lui-pill--soft'}`}>
                {open ? v.openDay.badge : '내려감'}
              </span>
            </div>
            <div className="l3__box">
              {v.openDay.terms.map((t) => (
                <div key={t.k} className="l3__box-row">
                  <span className="l3__box-k">{t.k}</span>
                  <span className="l3__box-v">{t.v}</span>
                </div>
              ))}
            </div>
            <div className="l3__pair">
              <Button
                variant="ghost"
                onClick={() =>
                  setNote({
                    title: '조건 수정',
                    text: '배분 비율과 최소 예상 관객을 고칠 수 있습니다. 이미 지원한 팀에게는 바뀐 조건이 다시 전달됩니다.',
                  })
                }
              >
                조건 수정
              </Button>
              <Button variant="ghost" onClick={() => setOpen((on) => !on)}>
                {open ? '공개 내리기' : '다시 공개'}
              </Button>
            </div>
          </div>

          <div className="l3__gap-28" />
          <div ref={appsRef} />
          <SectionHeader title="이 날 지원한 팀" aside={`${applicants.length}팀`} />

          <div className="l3__apps">
            {applicants.map((app) => (
              <div key={app.id} className="lui-card l3-app">
                <div className="l3-app__head">
                  <span className="l3-app__avatar">{app.initial}</span>
                  <span className="l3-app__who">
                    <span className="l3-app__name">{app.name}</span>
                    <span className="l3-app__sub">{app.sub}</span>
                  </span>
                  <button
                    type="button"
                    className="lui-row__chev"
                    onClick={() => navigate(P.club(app.id))}
                    aria-label={`${app.name} 자세히`}
                  >
                    <Icon name="chevron-right" size={18} />
                  </button>
                </div>

                <div className="l3__box">
                  {app.stats.map((s) => (
                    <div key={s.k} className="l3__box-row">
                      <span className="l3__box-k">{s.k}</span>
                      <span className={`l3__box-v${'accent' in s && s.accent ? ' l3__box-v--accent' : ''}`}>
                        {s.v}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="l3__pair">
                  <Button onClick={() => navigate(P.deposits)}>수락</Button>
                  <Button variant="ghost" onClick={() => navigate(P.chat(app.id))}>
                    대화
                  </Button>
                </div>
                <button
                  type="button"
                  className="l3-app__reject"
                  onClick={() => setRejecting(app.id)}
                >
                  거절하기
                </button>
              </div>
            ))}
          </div>

          <div className="l3__gap-18" />
          <div className="lui-card l3__bulk">
            <ListRow
              avatar={<Icon name="plus" size={16} />}
              title={v.bulk.title}
              sub={v.bulk.sub}
              chevron
              onClick={() =>
                setNote({
                  title: v.bulk.title,
                  text: '여러 날을 한 번에 고르면 같은 조건으로 함께 공개됩니다. 날짜마다 조건을 다르게 두고 싶으면 하나씩 공개하세요.',
                })
              }
            />
          </div>
        </div>
      </div>

      <Sheet open={!!rejectTarget} title="이 팀을 거절할까요?" onClose={() => setRejecting(null)}>
        <p className="lui-menu__note">
          {rejectTarget?.name} 의 지원을 거절합니다. 거절하면 이 날 지원 목록에서 사라지고, 상대
          동아리에도 알림이 갑니다.
        </p>
        <div className="l3__pair">
          <Button variant="ghost" onClick={() => setRejecting(null)}>
            그대로 두기
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (rejecting) setRejected((prev) => [...prev, rejecting])
              setRejecting(null)
            }}
          >
            거절하기
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!note} title={note?.title} onClose={() => setNote(null)}>
        <p className="lui-menu__note">{note?.text}</p>
        <Button block onClick={() => setNote(null)}>
          확인
        </Button>
      </Sheet>

      {/* 공연장 모드는 탭 구성이 다릅니다 (일정 · 지원 팀 · 정산 · 공연장 · 마이).
          갈 곳이 없는 탭은 눌리지 않는다는 걸 눈으로 알 수 있게 흐리게 둡니다. */}
      <nav className="lui-tabbar lui-tabbar--text">
        {v.tabs.map((tab) => {
          const on = tab.key === 'schedule'
          const soon = 'soon' in tab && tab.soon
          const go = () => {
            if (tab.key === 'apps') appsRef.current?.scrollIntoView({ behavior: 'smooth' })
            if (tab.key === 'settlement') navigate(P.settlement)
            if (tab.key === 'me') navigate(P.me)
          }
          return (
            <button
              key={tab.key}
              type="button"
              disabled={on || soon}
              aria-current={on ? 'page' : undefined}
              className={`lui-tabbar__item${on ? ' lui-tabbar__item--on' : ''}${
                soon ? ' lui-tabbar__item--soon' : ''
              }`}
              onClick={go}
            >
              <span className="lui-tabbar__label">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </Phone>
  )
}

export default L3Venue
