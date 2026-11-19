/**
 * 라이트 UI 라우트.
 *
 * Figma 페이지 `앱 · 라이트 UI (레퍼런스 반영)` 의 프로토타입 연결 79개를
 * 그대로 옮긴 것이라, 화면에서 어디로 가는지는 Figma 와 1:1 입니다.
 * 기존 2025 공연 앱(/login, /dashboard …)과 섞이지 않게 전부 /ui 아래에 둡니다.
 */

export const P = {
  // 관객
  start: '/ui/start',                                   // S1
  onboarding: '/ui/start/profile',                      // 온보딩 1스텝 (Figma 프레임 없음)
  home: '/ui',                                          // L1
  map: '/ui/map',                                       // S2
  search: '/ui/search',                                 // S3
  show: (id = 'glow') => `/ui/show/${id}`,              // D1
  book: (id = 'glow') => `/ui/show/${id}/book`,         // D2
  deposit: (id = 'glow') => `/ui/show/${id}/deposit`,   // D3
  ticket: (id = 'glow') => `/ui/ticket/${id}`,          // D4
  tickets: '/ui/tickets',                               // S7
  notifications: '/ui/notifications',                   // S8
  me: '/ui/me',                                         // S14

  // 동아리
  clubs: '/ui/clubs',                                   // L2
  club: (id = 'melodic') => `/ui/club/${id}`,           // S4
  recruitNew: '/ui/recruit/new',                        // S5
  proposal: (id = '1') => `/ui/proposal/${id}`,         // S6
  chat: (id = '1') => `/ui/chat/${id}`,                 // S9
  showNew: '/ui/show/new',                              // S10
  deposits: '/ui/deposits',                             // S11
  settlement: '/ui/settlement',                         // S13

  // 공연장
  venue: '/ui/venue',                                   // L3
  entry: '/ui/entry',                                   // S12

  // 초대
  invite: '/ui/invite',                                 // S15
  inviteSms: '/ui/invite/sms',                          // S16
  inviteCard: (code = 'glow') => `/ui/i/${code}`,       // S17

  // 공연 당일 (티켓 구매 이후)
  live: (id = 'glow') => `/ui/live/${id}`,                      // P1
  liveStore: (id = 'glow') => `/ui/live/${id}/store`,           // P2
  liveEntered: (id = 'glow') => `/ui/live/${id}/entered`,       // P3
  livePeople: (id = 'glow') => `/ui/live/${id}/people`,         // P4
  liveTap: (id = 'glow') => `/ui/live/${id}/tap`,               // P5
  liveGuestbook: (id = 'glow') => `/ui/live/${id}/guestbook`,   // P6

  // 연결
  connections: '/ui/connections',                       // C1
  connection: (id = 'melodic') => `/ui/connections/${id}`, // C2
  connectionStages: '/ui/connections/stages',           // C3
  connected: '/ui/connections/new',                     // C4
} as const
