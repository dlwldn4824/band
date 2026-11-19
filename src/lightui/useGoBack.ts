import { useLocation, useNavigate } from 'react-router-dom'
import { P } from './paths'

/**
 * 뒤로가기.
 *
 * `navigate(-1)` 만 쓰면 URL 로 바로 들어온 화면에서는 돌아갈 데가 없어 아무 일도
 * 일어나지 않거나, 엉뚱한 직전 페이지로 튑니다. 라우터가 쌓은 기록이 없으면
 * (`location.key === 'default'`) 정해 둔 곳으로 보냅니다.
 */
export function useGoBack(fallback: string = P.home) {
  const navigate = useNavigate()
  const location = useLocation()

  return (to?: string | false) => {
    if (typeof to === 'string') {
      navigate(to)
      return
    }
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }
}
