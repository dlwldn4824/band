import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const AdminLogin = () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!password.trim()) {
      setError('운영진 코드를 입력해주세요.')
      return
    }

    // 운영진 코드 검증 (체크인 코드와 동일하게 '0215' 사용)
    if (password.trim() === '0215') {
      // 운영진 로그인 성공 - Admin 페이지로 이동
      navigate('/manage')
    } else {
      setError('올바른 운영진 코드를 입력해주세요.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>운영진 로그인</h1>
          <p className="login-subtitle">이름과 운영진 코드를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="admin-name">이름</label>
            <input
              id="admin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="login-input"
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="admin-password">운영진 코드</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="운영진 코드 입력"
              className="login-input"
              autoComplete="off"
            />
          </div>

          <button type="submit" className="login-button">
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin

