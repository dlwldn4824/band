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
 * 한국 휴대폰 번호 보정 (엑셀 업로드 시 앞 0이 날아가는 문제 해결)
 * - 숫자로 저장된 경우 문자열로 변환
 * - 지수표기 방지
 * - 10자리면 앞에 0 붙여서 11자리로 보정
 */
export const normalizeKoreanMobile = (raw: any): string => {
  // 1) 원본을 문자열로
  let s = String(raw ?? '').trim()

  // 2) 지수표기(1.027e10 같은) 방지: 숫자면 정수 문자열로 변환
  //    (엑셀에서 큰 숫자가 지수로 오는 경우 대비)
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    s = Math.trunc(raw).toString()
  }

  // 3) 숫자만 남김
  s = s.replace(/\D/g, '')

  // 4) 10자리면(앞 0이 날아간 휴대폰) '0'을 붙여서 11자리로
  if (s.length === 10) {
    s = '0' + s
  }

  return s // 예: 01027865023
}

/**
 * 이름 정규화 (앞뒤 공백 제거)
 */
export const normalizeName = (name: string | undefined | null): string => {
  if (!name) return ''
  return String(name).trim()
}

/**
 * 게스트 객체에서 전화번호 필드 추출 (다양한 필드명 지원)
 * 엑셀 업로드, 웹 예매 등 다양한 소스에서 올 수 있는 다양한 필드명을 모두 지원
 */
export const getGuestPhone = (guest: any): string => {
  if (!guest || typeof guest !== 'object') return ''
  
  // 다양한 필드명 시도 (우선순위 순)
  return guest.phone || 
         guest['전화번호'] || 
         guest.Phone || 
         guest.phoneNumber || 
         guest['연락처'] || 
         guest['휴대폰'] || 
         guest['핸드폰'] ||
         guest['전화 번호'] ||
         guest['전화번호 '] ||
         guest['Phone'] ||
         guest['PHONE'] ||
         String(guest.phone || '').trim() || // 숫자로 저장된 경우
         ''
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
 * 같은 전화번호가 있으면 나중 값으로 덮어쓰기 (삭제된 게스트도 포함하여 저장)
 * 키는 전화번호만 사용 (이름은 변경 가능하므로)
 * 
 * ⚠️ 주의: 삭제된 게스트도 포함하여 반환합니다.
 * UI 렌더링 시점에 `isDeleted !== true`로 필터링해야 합니다.
 */
export const dedupeGuests = (guests: Array<{ name?: string; phone?: string; isDeleted?: boolean; deletedAt?: number; [key: string]: any }>): Array<any> => {
  const guestMap = new Map<string, any>()
  
  for (const guest of guests) {
    // ✅ 전화번호만 키로 사용 (이름은 무시)
    const guestPhone = normalizePhone(guest.phone || guest['전화번호'] || guest.Phone)
    if (!guestPhone) {
      continue
    }
    
    // 정규화된 값으로 저장 (일관성 유지)
    const normalizedGuest = {
      ...guest,
      phone: guestPhone,
      name: normalizeName(guest.name || guest['이름'] || guest.Name)
    }
    
    // ✅ 같은 전화번호면 "나중 값"으로 덮어쓰기 (삭제 플래그도 포함하여 저장됨)
    guestMap.set(guestPhone, normalizedGuest)
  }
  
  return Array.from(guestMap.values())
}
