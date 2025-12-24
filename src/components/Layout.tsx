import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, isAdmin } = useAuth()
  const { eventsEnabled } = useData()
  
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

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : ''
  }

  const isChat = location.pathname.startsWith('/chat') || location.pathname.startsWith('/admin/chat')
  const isGuestbook = location.pathname.startsWith('/guestbook') || location.pathname.startsWith('/admin/guestbook')
  const isEvents = location.pathname.startsWith('/events') || location.pathname.startsWith('/admin/events')
  const isPerformances = location.pathname.startsWith('/performances') || location.pathname.startsWith('/admin/performances')

  // 방명록, 채팅, 기타 페이지에서는 body 스크롤 막기
  useEffect(() => {
    if (isChat || isGuestbook || isEvents) {
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
  }, [isChat, isGuestbook, isEvents])

  const handleLogout = () => {
    logout()
    // 항상 일반 로그인 화면으로 이동 (window.location.replace로 React Router 리다이렉트 우회)
    window.location.replace('/login')
  }

  const handleLogoClick = () => {
    // adminStatus가 null이면 isAdmin 사용 (fallback)
    const currentAdminStatus = adminStatus !== null ? adminStatus : isAdmin
    if (currentAdminStatus) {
      navigate('/admin/dashboard')
    } else if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  // 네비게이션 링크 클릭 시 강제 리렌더링
  const handleNavClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
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
                2025 멜로딕 단독 공연
              </button>
            </h1>
            {((adminStatus !== null ? adminStatus : isAdmin) || isAuthenticated) && (
              <button onClick={handleLogout} className="logout-nav-button">
              </button>
            )}
          </div>
          <nav className="nav">
            {(adminStatus !== null ? adminStatus : isAdmin) ? (
              <>
                <Link to="/admin/dashboard" className={`nav-link ${isActive('/admin/dashboard')}`} onClick={(e) => handleNavClick('/admin/dashboard', e)}>
                  홈
                </Link>
                <Link to="/admin/performances" className={`nav-link ${isActive('/admin/performances')}`} onClick={(e) => handleNavClick('/admin/performances', e)}>
                  공연 정보
                </Link>
                <Link to="/admin/guestbook" className={`nav-link ${isActive('/admin/guestbook')}`} onClick={(e) => handleNavClick('/admin/guestbook', e)}>
                  방명록
                </Link>
                <Link to="/admin/chat" className={`nav-link ${isActive('/admin/chat')}`} onClick={(e) => handleNavClick('/admin/chat', e)}>
                  채팅
                </Link>
                <Link to="/admin/events" className={`nav-link ${isActive('/admin/events')}`} onClick={(e) => handleNavClick('/admin/events', e)}>
                  기타
                </Link>
              </>
            ) : isAuthenticated ? (
              <>
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`} onClick={(e) => handleNavClick('/dashboard', e)}>
                  홈
                </Link>
                <Link to="/performances" className={`nav-link ${isActive('/performances')}`} onClick={(e) => handleNavClick('/performances', e)}>
                  공연 정보
                </Link>
                <Link to="/guestbook" className={`nav-link ${isActive('/guestbook')}`} onClick={(e) => handleNavClick('/guestbook', e)}>
                  방명록
                </Link>
                <Link to="/chat" className={`nav-link ${isActive('/chat')}`} onClick={(e) => handleNavClick('/chat', e)}>
                  채팅
                </Link>
                {eventsEnabled && (
                  <Link to="/events" className={`nav-link ${isActive('/events')}`} onClick={(e) => handleNavClick('/events', e)}>
                    기타
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className={`nav-link ${isActive('/login')}`} onClick={(e) => handleNavClick('/login', e)}>
                  체크인
                </Link>
                <Link to="/performances" className={`nav-link ${isActive('/performances')}`} onClick={(e) => handleNavClick('/performances', e)}>
                  공연 정보
                </Link>
                <Link to="/guestbook" className={`nav-link ${isActive('/guestbook')}`} onClick={(e) => handleNavClick('/guestbook', e)}>
                  방명록
                </Link>
                {eventsEnabled && (
                  <Link to="/events" className={`nav-link ${isActive('/events')}`} onClick={(e) => handleNavClick('/events', e)}>
                    기타
                  </Link>
                )}
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

