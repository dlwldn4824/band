import { motion } from 'motion/react'
import { posters } from '../content'
import Poster, { upcoming } from '../components/Poster'
import { useReducedMotion } from '../useReducedMotion'

/**
 * POSH 히어로를 그대로 따릅니다 — 오른쪽에 붙은 큰 제목,
 * 그 아래 실제 포스터가 가로로 늘어서고, 왼쪽 아래에 작은 설명 한 단락.
 * 포스터 띠는 저절로 흐르지 않습니다. 직접 밀어서 봅니다.
 */
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
        {posters.map((p) => (
          <div className="b-strip__item" key={p.title} title={`${p.title} — ${p.sub}`}>
            <img src={p.src} alt={`${p.title} 포스터`} />
          </div>
        ))}
        {upcoming.map((u) => (
          <div className="b-strip__item" key={u.title} title={`${u.title} — ${u.note}`}>
            <Poster p={u} />
          </div>
        ))}
      </motion.div>

      <motion.p className="b-hero__foot" {...rise(0.28)}>
        <b>BANDY는 대학 밴드 동아리의 공연 플랫폼입니다.</b>
        공연장이 비는 날에 밴드를 연결하고, 같이 설 팀과 보러 올 사람까지 모읍니다. 노원 대학가에서
        시작합니다.
      </motion.p>
    </section>
  )
}
