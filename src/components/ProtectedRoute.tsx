import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()

  // 로딩 중이면 아무것도 렌더링하지 않음 (깜빡임 방지)
  // localStorage에 user가 있으면 로딩 중에도 인증된 것으로 간주
  if (isLoading) {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      // 로딩 중이지만 localStorage에 user가 있으면 대기 (인증 상태 복원 중)
      return null
    }
    // 로딩 중이고 localStorage에도 user가 없으면 로그인 페이지로
    return <Navigate to="/login" replace />
  }

  // 로딩 완료 후 인증 상태 확인
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

