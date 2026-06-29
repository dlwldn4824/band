import '../../pages/Admin.css'

interface PasswordModalProps {
  isOpen: boolean
  passwordInput: string
  passwordError: string
  isConfirming?: boolean
  onClose: () => void
  onPasswordChange: (password: string) => void
  onConfirm: () => void
}

const PasswordModal = ({ 
  isOpen, 
  passwordInput, 
  passwordError,
  isConfirming = false,
  onClose, 
  onPasswordChange, 
  onConfirm 
}: PasswordModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>비밀번호 확인</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="profile-form">
          <div className="form-group">
            <label htmlFor="password-input">비밀번호를 입력하세요</label>
            <input
              type="password"
              id="password-input"
              value={passwordInput}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onConfirm()
                }
              }}
              placeholder="비밀번호 입력"
              autoFocus
            />
            {passwordError && (
              <div className="error-message" style={{ marginTop: '0.5rem' }}>
                {passwordError}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className="login-button"
            disabled={!passwordInput.trim() || isConfirming}
          >
            {isConfirming ? '확인 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordModal


