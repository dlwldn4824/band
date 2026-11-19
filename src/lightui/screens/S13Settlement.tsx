import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import SummaryBox from '../components/SummaryBox'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import { P } from '../paths'
import { settlement as s } from '../../mocks/bandyLight'
import './S13Settlement.css'

/** S13 정산 — Figma 216:2 */
const S13Settlement = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <TopBar
        title="정산"
        right={
          <MoreMenu
            items={[
              { label: '입금 관리', to: P.deposits },
              {
                label: '정산 내역 내려받기',
                note: '정산 내역을 엑셀로 받습니다. 공연이 끝난 뒤에 열립니다.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s13">
          <div className="s13__gap-14" />
          <div className="lui-card s13__show">
            <ListRow
              avatar={<img src={s.show.thumb} alt="" />}
              title={s.show.title}
              sub={s.show.sub}
              chevron
              onClick={() => navigate(P.show('glow'))}
            />
          </div>

          <div className="s13__gap-26" />
          <div className="s13__payout">
            <span className="s13__payout-k">{s.payoutLabel}</span>
            <span className="s13__payout-v">{s.payout}</span>
          </div>

          <div className="s13__gap-14" />
          <SummaryBox items={s.breakdown} />

          <div className="s13__gap-26" />
          <SectionHeader title="어디로 얼마가 가나" />
          <div className="lui-meters">
            {s.shares.map((row) => (
              <div key={row.k} className="lui-meter">
                <span className="lui-meter__k">{row.k}</span>
                <span className="lui-meter__track">
                  <span
                    className={`lui-meter__fill${row.tone === 'accent' ? ' lui-meter__fill--accent' : ''}${
                      row.tone === 'mute' ? ' lui-meter__fill--mute' : ''
                    }`}
                    style={{ width: `${(row.value / s.totalValue) * 100}%` }}
                  />
                </span>
                <span className="lui-meter__v">{row.value.toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>

          <div className="s13__gap-26" />
          <SectionHeader title="입금 계좌" />
          <div className="lui-card s13__account">
            <div className="s13__account-row">
              <span className="s13__account-main">
                <span className="s13__account-title">{s.account.title}</span>
                <span className="s13__account-sub">{s.account.sub}</span>
              </span>
              <span className="lui-pill lui-pill--lg lui-pill--outline">변경</span>
            </div>
          </div>

          <div className="s13__gap-26" />
          <p className="s13__notice">{s.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.me)}>
          정산 요청
        </Button>
      </div>
    </Phone>
  )
}

export default S13Settlement
