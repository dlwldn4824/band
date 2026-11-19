import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Steps from '../components/Steps'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import { P } from '../paths'
import { depositGuide as d } from '../../mocks/bandyLight'
import glossSoft from '../assets/gloss-soft-accent.svg'
import glossSpec from '../assets/gloss-spec-accent.svg'
import './D3Deposit.css'

/**
 * D3 입금 안내 — Figma 185:2
 *
 * 아직 PG 가 없어서 계좌 복사 → 입금 기한 → 운영진 수동 확인 흐름입니다.
 */
const D3Deposit = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [copied, setCopied] = useState<'account' | 'name' | null>(null)

  const copy = async (what: 'account' | 'name', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      /* 클립보드를 못 쓰는 환경에서는 조용히 넘어갑니다 */
    }
  }

  return (
    <Phone>
      <TopBar title="입금 안내" />
      <div className="lui-body">
        <div className="d3">
          <Steps current={3} />

          {/* 규칙 6 — 핵심 강조 카드라서 글로스를 씁니다 */}
          <div className="lui-banner">
            <span className="lui-gloss lui-gloss--soft" aria-hidden>
              <img src={glossSoft} alt="" />
            </span>
            <span className="lui-gloss lui-gloss--spec" aria-hidden>
              <img src={glossSpec} alt="" />
            </span>
            <p className="lui-banner__title">아직 입금 전이에요</p>
            <p className="lui-banner__body">
              {d.due}
              <br />
              남은 시간 <span className="lui-banner__strong">{d.remain}</span>
            </p>
          </div>

          <div className="d3__amount">
            <span className="d3__amount-label">보내실 금액</span>
            <span className="d3__amount-value">{d.amount}</span>
          </div>

          <div className="lui-card d3__account">
            {d.account.map((row) => (
              <div key={row.k} className="d3__row">
                <span className="d3__k">{row.k}</span>
                <span className={`d3__v${'accent' in row && row.accent ? ' d3__v--accent' : ''}`}>
                  {row.v}
                </span>
              </div>
            ))}
            <div className="d3__spacer" />
            <div className="d3__copy">
              <Button variant="ghost" onClick={() => copy('account', d.accountNumber)}>
                {copied === 'account' ? '복사했어요' : '계좌 복사'}
              </Button>
              <Button variant="ghost" onClick={() => copy('name', d.depositorName)}>
                {copied === 'name' ? '복사했어요' : '입금자명 복사'}
              </Button>
            </div>
          </div>

          <div className="d3__gap" />
          <SectionHeader title="예매 내역" aside={d.bookingNo} />
          <SummaryBox items={d.detail} />

          <div className="d3__gap" />
          <p className="d3__notes">
            {d.notes.map((n) => (
              <span key={n}>
                {n}
                <br />
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="lui-bottombar d3__bottom">
        {/* 규칙 1 — 보조 동작(예매 취소)은 외곽선 */}
        <Button variant="ghost">예매 취소</Button>
        <Button onClick={() => navigate(P.ticket(showId))}>입금했어요</Button>
      </div>
    </Phone>
  )
}

export default D3Deposit
