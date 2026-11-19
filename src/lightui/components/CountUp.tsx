import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * 0 에서 target 까지 올라가는 숫자.
 *
 * 레이더가 끝난 뒤 「주변 밴드 8팀 · 공연 12개」 를 올릴 때 씁니다.
 * `prefers-reduced-motion` 이면 바로 최종 값입니다.
 */
const CountUp = ({
  to,
  run = true,
  duration = 600,
}: {
  to: number
  run?: boolean
  duration?: number
}) => {
  const reduced = useReducedMotion()
  const [n, setN] = useState(run && !reduced ? 0 : to)
  const raf = useRef<number>()

  useEffect(() => {
    if (!run) return
    if (reduced) {
      setN(to)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // 끝에서 부드럽게 멈추게
      const eased = 1 - (1 - t) * (1 - t)
      setN(Math.round(eased * to))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [run, to, duration, reduced])

  return <>{n}</>
}

export default CountUp
