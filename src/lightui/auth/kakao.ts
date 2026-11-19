import { mockKakaoUser, type BandyUser } from '../../mocks/auth'

/**
 * 카카오 로그인.
 *
 * 바깥에서 쓰는 건 `signInWithKakao()` 하나뿐입니다. 지금은 목이고,
 * 나중에 Kakao JavaScript SDK + Firebase 커스텀 토큰으로 바꿀 때
 * **이 파일 안만** 고치면 화면 코드는 그대로 둬도 됩니다.
 *
 * 실제로 붙일 때 할 일:
 *   1. index.html 에 Kakao SDK 를 싣고 `Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY)`
 *   2. `Kakao.Auth.authorize` / `Kakao.API.request('/v2/user/me')`
 *   3. 받은 카카오 토큰을 서버로 보내 Firebase 커스텀 토큰을 받고 `signInWithCustomToken`
 */

export type KakaoFailure = 'cancelled' | 'failed'

export class KakaoSignInError extends Error {
  code: KakaoFailure
  constructor(code: KakaoFailure, message: string) {
    super(message)
    this.name = 'KakaoSignInError'
    this.code = code
  }
}

const KEY = 'bandy.lightui.user'

/**
 * MOCK: 성공 말고 다른 길도 한 번은 타 볼 수 있게 열어 둔 스위치.
 * 주소에 `?kakao=cancel` 또는 `?kakao=fail` 을 붙이면 그 경로로 갑니다.
 */
function mockOutcome(): KakaoFailure | 'ok' {
  if (typeof window === 'undefined') return 'ok'
  const v = new URLSearchParams(window.location.search).get('kakao')
  if (v === 'cancel') return 'cancelled'
  if (v === 'fail') return 'failed'
  return 'ok'
}

/** 저장된 로그인 — 없으면 null */
export function getSession(): BandyUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BandyUser) : null
  } catch {
    return null
  }
}

export function saveSession(user: BandyUser) {
  try {
    localStorage.setItem(KEY, JSON.stringify(user))
  } catch {
    /* 저장이 막혀도 이번 세션 동안은 동작합니다 */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}

/** 온보딩(학교·학과)이 아직 안 끝난 사용자인지 */
export function needsOnboarding(user: BandyUser) {
  return !user.school || !user.department
}

/**
 * 카카오로 로그인합니다.
 * 성공하면 사용자, 취소·실패면 `KakaoSignInError` 를 던집니다.
 */
export async function signInWithKakao(): Promise<BandyUser> {
  // MOCK: SDK 팝업 대신 잠깐 기다렸다가 결과를 돌려줍니다
  await new Promise((r) => setTimeout(r, 600))

  const outcome = mockOutcome()
  if (outcome === 'cancelled') {
    throw new KakaoSignInError('cancelled', '카카오 로그인을 취소했어요.')
  }
  if (outcome === 'failed') {
    throw new KakaoSignInError('failed', '카카오 로그인에 실패했어요. 잠시 뒤 다시 시도해 주세요.')
  }

  // MOCK: 실제로는 카카오 프로필 + Firebase 커스텀 토큰으로 만든 사용자
  const saved = getSession()
  const user = saved ?? { ...mockKakaoUser }
  saveSession(user)
  return user
}
