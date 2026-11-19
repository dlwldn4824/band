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
        <a href="#about">BANDY 소개</a>
      </nav>
      <div className="b-nav__right">
        <Link to={links.my}>내 티켓</Link>
        <Link className="b-pill" to={links.console}>
          공연 올리기
        </Link>
      </div>
    </header>
  )
}
