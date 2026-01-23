/**
 * 게스트 데이터 정규화 및 중복 체크 유틸리티
 * 모든 게스트 관련 정규화를 통일하여 중복 방지
 */

/**
 * 전화번호 정규화 (숫자만 남김)
 * 모든 곳에서 동일한 방식으로 정규화하여 중복 방지
 */
export const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return ''
  // 숫자가 아닌 모든 문자 제거 (하이픈, 공백, 괄호, + 등 모두 제거)
  return String(phone).replace(/\D/g, '')
}

/**
 * 이름 정규화 (앞뒤 공백 제거)
 */
export const normalizeName = (name: string | undefined | null): string => {
  if (!name) return ''
  return String(name).trim()
}

/**
 * 게스트 중복 키 생성 (전화번호만 사용 - 이름은 변경 가능하므로)
 * 전화번호가 동일하면 같은 사람으로 간주
 * @param _name - 사용하지 않음 (하위 호환성을 위해 유지)
 * @param phone - 전화번호
 */
export const getGuestKey = (_name: string | undefined | null, phone: string | undefined | null): string => {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return ''
  // 전화번호만 키로 사용 (이름은 변경 가능하므로)
  return normalizedPhone
}

/**
 * 게스트 중복 체크 (전화번호만 비교)
 */
export const isDuplicateGuest = (
  guest1: { name?: string; phone?: string; [key: string]: any },
  guest2: { name?: string; phone?: string; [key: string]: any }
): boolean => {
  const phone1 = normalizePhone(guest1.phone || guest1['전화번호'] || guest1.Phone)
  const phone2 = normalizePhone(guest2.phone || guest2['전화번호'] || guest2.Phone)
  
  if (!phone1 || !phone2) return false
  return phone1 === phone2
}

/**
 * 게스트 배열 중복 제거 (전화번호 기준)
 * 삭제된 게스트는 제외하고, 같은 전화번호가 있으면 나중 값으로 덮어쓰기
 * 키는 전화번호만 사용 (이름은 변경 가능하므로)
 */
export const dedupeGuests = (guests: Array<{ name?: string; phone?: string; isDeleted?: boolean; [key: string]: any }>): Array<any> => {
  const guestMap = new Map<string, any>()
  
  for (const guest of guests) {
    // 삭제된 게스트는 제외
    if (guest.isDeleted === true) {
      continue
    }
    
    // ✅ 전화번호만 키로 사용 (이름은 무시)
    const guestPhone = normalizePhone(guest.phone || guest['전화번호'] || guest.Phone)
    if (!guestPhone) {
      continue
    }
    
    // 키는 정규화된 전화번호만 사용
    const key = guestPhone
    
    // 정규화된 값으로 저장 (일관성 유지)
    const normalizedGuest = {
      ...guest,
      phone: guestPhone,
      name: normalizeName(guest.name || guest['이름'] || guest.Name)
    }
    
    // 같은 키(전화번호)가 있으면 나중 값으로 덮어쓰기 (upsert 패턴)
    guestMap.set(key, normalizedGuest)
  }
  
  return Array.from(guestMap.values())
}
