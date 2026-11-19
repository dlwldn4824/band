import { motion } from 'motion/react'
import { VENUE_CONTACT } from '../content'
import { useReducedMotion } from '../useReducedMotion'

const EASE = [0.19, 1, 0.22, 1] as const

/* 한 주에서 공연이 없는 날 — 빨간 칸이 비는 날입니다 */
const WEEK = [
  { d: '월', empty: true },
  { d: '화', empty: true },
  { d: '수', empty: false },
  { d: '목', empty: true },
  { d: '금', empty: false },
  { d: '토', empty: false },
  { d: '일', empty: true },
]

/**
 * 공연장을 위한 자리.
 * 밴드·관객 이야기만 있으면 세 주체 중 하나가 통째로 빠집니다 —
 * 지금 BM 의 출발점이 공연장이라 더 그렇습니다.
 */
export default function Venue() {
  const reduced = useReducedMotion()

  return (
    <section className="b-venue" id="venue">
      <div className="b-venue__text">
        <p className="b-kicker b-kicker--dark">공연장이라면</p>
        <h2>
          공연이 없는 날,
          <br />
          공연장은 수익이 0원입니다.
        </h2>
        <p className="b-venue__body">
          대관료를 미리 받자니 밴드가 못 오고, 비워 두자니 그날은 그대로 손해입니다.
          BANDY는 그 빈 날에 설 밴드를 붙이고 관객까지 모아 옵니다. 공연장은 대관료 대신
          티켓 매출의 협의된 비율을 가져갑니다. 비는 날만 열어 두면 됩니다.
        </p>
        <div className="b-venue__acts">
          {/* 공연장 전용 가입 흐름은 아직 없습니다. 연락처가 들어오기 전까지는
              동아리 코드 게이트로 보내지 않고 문의 자리로 내려 줍니다. */}
          <a className="b-pill b-pill--lg b-pill--onblack" href={VENUE_CONTACT ? `mailto:${VENUE_CONTACT}` : '#contact'}>
            빈 날 등록하기
          </a>
          <span className="b-venue__note">
            공연장은 등록 전에 먼저 이야기부터 나눕니다. 비는 날짜와 정산 비율을 맞춰 보고 시작해요.
          </span>
        </div>
      </div>

      <div className="b-venue__week" aria-hidden="true">
        {WEEK.map((w, i) => (
          <motion.div
            key={w.d}
            className="b-venue__day"
            data-empty={w.empty ? '1' : '0'}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.05, ease: EASE }}
          >
            <span>{w.d}</span>
            {w.empty ? <em>비어 있음</em> : <i>공연</i>}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
