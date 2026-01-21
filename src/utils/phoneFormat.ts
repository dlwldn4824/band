/**
 * 전화번호 포맷팅 유틸리티
 */

/**
 * 전화번호를 010-0000-0000 형식으로 포맷팅
 * @param phone 전화번호 (하이픈 포함 또는 미포함)
 * @returns 포맷팅된 전화번호 (010-0000-0000) 또는 원본
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return phone
  
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '')
  
  // 이미 포맷팅된 형식이면 그대로 반환
  if (/^010-\d{4}-\d{4}$/.test(phone)) {
    return phone
  }
  
  // 11자리이고 010으로 시작하는지 확인
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
  
  // 10자리 숫자인 경우 앞에 0을 추가하여 010으로 시작하는 11자리로 만듦
  // 예: "1040564075" → "01040564075" → "010-4056-4075"
  if (digits.length === 10) {
    const withZero = `0${digits}`
    if (withZero.startsWith('010')) {
      return `${withZero.slice(0, 3)}-${withZero.slice(3, 7)}-${withZero.slice(7, 11)}`
    }
  }
  
  return phone
}

/**
 * 전화번호 검증 (010으로 시작, 11자리)
 * @param phone 전화번호
 * @returns 검증 결과
 */
export const validatePhoneNumber = (phone: string): { valid: boolean; message?: string } => {
  if (!phone || !phone.trim()) {
    return { valid: false, message: '전화번호를 입력해주세요.' }
  }
  
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '')
  
  // 10자리인 경우 앞에 0을 추가하여 검증
  const normalizedDigits = digits.length === 10 ? `0${digits}` : digits
  
  // 010으로 시작하는지 확인
  if (!normalizedDigits.startsWith('010')) {
    return { valid: false, message: '전화번호는 010으로 시작해야 합니다.' }
  }
  
  // 11자리인지 확인 (10자리 입력도 허용)
  if (normalizedDigits.length !== 11) {
    return { valid: false, message: '전화번호는 11자리여야 합니다. (예: 010-1234-5678)' }
  }
  
  return { valid: true }
}



