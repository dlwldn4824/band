import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '../useReducedMotion'

/**
 * BANDY 대표 모션 — 케이블 두 가닥이 맞물리는 순간.
 *
 * Connect 섹션 말고도 공연 성사·교류 수락처럼 "둘이 이어졌다"를 말해야 하는
 * 자리에 작게 다시 쓰라고 떼어 둔 컴포넌트입니다.
 * 그림은 Figma `앱 · 라이트 UI` 의 C3(연결 상태) · C4(연결되었어요) 와 같습니다.
 */

export type CableState = 'open' | 'connected'

const VW = 440
const VH = 96
const MID = VH / 2
const OPEN = { lx: 172, rx: 268 }
const SHUT = { lx: 213, rx: 227 }
const PLUG_W = 42
const PLUG_H = 34
const CABLE_H = 13

const SPRING = { type: 'spring', stiffness: 160, damping: 21, mass: 0.9 } as const

export default function CableConnect({
  state,
  height = 96,
}: {
  state: CableState
  height?: number
}) {
  const reduced = useReducedMotion()
  const on = state === 'connected'
  const { lx, rx } = on ? SHUT : OPEN
  const contact = (lx + rx) / 2

  /* 맞물릴 때마다 음파를 한 번 더 내보내려고 횟수를 셉니다 */
  const [pulse, setPulse] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (!on) return
    }
    if (on) setPulse((n) => n + 1)
  }, [on])

  const move = reduced ? { duration: 0 } : SPRING

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <filter id="b-cable-glow" x="-220%" y="-220%" width="540%" height="540%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 케이블 몸통 */}
      <motion.rect
        x={0}
        y={MID - CABLE_H / 2}
        height={CABLE_H}
        rx={CABLE_H / 2}
        fill="#17181c"
        animate={{ width: lx - PLUG_W }}
        initial={false}
        transition={move}
      />
      <motion.rect
        y={MID - CABLE_H / 2}
        height={CABLE_H}
        rx={CABLE_H / 2}
        fill="#17181c"
        animate={{ x: rx + PLUG_W, width: VW - rx - PLUG_W }}
        initial={false}
        transition={move}
      />

      {/* 신호 — 맞물린 뒤에만 접점에서 양쪽으로 흘러 나갑니다 */}
      {!reduced &&
        [0, 1, 2].map((k) => (
          <g key={k}>
            <motion.circle
              r={3.2}
              cy={MID}
              fill="#e0443f"
              initial={{ opacity: 0 }}
              animate={on ? { cx: [lx - PLUG_W - 8, 14], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
              transition={on ? { duration: 1.9, repeat: Infinity, delay: 0.45 + k * 0.63, ease: 'linear' } : { duration: 0.2 }}
            />
            <motion.circle
              r={3.2}
              cy={MID}
              fill="#e0443f"
              initial={{ opacity: 0 }}
              animate={on ? { cx: [rx + PLUG_W + 8, VW - 14], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
              transition={on ? { duration: 1.9, repeat: Infinity, delay: 0.45 + k * 0.63, ease: 'linear' } : { duration: 0.2 }}
            />
          </g>
        ))}

      {/* 접점 — 빨강은 여기서만 켜집니다 */}
      <motion.rect
        y={MID - 4.5}
        height={9}
        rx={4.5}
        fill="#e0443f"
        animate={{ x: lx, width: Math.max(rx - lx, 0), opacity: on ? 1 : 0 }}
        initial={false}
        transition={move}
      />

      {/* 맞물리는 순간 한 번 지나가는 음파 */}
      {!reduced && pulse > 0 && (
        <motion.circle
          key={pulse}
          cx={contact}
          cy={MID}
          fill="none"
          stroke="#e0443f"
          strokeWidth={2}
          initial={{ r: 8, opacity: 0.8 }}
          animate={{ r: 84, opacity: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
        />
      )}

      {/* 플러그 두 개 */}
      {[0, 1].map((side) => (
        <motion.g
          key={side}
          animate={{ x: side === 0 ? lx - PLUG_W : rx }}
          initial={false}
          transition={move}
        >
          <rect y={MID - PLUG_H / 2} width={PLUG_W} height={PLUG_H} rx={11} fill="#ffffff" />
          <rect y={MID - PLUG_H / 2} width={PLUG_W} height={PLUG_H} rx={11} fill="none" stroke="#dcdee3" />
          <rect x={side === 0 ? PLUG_W - 9 : 3} y={MID - 5} width={6} height={10} rx={3} fill="#c6cad1" />
        </motion.g>
      ))}

      <motion.circle
        cy={MID}
        r={6.5}
        fill="#e0443f"
        filter="url(#b-cable-glow)"
        animate={{ cx: contact, opacity: on ? 1 : 0 }}
        initial={false}
        transition={move}
      />
    </svg>
  )
}
