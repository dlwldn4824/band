import { useEffect, useState } from 'react'

/**
 * 모션을 줄여 달라고 설정해 둔 사람에게는 애니메이션 대신 완성된 화면을 보여 줍니다.
 * motion 라이브러리에도 같은 이름의 훅이 있지만 첫 렌더에 null 을 돌려주는 터라,
 * "모르면 일단 움직인다" 로 단순하게 다시 썼습니다.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/** 좁은 화면에서는 스크롤 연동 연출을 덜어 냅니다 */
export function useIsNarrow(breakpoint = 900): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [breakpoint])
  return narrow
}
