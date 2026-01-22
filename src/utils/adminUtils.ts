/**
 * 게스트 키 생성 함수 (일관된 키 생성을 위해 모든 곳에서 사용)
 */
export const makeGuestKey = (name: string, phone: string): string => {
  const normalizedPhone = String(phone || '').replace(/\D/g, '')
  return `${String(name || '').trim()}_${normalizedPhone}`
}

/**
 * 개인 로그인 링크 생성 함수
 */
export const generatePersonalLoginLink = (name: string, phone: string): string => {
  const normalizedPhone = phone.replace(/\D/g, '')
  const combinedData = `${name}|${normalizedPhone}`
  const base64Token = btoa(encodeURIComponent(combinedData))
  const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const baseUrl = window.location.origin
  return `${baseUrl}/t/${urlSafeToken}`
}

