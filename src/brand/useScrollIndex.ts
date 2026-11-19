import { useRef, useState } from 'react'
import { useMotionValueEvent, useScroll } from 'motion/react'

/**
 * 섹션을 지나가는 동안 0 … count-1 을 차례로 돌려줍니다.
 *
 * 랜딩에서는 아무것도 누르지 않아도 스크롤만으로 내용이 넘어가야 합니다.
 * 누르거나 올려놓는 건 "지금 보고 싶은 걸 먼저 보는" 보조 수단일 뿐입니다.
 *
 * 스크롤 할 때마다 리렌더하면 그 자체로 화면이 끊깁니다.
 * 그래서 번호가 실제로 바뀔 때만 state 를 건드립니다.
 */
export function useScrollIndex(
  count: number,
  opts?: { start?: string; end?: string; enabled?: boolean }
) {
  const ref = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [opts?.start ?? 'start 0.8', opts?.end ?? 'end 0.45'] as ['start 0.8', 'end 0.45'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (opts?.enabled === false) return
    const n = Math.min(count - 1, Math.max(0, Math.floor(p * count)))
    setI((prev) => (prev === n ? prev : n))
  })

  return [ref, i, setI] as const
}
