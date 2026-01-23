import { normalizePhone } from './guestUtils'

/**
 * 게스트 키 생성 함수 (전화번호만 사용)
 * userProfile 문서 ID 생성용 (phone-only 형식)
 * 이름은 변경 가능하므로 전화번호만으로 식별
 * @param _name - 사용하지 않음 (하위 호환성을 위해 유지)
 * @param phone - 전화번호
 */
export const makeGuestKey = (_name: string, phone: string): string => {
  // ✅ 전화번호만 키로 사용 (이름은 무시)
  return normalizePhone(phone)
}

/**
 * userProfile 문서 ID 생성 함수 (전화번호만 사용)
 * makeGuestKey의 별칭 (명확성을 위해)
 */
export const makeUserIdByPhone = (phone: string): string => {
  return normalizePhone(phone)
}

/**
 * 개인 로그인 링크 생성 함수 (전화번호만 사용)
 * 이름은 변경 가능하므로 전화번호만으로 링크 생성
 * @param _name - 사용하지 않음 (하위 호환성을 위해 유지)
 * @param phone - 전화번호
 */
export const generatePersonalLoginLink = (_name: string, phone: string): string => {
  const normalizedPhone = normalizePhone(phone)
  // ✅ 전화번호만 토큰으로 사용 (이름은 제외)
  const base64Token = btoa(encodeURIComponent(normalizedPhone))
  const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const baseUrl = window.location.origin
  return `${baseUrl}/t/${urlSafeToken}`
}

