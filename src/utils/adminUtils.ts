import { normalizePhone, normalizeName, makeGuestKey } from './guestUtils'
import { adminCreateLoginToken, buildPersonalLoginLink } from '../services/loginTokensApi'

/**
 * 게스트 키 생성 (이름+전화번호)
 */
export { makeGuestKey }

/**
 * userProfile 문서 ID 생성 (이름+전화번호)
 */
export const makeUserIdByPhone = (name: string, phone: string): string => {
  return makeGuestKey(name, phone)
}

/**
 * 개인 로그인 링크 생성 (불투명 토큰 — 서버 API)
 * 관리자 토큰이 있을 때 사용. 실패 시 null.
 */
export const generatePersonalLoginLink = async (
  name: string,
  phone: string
): Promise<string | null> => {
  const token = await adminCreateLoginToken(normalizeName(name), normalizePhone(phone))
  if (!token) return null
  return buildPersonalLoginLink(token)
}
