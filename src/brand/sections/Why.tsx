import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { audienceReasons, links } from '../content'
import { useReducedMotion } from '../useReducedMotion'

const EASE = [0.19, 1, 0.22, 1] as const

/**
 * 관객이 올 이유.
 * "모르는 밴드 공연에 왜 돈 내고 가지?" 에 답하는 자리입니다 —
 * 전환이 제일 많이 깨지는 지점이라 비워 둘 수 없습니다.
 */
export default function Why() {
  const reduced = useReducedMotion()

  return (
    <section className="b-why" id="audience">
      <p className="b-kicker">보러 가는 쪽이라면</p>
      <h2 className="b-why__h">모르던 밴드가 아는 밴드가 되는 곳.</h2>

      <div className="b-why__list">
        {audienceReasons.map((r, i) => (
          <motion.div
            className="b-why__item"
            key={r.head}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.07, ease: EASE }}
          >
            <span className="b-why__n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <b>{r.head}</b>
              <p>{r.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Link className="b-pill b-pill--lg b-why__cta" to={links.shows}>
        이번 주 공연 보기
      </Link>
    </section>
  )
}
