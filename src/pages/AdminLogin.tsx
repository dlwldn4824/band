import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

const AdminLogin = () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { performanceData } = useData()
  const { setAdmin, updateUser } = useAuth()
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
    if (password.trim() !== '0215') {
      setError('올바른 운영진 코드를 입력해주세요.')
      return
    }

    // 공연자 이름 검증
    const normalizedName = name.trim()
    let isPerformer = false

    // 1. performers 배열에서 확인
    if (performanceData?.performers && Array.isArray(performanceData.performers)) {
      isPerformer = performanceData.performers.some(performer => 
        performer.trim() === normalizedName
      )
    }

    // 2. setlist의 각 곡에서 공연자 확인 (vocal, guitar, bass, keyboard, drum)
    if (!isPerformer && performanceData?.setlist && Array.isArray(performanceData.setlist)) {
      for (const song of performanceData.setlist) {
        if (
          song.vocal?.trim() === normalizedName ||
          song.guitar?.trim() === normalizedName ||
          song.bass?.trim() === normalizedName ||
          song.keyboard?.trim() === normalizedName ||
          song.drum?.trim() === normalizedName
        ) {
          isPerformer = true
          break
        }
      }
    }

    if (!isPerformer) {
      setError('셋리스트에 등록된 공연자가 아닙니다.')
      return
    }

    // 운영진 로그인 성공 - 운영진 상태 설정
    setAdmin(true, normalizedName)
    
    // 운영자도 user 객체를 설정하여 채팅 등 기능 사용 가능하도록
    updateUser({
      name: normalizedName,
      phone: 'admin', // 운영자 식별자
      nickname: normalizedName
    })
    
    // Admin Dashboard로 이동
    navigate('/admin/dashboard')
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

