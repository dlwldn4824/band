import { callApi } from './apiClient'
import type {
  Club,
  ClubEvent,
  ClubSession,
  EventReservation,
  PlatformStats,
  ReservationSummary,
} from '../types/bandy'

/** 타입 별칭이라야 callApi 의 Record<string, unknown> 에 그대로 전달됩니다. */
export type EventListFilters = {
  category?: string
  clubId?: string
  university?: string
  q?: string
  includePast?: boolean
}

export async function listClubEvents(filters: EventListFilters = {}): Promise<ClubEvent[]> {
  const res = await callApi<{ ok?: boolean; events?: ClubEvent[] }>(
    '/api/club-events',
    'list',
    filters
  )
  return res?.ok && Array.isArray(res.events) ? res.events : []
}

export interface EventDetail {
  event: ClubEvent
  club: Pick<Club, 'id' | 'name' | 'university' | 'category' | 'emblem' | 'accent' | 'tagline'> | null
}

export async function getClubEvent(eventId: string): Promise<EventDetail | null> {
  const res = await callApi<{ ok?: boolean; event?: ClubEvent; club?: EventDetail['club'] }>(
    '/api/club-events',
    'get',
    { eventId }
  )
  if (!res?.ok || !res.event) return null
  return { event: res.event, club: res.club ?? null }
}

export type ReserveResult =
  | { ok: true; reservation: EventReservation; seatsLeft: number | null; updated: boolean }
  | { ok: false; error: string; seatsLeft: number | null }

/**
 * 행사 예약.
 * sourceClubId 를 함께 보내면 서버가 두 동아리의 교류 관계를 확인해
 * "교류를 통해 유입된 관객"으로 표시합니다.
 */
export async function reserveClubEvent(params: {
  eventId: string
  name: string
  phone: string
  headcount?: number
  sourceClubId?: string
}): Promise<ReserveResult> {
  const res = await callApi<{
    ok?: boolean
    reservation?: EventReservation
    seatsLeft?: number | null
    updated?: boolean
    error?: string
  }>('/api/club-events', 'reserve', params)

  if (res?.ok && res.reservation) {
    return {
      ok: true,
      reservation: res.reservation,
      seatsLeft: res.seatsLeft ?? null,
      updated: res.updated === true,
    }
  }
  return { ok: false, error: res?.error || 'request_failed', seatsLeft: res?.seatsLeft ?? null }
}

export async function listMyReservations(
  name: string,
  phone: string
): Promise<EventReservation[]> {
  const res = await callApi<{ ok?: boolean; reservations?: EventReservation[] }>(
    '/api/club-events',
    'my-reservations',
    { name, phone }
  )
  return res?.ok && Array.isArray(res.reservations) ? res.reservations : []
}

export async function cancelReservation(params: {
  eventId: string
  name: string
  phone: string
}): Promise<boolean> {
  const res = await callApi<{ ok?: boolean }>('/api/club-events', 'cancel', params)
  return res?.ok === true
}

export interface ClubReservationsResult {
  reservations: EventReservation[]
  summary: ReservationSummary | null
}

export async function listClubReservations(
  session: ClubSession
): Promise<ClubReservationsResult> {
  const res = await callApi<{
    ok?: boolean
    reservations?: EventReservation[]
    summary?: ReservationSummary
  }>('/api/club-events', 'club-reservations', {
    clubId: session.clubId,
    manageCode: session.manageCode,
  })

  return {
    reservations: res?.ok && Array.isArray(res.reservations) ? res.reservations : [],
    summary: res?.ok ? res.summary ?? null : null,
  }
}

export async function markReservationAttended(
  session: ClubSession,
  reservationId: string,
  attended: boolean
): Promise<EventReservation | null> {
  const res = await callApi<{ ok?: boolean; reservation?: EventReservation }>(
    '/api/club-events',
    'mark-attended',
    {
      clubId: session.clubId,
      manageCode: session.manageCode,
      reservationId,
      attended,
    }
  )
  return res?.ok && res.reservation ? res.reservation : null
}

export interface EventDraft {
  eventId?: string
  title: string
  category?: string
  description?: string
  /** 밀리초 timestamp */
  startsAt: number
  doorsAt?: string
  venueName?: string
  venueAddress?: string
  price?: number
  capacity?: number
  poster?: string
  tags?: string[]
  hubPath?: string
  status?: 'upcoming' | 'closed'
}

export async function upsertClubEvent(
  session: ClubSession,
  draft: EventDraft
): Promise<{ ok: boolean; event?: ClubEvent; error?: string }> {
  const res = await callApi<{ ok?: boolean; event?: ClubEvent; error?: string }>(
    '/api/club-events',
    'club-upsert-event',
    {
      clubId: session.clubId,
      manageCode: session.manageCode,
      ...draft,
    }
  )
  return { ok: res?.ok === true, event: res?.event, error: res?.error }
}

export async function deleteClubEvent(session: ClubSession, eventId: string): Promise<boolean> {
  const res = await callApi<{ ok?: boolean }>('/api/club-events', 'club-delete-event', {
    clubId: session.clubId,
    manageCode: session.manageCode,
    eventId,
  })
  return res?.ok === true
}

/** 관리자 — 파일럿 성과 지표 */
export async function adminPlatformStats(): Promise<PlatformStats | null> {
  const res = await callApi<{ ok?: boolean; stats?: PlatformStats }>(
    '/api/club-events',
    'stats',
    {},
    true
  )
  return res?.ok && res.stats ? res.stats : null
}

export async function adminAllReservations(): Promise<EventReservation[]> {
  const res = await callApi<{ ok?: boolean; reservations?: EventReservation[] }>(
    '/api/club-events',
    'all-reservations',
    {},
    true
  )
  return res?.ok && Array.isArray(res.reservations) ? res.reservations : []
}
