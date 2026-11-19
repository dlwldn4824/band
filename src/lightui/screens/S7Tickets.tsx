import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import Icon from '../components/Icon'
import { P } from '../paths'
import { myTickets as t } from '../../mocks/bandyLight'
import './S7Tickets.css'

/** S7 내 티켓 목록 — Figma 210:2 */
const S7Tickets = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState(t.tabs[0])

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
          <div className="lui-utabs lui-utabs--accent">
            {t.tabs.map((name) => (
              <button
                key={name}
                type="button"
                className={`lui-utab${name === tab ? ' lui-utab--on' : ''}`}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="s7__gap-14" />
          <div className="s7__list">
            {t.items.map((item) => (
              <div key={item.id} className="lui-card s7-item">
                <div className="s7-item__row">
                  <img className="s7-item__thumb" src={item.thumb} alt="" />
                  <button
                    type="button"
                    className="s7-item__main"
                    onClick={() => navigate(P.ticket(item.id))}
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
