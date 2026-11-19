import { motion } from 'motion/react'
import { proof, team, venues } from '../content'
import { useReducedMotion } from '../useReducedMotion'

const EASE = [0.19, 1, 0.22, 1] as const

/**
 * 지금까지 있었던 일 — 확인된 숫자만.
 * 카드를 나란히 두지 않고 큰 숫자와 구분선으로만 정리합니다.
 */
export default function Proof() {
  const reduced = useReducedMotion()

  return (
    <section className="b-proof" id="proof">
      <p className="b-kicker">지금까지</p>

      <div className="b-proof__row">
        {proof.map((p, i) => (
          <motion.div
            className="b-proof__cell"
            key={p.label}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.07, ease: EASE }}
          >
            <b>{p.n}</b>
            <span>{p.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="b-proof__notes">
        <p>
          <em>먼저 손을 내밀어 준 공연장</em>
          {venues.join(' · ')} — 아직 계약 전, 협력 의사를 밝힌 단계입니다.
        </p>
        <p>
          <em>만든 사람들</em>
          {team}
        </p>
      </div>
    </section>
  )
}
