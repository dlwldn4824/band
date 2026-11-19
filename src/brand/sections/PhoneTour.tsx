import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { tour } from '../content'
import { useReducedMotion } from '../useReducedMotion'

/**
 * POSH 가운데 기둥을 그대로 가져온 구간입니다.
 * 폰 하나를 화면 가운데 고정해 두고, 스크롤에 따라 안의 화면만 바뀝니다.
 * 문장은 폰 왼쪽과 오른쪽에 번갈아 붙습니다.
 *
 * 한 화면에서 움직이는 건 둘뿐입니다 — 폰 안의 화면이 바뀌는 것과 문장이 바뀌는 것.
 * 폰 자체는 움직이지 않습니다.
 */
const EASE = [0.19, 1, 0.22, 1] as const

export default function PhoneTour() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const n = Math.min(tour.length - 1, Math.max(0, Math.floor(p * tour.length)))
    setI((prev) => (prev === n ? prev : n))
  })

  /* 모션을 줄여 달라고 한 경우 — 고정하지 않고 차례로 늘어놓습니다 */
  if (reduced) {
    return (
      <section className="b-tour" id="about">
        {tour.map((t) => (
          <div className="b-tour__pin" key={t.head} style={{ position: 'static', height: 'auto', padding: '64px 20px' }}>
            <div className={`b-tour__slot b-tour__slot--${t.side}`}><p className={`b-tour__cap b-tour__cap--${t.side}`} style={{ margin: 0 }}>
              {t.head}
              <small>{t.sub}</small>
            </p></div>
            <div className="b-phone">
              <div className="b-phone__screen">
                <img src={t.src} alt="" />
              </div>
            </div>
          </div>
        ))}
      </section>
    )
  }

  const cur = tour[i]

  return (
    <section className="b-tour" id="about" ref={ref} style={{ height: `${tour.length * 100}svh` }}>
      <div className="b-tour__pin">
        {/* 왼쪽 자리 */}
        <div className="b-tour__slot b-tour__slot--l">
          <AnimatePresence mode="wait">
            {cur.side === 'l' && (
              <motion.p
                key={`l${i}`}
                className="b-tour__cap b-tour__cap--l"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.42, ease: EASE }}
                style={{ margin: 0 }}
              >
                {cur.head}
                <small>{cur.sub}</small>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 폰 — 고정, 안의 화면만 바뀝니다 */}
        <div className="b-phone">
          <div className="b-phone__screen">
            {tour.map((t, n) => (
              <motion.img
                key={t.head}
                src={t.src}
                alt={t.head}
                initial={false}
                animate={{ opacity: n === i ? 1 : 0 }}
                transition={{ duration: 0.42, ease: EASE }}
                loading={n === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽 자리 */}
        <div className="b-tour__slot b-tour__slot--r">
          <AnimatePresence mode="wait">
            {cur.side === 'r' && (
              <motion.p
                key={`r${i}`}
                className="b-tour__cap b-tour__cap--r"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.42, ease: EASE }}
                style={{ margin: 0 }}
              >
                {cur.head}
                <small>{cur.sub}</small>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="b-tour__dots" aria-hidden="true">
          {tour.map((t, n) => (
            <i key={t.head} data-on={n === i ? '1' : '0'} />
          ))}
        </div>
      </div>
    </section>
  )
}
