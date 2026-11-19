import { useState } from 'react'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import TabBar from '../components/TabBar'
import { P } from '../paths'
import { deposits as d, type DepositRow } from '../../mocks/bandyLight'
import './S11Deposits.css'

/** S11 입금 관리 (주최자) — Figma 214:2 */
const Row = ({ row, line, onConfirm }: { row: DepositRow; line?: boolean; onConfirm?: () => void }) => (
  <div className={`s11-row${line ? ' s11-row--line' : ''}`}>
    <div className="s11-row__top">
      <span className="s11-row__who">
        <span className="s11-row__name">{row.name}</span>
        {/* 입금 신고 = 예매자가 보냈다고 알린 건 (입금 대기와 구분) */}
        {row.reported && <span className="s11__reported">입금 신고</span>}
      </span>
      <span className="s11-row__amount">{row.amount}</span>
    </div>
    <div className="s11-row__bottom">
      <span className="s11-row__sub">{row.sub}</span>
      {row.reported ? (
        <button type="button" className="s11__confirm" onClick={onConfirm}>
          확인
        </button>
      ) : (
        <span className="s11-row__state">{row.state}</span>
      )}
    </div>
  </div>
)

type FilterKey = (typeof d.filters)[number]['key']

const S11Deposits = () => {
  const [filter, setFilter] = useState<FilterKey>('need')
  const [confirmed, setConfirmed] = useState<string[]>([])

  const rows = d.needCheck.filter((r) => !confirmed.includes(r.name))
  // 확인을 누르면 그만큼 「입금 완료」 쪽으로 옮겨 갑니다
  const movedToPaid = d.needCheck.filter((r) => confirmed.includes(r.name))
  const paid = [...movedToPaid.map((r) => ({ ...r, reported: false, state: '입금 완료' })), ...d.paid]

  const counts: Record<FilterKey, number> = {
    need: rows.length,
    paid: d.done + confirmed.length,
    refund: d.refunded.length,
  }

  return (
    <Phone>
      <TopBar
        title="입금 관리"
        right={
          <MoreMenu
            items={[
              { label: '정산 보기', to: P.settlement },
              {
                label: '입금 안내 다시 보내기',
                note: '아직 입금하지 않은 사람에게 계좌와 기한을 다시 알려 줍니다. 하루 한 번만 보낼 수 있어요.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s11">
          <p className="s11__line">{d.summaryLine}</p>
          <div className="s11__gap-6" />
          <p className="s11__big">
            {d.done + confirmed.length} <em>/ {d.total}</em>
          </p>
          <div className="s11__gap-18" />
          <div className="s11__filters">
            {d.filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={f.key === filter}
                className={`s11-filter${f.key === filter ? ' s11-filter--on' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {counts[f.key]}
              </button>
            ))}
          </div>

          <div className="s11__gap-24" />

          {filter === 'need' && (
            <>
              <div className="s11__sec">
                <span className="s11__sec-title">확인 필요한 예매</span>
                <span className="s11__sec-aside">예매순</span>
              </div>
              <div className="s11__gap-6" />
              {rows.length === 0 ? (
                <p className="s11__empty">{d.empty.need}</p>
              ) : (
                rows.map((row, i) => (
                  <Row
                    key={row.name}
                    row={row}
                    line={i < rows.length - 1}
                    onConfirm={() => setConfirmed((prev) => [...prev, row.name])}
                  />
                ))
              )}

              <div className="s11__gap-26" />
              <div className="s11__sec">
                <span className="s11__sec-title">기한이 지난 예매</span>
                <span className="s11__sec-aside">{d.expiredCount}</span>
              </div>
              <div className="s11__gap-6" />
              {d.expired.map((row) => (
                <Row key={row.name} row={row} />
              ))}
            </>
          )}

          {filter === 'paid' && (
            <>
              <div className="s11__sec">
                <span className="s11__sec-title">입금이 끝난 예매</span>
                <span className="s11__sec-aside">{d.paidMore}</span>
              </div>
              <div className="s11__gap-6" />
              {paid.length === 0 ? (
                <p className="s11__empty">{d.empty.paid}</p>
              ) : (
                paid.map((row, i) => <Row key={row.name} row={row} line={i < paid.length - 1} />)
              )}
            </>
          )}

          {filter === 'refund' && (
            <>
              <div className="s11__sec">
                <span className="s11__sec-title">환불한 예매</span>
                <span className="s11__sec-aside">{d.refunded.length}건</span>
              </div>
              <div className="s11__gap-6" />
              {d.refunded.length === 0 ? (
                <p className="s11__empty">{d.empty.refund}</p>
              ) : (
                d.refunded.map((row, i) => (
                  <Row key={row.name} row={row} line={i < d.refunded.length - 1} />
                ))
              )}
            </>
          )}

          <div className="s11__gap-22" />
          <p className="s11__note">{d.note}</p>
        </div>
      </div>
      <TabBar active="club" />
    </Phone>
  )
}

export default S11Deposits
