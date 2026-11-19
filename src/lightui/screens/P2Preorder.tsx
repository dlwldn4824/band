import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Stepper from '../components/Stepper'
import SummaryBox from '../components/SummaryBox'
import Button from '../components/Button'
import { P } from '../paths'
import { preorder as pre } from '../../mocks/bandyLight'
import './P2Preorder.css'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** P2 사전 구매 (굿즈·음료) — Figma 294:2 */
const P2Preorder = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [filter, setFilter] = useState(pre.filters[0])
  const [drinks, setDrinks] = useState<Record<string, number>>(
    Object.fromEntries(pre.drinks.map((d) => [d.id, d.initialQty])),
  )
  const [goods, setGoods] = useState<string[]>([])

  const drinkTotal = pre.drinks.reduce((sum, d) => sum + d.price * (drinks[d.id] ?? 0), 0)
  const goodsTotal = pre.goods
    .filter((g) => goods.includes(g.id))
    .reduce((sum, g) => sum + g.price, 0)
  const total = drinkTotal + goodsTotal

  const drinkLabel = pre.drinks
    .filter((d) => (drinks[d.id] ?? 0) > 0)
    .map((d) => `${d.name} ${drinks[d.id]}잔`)
    .join(' · ')

  const showDrinks = filter === '전체' || filter === '음료'
  const showGoods = filter === '전체' || filter === '굿즈' || filter === '한정'

  return (
    <Phone time="18:42">
      <TopBar
        title="사전 구매"
        right={
          <MoreMenu
            items={[
              { label: '내 티켓 보기', to: P.ticket() },
              {
                label: '수령 안내',
                note: '선주문한 굿즈는 공연 당일 현장 굿즈 부스에서 티켓 QR 을 보여 주고 받습니다.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="p2">
          <div className="p2__gap-14" />
          <p className="p2__lead">{pre.lead}</p>

          <div className="p2__gap-14" />
          <div className="p2__filters">
            {pre.filters.map((f) => (
              <button
                key={f}
                type="button"
                className={`p2-chip${f === filter ? ' p2-chip--on' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {showDrinks && (
            <>
              <div className="p2__gap-26" />
              <SectionHeader title="음료" aside={pre.drinksNote} />
              <div className="lui-card p2__drinks">
                {pre.drinks.map((d) => (
                  <ListRow
                    key={d.id}
                    avatar={d.initial}
                    title={d.name}
                    sub={d.priceLabel}
                    slot={
                      <Stepper
                        value={drinks[d.id] ?? 0}
                        min={0}
                        max={9}
                        onChange={(n) => setDrinks((prev) => ({ ...prev, [d.id]: n }))}
                        label={d.name}
                      />
                    }
                  />
                ))}
              </div>
            </>
          )}

          {showGoods && (
            <>
              <div className="p2__gap-26" />
              <SectionHeader title="굿즈" aside={pre.goodsNote} />
              <div className="p2__goods">
                {pre.goods.map((g) => {
                  const on = goods.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={on}
                      className={`lui-card p2-good${on ? ' p2-good--on' : ''}`}
                      onClick={() =>
                        setGoods((prev) =>
                          prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                        )
                      }
                    >
                      <span className="p2-good__photo">{g.photo && <img src={g.photo} alt="" />}</span>
                      <span className="p2-good__body">
                        <span className="p2-good__name">{g.name}</span>
                        <span className="p2-good__sub">{g.sub}</span>
                        <span className="p2-good__price">{g.priceLabel}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="p2__gap-26" />
          <SummaryBox
            items={[
              { k: drinkLabel || '음료', v: drinkTotal > 0 ? won(drinkTotal) : '선택 없음' },
              { k: '굿즈', v: goodsTotal > 0 ? won(goodsTotal) : '선택 없음' },
              { k: '추가 결제', v: won(total), total: true, accent: true, divider: true },
            ]}
          />

          <div className="p2__gap-14" />
          <p className="p2__notice">{pre.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar">
        <Button block disabled={total === 0} onClick={() => navigate(P.live(showId))}>
          {total > 0 ? `${won(total)} 추가하기` : '담은 것이 없어요'}
        </Button>
      </div>
    </Phone>
  )
}

export default P2Preorder
