import { callApi } from './apiClient'
import type { Club, ClubCategory, ClubEvent, ClubSession } from '../types/bandy'

const CLUB_SESSION_KEY = 'bandyClubSession'

export interface ClubListResult {
  clubs: Club[]
  universities: string[]
  categories: ClubCategory[]
}

export async function listClubs(
  filters: { category?: string; university?: string; q?: string } = {}
): Promise<ClubListResult> {
  const res = await callApi<{
    ok?: boolean
    clubs?: Club[]
    universities?: string[]
    categories?: ClubCategory[]
  }>('/api/clubs', 'list', filters)

  return {
    clubs: res?.ok && Array.isArray(res.clubs) ? res.clubs : [],
    universities: res?.ok && Array.isArray(res.universities) ? res.universities : [],
    categories: res?.ok && Array.isArray(res.categories) ? res.categories : [],
  }
}

export interface ClubDetail {
  club: Club
  events: ClubEvent[]
  connectedClubs: Club[]
}

export async function getClub(clubId: string): Promise<ClubDetail | null> {
  const res = await callApi<{
    ok?: boolean
    club?: Club
    events?: ClubEvent[]
    connectedClubs?: Club[]
  }>('/api/clubs', 'get', { clubId })

  if (!res?.ok || !res.club) return null
  return {
    club: res.club,
    events: Array.isArray(res.events) ? res.events : [],
    connectedClubs: Array.isArray(res.connectedClubs) ? res.connectedClubs : [],
  }
}

/** 동아리 운영진 코드 확인 — 성공하면 세션을 로컬에 저장합니다. */
export async function verifyClubCode(
  clubId: string,
  manageCode: string
): Promise<{ ok: true; club: Club } | { ok: false; error: string }> {
  const res = await callApi<{ ok?: boolean; club?: Club; error?: string }>(
    '/api/clubs',
    'verify-code',
    { clubId, manageCode }
  )

  if (res?.ok && res.club) {
    saveClubSession({ clubId, clubName: res.club.name, manageCode })
    return { ok: true, club: res.club }
  }
  return { ok: false, error: res?.error || 'request_failed' }
}

export async function updateClubProfile(
  session: ClubSession,
  patch: Partial<
    Pick<Club, 'tagline' | 'intro' | 'tags' | 'instagram' | 'contactEmail' | 'memberCount' | 'openToExchange'>
  >
): Promise<Club | null> {
  const res = await callApi<{ ok?: boolean; club?: Club }>('/api/clubs', 'update-profile', {
    clubId: session.clubId,
    manageCode: session.manageCode,
    ...patch,
  })
  return res?.ok && res.club ? res.club : null
}

export function saveClubSession(session: ClubSession): void {
  try {
    localStorage.setItem(CLUB_SESSION_KEY, JSON.stringify(session))
  } catch {
    // 저장 실패 시 세션 없이 동작 (코드 재입력 필요)
  }
}

export function loadClubSession(): ClubSession | null {
  try {
    const raw = localStorage.getItem(CLUB_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClubSession
    if (!parsed?.clubId || !parsed?.manageCode) return null
    return parsed
  } catch {
    return null
  }
}

export function clearClubSession(): void {
  try {
    localStorage.removeItem(CLUB_SESSION_KEY)
  } catch {
    // noop
  }
}

/** 관리자 — 파일럿 시드 데이터 생성 */
export async function adminSeedDemo(overwrite = false): Promise<{
  ok: boolean
  clubsWritten?: number
  eventsWritten?: number
  connectionsWritten?: number
  manageCodes?: Record<string, string>
  error?: string
}> {
  const res = await callApi<{
    ok?: boolean
    clubsWritten?: number
    eventsWritten?: number
    connectionsWritten?: number
    manageCodes?: Record<string, string>
    error?: string
  }>('/api/clubs', 'seed-demo', { overwrite }, true)

  return { ok: res?.ok === true, ...res }
}

/** 관리자 — 특정 동아리의 운영진 코드 재발급 */
export async function adminResetManageCode(
  clubId: string
): Promise<{ ok: boolean; manageCode?: string; error?: string }> {
  const res = await callApi<{ ok?: boolean; manageCode?: string; error?: string }>(
    '/api/clubs',
    'reset-manage-code',
    { clubId },
    true
  )
  return { ok: res?.ok === true, manageCode: res?.manageCode, error: res?.error }
}
