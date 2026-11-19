import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Sheet from '../components/Sheet'
import DirectionsSheet from '../components/DirectionsSheet'
import { P } from '../paths'
import { myTicket as t, radioGaga } from '../../mocks/bandyLight'
import qr from '../assets/ticket-qr.svg'
import './D4Ticket.css'

/** D4 티켓 · QR 입장 — Figma 186:2 */
const REFUND =
  '공연 3일 전까지는 전액 환불됩니다. 입금하신 계좌로 영업일 기준 2~3일 안에 돌려드려요. 그 뒤에는 운영진과 대화로 처리합니다.'

const D4Ticket = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [refund, setRefund] = useState(false)
  const [dirs, setDirs] = useState(false)

  return (
    <Phone>
      <TopBar
        title="내 티켓"
        right={
          <MoreMenu
            items={[
              { label: '친구 초대하기', sub: '링크 · 문자 · 초대 카드', to: P.invite },
              {
                label: '취소 · 환불',
                danger: true,
                note: REFUND,
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="d4">
          <div className="d4__gap-14" />
          <div className="d4__status">
            <span className="lui-pill lui-pill--ink">{t.status}</span>
            <span className="lui-pill lui-pill--soft">{t.entry}</span>
          </div>

          <div className="d4__gap-14" />
          <div className="d4__ticket">
            <div className="d4__ticket-head">
              <span className="d4__ticket-title">{t.title}</span>
              <span className="d4__ticket-sub">{t.sub}</span>
            </div>
            <div className="d4__notch" />
            <div className="d4__ticket-body">
              <div className="d4__qr">
                <img src={qr} alt="입장 QR" />
              </div>
              <div className="d4__facts">
                {t.facts.map((f) => (
                  <div key={f.k} className="d4__fact">
                    <span className="d4__fact-k">{f.k}</span>
                    <span className="d4__fact-v">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="d4__gap-26" />
          <p className="d4__guide">{t.guide}</p>

          {/* MOCK: 입구 단말이 QR 을 읽으면 서버가 알려 줄 자리입니다.
              붙기 전까지는 이 버튼으로 입장 완료(P3) 를 볼 수 있게 둡니다. */}
          <button
            type="button"
            className="d4__demo"
            onClick={() => navigate(P.liveEntered(showId))}
          >
            입장 처리됨 (데모)
          </button>

          <div className="d4__gap-26" />
          <SectionHeader title="사전 구매" aside="현장 교환" />
          <div className="lui-card d4__addon">
            <ListRow
              avatar={t.addon.initial}
              title={t.addon.name}
              sub={t.addon.sub}
              slot={<span className="lui-pill lui-pill--soft">{t.addon.state}</span>}
            />
          </div>

          <div className="d4__gap-26" />
          <SummaryBox items={t.payment} />

          <div className="d4__gap-26" />
          <div className="d4__links">
            <button type="button" className="d4__link" onClick={() => navigate(P.live(showId))}>
              공연 정보
            </button>
            <button type="button" className="d4__link" onClick={() => setRefund(true)}>
              취소 · 환불
            </button>
          </div>
        </div>
      </div>

      <Sheet open={refund} title="취소 · 환불" onClose={() => setRefund(false)}>
        <p className="lui-menu__note">{REFUND}</p>
        <Button block onClick={() => setRefund(false)}>
          확인
        </Button>
      </Sheet>

      <DirectionsSheet venue={radioGaga} open={dirs} onClose={() => setDirs(false)} />

      <div className="lui-bottombar">
        <Button block onClick={() => setDirs(true)}>
          공연장 길찾기
        </Button>
      </div>
    </Phone>
  )
}

export default D4Ticket
