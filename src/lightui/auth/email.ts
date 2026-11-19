import { mockKakaoUser, type BandyUser } from '../../mocks/auth'

/**
 * 이메일 로그인.
 *
 * 카카오 말고 하나가 더 필요해서 만들었습니다. 이유가 둘입니다.
 *
 *  1. 애플 심사자는 카카오 계정이 없습니다. 카카오뿐이면 로그인 화면에서
 *     막혀서 "기능이 동작하지 않음" 으로 떨어집니다 (가이드라인 2.1).
 *  2. 소셜 로그인으로 계정을 만들게 하면 애플은 같은 수준의 다른 로그인을
 *     하나 더 두라고 요구합니다 (가이드라인 4.8). 이름과 이메일만 받고,
 *     광고용으로 행동을 모으지 않아야 합니다 — 이 로그인이 그 조건입니다.
 *
 * MOCK: 지금은 서버가 없어서 코드를 브라우저가 만들고 브라우저가 확인합니다.
 * 실제로는 서버가 메일을 보내고 서버가 맞춰 봐야 합니다. 지금 구조로는
 * 코드를 아는 척만 하면 누구나 들어올 수 있습니다.
 */

const PENDING_KEY = 'bandy.lightui.emailCode'

export class EmailSignInError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

interface Pending {
  email: string
  code: string
  at: number
}

/** 코드가 유효한 시간 — 10분 */
const TTL = 10 * 60 * 1000

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Pending
    if (Date.now() - p.at > TTL) return null
    return p
  } catch {
    return null
  }
}

/**
 * 인증 코드를 보냅니다.
 *
 * MOCK 이라 메일이 실제로 가지 않습니다. 그래서 만든 코드를 그대로 돌려줘서
 * 화면에 띄웁니다 — 키 없이도 흐름을 끝까지 볼 수 있어야 하고, 심사자도
 * 이 화면만 보고 들어올 수 있어야 합니다.
 */
export async function sendEmailCode(email: string): Promise<{ sent: true; mockCode: string }> {
  const addr = email.trim().toLowerCase()
  if (!isEmail(addr)) throw new EmailSignInError('이메일 주소를 다시 확인해 주세요.')

  await new Promise((r) => setTimeout(r, 600))

  const code = String(Math.floor(100000 + Math.random() * 900000))
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: addr, code, at: Date.now() }))
  } catch {
    /* 저장이 막혀도 아래에서 코드를 화면에 보여 주므로 흐름은 이어집니다 */
  }

  // TODO: 서버가 메일을 보내고 코드를 들고 있어야 합니다.
  // 지금처럼 브라우저가 코드를 쥐고 있으면 아무나 들어올 수 있습니다.
  return { sent: true, mockCode: code }
}

export async function verifyEmailCode(email: string, code: string): Promise<BandyUser> {
  const addr = email.trim().toLowerCase()
  const entered = code.trim()
  if (entered.length !== 6) throw new EmailSignInError('6자리 숫자를 넣어 주세요.')

  await new Promise((r) => setTimeout(r, 500))

  const pending = readPending()
  if (!pending || pending.email !== addr) {
    throw new EmailSignInError('코드가 만료됐어요. 다시 받아 주세요.')
  }
  if (pending.code !== entered) {
    throw new EmailSignInError('코드가 맞지 않아요.')
  }

  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* 지우지 못해도 TTL 이 지나면 무효가 됩니다 */
  }

  // 이름은 가입 다음 단계(온보딩)에서 받습니다 — 여기서는 이메일만 압니다
  return { ...mockKakaoUser, id: `email:${addr}`, provider: 'email', email: addr, nickname: '' }
}
