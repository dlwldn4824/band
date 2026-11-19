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
