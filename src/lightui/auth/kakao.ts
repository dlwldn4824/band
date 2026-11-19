import { mockKakaoUser, type BandyUser } from '../../mocks/auth'

/**
 * 카카오 로그인.
 *
 * 흐름은 이렇습니다.
 *   1. `signInWithKakao()` → Kakao SDK 의 `Kakao.Auth.authorize()` 가 카카오 동의 화면으로 보냅니다
 *   2. 카카오가 `/ui/auth/kakao?code=…` 로 돌려보냅니다
 *   3. 그 화면이 `completeKakaoSignIn(code)` 로 코드를 우리 서버에 넘깁니다
 *   4. 서버(`/api/auth/kakao`)가 토큰을 받아 프로필만 돌려줍니다 — 액세스 토큰은 브라우저로 오지 않습니다
 *
 * 토큰 요청에는 REST API 키와 클라이언트 시크릿이 필요해서 브라우저만으로는 끝낼 수 없습니다.
 * 그래서 3~4번이 있습니다.
 *
 * `VITE_KAKAO_JS_KEY` 가 없으면 예전처럼 목으로 동작합니다 — 키를 넣기 전에도 화면이 돌아가게.
 */

/** 카카오 JavaScript SDK (2026.11 기준 최신) */
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js'
const STATE_KEY = 'bandy.lightui.kakaoState'

interface KakaoSdk {
  init: (key: string) => void
  isInitialized: () => boolean
  Auth: { authorize: (o: { redirectUri: string; state?: string; scope?: string }) => void }
}
declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

export function kakaoJsKey(): string | undefined {
  const key = import.meta.env.VITE_KAKAO_JS_KEY
  return typeof key === 'string' && key.length > 0 ? key : undefined
}

/** 카카오가 돌아올 주소 — 카카오 개발자 콘솔에 이 값 그대로 등록해야 합니다 */
export function kakaoRedirectUri() {
  return `${window.location.origin}/ui/auth/kakao`
}

function loadSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(window.Kakao)
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SDK_SRC
    el.crossOrigin = 'anonymous'
    el.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('sdk_missing')))
    el.onerror = () => reject(new Error('sdk_load_failed'))
    document.head.appendChild(el)
  })
}

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
 *
 * 키가 있으면 카카오 동의 화면으로 **이동**하므로 이 함수는 끝나지 않습니다.
 * 키가 없으면 예전처럼 목 사용자를 돌려줍니다.
 */
export async function signInWithKakao(): Promise<BandyUser> {
  const key = kakaoJsKey()
  if (key) {
    const Kakao = await loadSdk()
    if (!Kakao.isInitialized()) Kakao.init(key)

    // 돌아왔을 때 우리가 보낸 요청이 맞는지 확인할 값
    const state = Math.random().toString(36).slice(2)
    try {
      sessionStorage.setItem(STATE_KEY, state)
    } catch {
      /* 저장이 막히면 state 검사만 건너뜁니다 */
    }

    Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri(), state })
    // 여기서 페이지가 카카오로 넘어갑니다
    return new Promise<BandyUser>(() => {})
  }

  // MOCK: 키가 없을 때만 — 잠깐 기다렸다가 결과를 돌려줍니다
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

/**
 * 카카오에서 돌아온 뒤 — 인가 코드를 서버에 넘겨 프로필을 받습니다.
 * 성공하면 저장까지 하고 사용자를 돌려줍니다.
 */
export async function completeKakaoSignIn(code: string, state?: string | null): Promise<BandyUser> {
  let expected: string | null = null
  try {
    expected = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
  } catch {
    /* 저장이 막혀 있었다면 검사를 건너뜁니다 */
  }
  if (expected && state && expected !== state) {
    throw new KakaoSignInError('failed', '로그인 요청이 확인되지 않았어요. 다시 시도해 주세요.')
  }

  let res: Response
  try {
    res = await fetch('/api/auth/kakao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: kakaoRedirectUri() }),
    })
  } catch {
    throw new KakaoSignInError('failed', '서버에 닿지 못했어요. 잠시 뒤 다시 시도해 주세요.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    if (data.error === 'kakao_not_configured') {
      throw new KakaoSignInError('failed', '서버에 카카오 키가 아직 없어요.')
    }
    throw new KakaoSignInError('failed', '카카오 로그인에 실패했어요. 잠시 뒤 다시 시도해 주세요.')
  }

  const saved = getSession()
  const user: BandyUser = {
    id: data.user.id,
    provider: 'kakao',
    nickname: data.user.nickname,
    // 학교·학과는 온보딩에서 받습니다. 이미 받아 둔 게 있으면 지키고요.
    school: saved?.school ?? '',
    department: saved?.department ?? '',
    initial: data.user.nickname.slice(0, 1),
    role: saved?.role ?? 'member',
  }
  saveSession(user)
  return user
}
