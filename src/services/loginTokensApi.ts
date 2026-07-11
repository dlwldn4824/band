import { callApi } from './apiClient'

export async function resolveLoginToken(token: string) {
  const res = await callApi<{ ok: boolean; name?: string; phone?: string; error?: string }>(
    '/api/login-tokens',
    'resolve',
    { token }
  )
  if (!res?.ok || !res.name || !res.phone) {
    return { ok: false as const, error: res?.error || 'not_found' }
  }
  return { ok: true as const, name: res.name, phone: res.phone }
}

/** 본인 확인 후 불투명 토큰 발급 (일반 사용자) */
export async function createLoginToken(name: string, phone: string) {
  const res = await callApi<{ ok: boolean; token?: string; error?: string }>(
    '/api/login-tokens',
    'create',
    { name, phone }
  )
  if (!res?.ok || !res.token) return null
  return res.token
}

/** 관리자용 토큰 발급 */
export async function adminCreateLoginToken(name: string, phone: string) {
  const res = await callApi<{ ok: boolean; token?: string; error?: string }>(
    '/api/login-tokens',
    'create-admin',
    { name, phone },
    true
  )
  if (!res?.ok || !res.token) return null
  return res.token
}

export function buildPersonalLoginPath(token: string): string {
  return `/t/${token}`
}

export function buildPersonalLoginLink(token: string): string {
  return `${window.location.origin}/t/${token}`
}
