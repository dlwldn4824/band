/**
 * BANDY 플랫폼 레이어 공통 유틸
 *
 * 단일 공연 운영(guests_v2 · performanceData)과 분리된,
 * 다중 동아리 · 다중 행사 · 교류 · 현장 프로필 도메인을 다룹니다.
 */

import crypto from 'crypto'

export const CLUBS_COLLECTION = 'clubs'
export const CLUB_EVENTS_COLLECTION = 'clubEvents'
export const CLUB_CONNECTIONS_COLLECTION = 'clubConnections'
export const EVENT_RESERVATIONS_COLLECTION = 'eventReservations'
export const PROFILE_CARDS_COLLECTION = 'profileCards'
export const PROFILE_EXCHANGES_COLLECTION = 'profileExchanges'

/** 분야 — 탐색 필터와 동아리·행사 분류의 단일 소스 */
export const CLUB_CATEGORIES = [
  { id: 'band', label: '밴드' },
  { id: 'dance', label: '댄스' },
  { id: 'acappella', label: '아카펠라' },
  { id: 'theater', label: '연극·뮤지컬' },
  { id: 'film', label: '영화·영상' },
  { id: 'art', label: '미술·디자인' },
  { id: 'photo', label: '사진' },
  { id: 'etc', label: '기타' },
]

const CATEGORY_IDS = new Set(CLUB_CATEGORIES.map((c) => c.id))

export function normalizeCategory(value) {
  const id = String(value || '').trim()
  return CATEGORY_IDS.has(id) ? id : 'etc'
}

export function normalizeText(value, maxLength = 200) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

export function normalizeTags(value, maxCount = 6) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const tags = []
  for (const raw of value) {
    const tag = normalizeText(raw, 20)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= maxCount) break
  }
  return tags
}

export function normalizeBool(value) {
  return value === true
}

export function normalizeCount(value, { min = 0, max = 100000, fallback = 0 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** 한글 포함 식별자를 안전한 문서 ID로 (Firestore 문서 ID 제약 회피) */
export function slugify(value, fallbackPrefix = 'id') {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  if (base) return base
  return `${fallbackPrefix}-${crypto.randomBytes(4).toString('hex')}`
}

export function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
}

/** 현장 프로필 카드 공유 코드 — URL에 노출되므로 혼동되는 글자 제외 */
const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateShareCode(length = 8) {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += SHARE_CODE_ALPHABET[bytes[i] % SHARE_CODE_ALPHABET.length]
  }
  return out
}

/** 동아리 운영진 코드 — 평문은 저장하지 않고 해시만 보관 */
export function hashManageCode(clubId, code) {
  const secret = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_LOGIN_CODE || 'bandy-dev'
  return crypto
    .createHmac('sha256', secret)
    .update(`${clubId}:${String(code).trim().toUpperCase()}`)
    .digest('hex')
}

export function verifyManageCode(clubId, code, storedHash) {
  if (!code || !storedHash) return false
  const candidate = hashManageCode(clubId, code)
  const a = Buffer.from(candidate)
  const b = Buffer.from(String(storedHash))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function generateManageCode() {
  return generateShareCode(6)
}

/** Firestore Timestamp · Date · number 를 모두 밀리초로 */
export function toMillis(value) {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

/** 공개 동아리 프로필 — manageCodeHash 등 비공개 필드 제외 */
export function serializeClub(id, data = {}) {
  return {
    id,
    name: data.name || '',
    university: data.university || '',
    category: normalizeCategory(data.category),
    tagline: data.tagline || '',
    intro: data.intro || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    memberCount: data.memberCount ?? null,
    foundedYear: data.foundedYear ?? null,
    emblem: data.emblem || '',
    accent: data.accent || '',
    instagram: data.instagram || '',
    contactEmail: data.contactEmail || '',
    openToExchange: data.openToExchange !== false,
    connectionCount: normalizeCount(data.connectionCount),
    eventCount: normalizeCount(data.eventCount),
    isHostClub: data.isHostClub === true,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

export function serializeClubEvent(id, data = {}) {
  const capacity = normalizeCount(data.capacity, { fallback: 0 })
  const reservedCount = normalizeCount(data.reservedCount, { fallback: 0 })
  return {
    id,
    clubId: data.clubId || '',
    clubName: data.clubName || '',
    university: data.university || '',
    title: data.title || '',
    category: normalizeCategory(data.category),
    description: data.description || '',
    startsAt: toMillis(data.startsAt),
    doorsAt: data.doorsAt || '',
    venueName: data.venueName || '',
    venueAddress: data.venueAddress || '',
    price: normalizeCount(data.price, { fallback: 0 }),
    capacity,
    reservedCount,
    seatsLeft: capacity > 0 ? Math.max(0, capacity - reservedCount) : null,
    poster: data.poster || '',
    accent: data.accent || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    /** 당일 허브(티켓·셋리스트·채팅·방명록) 경로 — 연결된 행사만 보유 */
    hubPath: data.hubPath || '',
    status: data.status === 'closed' ? 'closed' : 'upcoming',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

export function serializeConnection(id, data = {}) {
  return {
    id,
    fromClubId: data.fromClubId || '',
    fromClubName: data.fromClubName || '',
    toClubId: data.toClubId || '',
    toClubName: data.toClubName || '',
    status: data.status === 'accepted' || data.status === 'declined' ? data.status : 'pending',
    message: data.message || '',
    requesterName: data.requesterName || '',
    requesterContact: data.requesterContact || '',
    createdAt: toMillis(data.createdAt),
    respondedAt: toMillis(data.respondedAt),
  }
}

/** 예약 — 전화번호는 관리자/본인 조회에만 쓰이므로 기본 마스킹 */
export function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 7) return digits ? '***' : ''
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

export function serializeReservation(id, data = {}, { includePhone = false } = {}) {
  return {
    id,
    eventId: data.eventId || '',
    eventTitle: data.eventTitle || '',
    clubId: data.clubId || '',
    clubName: data.clubName || '',
    name: data.name || '',
    phone: includePhone ? data.phone || '' : maskPhone(data.phone),
    headcount: normalizeCount(data.headcount, { min: 1, max: 20, fallback: 1 }),
    /** 교류로 발견한 행사인지 — "기존 인맥 밖 관객 유입" 검증 지표 */
    viaConnection: data.viaConnection === true,
    sourceClubId: data.sourceClubId || '',
    status: data.status === 'cancelled' || data.status === 'attended' ? data.status : 'reserved',
    startsAt: toMillis(data.startsAt),
    createdAt: toMillis(data.createdAt),
    attendedAt: toMillis(data.attendedAt),
  }
}

export function serializeProfileCard(id, data = {}, { viewerIsOwner = false } = {}) {
  const shareInstagram = data.shareInstagram !== false
  const sharePhone = data.sharePhone === true
  return {
    id,
    shareCode: data.shareCode || id,
    ownerName: data.ownerName || '',
    nickname: data.nickname || '',
    clubId: data.clubId || '',
    clubName: data.clubName || '',
    university: data.university || '',
    bio: data.bio || '',
    interests: Array.isArray(data.interests) ? data.interests : [],
    /** 동의한 항목만 상대에게 노출 */
    instagram: viewerIsOwner || shareInstagram ? data.instagram || '' : '',
    phone: viewerIsOwner || sharePhone ? data.phone || '' : '',
    shareInstagram,
    sharePhone,
    exchangeCount: normalizeCount(data.exchangeCount),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}
