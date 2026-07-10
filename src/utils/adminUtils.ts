import { normalizePhone, normalizeName, makeGuestKey } from './guestUtils'

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

/** 이름|전화번호 → URL-safe base64 토큰 */
export const encodePersonalLoginToken = (name: string, phone: string): string => {
  const normalizedName = normalizeName(name)
  const normalizedPhone = normalizePhone(phone)
  const combinedData = `${normalizedName}|${normalizedPhone}`
  const base64Token = btoa(encodeURIComponent(combinedData))
  return base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * 개인 로그인 링크 생성 (이름|전화번호 토큰)
 */
export const generatePersonalLoginLink = (name: string, phone: string): string => {
  const urlSafeToken = encodePersonalLoginToken(name, phone)
  const baseUrl = window.location.origin
  return `${baseUrl}/t/${urlSafeToken}`
}

