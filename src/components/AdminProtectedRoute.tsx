import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const location = useLocation()

  // AuthContext가 로딩 중이면 대기
  if (authLoading) {
    const savedAdmin = localStorage.getItem('isAdmin')
    const savedUser = localStorage.getItem('user')
    // localStorage에 admin과 user가 있으면 로딩 중에도 대기 (인증 상태 복원 중)
    if (savedAdmin === 'true' && savedUser) {
      return null
    }
    // 로딩 중이고 localStorage에도 admin이 없으면 로그인 페이지로
    if (!savedAdmin) {
      return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    }
    return null
  }

  // 로딩 완료 후 Admin이 아니면 로그인 페이지로 리다이렉트
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default AdminProtectedRoute

