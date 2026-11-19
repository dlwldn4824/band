/**
 * 카카오 로그인 — 인가 코드를 토큰으로 바꾸고 프로필만 돌려줍니다.
 *
 * 브라우저만으로는 끝낼 수 없는 단계입니다. 토큰 요청에는 REST API 키와
 * 클라이언트 시크릿이 필요한데, 둘 다 브라우저에 두면 안 되기 때문입니다.
 * 그래서 이 함수가 대신 받아 오고, 액세스 토큰은 서버 밖으로 내보내지 않습니다.
 *
 * 필요한 환경 변수 (Vercel > Settings > Environment Variables):
 *   KAKAO_REST_API_KEY   앱 > 앱 키 > REST API 키
 *   KAKAO_CLIENT_SECRET  앱 > 카카오 로그인 > 보안 > Client Secret (ON 이면 필수)
 */

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const ME_URL = 'https://kapi.kakao.com/v2/user/me'

/** 우리 쪽 주소로만 코드를 바꿔 줍니다 — 남의 redirect_uri 를 대신 처리하지 않게 */
function allowedRedirect(req, redirectUri) {
  if (typeof redirectUri !== 'string') return false
  if (!redirectUri.endsWith('/ui/auth/kakao')) return false
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (!host) return false
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origins = [`${proto}://${host}`, `http://${host}`, `https://${host}`]
  return origins.some((o) => redirectUri.startsWith(`${o}/`))
}

export async function handleKakaoAuthRequest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const restKey = process.env.KAKAO_REST_API_KEY
  if (!restKey) {
    // 아직 키를 넣지 않았으면 화면이 목 로그인으로 돌아가게 알려 줍니다
    return res.status(503).json({ ok: false, error: 'kakao_not_configured' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const { code, redirectUri } = body
  if (!code) return res.status(400).json({ ok: false, error: 'code_required' })
  if (!allowedRedirect(req, redirectUri)) {
    return res.status(400).json({ ok: false, error: 'redirect_uri_not_allowed' })
  }

  try {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: restKey,
      redirect_uri: redirectUri,
      code,
    })
    // 클라이언트 시크릿이 [ON] 이면 필수입니다
    if (process.env.KAKAO_CLIENT_SECRET) {
      form.set('client_secret', process.env.KAKAO_CLIENT_SECRET)
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: form,
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok || !token.access_token) {
      return res.status(502).json({
        ok: false,
        error: 'token_failed',
        detail: token.error_description || token.error || null,
      })
    }

    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const me = await meRes.json()
    if (!meRes.ok || !me.id) {
      return res.status(502).json({ ok: false, error: 'profile_failed' })
    }

    // 지금 쓰는 경로는 kakao_account.profile 쪽입니다 (properties.* 는 예전 경로)
    const profile = me.kakao_account?.profile ?? {}
    const nickname = profile.nickname || me.properties?.nickname || '밴디 사용자'

    // 액세스 토큰은 일부러 돌려주지 않습니다 — 브라우저에 있을 이유가 없습니다
    return res.status(200).json({
      ok: true,
      user: {
        id: `kakao_${me.id}`,
        nickname,
        profileImage: profile.profile_image_url || me.properties?.profile_image || null,
      },
    })
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'kakao_unreachable', detail: String(e) })
  }
}
