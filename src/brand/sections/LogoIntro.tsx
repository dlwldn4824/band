import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import lockup from '../assets/logo-lockup.png'

/**
 * 첫 로고 인트로 — 한 세션에 한 번, 1.3초 안에 끝납니다.
 * opacity 와 8px 이동만 씁니다. 회전·확대·바운스·블러 없음.
 */
const KEY = 'bandy-intro-seen'

export default function LogoIntro({ reduced }: { reduced: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (reduced) return
    try {
      if (sessionStorage.getItem(KEY) === '1') return
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* 저장이 막혀 있어도 한 번은 돕니다 */
    }
    setShow(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      setShow(false)
      document.body.style.overflow = prev
    }, 1320)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
    }
  }, [reduced])

  if (!show) return null

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.38, delay: 0.94, ease: [0.19, 1, 0.22, 1] }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F6F5F2', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}
    >
      <motion.img
        src={lockup}
        alt="BANDY"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.62, ease: [0.19, 1, 0.22, 1] }}
        style={{ width: 'min(380px, 56vw)', display: 'block' }}
      />
    </motion.div>
  )
}
