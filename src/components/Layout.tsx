import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

import { useData } from '../contexts/DataContext'

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, isAdmin } = useAuth()
  const { eventsEnabled } = useData()

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : ''
  }

  const isChat = location.pathname.startsWith('/chat') || location.pathname.startsWith('/admin/chat')
  const isGuestbook = location.pathname.startsWith('/guestbook') || location.pathname.startsWith('/admin/guestbook')
  const isEvents = location.pathname.startsWith('/events') || location.pathname.startsWith('/admin/events')

  const handleLogout = () => {
    logout()
    if (isAdmin) {
      navigate('/admin/login')
    } else {
      navigate('/login')
    }
  }

  const handleLogoClick = () => {
    if (isAdmin) {
      navigate('/admin/dashboard')
    } else if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className={`layout ${isChat ? 'layout--chat' : ''} ${isGuestbook ? 'layout--guestbook' : ''} ${isEvents ? 'layout--events' : ''}`}>
      <header className="header">
        <div className="container">
          <h1 className="logo">
            <button onClick={handleLogoClick} className="logo-button">
              2025 멜로딕 단독 공연
            </button>
          </h1>
          <nav className="nav">
            {isAdmin ? (
              <>
                <Link to="/admin/dashboard" className={`nav-link ${isActive('/admin/dashboard')}`}>
                  내 정보
                </Link>
                <Link to="/admin/performances" className={`nav-link ${isActive('/admin/performances')}`}>
                  공연 정보
                </Link>
                <Link to="/admin/events" className={`nav-link ${isActive('/admin/events')}`}>
                  이벤트
                </Link>
                <Link to="/admin/guestbook" className={`nav-link ${isActive('/admin/guestbook')}`}>
                  방명록
                </Link>
                <Link to="/admin/chat" className={`nav-link ${isActive('/admin/chat')}`}>
                  채팅
                </Link>
                <button onClick={handleLogout} className="nav-link logout-nav-button">
                  로그아웃
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                  내 정보
                </Link>
                <Link to="/performances" className={`nav-link ${isActive('/performances')}`}>
                  공연 정보
                </Link>
                {eventsEnabled && (
                  <Link to="/events" className={`nav-link ${isActive('/events')}`}>
                    이벤트
                  </Link>
                )}
                <Link to="/guestbook" className={`nav-link ${isActive('/guestbook')}`}>
                  방명록
                </Link>
                <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>
                  채팅
                </Link>
                <button onClick={handleLogout} className="nav-link logout-nav-button">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`nav-link ${isActive('/login')}`}>
                  체크인
                </Link>
                <Link to="/performances" className={`nav-link ${isActive('/performances')}`}>
                  공연 정보
                </Link>
                {eventsEnabled && (
                  <Link to="/events" className={`nav-link ${isActive('/events')}`}>
                    이벤트
                  </Link>
                )}
                <Link to="/guestbook" className={`nav-link ${isActive('/guestbook')}`}>
                  방명록
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
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 밴드 공연 관리 시스템</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout

