import posterGlow from './assets/poster-glow.jpg'
import posterCustom from './assets/poster-custom.jpg'
import posterNostalgic from './assets/poster-nostalgic.jpg'
import wall from './assets/wall.jpg'
import stage from './assets/chapter-stage.jpg'
import entry from './assets/chapter-entry.jpg'
import scHome from './assets/screens/home.jpg'
import scDetail from './assets/screens/detail.jpg'
import scTicket from './assets/screens/ticket.jpg'
import scConnect from './assets/screens/connect.jpg'
import scRecord from './assets/screens/record.jpg'

export const photos = { wall, stage, entry }

/** 히어로 포스터 띠 — 우리가 실제로 올렸던 공연들입니다 */
export const posters = [
  { src: posterGlow, title: 'GLOW', sub: 'MELODIC · THEN, · THORNAPPME' },
  { src: posterCustom, title: 'CUSTOM', sub: 'lexsound × melodic' },
  { src: posterNostalgic, title: '향수어린 추억들', sub: 'melod.ic 두 번째 정기공연' },
  { src: wall, title: '지난 공연들', sub: '노원 대학가' },
]

export const soonTiles = [
  { title: '겨울의 소리', sub: '멜로딕 단독 공연 · 라디오가가' },
  { title: '3월 연합 공연', sub: '팀 구하는 중' },
]

/**
 * 가운데 고정된 폰 안에서 넘어가는 화면들.
 * Figma `앱 · 라이트 UI (레퍼런스 반영)` 에서 그대로 내려받은 실제 앱 화면입니다.
 */
export const tour = [
  {
    src: scHome,
    side: 'l' as const,
    head: '이번 주엔 어디서 공연하지?',
    sub: '학교 밖에도 재밌는 공연은 많으니까. 가까운 공연부터 처음 보는 밴드의 무대까지.',
  },
  {
    src: scDetail,
    side: 'r' as const,
    head: '누가 나오는지, 어떤 공연인지.',
    sub: '출연 팀과 시간, 장소까지 한 화면에. 마음에 들면 친구한테 그대로 보내면 돼.',
  },
  {
    src: scTicket,
    side: 'l' as const,
    head: '링크 하나로 예매하고, QR로 입장.',
    sub: '앱 설치 없이 링크로 예매하고, 공연 당일엔 폰에 뜨는 티켓을 보여 주면 끝.',
  },
  {
    src: scConnect,
    side: 'r' as const,
    head: '우리랑 같이 공연할래?',
    sub: '다른 학교 밴드여도 괜찮아. 서로 음악이 맞으면, 일단 얘기해 보는 거지.',
  },
  {
    src: scRecord,
    side: 'l' as const,
    head: '공연 끝나고도 또 만나자.',
    sub: '합동 공연 몇 번, 응원 몇 번. 점수가 아니라 같이한 기록이 남습니다.',
  },
]

/**
 * 이미 함께 공연해 온 동아리들.
 * 공연 횟수 같은 숫자는 확인된 값이 아직 없어서 넣지 않았습니다 — 학교만 적습니다.
 */
export const clubs = [
  { name: '멜로딕', uni: '광운대' },
  { name: '렉사', uni: '서울과기대' },
  { name: '하모닉', uni: '삼육대' },
  { name: '아카펠라', uni: '서울여대' },
  { name: '손아름', uni: '인덕대' },
  { name: '블루노트', uni: '광운대' },
  { name: '소리울', uni: '서울여대' },
]

export const links = {
  shows: '/explore?mode=events',
  clubs: '/explore?mode=clubs',
  my: '/my',
  console: '/club-console',
}

/**
 * 확인된 숫자만 적습니다. 추정치나 목표치는 넣지 않습니다.
 * 바뀌면 이 블록만 고치면 페이지 전체에 반영됩니다.
 */
export const proof = [
  { n: '300명', label: '지금까지 공연을 보러 온 관객' },
  { n: '3회', label: 'BANDY로 치른 공연' },
  { n: '100만 원', label: '공연 한 번에 오간 결제액' },
  { n: '10곳+', label: '함께 공연해 온 밴드 동아리' },
]

/** 먼저 협력 의사를 밝힌 공연장 */
export const venues = ['홍대', '수락산']

/** 관객이 올 이유 — 티켓값은 우리가 실제로 받은 금액입니다 */
export const audienceReasons = [
  {
    head: '한 팀 보러 갔다가 네 팀을 봅니다.',
    body: '대학 밴드 공연은 보통 네다섯 팀이 함께 섭니다. 아는 밴드 하나만 보고 가도 모르던 세 팀을 같이 보게 돼요.',
  },
  {
    head: '티켓은 5천 원에서 1만 원.',
    body: '우리가 지금까지 받은 금액입니다. 학생은 더 싸고, 예매는 링크 하나로 끝나요.',
  },
  {
    head: '끝나고 그 밴드랑 얘기할 수 있습니다.',
    body: '공연장에서 프로필을 주고받습니다. 오늘 좋았던 팀의 다음 공연이 먼저 보이기 시작해요.',
  },
]

/** 팀 — 이 서비스를 누가 만들었는지 */
export const team = '8명이 외주 없이 직접 만들었고, 그중 5명은 무대에 서는 연주자입니다.'

/**
 * 공연장 문의처.
 * TODO: 실제 연락처로 바꿔 주세요 — 지금은 아래 섹션 안내 문구로만 연결됩니다.
 */
export const VENUE_CONTACT = ''

/** 02 Problem — 초안 문구 그대로 */
export const gripes = [
  { who: '밴드', text: '공연장을 빌리려니 돈이 부담되고,', note: '대관료 150만 원을 네다섯 팀이 나눠도 한 팀에 30만 원' },
  { who: '밴드', text: '같이 공연할 밴드를 찾으려니 아는 팀이 없고,', note: '선배가 아는 동아리, 작년에 한 번 섰던 무대가 전부' },
  { who: '관객', text: '공연 소식은 늘 뒤늦게 알게 되고.', note: '인스타 스토리를 놓치면 그 공연은 없었던 일' },
]

/**
 * 05 교류 기록.
 * 점수나 온도가 아니라 실제로 있었던 일만 셉니다. 활동이 없다고 깎이지도 않습니다.
 * 같은 공연에 여러 명이 응원을 가도 밴드 사이에서는 1회입니다.
 */
export interface Exchange {
  short: string
  name: string
  uni: string
  deg: number
  r: number
  together: number
  cheer: number
  meet: number
}

export const exchanges: Exchange[] = [
  { short: '렉', name: '렉사', uni: '서울과기대', deg: -66, r: 148, together: 3, cheer: 3, meet: 1 },
  { short: '하', name: '하모닉', uni: '삼육대', deg: -136, r: 156, together: 2, cheer: 2, meet: 0 },
  { short: '아', name: '아카펠라', uni: '서울여대', deg: -10, r: 172, together: 2, cheer: 1, meet: 1 },
  { short: '손', name: '손아름', uni: '인덕대', deg: 184, r: 148, together: 0, cheer: 3, meet: 0 },
  { short: '블', name: '블루노트', uni: '광운대', deg: 92, r: 162, together: 0, cheer: 1, meet: 0 },
  { short: '소', name: '소리울', uni: '서울여대', deg: 38, r: 182, together: 0, cheer: 0, meet: 1 },
]
