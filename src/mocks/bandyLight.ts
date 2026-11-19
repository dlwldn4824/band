/**
 * 라이트 UI 목 데이터.
 *
 * 화면에 보이는 문구·금액은 Figma 페이지 `앱 · 라이트 UI (레퍼런스 반영)` 에 적힌 것을
 * 그대로 옮겼습니다. 백엔드가 붙기 전까지 쓰는 자리표시용이고, Firestore 스키마와는
 * 아직 연결하지 않았습니다.
 *
 * 금액 구조(밴디 참가비 팀당 5만 원 · 티켓 수수료 · 공연장 티켓 매출 분배)는
 * 사업 구조 그 자체라 임의로 바꾸지 않습니다.
 */

// Figma 에 들어 있던 실제 공연 포스터
import posterGlowCard from '../lightui/assets/poster-glow.png'
import posterGlowHero from '../lightui/assets/show-glow-hero.png'
// 레포에 있던 우리 공연 포스터들
import posterUnion from '../assets/배경/연합공연_최종포스터.jpeg'
import posterDraft from '../assets/배경/포스터 시안.png'
import coverPosterWall from '../assets/배경/밴드_포스터_벽.jpeg'
// 굿즈 사진 — 레포에 있던 실제 상품 사진
import goodsPickBox from '../assets/상품 리스트/피크 보관함_앰프모양.jpg'
import goodsKeyring from '../assets/상품 리스트/헤드셋키링.jpg'
import goodsMagnet from '../assets/상품 리스트/기타자석 4종.jpg'

export const posters = {
  glowCard: posterGlowCard,
  glowHero: posterGlowHero,
  union: posterUnion,
  draft: posterDraft,
}

export interface ShowCard {
  id: string
  genre: string
  title: string
  venue: string
  date: string
  poster?: string
}

/** L1 「이번 주 열리는 행사」 가로 스크롤 */
export const weekShows: ShowCard[] = [
  { id: 'glow', genre: '밴드', title: '멜로딕', venue: '라디오가가', date: '11/22', poster: posters.glowCard },
  { id: 'lexa', genre: '밴드', title: '렉사', venue: '몽향', date: '11/29', poster: posters.union },
  { id: 'acappella', genre: '아카펠라', title: '아카펠라', venue: '광운대', date: '12/06', poster: posters.draft },
]

/** L1 「내 주변」 — 숫자는 레이더가 끝난 뒤 카운트업합니다 */
export const nearby = {
  bands: 8,
  shows: 12,
  sub: '노원구 월계동 기준 · 반경 3km',
  weekCount: '8팀',
}

/** D1 공연 상세 */
/** 길찾기에 쓰는 공연장 한 곳 — 이름·주소·좌표를 한 군데서 들고 있습니다 */
export interface VenuePlace {
  name: string
  address: string
  lat: number
  lng: number
}

export const radioGaga: VenuePlace = {
  name: '라디오가가',
  address: '서울 노원구 월계로 45 지하 1층',
  lat: 37.6186,
  lng: 127.0583,
}

export const showDetail = {
  id: 'glow',
  hero: posters.glowHero,
  badges: ['D-3', '밴드', '4팀 연합'],
  titleLines: ['멜로딕 단독 공연', '〈겨울의 소리〉'],
  host: '멜로딕 · 광운대학교 밴드 동아리',
  info: [
    { k: '일시', v: '11.22 (토) 19:00' },
    { k: '장소', v: '라디오가가 · 노원구 월계동' },
    { k: '러닝타임', v: '약 120분 · 중간 휴식 10분' },
    { k: '관람', v: '전체 관람가 · 스탠딩' },
  ],
  lineup: [
    { initial: '멜', name: '멜로딕', sub: '광운대 · 3곡' },
    { initial: '렉', name: '렉사', sub: '한양대 · 3곡' },
    { initial: '하', name: '하모닉', sub: '삼육대 · 2곡' },
    { initial: '손', name: '손아픔', sub: '서울과기대 · 3곡' },
  ],
  about: [
    '겨울의 끝에서 들려주고 싶은 열한 곡을 모았습니다. 네 팀이 각자의 무대를 꾸미고, 마지막 한 곡은 모두 함께 섭니다.',
    '',
    '공연 시작 30분 전부터 입장할 수 있고, 음료는 현장에서 교환합니다.',
  ],
  venue: radioGaga,
  notice: '예매 후 24시간 안에 입금해야 자리가 확정됩니다. 공연 3일 전까지 전액 환불, 이후에는 환불이 어렵습니다.',
  price: '15,000원',
  priceValue: 15000,
  remain: '잔여 12석',
}

/** D2 예매 — 매수와 옵션 */
export const booking = {
  summary: {
    thumb: posters.glowCard,
    title: '멜로딕 단독 공연',
    sub: '11.22 (토) 19:00 · 라디오가가',
  },
  maxPerPerson: 4,
  ticket: { name: '일반', price: 15000, priceLabel: '15,000원' },
  addons: [
    { id: 'drink', name: '음료 1잔', price: 3000, sub: '3,000원 · 현장 바에서 교환', initial: 1 },
    { id: 'tee', name: '공연 티셔츠', price: 15000, sub: '15,000원 · 수량 한정', initial: 0 },
  ],
  /**
   * 예매 수수료.
   * Figma 예시가 「티켓 2매 → 1,000원」 이라 1매당 500원으로 두었습니다.
   * 실제 요율은 아직 정해진 값이 아니니 확정되면 여기만 고치면 됩니다.
   */
  feePerTicket: 500,
  buyer: {
    nameLabel: '이름',
    namePlaceholder: '이지우',
    phoneLabel: '연락처',
    phonePlaceholder: '010-0000-0000',
    depositorLabel: '입금자명 (다를 경우)',
    depositorPlaceholder: '비워 두면 이름과 같게 처리돼요',
  },
}

/** D3 입금 안내 — PG 없이 계좌이체 + 운영진 수동 확인 */
export const depositGuide = {
  due: '11월 20일 (목) 23:59까지 입금하면 자리가 확정됩니다.',
  remain: '23:41:02',
  amount: '34,000원',
  account: [
    { k: '은행', v: '국민은행' },
    { k: '계좌번호', v: '123456-78-901234' },
    { k: '예금주', v: '밴디 (이지우)' },
    { k: '입금자명', v: '이지우', accent: true },
  ],
  accountNumber: '123456-78-901234',
  depositorName: '이지우',
  bookingNo: '예매번호 B-2611-0482',
  detail: [
    { k: '공연', v: '멜로딕 단독 공연' },
    { k: '일시', v: '11.22 (토) 19:00' },
    { k: '티켓', v: '일반 2매' },
    { k: '사전 구매', v: '음료 1잔' },
  ],
  notes: [
    '· 입금자명이 다르면 확인이 늦어질 수 있어요.',
    '· 기한이 지나면 예매가 자동으로 취소됩니다.',
    '· 입금 확인은 운영진이 직접 하며, 보통 1시간 안에 끝납니다.',
  ],
}

/** D4 티켓 · QR 입장 */
export const myTicket = {
  status: '입금 확인됨',
  entry: '입장 전',
  title: '멜로딕 단독 공연',
  sub: '11.22 (토) 19:00 · 라디오가가',
  facts: [
    { k: '매수', v: '일반 2매' },
    { k: '좌석', v: '자유석' },
    { k: '예매번호', v: 'B-2611-0482' },
  ],
  guide: '입구에서 이 화면을 보여 주세요. 2매가 한 번에 처리됩니다.',
  addon: { initial: '음', name: '음료 1잔', sub: '바에서 이 티켓을 보여 주세요', state: '미교환' },
  payment: [
    { k: '결제 금액', v: '34,000원' },
    { k: '입금 확인', v: '11.19 21:08' },
    { k: '환불 가능', v: '11.19까지' },
  ],
  venue: radioGaga,
}

export type MyTicket = typeof myTicket

export const mongHyang: VenuePlace = {
  name: '몽향',
  address: '서울 서대문구 연세로5다길 10 지하 1층',
  lat: 37.5571,
  lng: 126.9368,
}

export const midnight: VenuePlace = {
  name: '홍대 미드나잇',
  address: '서울 마포구 와우산로 29길 12 지하 1층',
  lat: 37.5547,
  lng: 126.9245,
}

/**
 * 티켓은 공연마다 다릅니다 — 예전에는 어느 티켓을 눌러도 멜로딕 것 하나만
 * 나와서, 눌러도 안 바뀌는 것처럼 보였습니다. 주소의 공연 id 로 찾습니다.
 */
export const ticketsByShow: Record<string, MyTicket> = {
  glow: myTicket,
  'lexa-melodic': {
    status: '입금 대기',
    entry: '입장 전',
    title: '렉사 X 멜로딕 연합',
    sub: '11.29 (토) 18:00 · 몽향',
    facts: [
      { k: '매수', v: '일반 1매' },
      { k: '좌석', v: '자유석' },
      { k: '예매번호', v: 'B-2611-0613' },
    ],
    guide: '입금이 확인되면 QR 이 열립니다. 기한은 11.21까지입니다.',
    addon: { initial: '음', name: '음료 1잔', sub: '바에서 이 티켓을 보여 주세요', state: '미교환' },
    payment: [
      { k: '결제 금액', v: '16,000원' },
      { k: '입금 기한', v: '11.21까지' },
      { k: '환불 가능', v: '11.26까지' },
    ],
    venue: mongHyang,
  },
  sonapeum: {
    status: '입금 확인됨',
    entry: '입장 1번',
    title: '손아픔 단독 공연',
    sub: '12.06 (토) 19:00 · 홍대 미드나잇',
    facts: [
      { k: '매수', v: '일반 1매' },
      { k: '좌석', v: '자유석' },
      { k: '예매번호', v: 'B-2612-0071' },
    ],
    guide: '입구에서 이 화면을 보여 주세요. 입장 순서는 1번입니다.',
    addon: { initial: '굿', name: '엽서 세트', sub: '굿즈 부스에서 받아 가세요', state: '미교환' },
    payment: [
      { k: '결제 금액', v: '15,000원' },
      { k: '입금 확인', v: '11.30 14:22' },
      { k: '환불 가능', v: '12.03까지' },
    ],
    venue: midnight,
  },
}

/** 모르는 id 면 기본 티켓 — 화면이 비는 것보다 낫습니다 */
export const ticketFor = (id: string): MyTicket => ticketsByShow[id] ?? myTicket

/* ──────────────────────────────────────────────────────────────
 * S2 탐색 · 지도
 *
 * Figma 는 이 자리에 점·레이더 일러스트를 두었지만, 실제 지도 API 로 바꿔
 * 서울·신촌·부산처럼 떨어진 지역의 공연도 돌려 볼 수 있게 했습니다.
 * (L1 홈의 「내 주변」 은 Figma 그대로 레이더 그림을 씁니다.)
 *
 * 좌표는 지도 시연용 값입니다. 라디오가가·몽향·얼라이브홀은 우리가 실제로 쓰던
 * 공연장이고, 그 밖의 이름은 지역을 채우기 위한 자리표시입니다 — 실제 섭외처가
 * 정해지면 이 배열만 고치면 됩니다.
 * ────────────────────────────────────────────────────────────── */

export interface MapShow {
  id: string
  title: string
  venue: string
  region: string
  date: string
  distance?: string
  lat: number
  lng: number
  poster?: string
  real?: boolean
  /** 필터 칩이 거를 거리 — 오늘은 11.22 기준입니다 */
  when: 'today' | 'week' | 'later'
  genre: string
  free?: boolean
}

export const mapShows: MapShow[] = [
  { id: 'glow', title: '멜로딕 단독 공연', venue: '라디오가가', region: '서울 노원', date: '11.22 (토) 19:00', distance: '0.4km', lat: 37.6186, lng: 127.0583, poster: posters.draft, real: true, when: 'today', genre: '밴드' },
  { id: 'lexa-melodic', title: '렉사 X 멜로딕', venue: '몽향', region: '서울 노원', date: '11.29 (토) 18:00', distance: '1.2km', lat: 37.6256, lng: 127.0629, poster: posters.union, real: true, when: 'week', genre: '밴드' },
  { id: 'alive-night', title: '얼라이브 합동 공연', venue: '얼라이브홀', region: '서울 홍대', date: '12.06 (토) 19:30', distance: '11.8km', lat: 37.5556, lng: 126.923, poster: posters.glowCard, real: true, when: 'later', genre: '밴드' },
  { id: 'sinchon-winter', title: '신촌 겨울 밴드전', venue: '신촌 파랑홀', region: '서울 신촌', date: '12.13 (토) 18:00', distance: '10.4km', lat: 37.5558, lng: 126.9365, when: 'later', genre: '밴드', free: true },
  { id: 'seongsu-live', title: '성수 라이브 나이트', venue: '성수 언더스테이지', region: '서울 성수', date: '12.20 (토) 19:00', distance: '8.1km', lat: 37.5447, lng: 127.0557, when: 'later', genre: '밴드' },
  { id: 'busan-seomyeon', title: '서면 인디 데이', venue: '서면 오방가라지', region: '부산 서면', date: '12.07 (일) 17:00', lat: 35.1578, lng: 129.0595, when: 'later', genre: '인디' },
  { id: 'busan-gwangalli', title: '광안리 바다밴드', venue: '광안리 인디고', region: '부산 광안리', date: '12.14 (일) 18:00', lat: 35.1532, lng: 129.1186, when: 'later', genre: '밴드', free: true },
  { id: 'daegu-heavy', title: '대구 합동 공연', venue: '대구 헤비', region: '대구 동성로', date: '12.21 (일) 18:00', lat: 35.8686, lng: 128.5944, when: 'later', genre: '밴드' },
]

/** 지도를 처음 열었을 때 보이는 범위 — 노원 월계동 기준 */
export const mapHome = { lat: 37.6186, lng: 127.0583, zoom: 13 }

/** 내 위치 — 월계역 부근. 라디오가가 마커와 겹치지 않게 조금 떨어뜨려 둡니다. */
export const myLocation = { lat: 37.6134, lng: 127.0575 }

/** S2 상단 필터 — Figma 205:16 */
export const mapFilters = ['전체', '오늘', '이번 주', '밴드', '무료']

/* ── L2 동아리 교류 ─────────────────────────────────── */

export const myClub = {
  initial: '멜',
  name: '멜로딕 · 광운대',
  sub: '밴드 · 부원 18명 · 올해 공연 2회',
  received: 2,
  sent: 1,
  switcher: '멜로딕 ▾',
  /** 다크 카드 안에서 C1 로 들어가는 줄 */
  connections: { title: '우리의 연결', sub: '만난 밴드 6팀' },
}

export interface RecruitPost {
  id: string
  initial: string
  club: string
  clubSub: string
  badge: string
  badgeAccent?: boolean
  titleLines: string[]
  /** 팀당 비용은 밴디 참가비 5만 원 — 공연장 대관료 대신 내는 돈입니다 */
  info: { k: string; v: string; accent?: boolean }[]
  joined: number
  need: number
}

export const recruitPosts: RecruitPost[] = [
  {
    id: 'lexa-union',
    initial: '렉',
    club: '렉사 · 한양대',
    clubSub: '밴드 · 부원 24명',
    badge: '모집중',
    badgeAccent: true,
    titleLines: ['연합 공연 같이 할 팀', '2팀 구해요'],
    info: [
      { k: '공연 예정일', v: '2026.03 중 (협의)' },
      { k: '공연장', v: '밴디 빈 날에서 연결' },
      { k: '팀당 비용', v: '참가비 5만 원', accent: true },
    ],
    joined: 2,
    need: 4,
  },
  {
    id: 'sonapeum-hongdae',
    initial: '손',
    club: '손아픔 · 서울과기대',
    clubSub: '밴드 · 부원 15명',
    badge: '마감 임박',
    titleLines: ['3월 홍대 공연, 1팀만 더'],
    info: [
      { k: '공연 예정일', v: '2026.03.21 (토)' },
      { k: '공연장', v: '홍대 미드나잇' },
      { k: '팀당 비용', v: '참가비 5만 원', accent: true },
    ],
    joined: 3,
    need: 4,
  },
]

export const suggestedClubs = [
  { initial: '하', name: '하모닉', lines: ['같은 장르 · 3km', '올해 공연 4회'] },
  { initial: '블', name: '블루노트', lines: ['작년 합동 이력', '올해 공연 2회'] },
  { initial: '소', name: '소리울', lines: ['같은 장르 · 5km', '올해 공연 1회'] },
]

/* ── S4 동아리 상세 ─────────────────────────────────── */

export const clubDetail = {
  cover: coverPosterWall,
  initial: '멜',
  name: '멜로딕',
  sub: '광운대학교 · 밴드 · 2008년 창단',
  stats: [
    { k: '부원', v: '18' },
    { k: '올해 공연', v: '2' },
    { k: '교류 동아리', v: '6' },
  ],
  about:
    '록과 시티팝을 주로 합니다. 학기마다 정기 공연을 열고, 다른 학교 동아리와 함께 서는 연합 공연을 1년에 두 번 정도 합니다.',
  upcoming: {
    thumb: posters.draft,
    title: '멜로딕 단독 공연 〈겨울의 소리〉',
    sub: '11.22 (토) 19:00 · 라디오가가',
  },
  past: [
    { title: '2026 봄 정기 공연', sub: '04.19 · 라디오가가 · 관객 96명' },
    { title: '렉사 X 멜로딕 연합', sub: '06.07 · 몽향 · 관객 88명' },
    { title: '여름 버스킹', sub: '08.21 · 광운대 노천극장 · 관객 120명' },
  ],
  pastCount: 7,
}

/* ── S5 모집 글 쓰기 ────────────────────────────────── */
export const recruitForm = {
  title: '연합 공연 같이 할 팀 2팀 구해요',
  datePlaceholder: '2026. 03 중 (협의 가능)',
  venueOptions: [
    {
      id: 'bandy',
      title: '밴디 빈 날에서 연결',
      // 공연장은 대관료 대신 티켓 매출의 협의 비율을 가져갑니다
      sub: '대관료 0원 · 티켓 매출 일부를 공연장에',
    },
    { id: 'own', title: '직접 잡은 공연장', sub: '장소와 대관료를 직접 입력' },
  ],
  teams: { title: '우리 팀 포함', joined: 2, initial: 4 },
  /** 밴디 참가비는 팀당 5만 원 고정 — 사업 구조라 화면에서 바꾸지 않습니다 */
  feePerTeam: 50000,
  aboutPlaceholder: '어떤 공연인지, 어떤 팀을 찾는지 적어 주세요',
  notice: '올리면 교류 탭의 ‘팀 구해요’에 바로 보입니다.',
}

/* ── S6 받은 제안 상세 ──────────────────────────────── */
/* ── L2-b 받은 제안 · L2-c 보낸 제안 ─────────────────── */
export interface ProposalTerm {
  k: string
  v: string
  /** 금액처럼 빨강으로 읽혀야 하는 값 (규칙 7) */
  accent?: boolean
}

/** 답을 기다리는 제안 카드 */
export interface ReceivedProposal {
  id: string
  initial: string
  club: string
  clubSub: string
  /** 「새 제안」은 강조, 「확인함」은 조용하게 */
  badge: string
  badgeAccent?: boolean
  title: string
  terms: ProposalTerm[]
}

/** 이미 답한 제안 한 줄 */
export interface PastProposal {
  id: string
  initial: string
  club: string
  sub: string
  state: '수락함' | '거절함'
}

export const receivedProposals = {
  waiting: [
    {
      id: '1',
      initial: '하',
      club: '하모닉 · 삼육대',
      clubSub: '밴드 · 부원 12명 · 2시간 전',
      badge: '새 제안',
      badgeAccent: true,
      title: '3월 연합 공연에 같이 서고 싶어요',
      terms: [
        { k: '공연 예정일', v: '2026.03.14 (토)' },
        { k: '공연장', v: '라디오가가 · 밴디 빈 날' },
        { k: '맡을 곡', v: '3곡 · 약 20분' },
      ],
    },
    {
      id: '2',
      initial: '소',
      club: '소리울 · 인덕대',
      clubSub: '아카펠라 · 부원 9명 · 어제',
      badge: '확인함',
      title: '4월 버스킹 같이 하실래요?',
      terms: [
        { k: '공연 예정일', v: '2026.04 중 (협의)' },
        { k: '공연장', v: '광운대 노천극장' },
        { k: '맡을 곡', v: '2곡' },
      ],
    },
  ] as ReceivedProposal[],
  past: [
    { id: '3', initial: '블', club: '블루노트 · 서울여대', sub: '겨울 합동 공연 · 11.02', state: '수락함' },
    { id: '4', initial: '손', club: '손아픔 · 서울과기대', sub: '가을 정기 게스트 · 09.28', state: '거절함' },
    { id: '5', initial: '하', club: '하모닉 · 삼육대', sub: '합주실 교류 모임 · 2025.11.02', state: '수락함' },
  ] as PastProposal[],
  notice: '제안은 받은 뒤 7일이 지나면 자동으로 만료됩니다.',
}

/** 보낸 제안 — 아직 답이 없는 것 */
export interface SentWaiting {
  id: string
  initial: string
  club: string
  clubSub: string
  badge: string
  title: string
  terms: ProposalTerm[]
}

/** 보낸 제안 — 답이 온 것 */
export interface SentAnswered {
  id: string
  initial: string
  club: string
  clubSub: string
  state: '수락됨' | '거절됨'
  /** 수락됨일 때 */
  terms?: ProposalTerm[]
  /** 거절됨일 때 상대가 남긴 말 */
  reply?: string
}

export const sentProposals = {
  waiting: [
    {
      id: '6',
      initial: '렉',
      club: '렉사 · 한양대',
      clubSub: '보낸 날 11.17 · 2일째 대기',
      badge: '대기',
      title: '연합 공연 같이 할 팀 2팀 구해요',
      terms: [
        { k: '공연 예정일', v: '2026.03 중 (협의)' },
        { k: '맡을 곡', v: '3곡 · 약 20분' },
        { k: '팀당 비용', v: '참가비 5만 원', accent: true },
      ],
    },
  ] as SentWaiting[],
  answered: [
    {
      id: '7',
      initial: '하',
      club: '하모닉 · 삼육대',
      clubSub: '11.14 보냄 · 11.15 수락',
      state: '수락됨',
      terms: [
        { k: '이어진 공연', v: '3월 연합 공연' },
        { k: '현재', v: '4팀 중 3팀' },
      ],
    },
    {
      id: '8',
      initial: '블',
      club: '블루노트 · 서울여대',
      clubSub: '11.08 보냄 · 11.10 거절',
      state: '거절됨',
      reply:
        '이번 학기엔 자체 정기 공연 준비 중이라 어려울 것 같아요. 다음에 꼭 같이 해요!',
    },
  ] as SentAnswered[],
  more: { title: '다른 동아리에 제안하기', sub: '장르와 거리로 추천해 드려요' },
  notice: '제안은 운영진만 보낼 수 있습니다. 부원 계정에는 이 탭이 보이지 않아요.',
}

export const proposal = {
  from: {
    initial: '하',
    name: '하모닉 · 삼육대',
    sub: '밴드 · 부원 12명 · 올해 공연 3회',
    badge: '새 제안',
  },
  message:
    '안녕하세요! 3월 연합 공연 글 보고 연락드립니다. 저희는 시티팝 위주로 3곡 준비할 수 있고, 드럼·베이스 장비는 저희 쪽에서 가져갈 수 있어요.',
  terms: [
    { k: '공연 예정일', v: '2026.03.14 (토)' },
    { k: '공연장', v: '라디오가가 · 밴디 빈 날' },
    { k: '맡을 곡', v: '3곡 · 약 20분' },
    { k: '팀당 비용', v: '참가비 5만 원', accent: true },
  ],
  past: [
    { title: '삼육대 가을 정기', sub: '10.11 · 관객 64명' },
    { title: '하모닉 X 소리울', sub: '07.05 · 관객 71명' },
  ],
  pastCount: 3,
  notice: '수락하면 모집 글의 모인 팀이 3/4팀이 되고, 공연장에 지원서가 함께 전달됩니다.',
}

/* ── S9 대화 ────────────────────────────────────────── */
export interface ChatLine {
  side: 'them' | 'me'
  text: string
  at: string
}

export const chat = {
  title: '렉사 · 한양대',
  day: '11월 18일 월요일',
  lines: [
    { side: 'them', text: '안녕하세요! 3월 연합 공연 글 보고 연락드려요. 저희 4곡 준비할 수 있습니다.', at: '오후 2:14' },
    { side: 'me', text: '반가워요! 혹시 드럼은 공연장 걸 쓰시나요?', at: '오후 2:20 · 읽음' },
    { side: 'them', text: '네, 공연장 장비 쓰면 될 것 같아요. 심벌만 가져갈게요.', at: '오후 2:22' },
    { side: 'me', text: '좋아요. 그럼 3월 14일 라디오가가로 지원서 같이 넣을까요?', at: '오후 2:25 · 읽음' },
  ] as ChatLine[],
  joint: {
    title: '같이 지원하기',
    sub: '3월 14일 (토) · 라디오가가 · 4팀 중 3팀',
    link: '조건 보기 ›',
    cta: '같이 지원',
  },
  inputPlaceholder: '메시지 보내기',
}

/* ── S10 공연 만들기 ────────────────────────────────── */
export const showForm = {
  upload: { title: '포스터 올리기', sub: '3:4 비율 · 최대 5MB' },
  fields: [
    { label: '공연명', value: '멜로딕 단독 공연 〈겨울의 소리〉' },
    { label: '주최 동아리', value: '멜로딕 · 광운대' },
    { label: '일시', value: '2026. 11. 22 (토) 19:00' },
  ],
  venueOptions: [
    {
      id: 'bandy',
      title: '라디오가가 · 밴디 연결',
      // 대관료 대신 티켓 매출의 협의 비율(예시 20%)을 공연장이 가져갑니다
      sub: '대관료 0원 · 티켓 매출의 20%',
    },
    { id: 'own', title: '직접 잡은 공연장', sub: '장소와 대관료 직접 입력' },
  ],
  lineup: [
    { initial: '렉', name: '렉사 · 한양대', sub: '3곡 · 확정', state: '확정', pending: false },
    { initial: '하', name: '하모닉 · 삼육대', sub: '2곡 · 수락 대기', state: '대기', pending: true },
  ],
  invite: { initial: '+', title: '팀 더 초대하기', sub: '모집 글로 찾기' },
  notice: '참가비는 팀당 5만 원이고, 공연이 확정될 때 함께 청구됩니다.',
}

/* ── S11 입금 관리 (주최자) ──────────────────────────
 * PG 가 없으니 운영진이 통장을 보고 직접 확인합니다.
 * 「입금 신고」(예매자가 보냈다고 알린 건)와 「입금 대기」(아직 연락 없음)를
 * 반드시 구분해서 보여 줘야 합니다 — 운영진이 통장에서 찾아볼 순서가 달라집니다.
 */
export interface DepositRow {
  name: string
  amount: string
  sub: string
  /** true = 예매자가 「입금했어요」 를 눌러 알린 건 */
  reported?: boolean
  /** 확인 버튼 대신 보여 줄 상태 문구 */
  state?: string
}

/**
 * S18 공연 관리 — 운영진이 자기 동아리 공연을 한자리에서 보는 화면.
 * 입금·입장·정산 화면은 전부터 있었지만 평소에 들어갈 길이 없어서, 그 입구를 모았습니다.
 */
export const clubConsole = {
  club: { initial: '멜', name: '멜로딕 · 광운대', sub: '밴드 · 부원 18명' },
  summaryLine: '다가오는 공연 2개 · 확인할 입금 2건',
  upcoming: [
    {
      id: 'glow',
      thumb: posters.glowCard,
      title: '멜로딕 단독 공연',
      when: '11.22 (토) 19:00 · 라디오가가',
      paid: 35,
      total: 42,
      /** 미입금이 있으면 빨강 (규칙 7) */
      urgent: true,
    },
    {
      id: 'union',
      thumb: posters.union,
      title: '렉사 X 멜로딕 연합',
      when: '11.29 (토) 18:00 · 몽향',
      paid: 12,
      total: 20,
      urgent: false,
    },
  ],
  past: [
    {
      id: 'autumn',
      thumb: posters.draft,
      title: '가을 연합 공연',
      when: '10.11 (토) · 라디오가가',
      state: '정산 대기',
    },
  ],
  menu: [
    { key: 'deposits' as const, title: '입금 관리', value: '확인 2건' },
    { key: 'entry' as const, title: '입장 관리', value: '공연 당일' },
    { key: 'settlement' as const, title: '정산', value: '1건 대기' },
  ],
  note: '공연 만들기와 입금·정산은 동아리 운영진만 할 수 있습니다. 부원에게 권한을 주려면 동아리 운영진에게 말해 주세요.',
}

export const deposits = {
  summaryLine: '예매 42건 중 35건 입금 완료',
  done: 35,
  total: 42,
  /** 칩은 아래 목록을 실제로 바꿉니다. 숫자는 데이터에서 세므로 어긋날 일이 없습니다 */
  filters: [
    { key: 'need' as const, label: '확인 필요' },
    { key: 'paid' as const, label: '입금 완료' },
    { key: 'refund' as const, label: '환불' },
  ],
  needCheck: [
    { name: '이지우', amount: '34,000원', sub: '2매 · 11.20까지', reported: true },
    { name: '김민지', amount: '16,000원', sub: '1매 · 11.21까지', state: '입금 대기' },
    { name: '박서준', amount: '16,000원', sub: '1매 · 11.21까지', state: '입금 대기' },
    { name: '최유성', amount: '31,000원', sub: '2매 · 11.20까지', reported: true },
  ] as DepositRow[],
  expired: [
    { name: '양성은', amount: '16,000원', sub: '1매 · 11.18 지남', state: '자동 취소됨' },
  ] as DepositRow[],
  expiredCount: '1건',
  /** 입금이 끝난 건 — 전체 35건 중 최근 것만 보여 줍니다 */
  paid: [
    { name: '정하늘', amount: '32,000원', sub: '2매 · 11.19 입금', state: '입금 완료' },
    { name: '오수민', amount: '16,000원', sub: '1매 · 11.19 입금', state: '입금 완료' },
    { name: '한지훈', amount: '48,000원', sub: '3매 · 11.18 입금', state: '입금 완료' },
  ] as DepositRow[],
  paidMore: '최근 3건만 보여 줍니다',
  refunded: [
    { name: '서다인', amount: '16,000원', sub: '1매 · 11.17 환불', state: '환불 완료' },
  ] as DepositRow[],
  empty: {
    need: '확인할 입금이 없어요. 전부 처리했습니다.',
    paid: '아직 입금이 끝난 예매가 없어요.',
    refund: '환불한 예매가 없어요.',
  },
  note: '입금 신고는 예매자가 보냈다고 알린 건이고, 입금 대기는 아직 연락이 없는 건입니다.',
}

/* ── S13 정산 ───────────────────────────────────────
 * 공연장은 대관료 대신 티켓 매출의 협의 비율(여기서는 20%)을 가져가고,
 * 밴드는 팀당 참가비 5만 원을 냅니다.
 */
export const settlement = {
  show: { thumb: posters.draft, title: '멜로딕 단독 공연', sub: '11.22 (토) · 라디오가가 · 종료' },
  payoutLabel: '동아리가 받는 금액',
  payout: '327,000원',
  breakdown: [
    { k: '티켓 매출', v: '40매 · 640,000원' },
    { k: '사전 구매', v: '음료 18잔 · 54,000원' },
    { k: '밴디 수수료', v: '-39,000원' },
    { k: '공연장 몫 (20%)', v: '-128,000원' },
    { k: '참가비 (4팀)', v: '-200,000원' },
    { k: '티켓 매출 합계', v: '694,000원', total: true, divider: true },
  ],
  totalValue: 694000,
  shares: [
    { k: '동아리', value: 327000, tone: 'ink' as const },
    { k: '참가비', value: 200000, tone: 'accent' as const },
    { k: '공연장', value: 128000, tone: 'mute' as const },
    { k: '수수료', value: 39000, tone: 'mute' as const },
  ],
  account: { title: '국민 123456-78-901234', sub: '멜로딕 (이지우)' },
  notice: '정산 요청 후 영업일 기준 3일 안에 입금됩니다.',
}

/* ── L3 공연장 · 팀 찾기 ────────────────────────────
 * 공연장은 빈 날(수익 0원)을 열어 주고, 대관료 대신 티켓 매출의 협의 비율을 받습니다.
 */
export const venueBoard = {
  name: '라디오가가',
  mode: '공연장 모드 ▾',
  emptyDays: 11,
  /** 캘린더 공통 — 주마다 바뀌지 않는 것 */
  calendar: {
    rows: ['비어 있음', '공개함', '지원 받음', '확정'],
    legend: ['해당됨', '해당 없음'],
  },
  /** 화살표로 오가는 주 — 가운데(index 1)가 이번 주입니다 */
  weeks: [
    {
      label: '3월 1주',
      badge: '지난 주',
      days: [
        { dow: '월', date: '02', cells: [false, false, false, false] },
        { dow: '화', date: '03', cells: [true, true, false, false] },
        { dow: '수', date: '04', cells: [true, false, false, false] },
        { dow: '목', date: '05', cells: [false, false, false, false] },
        { dow: '금', date: '06', cells: [true, true, true, false] },
        { dow: '토', date: '07', cells: [true, true, true, true], accent: true },
        { dow: '일', date: '08', cells: [true, false, false, false] },
      ],
      note: '토요일 7일 · 공연 끝남',
    },
    {
      label: '3월 2주',
      badge: '이번 주',
      days: [
        { dow: '월', date: '09', cells: [true, true, false, false] },
        { dow: '화', date: '10', cells: [true, true, true, false] },
        { dow: '수', date: '11', cells: [false, false, false, false] },
        { dow: '목', date: '12', cells: [true, true, true, false] },
        { dow: '금', date: '13', cells: [true, false, false, false] },
        { dow: '토', date: '14', cells: [true, true, true, true], accent: true },
        { dow: '일', date: '15', cells: [false, false, false, false] },
      ],
      note: '토요일 14일 · 확정 1건',
    },
    {
      label: '3월 3주',
      badge: '다음 주',
      days: [
        { dow: '월', date: '16', cells: [true, false, false, false] },
        { dow: '화', date: '17', cells: [true, false, false, false] },
        { dow: '수', date: '18', cells: [true, true, false, false] },
        { dow: '목', date: '19', cells: [false, false, false, false] },
        { dow: '금', date: '20', cells: [true, true, false, false] },
        { dow: '토', date: '21', cells: [true, true, false, false], accent: true },
        { dow: '일', date: '22', cells: [true, false, false, false] },
      ],
      note: '아직 지원한 팀이 없어요',
    },
  ],
  openDay: {
    date: '3월 14일 (토)',
    badge: '공개중',
    terms: [
      { k: '대관료', v: '0원 · 티켓 수익 배분' },
      { k: '배분 비율', v: '티켓 매출의 20%' },
      { k: '최소 예상 관객', v: '60명' },
    ],
  },
  applicants: [
    {
      id: 'melodic',
      initial: '멜',
      name: '멜로딕 · 광운대',
      sub: '밴드 · 부원 18명 · 4팀 연합',
      stats: [
        { k: '지난 공연', v: '2회 · 평균 관객 92명' },
        { k: '예상 관객', v: '80 ~ 110명' },
        { k: '예상 정산', v: '약 24만 원', accent: true },
      ],
    },
    {
      id: 'harmonic',
      initial: '하',
      name: '하모닉 · 삼육대',
      sub: '밴드 · 부원 12명 · 3팀 연합',
      stats: [
        { k: '지난 공연', v: '첫 공연' },
        { k: '예상 관객', v: '40 ~ 70명' },
        { k: '예상 정산', v: '약 13만 원' },
      ],
    },
  ],
  bulk: { title: '남은 빈 날 8일 한 번에 공개', sub: '같은 조건으로 적용돼요' },
  /** 공연장 모드 탭 — 갈 곳이 있는 것만 누를 수 있습니다 */
  tabs: [
    { key: 'schedule', label: '일정' },
    { key: 'apps', label: '지원 팀' },
    { key: 'settlement', label: '정산' },
    { key: 'venue', label: '공연장', soon: true },
    { key: 'me', label: '마이' },
  ],
  /** 관객 화면으로 돌아가는 길 */
  exit: '관객 모드로',
}

/* ── S12 입장 관리 · QR ─────────────────────────────── */
export const entryDesk = {
  scanHint: '관객의 QR을 사각형 안에 맞춰 주세요',
  entered: 42,
  capacity: 80,
  badge: '진행 중',
  recent: [
    { initial: '이', name: '이지우', sub: '일반 2매 · 음료 1잔 · 19:02' },
    { initial: '김', name: '김민지', sub: '일반 1매 · 19:01' },
    { initial: '박', name: '박서준', sub: '일반 1매 · 18:58' },
  ],
  onsite: { title: '현장에서 티켓 팔기', sub: '잔여 12석 · 현금 · 계좌' },
}

/* ── S3 검색 ────────────────────────────────────────── */
export const search = {
  query: '밴드',
  recent: ['멜로딕', '라디오가가', '연합 공연', '노원'],
  clubs: [
    { id: 'melodic', initial: '멜', name: '멜로딕', sub: '광운대 · 밴드 · 부원 18명' },
    { id: 'lexa', initial: '렉', name: '렉사', sub: '한양대 · 밴드 · 부원 24명' },
    { id: 'harmonic', initial: '하', name: '하모닉', sub: '삼육대 · 밴드 · 부원 12명' },
  ],
  trending: [
    { rank: 1, word: '연합 공연', delta: '—' },
    { rank: 2, word: '홍대 공연장', delta: '▲ 2' },
    { rank: 3, word: '아카펠라', delta: '▼ 1' },
    { rank: 4, word: '무료 공연', delta: 'new' },
  ],
}

/* ── S7 내 티켓 목록 ────────────────────────────────── */
export const myTickets = {
  /** 배지는 탭과 겹치지 않게 전체 장수를 보여 줍니다 */
  count: '전체 5장',
  tabs: [
    { key: 'upcoming', label: '예정' },
    { key: 'past', label: '지난' },
    { key: 'cancelled', label: '취소 · 환불' },
  ],
  /** 탭에 아무것도 없을 때 */
  empty: {
    upcoming: '예정된 공연이 없어요. 지도에서 가까운 공연을 찾아보세요.',
    past: '아직 다녀온 공연이 없어요.',
    cancelled: '취소하거나 환불한 예매가 없어요.',
  },
  items: [
    {
      id: 'glow',
      tab: 'upcoming',
      thumb: posters.draft,
      title: '멜로딕 단독 공연',
      when: '11.22 (토) 19:00 · 라디오가가',
      what: '일반 2매 · 음료 1잔',
      badge: '오늘',
      urgent: true,
      /** 공연 당일이면 티켓(D4) 대신 공연 정보(P1)로 갑니다 */
      today: true,
    },
    {
      id: 'lexa-melodic',
      tab: 'upcoming',
      thumb: posters.union,
      title: '렉사 X 멜로딕 연합',
      when: '11.29 (토) 18:00 · 몽향',
      what: '일반 1매',
      badge: '입금 24h',
      urgent: true,
    },
    {
      id: 'sonapeum',
      tab: 'upcoming',
      thumb: posters.draft,
      title: '손아픔 단독 공연',
      when: '12.06 (토) 19:00 · 홍대 미드나잇',
      what: '일반 1매',
      badge: '입장 1번',
    },
    {
      id: 'autumn-union',
      tab: 'past',
      thumb: posters.union,
      title: '가을 연합 공연',
      when: '10.11 (토) 18:00 · 라디오가가',
      what: '일반 2매',
      badge: '다녀옴',
    },
    {
      id: 'harmonic-spring',
      tab: 'cancelled',
      thumb: posters.draft,
      title: '하모닉 봄 정기',
      when: '04.19 (토) 19:00 · 라디오가가',
      what: '일반 1매 · 15,000원',
      badge: '환불 완료',
    },
  ],
  countMax: 2,
  counts: [
    { k: '11.22', value: 2, tone: 'accent' as const },
    { k: '11.29', value: 1, tone: 'soft' as const },
    { k: '12.06', value: 1, tone: 'soft' as const },
  ],
}

/* ── S8 알림 ────────────────────────────────────────── */
export const notifications = {
  today: [
    { initial: '렉', title: '렉사가 교류를 신청했어요', sub: '연합 공연 · 2시간 전', unread: true, to: 'proposal' },
    { initial: '멜', title: '입금이 확인됐어요', sub: '멜로딕 단독 공연 · 4시간 전', unread: true, to: 'ticket' },
    { initial: '라', title: '라디오가가가 3월 14일을 공개했어요', sub: '공연장 · 7시간 전', to: 'venue' },
  ],
  thisWeek: [
    { initial: '손', title: '손아픔이 새 공연을 열었어요', sub: '12.06 홍대 · 2일 전', to: 'show' },
    { initial: '아', title: '아카펠라 겨울 정기가 매진됐어요', sub: '12.06 · 3일 전', to: 'show' },
    { initial: '하', title: '하모닉이 제안을 수락했어요', sub: '연합 공연 · 4일 전', to: 'proposal' },
  ],
  settings: [
    { id: 'before', title: '공연 하루 전 알림', sub: '예매한 공연만', on: true },
    { id: 'proposal', title: '교류 제안 알림', sub: '운영진만 받아요', on: true },
    { id: 'nearby', title: '주변 공연 소식', sub: '반경 3km', on: false },
  ],
}

/* ── S14 마이 ───────────────────────────────────────── */
export const me = {
  initial: '이',
  name: '이지우',
  sub: '광운대학교 · jiwoo@kw.ac.kr',
  clubs: [
    { initial: '멜', name: '멜로딕', sub: '운영진 · 부원 18명', badge: '운영진' },
  ],
  joinClub: { initial: '+', title: '동아리 만들기 · 참여하기', sub: '코드로 참여할 수 있어요' },
  booking: [
    { title: '예매 내역', value: '12건' },
    { title: '찜한 공연', value: '5' },
    { title: '팔로우한 동아리', value: '8' },
  ],
  settings: [
    { title: '알림 설정' },
    { title: '계좌 · 환불 정보' },
    { title: '공연장으로 등록하기', value: '무료' },
    { title: '문의하기' },
    { title: '로그아웃' },
  ],
  version: 'BANDY v0.9.2',
}

/* ── S15 초대 보내기 ────────────────────────────────── */
export const invite = {
  eventId: 'glow',
  code: 'ab12cd',
  link: 'bandy.kr/i/ab12cd',
  // MOCK: 실제 배포 주소가 정해지면 여기만 바꾸면 됩니다
  fullLink: 'https://bandy.kr/i/ab12cd',
  venue: '라디오가가 · 노원구 월계동',
  /** 티켓 이미지에는 장소를 따로 쓰므로 날짜·시각만 */
  ticketWhen: '11.22 (토) 19:00',
  poster: posters.glowHero,
  title: '멜로딕 단독 공연 〈겨울의 소리〉',
  when: '11.22 (토) 19:00 · 라디오가가',
  message: '이번 주 토요일에 우리 공연해. 자리 하나 맡아 뒀으니까 와 줘!',
  channels: [
    { id: 'sms', icon: 'share-sms', label: '문자' },
    { id: 'kakao', icon: 'share-kakao', label: '카카오톡' },
    { id: 'link', icon: 'share-link', label: '링크 복사' },
    { id: 'story', icon: 'share-story', label: '스토리' },
  ],
  stats: [
    { k: '보낸 초대', v: '12명' },
    { k: '링크를 연 사람', v: '8명' },
    { k: '예매까지 간 사람', v: '3명', accent: true },
  ],
  notice: '초대 링크로 들어온 사람은 로그인 없이 티켓부터 볼 수 있어요.',
}

/* ── S16 문자로 받은 모습 ───────────────────────────── */
export const inviteSms = {
  from: '010-1234-5678',
  at: '오후 2:41',
  card: {
    title: '멜로딕 단독 공연 〈겨울의 소리〉',
    when: '11.22 (토) 19:00 · 라디오가가',
    host: 'bandy.kr',
  },
  text: '이번 주 토요일에 우리 공연해. 자리 하나 맡아 뒀으니까 와 줘!',
  sender: '이지우',
  reply: '오 티켓 이쁘다 ㅋㅋ 갈게!',
  replyState: '읽음',
}

/* ── S17 초대장 (링크 열면) ─────────────────────────── */
export const inviteCard = {
  headline: ['이지우님이', '공연에 초대했어요'],
  host: '멜로딕 · 광운대학교 밴드 동아리',
  facts: [
    { k: '공연', v: '멜로딕 단독 공연 〈겨울의 소리〉' },
    { k: '일시', v: '11.22 (토) 19:00' },
    { k: '장소', v: '라디오가가 · 노원구 월계동' },
    { k: '출연', v: '멜로딕 · 렉사 · 하모닉 · 손아픔' },
    { k: '티켓', v: '15,000원 · 잔여 12석', accent: true },
  ],
  sender: { initial: '이', name: '이지우', role: '멜로딕 · 보컬' },
  message: '“이번 주 토요일에 우리 공연해. 자리 하나 맡아 뒀으니까 와 줘!”',
  social: '이 초대로 벌써 8명이 왔어요',
  notice: '로그인 없이 먼저 둘러볼 수 있어요.',
}

/* ── C1 우리가 만난 밴드 (연결 지도) ────────────────
 * 교류를 숫자 온도가 아니라 실제 기록(합동 공연 n회 · 응원 n회)으로 보여 줍니다.
 * 활동이 없다고 해서 수치가 깎이지 않습니다 — 선은 쌓이기만 합니다.
 */
export const connections = {
  ownerName: '멜로딕',
  headline: ['멜로딕이 만난 밴드', '6팀'],
  lead: '함께 선 공연과 응원하러 간 공연이 선으로 쌓입니다.',
  /**
   * 관계 그래프 (React Flow).
   * 좌표는 일부러 완벽한 방사형이 아니라 조금 비뚤게 두었습니다 — 가지런하면 발표자료처럼 보입니다.
   * 그래프에는 5팀만 올리고 나머지는 아래 리스트로 넘깁니다.
   */
  graph: {
    center: { id: 'melodic', label: '멜로딕', x: 142, y: 112 },
    nodes: [
      { id: 'lexa', initial: '렉', name: '렉사', record: '합동 2 · 응원 3', size: 46, tone: 'strong' as const, x: 38, y: 16, from: 'tl', to: 'br' },
      { id: 'harmonic', initial: '하', name: '하모닉', record: '합동 1 · 응원 2', size: 46, tone: 'strong' as const, x: 262, y: 40, from: 'tr', to: 'bl' },
      { id: 'acappella', initial: '아', name: '아카펠라', record: '합동 1', size: 42, tone: 'mid' as const, x: 288, y: 172, from: 'r', to: 'l' },
      { id: 'sonapeum', initial: '손', name: '손아픔', record: '응원 2', size: 38, tone: 'weak' as const, x: 14, y: 166, from: 'l', to: 'r' },
      { id: 'bluenote', initial: '블', name: '블루노트', record: '응원 1', size: 38, tone: 'weak' as const, x: 152, y: 238, from: 'b', to: 't' },
    ],
  },
  legend: [
    { label: '함께 선 공연', tone: 'strong' as const },
    { label: '응원만', tone: 'mid' as const },
    { label: '수락만', tone: 'weak' as const },
  ],
  /** 막대 길이는 Figma 값 비율 그대로 (전체 277.766 기준) */
  list: [
    { id: 'lexa', initial: '렉', name: '렉사', sub: '합동 공연 2회 · 응원 3회', ratio: 263.875 / 277.766, warm: true },
    { id: 'harmonic', initial: '하', name: '하모닉', sub: '합동 공연 1회 · 응원 2회', ratio: 194.422 / 277.766, warm: true },
    { id: 'acappella', initial: '아', name: '아카펠라', sub: '합동 공연 1회', ratio: 133.313 / 277.766, warm: true },
    { id: 'sonapeum', initial: '손', name: '손아픔', sub: '응원 2회', ratio: 83.328 / 277.766, warm: false },
    { id: 'bluenote', initial: '블', name: '블루노트', sub: '응원 1회', ratio: 49.984 / 277.766, warm: false },
    { id: 'soriul', initial: '소', name: '소리울', sub: '교류 수락만', ratio: 22.219 / 277.766, warm: false },
  ],
  archive: { initial: '年', title: '올해 만난 밴드 모아보기', sub: '이미지로 저장해 공유할 수 있어요' },
  stagesRow: { initial: '?', title: '연결은 어떻게 쌓이나요?', sub: '수락 · 응원 · 합동 · 단골 네 단계' },
  notice: '연결선의 굵기는 함께한 횟수입니다. 활동이 없다고 가늘어지지는 않아요.',
}

/* ── C2 우리 사이 (관계 상세) ───────────────────────
 * 교류를 숫자 온도가 아니라 실제 기록으로 보여 줍니다.
 */
export const relation = {
  title: '멜로딕 × 렉사',
  cable: {
    left: { initial: '멜', name: '멜로딕', school: '광운대' },
    right: { initial: '렉', name: '렉사', school: '한양대' },
  },
  caption: '함께한 순간이 쌓이고 있어요',
  stats: [
    { v: '2회', k: '합동 공연', accent: true },
    { v: '3회', k: '공연 응원' },
    { v: '1회', k: '교류 모임' },
  ],
  log: [
    { strong: true, title: '렉사 X 멜로딕 연합 공연', sub: '몽향 · 관객 88명', at: '06.07' },
    { strong: false, title: '렉사 정기 공연에 응원 방문', sub: '부원 4명 현장 체크인', at: '05.18' },
    { strong: false, title: '멜로딕 봄 정기에 렉사 방문', sub: '부원 6명 현장 체크인', at: '04.19' },
    { strong: true, title: '2025 겨울 연합 공연', sub: '라디오가가 · 관객 96명', at: '2025.12.14' },
    { strong: false, title: '합주실 교류 모임', sub: '양쪽 운영진 확인', at: '2025.11.02' },
  ],
  next: {
    title: '3월 연합 공연에 함께 서기',
    sub: '렉사가 올린 모집 글 · 4팀 중 3팀',
  },
  notice: '응원 방문은 같은 공연이면 밴드 간 1회로 셉니다. 방문 인원은 따로 표시해요.',
}

export type Relation = typeof relation

/**
 * 밴드마다 다른 관계 페이지.
 *
 * 예전에는 relation 하나만 그려서, 연결 지도에서 어느 밴드를 눌러도 똑같이
 * 「멜로딕 × 렉사」 가 나왔습니다. 주소의 id 로 찾습니다 (그래프·목록과 같은 값).
 */
const NOTICE = relation.notice

export const relationsByClub: Record<string, Relation> = {
  lexa: relation,
  harmonic: {
    title: '멜로딕 × 하모닉',
    cable: {
      left: { initial: '멜', name: '멜로딕', school: '광운대' },
      right: { initial: '하', name: '하모닉', school: '삼육대' },
    },
    caption: '함께한 순간이 쌓이고 있어요',
    stats: [
      { v: '1회', k: '합동 공연', accent: true },
      { v: '2회', k: '공연 응원' },
      { v: '1회', k: '교류 모임' },
    ],
    log: [
      { strong: true, title: '겨울 합동 공연', sub: '라디오가가 · 관객 74명', at: '11.02' },
      { strong: false, title: '하모닉 가을 정기에 응원 방문', sub: '부원 5명 현장 체크인', at: '10.12' },
      { strong: false, title: '멜로딕 봄 정기에 하모닉 방문', sub: '부원 3명 현장 체크인', at: '04.19' },
      { strong: false, title: '합주실 교류 모임', sub: '양쪽 운영진 확인', at: '2025.11.02' },
    ],
    next: { title: '3월 연합 공연에 함께 서기', sub: '같은 모집 글에 지원 중 · 4팀 중 3팀' },
    notice: NOTICE,
  },
  acappella: {
    title: '멜로딕 × 아카펠라',
    cable: {
      left: { initial: '멜', name: '멜로딕', school: '광운대' },
      right: { initial: '아', name: '아카펠라', school: '서울여대' },
    },
    caption: '한 번 같이 섰어요',
    stats: [
      { v: '1회', k: '합동 공연', accent: true },
      { v: '0회', k: '공연 응원' },
      { v: '0회', k: '교류 모임' },
    ],
    log: [
      { strong: true, title: '아카펠라 겨울 정기 게스트', sub: '광운대 노천극장 · 관객 120명', at: '12.06' },
    ],
    next: { title: '4월 버스킹 같이 하기', sub: '아카펠라가 보낸 제안 · 답을 기다리는 중' },
    notice: NOTICE,
  },
  sonapeum: {
    title: '멜로딕 × 손아픔',
    cable: {
      left: { initial: '멜', name: '멜로딕', school: '광운대' },
      right: { initial: '손', name: '손아픔', school: '서울과기대' },
    },
    caption: '아직 같이 선 적은 없어요',
    stats: [
      { v: '0회', k: '합동 공연' },
      { v: '2회', k: '공연 응원', accent: true },
      { v: '0회', k: '교류 모임' },
    ],
    log: [
      { strong: false, title: '손아픔 단독 공연에 응원 방문', sub: '부원 6명 현장 체크인', at: '12.06' },
      { strong: false, title: '멜로딕 단독 공연에 손아픔 방문', sub: '부원 2명 현장 체크인', at: '09.28' },
    ],
    next: { title: '같이 설 기회 만들기', sub: '아직 함께 선 공연이 없습니다' },
    notice: NOTICE,
  },
  bluenote: {
    title: '멜로딕 × 블루노트',
    cable: {
      left: { initial: '멜', name: '멜로딕', school: '광운대' },
      right: { initial: '블', name: '블루노트', school: '서울여대' },
    },
    caption: '한 번 보러 와 줬어요',
    stats: [
      { v: '0회', k: '합동 공연' },
      { v: '1회', k: '공연 응원', accent: true },
      { v: '0회', k: '교류 모임' },
    ],
    log: [
      { strong: false, title: '멜로딕 단독 공연에 블루노트 방문', sub: '부원 4명 현장 체크인', at: '11.22' },
    ],
    next: { title: '같이 설 기회 만들기', sub: '겨울 합동 공연 제안은 거절되었습니다' },
    notice: NOTICE,
  },
  soriul: {
    title: '멜로딕 × 소리울',
    cable: {
      left: { initial: '멜', name: '멜로딕', school: '광운대' },
      right: { initial: '소', name: '소리울', school: '인덕대' },
    },
    caption: '이제 막 연결되었어요',
    stats: [
      { v: '0회', k: '합동 공연' },
      { v: '0회', k: '공연 응원' },
      { v: '0회', k: '교류 모임' },
    ],
    log: [],
    next: { title: '4월 버스킹 같이 하기', sub: '소리울이 보낸 제안 · 답을 기다리는 중' },
    notice: NOTICE,
  },
}

/** 기록이 없을 때 자리를 비우지 않게 */
export const relationEmptyLog = '아직 함께한 기록이 없어요. 공연에 응원하러 가면 여기에 쌓입니다.'

/** 모르는 id 면 기본 관계 — 화면이 비는 것보다 낫습니다 */
export const relationFor = (id: string): Relation => relationsByClub[id] ?? relation

/* ── C3 연결 상태 4단계 ─────────────────────────────
 * 로고의 케이블 B 와 같은 모티프 — 플러그가 맞물리고 신호가 흐릅니다.
 */
export const connectionStages = {
  stages: [
    {
      no: '1. 교류 신청',
      tag: '대기',
      art: 'idle' as const,
      lines: ['케이블 끝이 한쪽에서 나타나고, 상대의 응답을 기다립니다.', '“새로운 연결이 기다리고 있어요”'],
    },
    {
      no: '2. 교류 수락',
      tag: '연결',
      art: 'connected' as const,
      lines: ['두 플러그가 맞물리고 짧은 진동과 함께 빛이 퍼집니다.', '“새로운 밴드와 연결되었어요!”'],
    },
    {
      no: '3. 합동 공연 성사',
      tag: '신호',
      art: 'signal' as const,
      lines: ['케이블을 따라 음파가 흐르고 두 밴드 이름이 함께 뜹니다. 약 2초.', '“우리의 첫 합동 공연이 만들어졌어요!”'],
    },
    {
      no: '4. 공연 응원 방문',
      tag: '기록',
      art: 'cheer' as const,
      lines: [
        '상대 밴드 부원이 현장에서 QR 체크인하면 음표 하나가 케이블을 타고 건너갑니다.',
        '“렉사가 우리 공연에 응원하러 왔어요!”',
      ],
    },
  ],
  recordArt: 'idle' as const,
  notice: '공연이 확정된 시점과 실제로 끝난 시점을 구분합니다. 횟수는 끝난 뒤에 올라갑니다.',
}

/* ── C4 연결되었어요 (성사 순간) ────────────────────── */
export const connected = {
  badge: '새로운 연결',
  headline: ['멜로딕과 렉사가', '연결되었어요'],
  lines: ['이제 두 밴드의 공연이 서로에게 먼저 보입니다.', '함께 선 공연이 쌓일수록 선이 굵어져요.'],
  pair: ['멜', '렉'],
}

/* ── P1 공연 정보 (예매 후) ─────────────────────────── */
export const showLive = {
  hero: posters.glowHero,
  venue: radioGaga,
  badges: [
    { label: '예매 완료', tone: 'ink' as const },
    { label: '오늘', tone: 'accent' as const },
  ],
  titleLines: ['멜로딕 단독 공연', '〈겨울의 소리〉'],
  when: '11.22 (토) 19:00 · 라디오가가',
  entry: { title: '입장 코드 보기', sub: '일반 2매 · 음료 1잔 · 18:30부터 입장' },
  timeline: [
    { at: '18:30', dur: '30분', title: '관객 입장', sub: '입구에서 QR을 보여 주세요' },
    { at: '19:00', dur: '50분', title: '멜로딕', sub: '광운대 · 3곡', now: true },
    { at: '20:00', dur: '50분', title: '렉사', sub: '한양대 · 3곡' },
    { at: '21:00', dur: '40분', title: '하모닉 · 손아픔 합동', sub: '마지막 한 곡은 다 같이' },
  ],
  setlistOwner: '멜로딕',
  setlist: [
    { no: '01', title: '겨울의 소리', who: '보컬 이지우' },
    { no: '02', title: '밤의 라디오', who: '기타 최유성' },
    { no: '03', title: '다시 만나자', who: '전원' },
  ],
  canDo: [
    { initial: '현', title: '현장에서 사람 만나기', sub: '취향이 겹치는 관객을 알려드려요', to: 'people' },
    { initial: '굿', title: '사전 구매한 것 받기', sub: '음료 1잔 · 바에서 교환', to: 'store' },
    /** 공연이 끝나기 전에는 눌리지 않습니다 */
    { initial: '방', title: '방명록 남기기', sub: '공연이 끝나면 열려요', to: 'guestbook', lock: '끝나고' },
  ],
  notice: '공연 30분 전부터 입장할 수 있어요. 늦으면 곡과 곡 사이에 들어갑니다.',
}

/* ── P2 사전 구매 (굿즈·음료) ───────────────────────── */
export const preorder = {
  lead: '공연 당일 현장에서 받습니다. 줄 안 서도 돼요.',
  filters: ['전체', '음료', '굿즈', '한정'],
  drinksNote: '현장 바에서 교환',
  drinks: [
    { id: 'beer', initial: '음', name: '생맥주', price: 3000, priceLabel: '3,000원', initialQty: 1 },
    { id: 'soft', initial: '무', name: '무알콜 음료', price: 2500, priceLabel: '2,500원', initialQty: 0 },
  ],
  goodsNote: '수량 한정',
  goods: [
    { id: 'pickbox', name: '기타 피크 보관함', sub: '앰프 모양 · 한정 30개', price: 12000, priceLabel: '12,000원', photo: goodsPickBox, limited: true },
    // 공연 티셔츠는 아직 사진이 없어 회색 자리로 둡니다
    { id: 'tee', name: '공연 티셔츠', sub: 'S / M / L', price: 15000, priceLabel: '15,000원', photo: null },
    { id: 'keyring', name: '헤드셋 키링', sub: '한정 50개', price: 7000, priceLabel: '7,000원', photo: goodsKeyring, limited: true },
    { id: 'magnet', name: '기타 자석 4종', sub: '세트', price: 9000, priceLabel: '9,000원', photo: goodsMagnet },
  ],
  notice: '공연 2일 전까지 바꿀 수 있어요. 당일 취소는 어렵습니다.',
}

/* ── P3 입장 완료 ───────────────────────────────────── */
export const entered = {
  /** 찢어 낸 티켓 반쪽 — 「입장했어요」 라는 큰 동그라미 대신 증거를 보여 줍니다 */
  stub: {
    state: '입장 완료',
    at: '18:42',
    show: '멜로딕 단독 공연',
    detail: '일반 2매 · 음료 1잔',
    order: '42번째 입장',
  },
  /** 현장에서 하나씩 지워 가는 목록 */
  todo: [
    {
      id: 'drink',
      title: '음료 1잔 받기',
      sub: '바에서 이 화면을 보여 주세요',
      badge: '미교환',
      doneBadge: '교환함',
      accent: true,
    },
    {
      id: 'people',
      title: '옆자리에 누가 있는지 보기',
      sub: '취향 겹치는 관객 3명',
      to: 'people',
    },
    {
      id: 'guestbook',
      title: '방명록 남기기',
      sub: '공연이 끝나면 열려요',
      lock: '끝나고',
    },
  ],
  nextAt: '19:00',
  next: { initial: '멜', name: '멜로딕', sub: '광운대 · 3곡 · 50분', badge: '첫 순서' },
  notice: '공연 중에는 화면을 어둡게 해 주세요. 방명록은 끝나면 열립니다.',
}


/* ── P4 현장 네트워킹 ───────────────────────────────── */
export const nearbyPeople = {
  headline: ['취향이 겹치는', '세 명이 와 있어요'],
  lead: '관심사와 좋아하는 밴드를 비교해 골랐어요.',
  people: [
    {
      id: 'yujin',
      initial: '유',
      name: '유진',
      sub: '서울과기대 · 베이스',
      overlap: '겹치는 것 4',
      strong: true,
      tags: [
        { label: '시티팝', on: true },
        { label: '실리카겔', on: true },
        { label: '베이스', on: false },
        { label: '라디오가가 단골', on: true },
      ],
      mission: '“오늘 제일 기대하는 팀이 어디예요?”',
    },
    {
      id: 'doyun',
      initial: '도',
      name: '도윤',
      sub: '삼육대 · 드럼',
      overlap: '겹치는 것 3',
      strong: false,
      tags: [
        { label: '록', on: true },
        { label: '드럼', on: true },
        { label: '합주실 구함', on: false },
      ],
      mission: '“합주실 어디 쓰세요?”',
    },
  ],
  tapRow: { title: '휴대폰 맞대서 바로 연결', sub: '가까이 있는 사람과 · NFC' },
  madeCount: '1',
  made: [{ initial: '세', name: '세연', sub: '19:24 · 휴대폰 맞대서 연결', badge: '연결됨' }],
  notice: '연결은 이 공연에서만 보입니다. 서로 수락하면 다음 공연 알림으로 이어져요.',
}

/* ── P5 휴대폰 맞대기 (NFC) ─────────────────────────── */
export const tapToConnect = {
  headline: ['휴대폰 뒷면을', '서로 맞대 주세요'],
  lines: ['가까이 대면 서로의 프로필이 뜨고,', '둘 다 수락하면 연결이 남습니다.'],
  status: '상대 휴대폰을 찾는 중',
  hint: 'NFC가 꺼져 있으면 설정에서 켜 주세요',
  notice: '이름과 학교, 좋아하는 밴드만 보입니다. 연락처는 공유되지 않아요.',
}

/* ── P6 방명록 ──────────────────────────────────────── */
export const guestbook = {
  title: '오늘 어땠어요?',
  lead: '남긴 말은 공연 페이지에 그대로 남습니다.',
  placeholder: '기억에 남는 순간을 적어 주세요',
  maxLength: 200,
  count: '24개',
  entries: [
    { initial: '세', name: '세연', at: '21:48', text: '마지막 곡 다 같이 부를 때 소름 돋았어요. 다음 공연도 꼭 올게요!' },
    { initial: '익', name: '익명', at: '21:41', text: '베이스 소리 진짜 좋았습니다 ㅠㅠ' },
    { initial: '유', name: '유진', at: '21:30', text: '오늘 처음 왔는데 옆자리 분이랑 밴드 얘기하다가 친해졌어요. 이런 거 좋네요.' },
  ],
  notice: '공연이 끝난 뒤 48시간 동안 쓸 수 있어요.',
}
