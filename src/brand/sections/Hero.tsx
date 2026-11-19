import { motion } from 'motion/react'
import { posters } from '../content'
import Poster, { upcoming } from '../components/Poster'
import { useReducedMotion } from '../useReducedMotion'

/**
 * POSH 히어로를 그대로 따릅니다 — 오른쪽에 붙은 큰 제목,
 * 그 아래 실제 포스터가 가로로 늘어서고, 왼쪽 아래에 작은 설명 한 단락.
 *
 * 띠는 저절로 흐릅니다. 아무것도 누르거나 밀지 않아도 포스터가 계속 지나가야
 * "지금 돌아가는 판"처럼 보입니다. 올려놓으면 멈추니 하나를 들여다볼 수도 있습니다.
 */

/** 실제 포스터 + 아직 포스터가 없는 공연 — 띠에 들어가는 전부 */
const strip = [
  ...posters.map((p) => ({ key: p.title, title: p.title, hint: `${p.title} — ${p.sub}`, img: p.src, art: null })),
  ...upcoming.map((u) => ({ key: u.title, title: u.title, hint: `${u.title} — ${u.note}`, img: null, art: u })),
]

export default function Hero() {
  const reduced = useReducedMotion()
  const rise = (d: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.52, delay: d, ease: [0.19, 1, 0.22, 1] as const },
        }

  return (
    <section className="b-hero" id="top">
      <motion.h1 className="b-hero__h" {...rise(0.06)}>
        우리 다음 공연,
        <br />
        같이 할래?
      </motion.h1>

      <motion.div className="b-strip" {...rise(0.18)}>
        {/* 같은 묶음을 두 번 깔고 절반만큼 밀어, 이음매 없이 이어집니다 */}
        <div className="b-strip__track">
          {[0, 1].map((pass) =>
            strip.map((s) => (
              <div
                className="b-strip__item"
                key={`${pass}-${s.key}`}
                title={s.hint}
                aria-hidden={pass === 1 ? true : undefined}
              >
                {s.img ? <img src={s.img} alt={`${s.title} 포스터`} draggable={false} /> : <Poster p={s.art!} />}
              </div>
            ))
          )}
        </div>
      </motion.div>

      <motion.p className="b-hero__foot" {...rise(0.28)}>
        <b>BANDY는 대학 밴드 동아리의 공연 플랫폼입니다.</b>
        공연장이 비는 날에 밴드를 연결하고, 같이 설 팀과 보러 올 사람까지 모읍니다. 노원 대학가에서
        시작합니다.
      </motion.p>
    </section>
  )
}
