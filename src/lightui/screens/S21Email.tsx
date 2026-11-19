import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { EmailSignInError, isEmail, sendEmailCode, verifyEmailCode } from '../auth/email'
import { needsOnboarding, saveSession } from '../auth/kakao'
import { readSide } from '../auth/side'
import './S21Email.css'

/**
 * S21 이메일로 시작하기.
 *
 * 카카오 말고 하나가 더 있어야 하는 이유는 auth/email.ts 에 적어 뒀습니다 —
 * 요약하면 애플 심사자가 카카오 계정이 없고, 소셜 로그인만 두면 가이드라인
 * 4.8 에 걸립니다.
 *
 * MOCK: 메일이 실제로 가지 않아서 코드를 화면에 띄웁니다. 서버가 붙으면
 * 그 자리가 사라집니다.
 */
const S21Email = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const side = readSide(params.get('as'))

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [mockCode, setMockCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await sendEmailCode(email)
      setSentTo(email.trim().toLowerCase())
      setMockCode(res.mockCode)
    } catch (e) {
      setError(e instanceof EmailSignInError ? e.message : '코드를 보내지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!sentTo) return
    setError(null)
    setBusy(true)
    try {
      const user = await verifyEmailCode(sentTo, code)
      saveSession(user)
      navigate(needsOnboarding(user) ? P.onboarding(side) : P.home)
    } catch (e) {
      setError(e instanceof EmailSignInError ? e.message : '확인하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Phone>
      <TopBar title="이메일로 시작하기" />
      <div className="lui-body">
        <div className="s21">
          <p className="s21__lead">
            {sentTo ? (
              <>
                <b>{sentTo}</b> 로 6자리 코드를 보냈어요.
              </>
            ) : (
              '쓰시는 이메일 주소를 넣어 주세요. 6자리 코드를 보내 드려요.'
            )}
          </p>

          <label className="lui-field">
            <span className="lui-field__label">이메일</span>
            <input
              className="lui-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              disabled={!!sentTo}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {sentTo && (
            <>
              <div className="s21__gap" />
              <label className="lui-field">
                <span className="lui-field__label">인증 코드</span>
                <input
                  className="lui-input s21__code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </label>

              {/* MOCK: 메일이 실제로 가지 않으니 여기 띄웁니다. 서버가 붙으면 사라집니다. */}
              {mockCode && (
                <p className="s21__mock">
                  메일 발송은 아직 붙지 않았습니다. 이번 코드는 <b>{mockCode}</b> 입니다.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="s21__error" role="alert">
              {error}
            </p>
          )}

          <div className="s21__space" />

          {sentTo ? (
            <>
              <Button block disabled={busy || code.length !== 6} onClick={verify}>
                {busy ? '확인 중…' : '확인'}
              </Button>
              <button
                type="button"
                className="s21__again"
                onClick={() => {
                  setSentTo(null)
                  setMockCode(null)
                  setCode('')
                  setError(null)
                }}
              >
                다른 주소로 받기
              </button>
            </>
          ) : (
            <Button block disabled={busy || !isEmail(email)} onClick={send}>
              {busy ? '보내는 중…' : '인증 코드 받기'}
            </Button>
          )}

          <p className="s21__terms">
            시작하면{' '}
            <button type="button" onClick={() => navigate(P.legal('terms'))}>
              이용약관
            </button>
            과{' '}
            <button type="button" onClick={() => navigate(P.legal('privacy'))}>
              개인정보 처리방침
            </button>
            에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </Phone>
  )
}

export default S21Email
