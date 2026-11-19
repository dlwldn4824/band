import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import lockup from '../assets/logo-lockup.png'
import { links } from '../content'

/** 내려가면 숨고 올라오면 나타납니다 — 상태 전환만, 420ms */
export default function Nav() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 4) return
      el.style.transform = y > last && y > 120 ? 'translateY(-100%)' : 'translateY(0)'
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="b-nav" ref={ref}>
      <Link to="/brand" aria-label="BANDY">
        <img src={lockup} alt="BANDY" />
      </Link>
      <nav className="b-nav__links">
        <Link to={links.shows}>공연 둘러보기</Link>
        <Link to={links.clubs}>동아리 둘러보기</Link>
        <a href="#venue">공연장이라면</a>
        <a href="#about">BANDY 소개</a>
      </nav>
      <div className="b-nav__right">
        <Link to={links.my}>내 티켓</Link>
        {/* 바로 운영진 코드 게이트로 보내지 않고, 무엇이 필요한지 설명하는 자리로 먼저 내려 줍니다 */}
        <a className="b-pill" href="#start">
          공연 올리기
        </a>
      </div>
    </header>
  )
}
