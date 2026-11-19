import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import Button from '../components/Button'
import Logo from '../components/Logo'
import { P } from '../paths'
import { KakaoSignInError, needsOnboarding, signInWithKakao } from '../auth/kakao'
import './S1Start.css'

/** S1 시작 · 로그인 — Figma 204:2 */
const S1Start = () => {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // MOCK: 지금은 가짜 사용자를 돌려줍니다 (src/lightui/auth/kakao.ts)
  const kakao = async () => {
    setError(null)
    setBusy(true)
    try {
      const user = await signInWithKakao()
      navigate(needsOnboarding(user) ? P.onboarding : P.home)
    } catch (e) {
      setError(e instanceof KakaoSignInError ? e.message : '로그인 중 문제가 생겼어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Phone>
      <div className="lui-body">
        <div className="s1">
          <div className="s1__top" />
          <div className="s1__brand">
            <Logo kind="mark" className="s1__mark" />
            <Logo kind="wordmark" className="s1__wordmark" alt="BANDY" />
            <p className="s1__lead">
              비어 있던 공연장이 무대가 되고,
              <br />
              교류한 동아리가 서로의 관객이 됩니다.
            </p>
          </div>

          <div className="s1__space" />

          <div className="s1__actions">
            {/* 규칙 1 — 기본 버튼 하나, 보조는 외곽선. Figma 가 평평하게 그려 두어 flat 입니다 */}
            <Button flat onClick={() => navigate(P.home)}>
              학교 이메일로 시작하기
            </Button>
            <Button variant="ghost" onClick={kakao} disabled={busy}>
              {busy ? '카카오 연결 중…' : '카카오로 시작하기'}
            </Button>
            {error && (
              <p className="s1__error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="s1__gap" />
          <p className="s1__terms">시작하면 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
        </div>
      </div>
    </Phone>
  )
}

export default S1Start
