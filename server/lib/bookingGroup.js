import crypto from 'crypto'

/**
 * 동행자 예매 그룹 헬퍼 (서버)
 */

export function createBookingGroupId() {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * 전화번호 미등록 동행자 이름: {대표이름}2, {대표이름}3 ...
 * 이미 같은 전화로 쓰인 접미는 건너뜀
 */
export function allocateSharedCompanionName(primaryName, phone, usedKeys, existingGuests) {
  const base = String(primaryName || '').trim()
  let suffix = 2
  while (suffix < 100) {
    const candidate = `${base}${suffix}`
    const key = `${candidate}|${phone}`
    const takenInBatch = usedKeys.has(key)
    const takenExisting = existingGuests.some(
      (g) =>
        g.isDeleted !== true &&
        String(g.name || '').trim() === candidate &&
        String(g.phone || '').replace(/\D/g, '') === phone
    )
    if (!takenInBatch && !takenExisting) {
      usedKeys.add(key)
      return candidate
    }
    suffix += 1
  }
  return `${base}${Date.now()}`
}

/**
 * 그룹 멤버 정렬: 대표 → 공유전화 동행 → 개별전화 동행, 이름순
 */
export function sortGroupMembers(members) {
  return [...members].sort((a, b) => {
    const aPrimary = a.isPrimaryBooker === true ? 0 : 1
    const bPrimary = b.isPrimaryBooker === true ? 0 : 1
    if (aPrimary !== bPrimary) return aPrimary - bPrimary
    const aShared = a.companionMode === 'shared_phone' ? 0 : 1
    const bShared = b.companionMode === 'shared_phone' ? 0 : 1
    if (aShared !== bShared) return aShared - bShared
    return String(a.name || '').localeCompare(String(b.name || ''), 'ko')
  })
}
