import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

/**
 * 플랫폼 레이어 셸.
 *
 * 단일 공연 허브(Layout)와 같은 헤더·네비 스타일을 그대로 씁니다.
 * 다른 점은 로고가 공연명이 아닌 BANDY 라는 것과 탭 구성뿐입니다.
 */

interface BandyLayoutProps {
  children: React.ReactNode
}

const TABS = [
  { path: '/explore', label: '탐색' },
  { path: '/my', label: '내 BANDY' },
  { path: '/club-console', label: '동아리 콘솔' },
]

const BandyLayout = ({ children }: BandyLayoutProps) => {
  const location = useLocation()

  // 헤더가 fixed 이므로 본문 여백 계산용 높이를 측정합니다 (Layout 과 동일)
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('.header')
      if (header) {
        const height = header.getBoundingClientRect().height
        document.documentElement.style.setProperty('--header-height', `${height}px`)
      }
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    window.addEventListener('orientationchange', updateHeaderHeight)
    const timeoutId = setTimeout(updateHeaderHeight, 100)

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      window.removeEventListener('orientationchange', updateHeaderHeight)
      clearTimeout(timeoutId)
    }
  }, [])

  // 상세 → 목록 이동 시 스크롤 위치 초기화
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, location.key])

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`) ? 'active' : ''

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <div className="header-top">
            <h1 className="logo">
              <Link to="/explore" className="logo-button">
                BANDY
              </Link>
            </h1>
          </div>
          <nav className="nav">
            {TABS.map((tab) => (
              <Link key={tab.path} to={tab.path} className={`nav-link ${isActive(tab.path)}`}>
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  )
}

export default BandyLayout
