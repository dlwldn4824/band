import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { bezel, tour } from '../content'
import { useReducedMotion } from '../useReducedMotion'

/**
 * POSH 가운데 기둥을 그대로 가져온 구간입니다.
 * 폰 하나를 화면 가운데 고정해 두고, 스크롤에 따라 안의 화면만 바뀝니다.
 * 문장은 폰 왼쪽과 오른쪽에 번갈아 붙습니다.
 *
 * 전환은 전부 스크롤 값에 직접 물려 있습니다 — 손가락을 멈추면 전환도 멈춥니다.
 * 예전처럼 경계를 넘을 때 타이머로 0.4초짜리 페이드를 재생하면,
 * 스크롤이 그 동안 계속 내려가서 "뚝뚝 끊기며 넘어가는" 느낌이 납니다.
 * 그리고 스크롤 중에는 리렌더가 한 번도 일어나지 않습니다(값만 바뀝니다).
 */

/** 화면 하나가 머무는 길이(뷰포트 높이 배수). 1 이면 휙휙 넘어갑니다. */
const DWELL = 1.6

/** 다음 화면이 덮어 오는 구간 — 한 화면 몫의 몇 할을 쓸지 */
const FADE = 0.34

function Screen({ raw, n, src, alt }: { raw: MotionValue<number>; n: number; src: string; alt: string }) {
  /* 0번은 늘 깔려 있습니다. 1번부터 차례로 그 위를 덮습니다 —
     둘을 각각 페이드하면 겹치는 순간 합이 1 이 안 돼 흰 바탕이 비칩니다. */
  const opacity = useTransform(raw, [n - FADE, n], [0, 1])
  return (
    <motion.img
      src={src}
      alt={alt}
      style={n === 0 ? { zIndex: 0 } : { opacity, zIndex: n }}
      draggable={false}
    />
  )
}

function Cap({ raw, n, head, sub, side }: { raw: MotionValue<number>; n: number; head: string; sub: string; side: 'l' | 'r' }) {
  const opacity = useTransform(raw, [n - FADE, n - 0.04, n + 0.72, n + 0.96], [0, 1, 1, 0])
  const y = useTransform(raw, [n - FADE, n - 0.04, n + 0.72, n + 0.96], [14, 0, 0, -10])
  return (
    <motion.p className={`b-tour__cap b-tour__cap--${side}`} style={{ opacity, y }}>
      {head}
      <small>{sub}</small>
    </motion.p>
  )
}

function Dot({ raw, n }: { raw: MotionValue<number>; n: number }) {
  const scaleX = useTransform(raw, [n, n + 1], [0, 1])
  return (
    <i>
      <motion.b style={{ scaleX }} />
    </i>
  )
}

export default function PhoneTour() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  /** 0 … tour.length — 소수점까지 그대로 씁니다 */
  const raw = useTransform(scrollYProgress, [0, 1], [0, tour.length])

  /* 모션을 줄여 달라고 한 경우 — 고정하지 않고 차례로 늘어놓습니다 */
  if (reduced) {
    return (
      <section className="b-tour" id="about">
        {tour.map((t) => (
          <div className="b-tour__pin" key={t.head} style={{ position: 'static', height: 'auto', padding: '64px 20px' }}>
            <div className={`b-tour__slot b-tour__slot--${t.side}`}>
              <p className={`b-tour__cap b-tour__cap--${t.side}`}>
                {t.head}
                <small>{t.sub}</small>
              </p>
            </div>
            <div className="b-phone">
              <div className="b-phone__screen">
                <img src={t.src} alt="" />
              </div>
              <img className="b-phone__bezel" src={bezel} alt="" aria-hidden="true" />
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="b-tour" id="about" ref={ref} style={{ height: `${tour.length * DWELL * 100}svh` }}>
      <div className="b-tour__pin">
        {/* 왼쪽 자리 — 홀수 번째 문장들이 같은 칸에 포개집니다 */}
        <div className="b-tour__slot b-tour__slot--l">
          {tour.map((t, n) => t.side === 'l' && <Cap key={t.head} raw={raw} n={n} head={t.head} sub={t.sub} side="l" />)}
        </div>

        {/* 폰 — 고정, 안의 화면만 바뀝니다 */}
        <div className="b-phone">
          <div className="b-phone__screen">
            {tour.map((t, n) => (
              <Screen key={t.head} raw={raw} n={n} src={t.src} alt={t.head} />
            ))}
          </div>
          <img className="b-phone__bezel" src={bezel} alt="" aria-hidden="true" />
        </div>

        {/* 오른쪽 자리 */}
        <div className="b-tour__slot b-tour__slot--r">
          {tour.map((t, n) => t.side === 'r' && <Cap key={t.head} raw={raw} n={n} head={t.head} sub={t.sub} side="r" />)}
        </div>

        <div className="b-tour__dots" aria-hidden="true">
          {tour.map((t, n) => (
            <Dot key={t.head} raw={raw} n={n} />
          ))}
        </div>
      </div>
    </section>
  )
}
