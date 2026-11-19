import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { P } from '../paths'
import { entered as e } from '../../mocks/bandyLight'
import './P3Entered.css'

/**
 * P3 입장 완료 — Figma 295:2 에서 한 번 바꿨습니다.
 *
 * 원래는 큰 동그라미 체크 + 두 줄 제목이었는데, 바로 다음 화면(P5)도 같은 골격이라
 * 두 화면이 한 벌처럼 보였습니다. 여기서는 「됐어요」 를 그림으로 외치는 대신
 * 찢어 낸 티켓 반쪽으로 증거를 보여 주고, 아래는 현장에서 하나씩 지워 가는
 * 체크리스트로 둡니다 — P1 의 타임라인, P4 의 사람 카드와도 겹치지 않습니다.
 */
const P3Entered = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [done, setDone] = useState<string[]>([])

  const toggle = (id: string) =>
    setDone((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const dest: Record<string, string> = { people: P.livePeople(showId) }

  return (
    <Phone time="18:42">
      <TopBar
        title="입장"
        right={
          <MoreMenu
            items={[
              { label: '내 티켓 보기', to: P.ticket() },
              { label: '공연 정보', to: P.live(showId) },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="p3">
          <div className="p3__gap-14" />

          {/* 찢어 낸 반쪽 — D4 티켓과 같은 절취선 모티프 */}
          <div className="p3-stub">
            <div className="p3-stub__top">
              <span className="p3-stub__state">
                <span className="p3-stub__check">
                  <Icon name="check" size={12} />
                </span>
                {e.stub.state}
              </span>
              <span className="p3-stub__at">{e.stub.at}</span>
            </div>
            <div className="p3-stub__tear" />
            <div className="p3-stub__bottom">
              <span className="p3-stub__show">{e.stub.show}</span>
              <span className="p3-stub__detail">
                {e.stub.detail} · {e.stub.order}
              </span>
            </div>
          </div>

          <div className="p3__gap-26" />
          <SectionHeader title="지금 할 것" aside={`${done.length}/${e.todo.length}`} />
          <div className="lui-card p3__list">
            {e.todo.map((row) => {
              const on = done.includes(row.id)
              const to = 'to' in row && row.to ? dest[row.to] : undefined
              const locked = 'lock' in row ? row.lock : undefined
              return (
                <div key={row.id} className={`p3-check${on ? ' p3-check--on' : ''}`}>
                  <button
                    type="button"
                    className="p3-check__box"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${row.title} 했음으로 표시`}
                    disabled={!!locked}
                    onClick={() => toggle(row.id)}
                  >
                    <Icon name="check" size={13} />
                  </button>

                  {to ? (
                    <button type="button" className="p3-check__main" onClick={() => navigate(to)}>
                      <span className="p3-check__title">{row.title}</span>
                      <span className="p3-check__sub">{row.sub}</span>
                    </button>
                  ) : (
                    <span className="p3-check__main">
                      <span className="p3-check__title">{row.title}</span>
                      <span className="p3-check__sub">{row.sub}</span>
                    </span>
                  )}

                  {locked ? (
                    <span className="lui-pill lui-pill--soft">{locked}</span>
                  ) : 'badge' in row && row.badge ? (
                    <span className={`lui-pill${on ? ' lui-pill--soft' : ''}`}>
                      {on ? row.doneBadge : row.badge}
                    </span>
                  ) : (
                    <Icon name="chevron-right" size={18} className="p3-check__chev" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="p3__gap-26" />
          <SectionHeader title="곧 시작" aside={e.nextAt} />
          <div className="lui-card p3__next">
            <ListRow
              avatar={e.next.initial}
              title={e.next.name}
              sub={e.next.sub}
              slot={<span className="lui-pill lui-pill--soft">{e.next.badge}</span>}
            />
          </div>

          <div className="p3__gap-26" />
          <p className="p3__notice">{e.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar p3__bottom">
        {/* 규칙 1 — 기본 버튼은 「사람 만나러 가기」 하나 */}
        <Button variant="ghost" onClick={() => navigate(P.live(showId))}>
          공연 정보
        </Button>
        <Button onClick={() => navigate(P.livePeople(showId))}>사람 만나러 가기</Button>
      </div>
    </Phone>
  )
}

export default P3Entered
