import { normalizePhone, normalizeName } from './guestUtils'

/**
 * 게스트 키 생성 함수 (일관된 키 생성을 위해 모든 곳에서 사용)
 * userProfile 문서 ID 생성용 (name_phone 형식)
 */
export const makeGuestKey = (name: string, phone: string): string => {
  const normalizedName = normalizeName(name)
  const normalizedPhone = normalizePhone(phone)
  return `${normalizedName}_${normalizedPhone}`
}

/**
 * 개인 로그인 링크 생성 함수
 */
export const generatePersonalLoginLink = (name: string, phone: string): string => {
  const normalizedName = normalizeName(name)
  const normalizedPhone = normalizePhone(phone)
  const combinedData = `${normalizedName}|${normalizedPhone}`
  const base64Token = btoa(encodeURIComponent(combinedData))
  const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const baseUrl = window.location.origin
  return `${baseUrl}/t/${urlSafeToken}`
}

