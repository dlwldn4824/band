import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : ''
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLogoClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <h1 className="logo">
            <button onClick={handleLogoClick} className="logo-button">
              🎸 밴드 공연 관리
            </button>
          </h1>
          <nav className="nav">
            {isAuthenticated ? (
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                내 정보
              </Link>
            ) : (
              <Link to="/login" className={`nav-link ${isActive('/login')}`}>
                체크인
              </Link>
            )}
            <Link to="/performances" className={`nav-link ${isActive('/performances')}`}>
              공연 정보
            </Link>
            <Link to="/events" className={`nav-link ${isActive('/events')}`}>
              이벤트
            </Link>
            <Link to="/guestbook" className={`nav-link ${isActive('/guestbook')}`}>
              방명록
            </Link>
            <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>
              채팅
            </Link>
            {isAuthenticated && (
              <button onClick={handleLogout} className="nav-link logout-nav-button">
                로그아웃
              </button>
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

