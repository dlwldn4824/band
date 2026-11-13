/**
 * 서비스 브랜드 — 화면에 보이는 이름은 여기 한 곳에서만 바꿉니다.
 *
 * 화면에 보이는 이름은 '밴디'(영문 BANDY)입니다.
 * 한때 '마주'로 바꿨다가 되돌렸는데, 이 파일 하나만 고치면 되도록
 * 모든 화면이 아래 상수를 참조합니다.
 *
 * 코드 안의 식별자(bandyCore, bandyFormat, Bandy.css 등)는 그대로 둡니다.
 * 파일·심볼까지 한꺼번에 바꾸면 변경분만 커지고 얻는 게 없습니다.
 */

export const SERVICE_NAME = '밴디'
export const SERVICE_NAME_EN = 'BANDY'

/** 헤더 워드마크처럼 둘을 같이 쓰는 자리 */
export const SERVICE_WORDMARK = `${SERVICE_NAME_EN} · ${SERVICE_NAME}`

/** "내 밴디", "밴디 플랫폼" 처럼 이름을 끼워 쓰는 문구 */
export const myPageLabel = () => `내 ${SERVICE_NAME}`
