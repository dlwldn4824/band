import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { verifyAdminCode } from '../services/adminAuthApi'
import { isManageSessionActive, setManageSession } from '../utils/manageSession'
import '../pages/Admin.css'

interface ManageProtectedRouteProps {
  children: React.ReactNode
}

const ManageProtectedRoute = ({ children }: ManageProtectedRouteProps) => {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionActive, setSessionActive] = useState(isManageSessionActive)

  if (authLoading) {
    return null
  }

  // 운영진(admin) 화면과 완전 분리 — admin 로그인 상태에서는 /manage 접근 불가
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('운영 관리 비밀번호를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await verifyAdminCode('action', password)
      if (!ok) {
        setError('올바른 비밀번호를 입력해주세요.')
        return
      }
      setManageSession(true)
      setSessionActive(true)
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!sessionActive) {
    return (
      <div className="admin-page admin-page--unified manage-gate">
        <div className="manage-gate-card ui-card">
          <h1 className="admin-page-title">운영 관리</h1>
          <p className="admin-page-subtitle ui-muted">
            이 페이지는 운영진 대시보드와 별도입니다. 운영 관리 비밀번호를 입력하세요.
          </p>
          <form className="manage-gate-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="manage-password">운영 관리 비밀번호</label>
              <input
                id="manage-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoFocus
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              className="admin-primary-button"
              disabled={!password.trim() || isSubmitting}
            >
              {isSubmitting ? '확인 중...' : '입장'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ManageProtectedRoute
