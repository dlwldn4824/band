import type { Guest } from '../contexts/DataContext'

export interface PublicGuest {
  name: string
  phone: string
  entryNumber: number | null
  checkedIn: boolean
  checkedInAt: number | null
  paymentConfirmed: boolean
  isWalkIn: boolean
  ticketReceived: boolean
  bookedAt: number | null
}

const ADMIN_TOKEN_KEY = 'adminApiToken'

export function setAdminApiToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminApiToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function hasAdminApiToken(): boolean {
  return !!localStorage.getItem(ADMIN_TOKEN_KEY)
}

function getAdminApiToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

function getAdminApiErrorMessage(error?: string): string {
  if (error === 'server_not_configured') {
    return '서버 API가 설정되지 않았습니다. Vercel에 FIREBASE_SERVICE_ACCOUNT를 추가한 뒤 재배포해주세요.'
  }
  if (error === 'firestore_quota_exceeded') {
    return 'Firebase 읽기/쓰기 할당량이 초과되었습니다. Firebase 콘솔에서 사용량을 확인하거나 잠시 후 다시 시도해주세요.'
  }
  if (error === 'unauthorized' || !hasAdminApiToken()) {
    return '인증이 만료되었습니다. /manage를 새로고침하고 운영 관리 비밀번호를 다시 입력해주세요.'
  }
  return '게스트 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

export function getGuestsLoadErrorMessage(error?: string): string {
  if (error === 'firestore_quota_exceeded') {
    return 'Firebase 할당량 초과로 게스트 목록을 불러오지 못했습니다. 데이터가 삭제된 것은 아닙니다. Firebase 콘솔 → Usage에서 확인해주세요.'
  }
  if (error === 'server_not_configured') {
    return '서버 API가 설정되지 않았습니다. Vercel에 FIREBASE_SERVICE_ACCOUNT를 추가한 뒤 재배포해주세요.'
  }
  if (error === 'unauthorized') {
    return '인증이 만료되었습니다. 운영진 로그인 또는 /manage 비밀번호를 다시 입력해주세요.'
  }
  return '게스트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}

async function callGuestsApi<T>(action: string, body: Record<string, unknown> = {}, admin = false): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (admin) {
      const token = getAdminApiToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/guests', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...body }),
    })

    if (!res.ok && res.status !== 200) {
      // 4xx/5xx라도 본문에 정보가 있을 수 있음
      try {
        return (await res.json()) as T
      } catch {
        return null
      }
    }

    return (await res.json()) as T
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 공개 API (일반 사용자)
// ---------------------------------------------------------------------------

export interface GuestLoginResult {
  ok: boolean
  reason?: 'empty_guests' | 'not_found' | 'deleted' | 'invalid_phone' | 'name_mismatch'
  guest?: PublicGuest
  didCheckInNow?: boolean
}

export async function guestLogin(phone: string, name?: string): Promise<GuestLoginResult> {
  const body: Record<string, unknown> = { phone }
  if (name) body.name = name
  const result = await callGuestsApi<GuestLoginResult>('login', body)
  return result ?? { ok: false, reason: 'not_found' }
}

export async function getGuestStatus(phone: string, name?: string): Promise<PublicGuest | null> {
  const body: Record<string, unknown> = { phone }
  if (name) body.name = name
  const result = await callGuestsApi<{ ok: boolean; guest?: PublicGuest }>('status', body)
  return result?.ok && result.guest ? result.guest : null
}

export interface GuestCheckResult {
  exists: boolean
  isDeleted: boolean
  exactMatch?: boolean
  name?: string
  paymentConfirmed?: boolean
}

export async function checkGuest(phone: string, name?: string): Promise<GuestCheckResult> {
  const body: Record<string, unknown> = { phone }
  if (name) body.name = name
  const result = await callGuestsApi<GuestCheckResult>('check', body)
  return result ?? { exists: false, isDeleted: false }
}

export interface RegisterGuestResult {
  success: boolean
  message?: string
  guest?: PublicGuest
}

export async function registerGuest(params: {
  name: string
  phone: string
  isWalkIn?: boolean
  email?: string
  source?: string
  bookedAt?: number
  confirmPayment?: boolean
}): Promise<RegisterGuestResult> {
  const result = await callGuestsApi<RegisterGuestResult>('register', { ...params })
  return result ?? { success: false, message: '등록에 실패했습니다. 다시 시도해주세요.' }
}

export async function onsitePayment(params: { name: string; phone: string }): Promise<RegisterGuestResult> {
  const result = await callGuestsApi<RegisterGuestResult>('onsite-payment', { ...params })
  return result ?? { success: false, message: '처리에 실패했습니다. 다시 시도해주세요.' }
}

// ---------------------------------------------------------------------------
// 관리자 API (Bearer 토큰 필요)
// ---------------------------------------------------------------------------

interface AdminGuestsResponse {
  ok: boolean
  guests?: Guest[]
  removedCount?: number
  fixedCount?: number
  message?: string
  error?: string
}

export interface AdminListGuestsResult {
  guests: Guest[] | null
  error?: string
}

export async function adminListGuests(): Promise<AdminListGuestsResult> {
  const result = await callGuestsApi<AdminGuestsResponse>('list', {}, true)
  if (result?.ok && Array.isArray(result.guests)) {
    return { guests: result.guests }
  }
  return { guests: null, error: result?.error ?? 'unknown' }
}

export async function adminUploadGuests(guests: Guest[]): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('upload', { guests }, true)
  if (result?.ok && Array.isArray(result.guests)) return result.guests
  throw new Error(getAdminApiErrorMessage(result?.error))
}

export async function adminTogglePayment(phone: string): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('toggle-payment', { phone }, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
}

export async function adminToggleTicket(phone: string): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('toggle-ticket', { phone }, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
}

export async function adminDeleteGuest(phone: string): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('delete', { phone }, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
}

export async function adminUpdateGuest(phone: string, guest: Guest): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('update', { phone, guest }, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
}

export async function adminClearGuests(): Promise<boolean> {
  const result = await callGuestsApi<AdminGuestsResponse>('clear', {}, true)
  return result?.ok === true
}

export async function adminDeduplicateGuests(): Promise<{ ok: boolean; removedCount: number; guests: Guest[] }> {
  const result = await callGuestsApi<AdminGuestsResponse>('deduplicate', {}, true)
  return {
    ok: result?.ok === true,
    removedCount: result?.removedCount ?? 0,
    guests: Array.isArray(result?.guests) ? result!.guests! : [],
  }
}

export async function adminFixGuestPhones(): Promise<{ ok: boolean; fixedCount: number; guests: Guest[] }> {
  const result = await callGuestsApi<AdminGuestsResponse>('fix-phones', {}, true)
  return {
    ok: result?.ok === true,
    fixedCount: result?.fixedCount ?? 0,
    guests: Array.isArray(result?.guests) ? result!.guests! : [],
  }
}
