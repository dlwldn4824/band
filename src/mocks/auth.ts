/**
 * 로그인 목 데이터.
 *
 * MOCK: 카카오 SDK 와 Firebase 커스텀 토큰이 붙기 전까지 쓰는 가짜 사용자입니다.
 * 실제로 바꿀 때는 `src/lightui/auth/kakao.ts` 안만 고치면 되고 이 파일은 지우면 됩니다.
 */

export interface BandyUser {
  id: string
  provider: 'kakao'
  nickname: string
  /** 온보딩 전에는 비어 있습니다 */
  school: string
  department: string
  /** 아바타 자리에 쓰는 한 글자 */
  initial: string
  /** 동아리에서의 권한 — 운영진만 할 수 있는 일이 있습니다 */
  role: 'manager' | 'member'
}

/** MOCK: 카카오에서 막 돌아온 사용자 — 학교·학과는 아직 없습니다 */
export const mockKakaoUser: BandyUser = {
  id: 'kakao_1047352991',
  provider: 'kakao',
  nickname: '이지우',
  school: '',
  department: '',
  initial: '이',
  role: 'manager',
}

/** 온보딩 화면에서 고르는 보기 */
export const onboardingOptions = {
  schools: ['광운대학교', '한양대학교', '삼육대학교', '서울과학기술대학교'],
  departments: ['로봇학부', '컴퓨터정보공학부', '전자공학과', '경영학부', '기타'],
}
