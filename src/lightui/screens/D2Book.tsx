import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Steps from '../components/Steps'
import Stepper from '../components/Stepper'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import { P } from '../paths'
import { booking } from '../../mocks/bandyLight'
import './D2Book.css'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** D2 예매 · 매수와 옵션 — Figma 184:2 */
const D2Book = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()

  const [tickets, setTickets] = useState(2)
  const [addons, setAddons] = useState<Record<string, number>>(
    Object.fromEntries(booking.addons.map((a) => [a.id, a.initial])),
  )

  const ticketTotal = tickets * booking.ticket.price
  const addonTotal = booking.addons.reduce((sum, a) => sum + a.price * (addons[a.id] ?? 0), 0)
  const fee = tickets * booking.feePerTicket
  const total = ticketTotal + addonTotal + fee

  return (
    <Phone>
      <TopBar title="예매" />
      <div className="lui-body">
        <div className="d2">
          <Steps current={1} />

          <div className="lui-card d2__show">
            <div className="d2__show-row">
              <img className="d2__thumb" src={booking.summary.thumb} alt="" />
              <div className="d2__show-main">
                <span className="d2__show-title">{booking.summary.title}</span>
                <span className="d2__show-sub">{booking.summary.sub}</span>
              </div>
            </div>
          </div>

          <div className="d2__gap" />
          <SectionHeader title="매수" aside={`1인 최대 ${booking.maxPerPerson}매`} />
          <div className="lui-card d2__option">
            <div className="d2__opt-row">
              <div className="d2__opt-main">
                <span className="d2__opt-name">{booking.ticket.name}</span>
                <span className="d2__opt-sub">{booking.ticket.priceLabel}</span>
              </div>
              <Stepper
                value={tickets}
                min={1}
                max={booking.maxPerPerson}
                onChange={setTickets}
                label="티켓"
              />
            </div>
          </div>

          <div className="d2__gap" />
          {/* 여기서 안 고르고 넘어가도 공연 당일에 P2 에서 담을 수 있습니다 */}
          <SectionHeader
            title="사전 구매"
            aside="나중에 추가하기"
            onAside={() => navigate(P.liveStore(showId))}
          />
          <div className="lui-card d2__option d2__option--multi">
            {booking.addons.map((a, i) => (
              <div key={a.id} style={{ display: 'contents' }}>
                {i > 0 && <span className="d2__opt-line" />}
                <div className="d2__opt-row">
                  <div className="d2__opt-main">
                    <span className="d2__opt-name">{a.name}</span>
                    <span className="d2__opt-sub">{a.sub}</span>
                  </div>
                  <Stepper
                    value={addons[a.id] ?? 0}
                    min={0}
                    max={9}
                    onChange={(n) => setAddons((prev) => ({ ...prev, [a.id]: n }))}
                    label={a.name}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="d2__gap" />
          <SectionHeader title="예매자 정보" aside="입금자명으로 확인해요" />
          <div className="d2__fields">
            <label className="lui-field">
              <span className="lui-field__label">{booking.buyer.nameLabel}</span>
              <input className="lui-input" placeholder={booking.buyer.namePlaceholder} />
            </label>
            <label className="lui-field">
              <span className="lui-field__label">{booking.buyer.phoneLabel}</span>
              <input className="lui-input" inputMode="tel" placeholder={booking.buyer.phonePlaceholder} />
            </label>
            <label className="lui-field">
              <span className="lui-field__label">{booking.buyer.depositorLabel}</span>
              <input className="lui-input" placeholder={booking.buyer.depositorPlaceholder} />
            </label>
          </div>

          <div className="d2__gap" />
          <SummaryBox
            items={[
              { k: `티켓 ${tickets}매`, v: won(ticketTotal) },
              ...booking.addons
                .filter((a) => (addons[a.id] ?? 0) > 0)
                .map((a) => ({
                  k: `${a.name}${(addons[a.id] ?? 0) > 1 ? ` ×${addons[a.id]}` : ''}`,
                  v: won(a.price * (addons[a.id] ?? 0)),
                })),
              { k: '예매 수수료', v: won(fee) },
              { k: '결제 금액', v: won(total), total: true, accent: true, divider: true },
            ]}
          />
        </div>
      </div>

      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.deposit(showId))}>
          {won(total)} · 계좌 받기
        </Button>
      </div>
    </Phone>
  )
}

export default D2Book
