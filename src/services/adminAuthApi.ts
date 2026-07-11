import { setAdminApiToken } from './guestsApi'

export type AdminCodeType = 'login' | 'action'

export type VerifyAdminCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'not_configured' | 'network' }

export async function verifyAdminCode(
  type: AdminCodeType,
  code: string
): Promise<boolean> {
  const result = await verifyAdminCodeDetailed(type, code)
  return result.ok
}

export async function verifyAdminCodeDetailed(
  type: AdminCodeType,
  code: string
): Promise<VerifyAdminCodeResult> {
  try {
    const res = await fetch('/api/verify-admin-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, code }),
    })

    if (res.status === 429) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (res.status === 503) {
      return { ok: false, reason: 'not_configured' }
    }

    if (!res.ok) {
      return { ok: false, reason: 'invalid' }
    }

    const data = (await res.json()) as { ok?: boolean; token?: string; error?: string }
    if (data.error === 'too_many_attempts') {
      return { ok: false, reason: 'rate_limited' }
    }
    if (data.error === 'not_configured') {
      return { ok: false, reason: 'not_configured' }
    }
    if (data.ok === true && data.token) {
      setAdminApiToken(data.token)
      return { ok: true }
    }
    if (data.ok === true) {
      return { ok: true }
    }
    return { ok: false, reason: 'invalid' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

export function verifyAdminCodeErrorMessage(
  reason: 'invalid' | 'rate_limited' | 'not_configured' | 'network'
): string {
  switch (reason) {
    case 'rate_limited':
      return '시도 횟수를 초과했습니다. 15분 뒤에 다시 시도해주세요.'
    case 'not_configured':
      return '서버 API 설정이 필요합니다. Vercel 환경변수를 확인해주세요.'
    case 'network':
      return '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    default:
      return '올바른 코드를 입력해주세요.'
  }
}
