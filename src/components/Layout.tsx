import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { trackNavTab } from '../analytics'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, isAdmin } = useAuth()
  const { performanceData } = useData()
  
  // 새로고침 시 admin 상태가 아직 로드되지 않았을 수 있으므로
  // localStorage에서 직접 확인하여 깜빡임 방지
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null)
  
  useEffect(() => {
    // localStorage에서 admin 상태 확인
    const savedAdmin = localStorage.getItem('isAdmin')
    setAdminStatus(savedAdmin === 'true')
  }, [isAdmin]) // isAdmin이 변경될 때마다 업데이트

  // 헤더 높이를 동적으로 측정하여 CSS 변수로 설정
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('.header')
      if (header) {
        const height = header.getBoundingClientRect().height
        document.documentElement.style.setProperty('--header-height', `${height}px`)
      }
    }

    // 초기 측정
    updateHeaderHeight()

    // 리사이즈 및 오리엔테이션 변경 시 재측정
    window.addEventListener('resize', updateHeaderHeight)
    window.addEventListener('orientationchange', updateHeaderHeight)

    // 약간의 지연 후 재측정 (렌더링 완료 후)
    const timeoutId = setTimeout(updateHeaderHeight, 100)
    const timeoutId2 = setTimeout(updateHeaderHeight, 300)

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      window.removeEventListener('orientationchange', updateHeaderHeight)
      clearTimeout(timeoutId)
      clearTimeout(timeoutId2)
    }
  }, [adminStatus, isAuthenticated]) // 헤더 내용이 변경될 수 있으므로 의존성 추가

  // 페이지 이동 시 스크롤 위치 초기화 (홈 하단 타임라인 → 공연 정보 등)
  useEffect(() => {
    const scrollToTop = () => {
      if (document.body.style.position === 'fixed') {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    scrollToTop()
    const rafId = requestAnimationFrame(scrollToTop)
    const timeoutId = setTimeout(scrollToTop, 50)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [location.pathname, location.key])

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : ''
  }

  const isChat = location.pathname.startsWith('/old/chat') || location.pathname.startsWith('/old/admin/chat')
  const isGuestbook = location.pathname.startsWith('/old/guestbook') || location.pathname.startsWith('/old/admin/guestbook')
  const isEvents = location.pathname.startsWith('/old/events') || location.pathname.startsWith('/old/admin/events')
  const isPerformances = location.pathname.startsWith('/old/performances') || location.pathname.startsWith('/old/admin/performances')

  // 방명록, 채팅 페이지에서는 body 스크롤 막기
  useEffect(() => {
    if (isChat || isGuestbook) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      // cleanup: 페이지를 벗어날 때 스타일 초기화
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isChat, isGuestbook])

  const handleLogout = () => {
    logout()
    // 항상 일반 로그인 화면으로 이동 (window.location.replace로 React Router 리다이렉트 우회)
    window.location.replace('/old/login')
  }

  const handleLogoClick = () => {
    // adminStatus가 null이면 isAdmin 사용 (fallback)
    const currentAdminStatus = adminStatus !== null ? adminStatus : isAdmin
    if (currentAdminStatus) {
      navigate('/old/admin/dashboard')
    } else if (isAuthenticated) {
      navigate('/old/dashboard')
    } else {
      navigate('/old/login')
    }
  }

  // 네비게이션 링크 클릭 시 강제 리렌더링
  const handleNavClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>, tabName: string) => {
    trackNavTab(tabName, location.pathname, path)
    // 현재 경로와 같을 때도 리렌더링하도록 navigate 호출
    if (location.pathname === path) {
      e.preventDefault()
      // replace: false로 하여 히스토리에 새 엔트리 추가하고 state 변경으로 리렌더링 트리거
      navigate(path, { replace: false, state: { refresh: Date.now() } })
    }
  }

  return (
    <div className={`layout ${isChat ? 'layout--chat' : ''} ${isGuestbook ? 'layout--guestbook' : ''} ${isEvents ? 'layout--events' : ''} ${isPerformances ? 'layout--performances' : ''}`}>
      <header className="header">
        <div className="container">
          <div className="header-top">
            <h1 className="logo">
              <button onClick={handleLogoClick} className="logo-button">
                {performanceData?.ticket?.eventName || 'Summer Night Live'}
              </button>
            </h1>
            {((adminStatus !== null ? adminStatus : isAdmin) || isAuthenticated) && (
              <button onClick={handleLogout} className="logout-nav-button">
                <img src="/assets/배경/logout-button.png" alt="로그아웃" />
              </button>
            )}
          </div>
          <nav className="nav">
            {(adminStatus !== null ? adminStatus : isAdmin) ? (
              <>
                <Link to="/old/admin/dashboard" className={`nav-link ${isActive('/old/admin/dashboard')}`} onClick={(e) => handleNavClick('/old/admin/dashboard', e, 'home')}>
                  홈
                </Link>
                <Link to="/old/admin/performances" className={`nav-link ${isActive('/old/admin/performances')}`} onClick={(e) => handleNavClick('/old/admin/performances', e, 'performances')}>
                  공연 정보
                </Link>
                <Link to="/old/admin/chat" className={`nav-link ${isActive('/old/admin/chat')}`} onClick={(e) => handleNavClick('/old/admin/chat', e, 'chat')}>
                  채팅
                </Link>
              </>
            ) : isAuthenticated ? (
              <>
                <Link to="/old/dashboard" className={`nav-link ${isActive('/old/dashboard')}`} onClick={(e) => handleNavClick('/old/dashboard', e, 'home')}>
                  홈
                </Link>
                <Link to="/old/performances" className={`nav-link ${isActive('/old/performances')}`} onClick={(e) => handleNavClick('/old/performances', e, 'performances')}>
                  공연 정보
                </Link>
                <Link to="/old/chat" className={`nav-link ${isActive('/old/chat')}`} onClick={(e) => handleNavClick('/old/chat', e, 'chat')}>
                  채팅
                </Link>
              </>
            ) : (
              <>
                <Link to="/old/performances" className={`nav-link ${isActive('/old/performances')}`} onClick={(e) => handleNavClick('/old/performances', e, 'performances')}>
                  공연 정보
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>

    </div>
  )
}

export default Layout

