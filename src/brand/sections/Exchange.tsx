import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { exchanges, type Exchange } from '../content'
import { useIsNarrow, useReducedMotion } from '../useReducedMotion'

/**
 * 05 교류 기록.
 *
 * 밴드 사이를 점수나 온도로 매기지 않습니다. 실제로 있었던 일만 셉니다 —
 * 합동 공연 몇 번, 응원 몇 번, 모임 몇 번. 한동안 안 만났다고 숫자가 줄지도 않습니다.
 * 스크롤을 내리면 함께 공연한 밴드가 하나씩 붙습니다.
 */

const C = 250
const VIEW = 500

const pos = (b: Exchange) => {
  const rad = (b.deg * Math.PI) / 180
  return { x: C + Math.cos(rad) * b.r, y: C + Math.sin(rad) * b.r }
}

/* 선의 성격 — 같이 섰으면 빨강, 응원만이면 회색, 수락만이면 아주 옅게 */
const lineOf = (b: Exchange) => {
  if (b.together > 0) return { color: '#e0443f', width: 2 + b.together * 1.4 }
  if (b.cheer > 0) return { color: '#a3a8b0', width: 1.5 + b.cheer * 0.6 }
  return { color: '#dcdee3', width: 1.5 }
}

export default function Exchange() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const mapRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(reduced || narrow ? exchanges.length : 0)
  const [picked, setPicked] = useState(0)

  const { scrollYProgress } = useScroll({ target: mapRef, offset: ['start 0.9', 'end 0.5'] })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduced || narrow) return
    setShown(Math.max(0, Math.min(exchanges.length, Math.ceil(p * (exchanges.length + 0.4)))))
  })

  const visible = reduced || narrow ? exchanges.length : shown
  const b = exchanges[picked]

  return (
    <section className="b-exch">
      <p className="b-kicker">공연이 끝난 뒤</p>
      <h2 className="b-exch__h">공연 끝나고도 또 만나자.</h2>
      <p className="b-exch__lede">
        처음엔 서로 이름도 몰랐는데, 어느새 합동 공연도 하고 응원도 가고.
        우리가 함께한 공연과 만남을 BANDY에 남겨보자.
      </p>

      <div className="b-exch__grid">
        <div className="b-exch__map" ref={mapRef}>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label="멜로딕이 함께한 밴드 연결 지도">
            {exchanges.map((e, i) => {
              const p = pos(e)
              const l = lineOf(e)
              const on = i < visible
              const mx = (C + p.x) / 2 + (p.y - C) * 0.1
              const my = (C + p.y) / 2 - (p.x - C) * 0.1
              return (
                <motion.path
                  key={e.name}
                  d={`M ${C} ${C} Q ${mx} ${my} ${p.x} ${p.y}`}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={l.width}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: on ? 1 : 0, opacity: on ? (picked === i ? 1 : 0.55) : 0 }}
                  transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
                />
              )
            })}

            {exchanges.map((e, i) => {
              const p = pos(e)
              const on = i < visible
              const sel = picked === i
              return (
                <motion.g
                  key={e.name}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.5 }}
                  transition={{ duration: reduced ? 0 : 0.42, delay: reduced ? 0 : 0.1, ease: [0.19, 1, 0.22, 1] }}
                  style={{ originX: `${p.x}px`, originY: `${p.y}px`, cursor: 'pointer' }}
                  onClick={() => setPicked(i)}
                >
                  <circle cx={p.x} cy={p.y} r={29} fill={sel ? '#e0443f' : '#ffffff'} stroke={sel ? '#e0443f' : '#ecedef'} strokeWidth={1.5} />
                  <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill={sel ? '#ffffff' : '#17181c'}>
                    {e.short}
                  </text>
                  <text x={p.x} y={p.y + 49} textAnchor="middle" fontSize="12" fill="#8a8f98">
                    {e.name}
                  </text>
                </motion.g>
              )
            })}

            <circle cx={C} cy={C} r={44} fill="#17181c" />
            <text x={C} y={C + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#ffffff">
              멜로딕
            </text>
          </svg>

          <div className="b-exch__legend">
            <span><i style={{ background: '#e0443f' }} />함께 선 공연</span>
            <span><i style={{ background: '#a3a8b0' }} />응원만</span>
            <span><i style={{ background: '#dcdee3' }} />수락만</span>
          </div>
        </div>

        <div className="b-exch__panel">
          <h3>멜로딕 × {b.name}</h3>
          <p className="b-exch__sub">{b.uni} · 지도에서 밴드를 누르면 우리 사이 기록이 보입니다</p>

          <div className="b-exch__rows">
            {([
              ['합동 공연', b.together],
              ['응원 방문', b.cheer],
              ['교류 모임', b.meet],
            ] as [string, number][]).map(([label, n]) => (
              <div className="b-exch__row" key={label}>
                <span>{label}</span>
                {n > 0 ? <b>{n}회</b> : <small>아직 없음</small>}
              </div>
            ))}
          </div>

          <p className="b-exch__foot">
            점수도 온도도 매기지 않습니다. 있었던 일만 셉니다. 한동안 못 만났다고 숫자가 줄어들지
            않고, 같은 공연에 여러 명이 응원을 가도 밴드 사이에서는 1회입니다.
          </p>
        </div>
      </div>
    </section>
  )
}
