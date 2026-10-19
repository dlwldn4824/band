/**
 * BANDY 플랫폼 레이어 타입
 * (서버 server/lib/bandyCore.js 의 serialize* 결과와 1:1로 대응)
 */

export type ClubCategoryId =
  | 'band'
  | 'dance'
  | 'acappella'
  | 'theater'
  | 'film'
  | 'art'
  | 'photo'
  | 'etc'

export interface ClubCategory {
  id: ClubCategoryId
  label: string
}

export const CLUB_CATEGORIES: ClubCategory[] = [
  { id: 'band', label: '밴드' },
  { id: 'dance', label: '댄스' },
  { id: 'acappella', label: '아카펠라' },
  { id: 'theater', label: '연극·뮤지컬' },
  { id: 'film', label: '영화·영상' },
  { id: 'art', label: '미술·디자인' },
  { id: 'photo', label: '사진' },
  { id: 'etc', label: '기타' },
]

const CATEGORY_LABELS = new Map(CLUB_CATEGORIES.map((c) => [c.id, c.label]))

export const categoryLabel = (id?: string): string =>
  (id && CATEGORY_LABELS.get(id as ClubCategoryId)) || '기타'

export interface Club {
  id: string
  name: string
  university: string
  category: ClubCategoryId
  tagline: string
  intro: string
  tags: string[]
  memberCount: number | null
  foundedYear: number | null
  emblem: string
  accent: string
  instagram: string
  contactEmail: string
  openToExchange: boolean
  connectionCount: number
  eventCount: number
  isHostClub: boolean
  createdAt: number | null
  updatedAt: number | null
}

export interface ClubEvent {
  id: string
  clubId: string
  clubName: string
  university: string
  title: string
  category: ClubCategoryId
  description: string
  startsAt: number | null
  doorsAt: string
  venueName: string
  venueAddress: string
  price: number
  capacity: number
  reservedCount: number
  /** 정원이 설정된 행사만 숫자, 무제한이면 null */
  seatsLeft: number | null
  poster: string
  accent: string
  tags: string[]
  /** 당일 허브(티켓·셋리스트·채팅·방명록) 경로 — 연결된 행사만 보유 */
  hubPath: string
  status: 'upcoming' | 'closed'
  createdAt: number | null
  updatedAt: number | null
}

export interface ClubConnection {
  id: string
  fromClubId: string
  fromClubName: string
  toClubId: string
  toClubName: string
  status: 'pending' | 'accepted' | 'declined'
  message: string
  requesterName: string
  requesterContact: string
  createdAt: number | null
  respondedAt: number | null
}

export interface EventReservation {
  id: string
  eventId: string
  eventTitle: string
  clubId: string
  clubName: string
  name: string
  phone: string
  headcount: number
  /** 교류로 발견한 행사인지 — 기존 인맥 밖 관객 유입 지표 */
  viaConnection: boolean
  sourceClubId: string
  status: 'reserved' | 'cancelled' | 'attended'
  startsAt: number | null
  createdAt: number | null
  attendedAt: number | null
}

export interface ProfileCard {
  id: string
  shareCode: string
  ownerName: string
  nickname: string
  clubId: string
  clubName: string
  university: string
  bio: string
  interests: string[]
  /** 본인이 동의한 항목만 채워집니다 */
  instagram: string
  phone: string
  shareInstagram: boolean
  sharePhone: boolean
  exchangeCount: number
  createdAt: number | null
  updatedAt: number | null
}

export interface ProfileExchange {
  card: ProfileCard
  eventId: string
  exchangedAt: number | null
}

export interface ConnectionSummary {
  receivedTotal: number
  receivedPending: number
  receivedAccepted: number
  sentTotal: number
  sentAccepted: number
  acceptRate: number
}

export interface ReservationSummary {
  total: number
  headcount: number
  viaConnection: number
  attended: number
  cancelled: number
  attendanceRate: number
  viaConnectionRate: number
}

export interface PlatformStats {
  clubs: number
  events: number
  connections: number
  connectionsAccepted: number
  connectionAcceptRate: number
  connectionsPending: number
  reservations: number
  headcount: number
  attended: number
  attendanceRate: number
  viaConnection: number
  viaConnectionRate: number
  grossValue: number
}

/** 교류 신청·응답에 쓰는 동아리 운영진 세션 (localStorage 보관) */
export interface ClubSession {
  clubId: string
  clubName: string
  manageCode: string
}
