import { motion } from 'motion/react'
import { gripes } from '../content'
import { useReducedMotion } from '../useReducedMotion'

const EASE = [0.19, 1, 0.22, 1] as const

/**
 * 02 Problem — 공연 한 번 잡기가 왜 이렇게 어려운지.
 * 똑같은 카드 세 장을 나란히 두지 않고, 폭과 들여쓰기를 다 다르게 둡니다.
 */
export default function Problem() {
  const reduced = useReducedMotion()

  return (
    <section className="b-problem">
      <p className="b-kicker">지금</p>
      <h2 className="b-problem__h">
        공연 한 번 잡기가
        <br />왜 이렇게 어렵지?
      </h2>

      <div className="b-problem__list">
        {gripes.map((g, i) => (
          <motion.div
            className="b-problem__item"
            key={g.text}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.07, ease: EASE }}
          >
            <span className="b-problem__who">{g.who}</span>
            <p>
              {g.text}
              <small>{g.note}</small>
            </p>
          </motion.div>
        ))}
      </div>

      <p className="b-problem__punch">
        다들 공연하고 싶은데, <em>서로를 잘 모른다.</em>
      </p>
    </section>
  )
}
