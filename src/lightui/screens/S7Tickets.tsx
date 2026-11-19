import { useNavigate, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import Icon from '../components/Icon'
import { P } from '../paths'
import { myTickets as t } from '../../mocks/bandyLight'
import './S7Tickets.css'

type TabKey = 'upcoming' | 'past' | 'cancelled'

/**
 * S7 내 티켓 목록 — Figma 210:2
 *
 * 탭은 교류 탭과 같은 규칙입니다 — 이동이 아니라 같은 화면에서 목록만 바뀌고,
 * 어떤 탭인지는 `?tab=` 에 남아 뒤로가기로 돌아올 수 있습니다.
 */
const S7Tickets = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const asked = params.get('tab') as TabKey | null
  const tab: TabKey = t.tabs.some((x) => x.key === asked) ? (asked as TabKey) : 'upcoming'
  const items = t.items.filter((item) => item.tab === tab)

  const goTab = (next: TabKey) => {
    const q = new URLSearchParams(params)
    if (next === 'upcoming') q.delete('tab')
    else q.set('tab', next)
    setParams(q)
  }

  return (
    <Phone>
      <div className="lui-body">
        <div className="s7">
          <div className="s7__gap-14" />
          <div className="s7__head">
            <h1 className="s7__title">내 티켓</h1>
            <span className="lui-pill lui-pill--lg lui-pill--outline">{t.count}</span>
          </div>

          <div className="s7__gap-14" />
          <div className="lui-utabs lui-utabs--accent" role="tablist">
            {t.tabs.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={x.key === tab}
                className={`lui-utab${x.key === tab ? ' lui-utab--on' : ''}`}
                onClick={() => goTab(x.key as TabKey)}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div className="s7__gap-14" />
          <div className="s7__list">
            {items.length === 0 && <p className="s7__empty">{t.empty[tab]}</p>}
            {items.map((item) => (
              <div key={item.id} className="lui-card s7-item">
                <div className="s7-item__row">
                  <img className="s7-item__thumb" src={item.thumb} alt="" />
                  <button
                    type="button"
                    className="s7-item__main"
                    onClick={() =>
                      /* 공연 당일에는 티켓보다 「오늘 뭘 할 수 있는지」 가 먼저입니다 */
                      navigate('today' in item && item.today ? P.live(item.id) : P.ticket(item.id))
                    }
                  >
                    <span className="s7-item__title">{item.title}</span>
                    <span className="s7-item__sub">{item.when}</span>
                    <span className="s7-item__sub">{item.what}</span>
                  </button>
                  <span className="s7-item__side">
                    {/* 규칙 7 — 마감·입금처럼 꼭 봐야 하는 것만 빨강 */}
                    <span className={`lui-pill lui-pill--lg${item.urgent ? '' : ' lui-pill--outline'}`}>
                      {item.badge}
                    </span>
                    <Icon name="chevron-right" size={18} className="s7-item__chev" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="s7__gap-26" />
          <SectionHeader title="다가오는 공연 예매 수" />
          <div className="lui-meters">
            {t.counts.map((row) => (
              <div key={row.k} className="lui-meter">
                <span className="lui-meter__k">{row.k}</span>
                <span className="lui-meter__track">
                  <span
                    className={`lui-meter__fill lui-meter__fill--${row.tone}`}
                    style={{ width: `${(row.value / t.countMax) * 100}%` }}
                  />
                </span>
                <span className="lui-meter__v">{row.value}매</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="ticket" />
    </Phone>
  )
}

export default S7Tickets
