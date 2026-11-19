import { Fragment, ReactNode } from 'react'

export interface SummaryItem {
  k: ReactNode
  v: ReactNode
  /** 합계 줄 — 16px 포인트 컬러 (규칙 7: 금액 데이터) */
  total?: boolean
  /** 위에 구분선 */
  divider?: boolean
  accent?: boolean
}

/** 금액·내역 요약 박스 — Figma D2 184:130 / D3 185:89 */
const SummaryBox = ({ items }: { items: SummaryItem[] }) => (
  <div className="lui-sum">
    {items.map((it, i) => (
      <Fragment key={i}>
        {it.divider && <span className="lui-sum__line" />}
        <div className="lui-sum__row">
          <span className="lui-sum__k">{it.k}</span>
          <span
            className={`lui-sum__v${it.total ? ' lui-sum__v--total' : ''}${
              it.accent ? ' lui-sum__v--accent' : ''
            }`}
          >
            {it.v}
          </span>
        </div>
      </Fragment>
    ))}
  </div>
)

export default SummaryBox
