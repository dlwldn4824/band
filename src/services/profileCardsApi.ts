import { callApi } from './apiClient'
import type { ProfileCard, ProfileExchange } from '../types/bandy'

/** 타입 별칭이라야 callApi 의 Record<string, unknown> 에 그대로 전달됩니다. */
export type ProfileCardDraft = {
  name: string
  phone: string
  nickname?: string
  clubId?: string
  university?: string
  bio?: string
  interests?: string[]
  instagram?: string
  shareInstagram?: boolean
  sharePhone?: boolean
}

export async function upsertProfileCard(
  draft: ProfileCardDraft
): Promise<{ ok: boolean; card?: ProfileCard; error?: string }> {
  const res = await callApi<{ ok?: boolean; card?: ProfileCard; error?: string }>(
    '/api/profile-cards',
    'upsert',
    draft
  )
  return { ok: res?.ok === true, card: res?.card, error: res?.error }
}

export async function getMyProfileCard(name: string, phone: string): Promise<ProfileCard | null> {
  const res = await callApi<{ ok?: boolean; card?: ProfileCard | null }>(
    '/api/profile-cards',
    'my-card',
    { name, phone }
  )
  return res?.ok ? res.card ?? null : null
}

/** 공유 코드로 상대 카드 조회 — 동의하지 않은 연락처는 빈 값으로 옵니다. */
export async function getCardByShareCode(
  shareCode: string
): Promise<{ ok: boolean; card?: ProfileCard; error?: string }> {
  const res = await callApi<{ ok?: boolean; card?: ProfileCard; error?: string }>(
    '/api/profile-cards',
    'get-by-code',
    { shareCode }
  )
  return { ok: res?.ok === true, card: res?.card, error: res?.error }
}

export async function exchangeProfileCard(params: {
  name: string
  phone: string
  shareCode: string
  eventId?: string
}): Promise<{ ok: boolean; card?: ProfileCard; alreadyExchanged?: boolean; error?: string }> {
  const res = await callApi<{
    ok?: boolean
    card?: ProfileCard
    alreadyExchanged?: boolean
    error?: string
  }>('/api/profile-cards', 'exchange', params)

  return {
    ok: res?.ok === true,
    card: res?.card,
    alreadyExchanged: res?.alreadyExchanged === true,
    error: res?.error,
  }
}

export async function listMyExchanges(name: string, phone: string): Promise<ProfileExchange[]> {
  const res = await callApi<{ ok?: boolean; exchanges?: ProfileExchange[] }>(
    '/api/profile-cards',
    'my-exchanges',
    { name, phone }
  )
  return res?.ok && Array.isArray(res.exchanges) ? res.exchanges : []
}

/** 카드 공유 링크 — NFC 태그·QR·링크 공유 모두 같은 URL을 씁니다. */
export function cardShareUrl(shareCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/card/${shareCode}`
}

/**
 * Web NFC 지원 여부.
 * 미지원 기기에서는 QR·링크 공유로 자동 대체합니다.
 */
export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

export function profileCardErrorMessage(error?: string): string {
  switch (error) {
    case 'card_not_found':
      return '해당 코드의 프로필 카드를 찾을 수 없습니다.'
    case 'card_required':
      return '먼저 내 프로필 카드를 만들어 주세요.'
    case 'self_exchange':
      return '내 카드와는 교환할 수 없습니다.'
    case 'invalid_identity':
      return '이름과 연락처를 확인해 주세요.'
    case 'rate_limited':
      return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'
    case 'server_not_configured':
      return '서버가 아직 설정되지 않았습니다.'
    default:
      return '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
