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

function getAdminApiToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
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

export async function getGuestStatus(phone: string): Promise<PublicGuest | null> {
  const result = await callGuestsApi<{ ok: boolean; guest?: PublicGuest }>('status', { phone })
  return result?.ok && result.guest ? result.guest : null
}

export interface GuestCheckResult {
  exists: boolean
  isDeleted: boolean
  name?: string
  paymentConfirmed?: boolean
}

export async function checkGuest(phone: string): Promise<GuestCheckResult> {
  const result = await callGuestsApi<GuestCheckResult>('check', { phone })
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

export async function adminListGuests(): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('list', {}, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
}

export async function adminUploadGuests(guests: Guest[]): Promise<Guest[] | null> {
  const result = await callGuestsApi<AdminGuestsResponse>('upload', { guests }, true)
  return result?.ok && Array.isArray(result.guests) ? result.guests : null
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
