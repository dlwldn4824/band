import { callApi } from './apiClient'
import type { ClubConnection, ClubSession, ConnectionSummary } from '../types/bandy'

/** 교류 신청 — 신청하는 동아리의 운영진 코드가 필요합니다. */
export async function requestConnection(
  session: ClubSession,
  params: { toClubId: string; message: string; requesterName?: string; requesterContact?: string }
): Promise<{ ok: boolean; connection?: ClubConnection; error?: string }> {
  const res = await callApi<{ ok?: boolean; connection?: ClubConnection; error?: string }>(
    '/api/club-connections',
    'request',
    {
      fromClubId: session.clubId,
      manageCode: session.manageCode,
      ...params,
    }
  )
  return { ok: res?.ok === true, connection: res?.connection, error: res?.error }
}

export interface ConnectionInbox {
  received: ClubConnection[]
  sent: ClubConnection[]
  summary: ConnectionSummary | null
}

export async function loadConnectionInbox(session: ClubSession): Promise<ConnectionInbox> {
  const res = await callApi<{
    ok?: boolean
    received?: ClubConnection[]
    sent?: ClubConnection[]
    summary?: ConnectionSummary
  }>('/api/club-connections', 'inbox', {
    clubId: session.clubId,
    manageCode: session.manageCode,
  })

  return {
    received: res?.ok && Array.isArray(res.received) ? res.received : [],
    sent: res?.ok && Array.isArray(res.sent) ? res.sent : [],
    summary: res?.ok ? res.summary ?? null : null,
  }
}

export async function respondToConnection(
  session: ClubSession,
  connectionId: string,
  decision: 'accept' | 'decline'
): Promise<{ ok: boolean; connection?: ClubConnection; error?: string }> {
  const res = await callApi<{ ok?: boolean; connection?: ClubConnection; error?: string }>(
    '/api/club-connections',
    'respond',
    {
      clubId: session.clubId,
      manageCode: session.manageCode,
      connectionId,
      decision,
    }
  )
  return { ok: res?.ok === true, connection: res?.connection, error: res?.error }
}

export async function withdrawConnection(
  session: ClubSession,
  connectionId: string
): Promise<boolean> {
  const res = await callApi<{ ok?: boolean }>('/api/club-connections', 'withdraw', {
    clubId: session.clubId,
    manageCode: session.manageCode,
    connectionId,
  })
  return res?.ok === true
}

/** 관리자 — 전체 교류 현황 */
export async function adminListConnections(): Promise<ClubConnection[]> {
  const res = await callApi<{ ok?: boolean; connections?: ClubConnection[] }>(
    '/api/club-connections',
    'list-all',
    {},
    true
  )
  return res?.ok && Array.isArray(res.connections) ? res.connections : []
}

/** 교류 신청 실패 사유를 사용자에게 보여줄 문구로 */
export function connectionErrorMessage(error?: string): string {
  switch (error) {
    case 'invalid_manage_code':
      return '동아리 운영진 코드가 올바르지 않습니다.'
    case 'already_connected':
      return '이미 교류 중인 동아리입니다.'
    case 'already_requested':
      return '이미 신청한 교류가 응답을 기다리고 있습니다.'
    case 'not_open_to_exchange':
      return '상대 동아리가 현재 교류 신청을 받지 않습니다.'
    case 'message_too_short':
      return '소개 메시지를 10자 이상 적어 주세요.'
    case 'same_club':
      return '같은 동아리에는 교류를 신청할 수 없습니다.'
    case 'club_not_found':
      return '동아리를 찾을 수 없습니다.'
    case 'rate_limited':
      return '신청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'
    case 'server_not_configured':
      return '서버가 아직 설정되지 않았습니다.'
    default:
      return '교류 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
