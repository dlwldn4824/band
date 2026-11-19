import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { KakaoSignInError, completeKakaoSignIn, needsOnboarding } from '../auth/kakao'
import { recallSide } from '../auth/side'
import './S1cKakaoReturn.css'

/**
 * 카카오에서 돌아오는 자리 — `/ui/auth/kakao?code=…`
 *
 * 화면이라기보다 거쳐 가는 곳입니다. 코드를 서버에 넘겨 프로필을 받고,
 * 학교·학과가 없으면 온보딩으로, 있으면 홈으로 보냅니다.
 * 실패하면 여기서 멈추고 왜 그런지 말합니다 — 조용히 시작 화면으로 되돌리지 않습니다.
 */
const S1cKakaoReturn = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  // React 18 개발 모드는 effect 를 두 번 돌립니다. 인가 코드는 한 번만 쓸 수 있습니다.
  const used = useRef(false)
  // 카카오는 ?as= 를 돌려주지 않아서, 고를 때 적어 둔 것을 읽습니다
  const side = recallSide()

  useEffect(() => {
    if (used.current) return
    used.current = true

    const code = params.get('code')
    const kakaoError = params.get('error')

    if (kakaoError) {
      setError(
        kakaoError === 'access_denied'
          ? '카카오 로그인을 취소했어요.'
          : (params.get('error_description') ?? '카카오 로그인에 실패했어요.'),
      )
      return
    }
    if (!code) {
      setError('카카오에서 받은 정보가 없어요.')
      return
    }

    completeKakaoSignIn(code, params.get('state'))
      .then((user) => {
        navigate(needsOnboarding(user) ? P.onboarding(side) : P.home, { replace: true })
      })
      .catch((e) => {
        setError(e instanceof KakaoSignInError ? e.message : '카카오 로그인에 실패했어요.')
      })
  }, [navigate, params])

  return (
    <Phone>
      <TopBar title="카카오 로그인" back={P.start()} />
      <div className="lui-body">
        <div className="kret">
          {error ? (
            <>
              <p className="kret__title">로그인하지 못했어요</p>
              <p className="kret__sub">{error}</p>
            </>
          ) : (
            <>
              <p className="kret__title">카카오에서 돌아오는 중…</p>
              <p className="kret__sub">잠깐만 기다려 주세요.</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="lui-bottombar">
          <Button block onClick={() => navigate(P.start(), { replace: true })}>
            다시 시도하기
          </Button>
        </div>
      )}
    </Phone>
  )
}

export default S1cKakaoReturn
