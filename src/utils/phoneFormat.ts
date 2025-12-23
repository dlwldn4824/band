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
  
  // 11자리이고 010으로 시작하는지 확인
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
  
  // 이미 포맷팅된 형식이면 그대로 반환
  if (/^010-\d{4}-\d{4}$/.test(phone)) {
    return phone
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
  
  // 010으로 시작하는지 확인
  if (!digits.startsWith('010')) {
    return { valid: false, message: '전화번호는 010으로 시작해야 합니다.' }
  }
  
  // 11자리인지 확인
  if (digits.length !== 11) {
    return { valid: false, message: '전화번호는 11자리여야 합니다. (예: 010-1234-5678)' }
  }
  
  return { valid: true }
}



