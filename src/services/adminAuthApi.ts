import { setAdminApiToken } from './guestsApi'

export type AdminCodeType = 'login' | 'action'

export async function verifyAdminCode(type: AdminCodeType, code: string): Promise<boolean> {
  try {
    const res = await fetch('/api/verify-admin-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, code }),
    })

    if (!res.ok) return false

    const data = (await res.json()) as { ok?: boolean; token?: string }
    if (data.ok === true && data.token) {
      // 관리자 게스트 API 호출용 토큰 저장
      setAdminApiToken(data.token)
    }
    return data.ok === true
  } catch {
    return false
  }
}
