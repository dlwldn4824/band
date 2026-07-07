/**
 * 게스트 정규화 유틸 (src/utils/guestUtils.ts 서버 포팅)
 */

export const normalizePhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

export const normalizeName = (name) => {
  if (!name) return ''
  return String(name).trim()
}

export const normalizeKoreanMobile = (raw) => {
  let s = String(raw ?? '').trim()
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    s = Math.trunc(raw).toString()
  }
  s = s.replace(/\D/g, '')
  if (s.length === 10) {
    s = '0' + s
  }
  return s
}

export const getGuestPhone = (guest) => {
  if (!guest || typeof guest !== 'object') return ''
  return (
    guest.phone ||
    guest['전화번호'] ||
    guest.Phone ||
    guest.phoneNumber ||
    guest['연락처'] ||
    guest['휴대폰'] ||
    guest['핸드폰'] ||
    guest['전화 번호'] ||
    guest['전화번호 '] ||
    guest['PHONE'] ||
    ''
  )
}

export const getGuestName = (guest) => {
  if (!guest || typeof guest !== 'object') return ''
  return normalizeName(guest.name || guest['이름'] || guest.Name || '')
}

/**
 * 전화번호 기준 중복 제거 (나중 값 우선, 삭제된 게스트 포함)
 */
export const dedupeGuests = (guests) => {
  const guestMap = new Map()
  for (const guest of guests) {
    const phone = normalizePhone(getGuestPhone(guest))
    if (!phone) continue
    guestMap.set(phone, {
      ...guest,
      phone,
      name: getGuestName(guest),
    })
  }
  return Array.from(guestMap.values())
}

/**
 * 클라이언트에 반환할 본인 게스트 정보 (필요한 필드만)
 */
export const toPublicGuest = (guest) => ({
  name: getGuestName(guest),
  phone: normalizePhone(getGuestPhone(guest)),
  entryNumber: guest.entryNumber ?? null,
  checkedIn: guest.checkedIn === true,
  checkedInAt: guest.checkedInAt ?? null,
  paymentConfirmed: guest.paymentConfirmed === true,
  isWalkIn: guest.isWalkIn === true,
  ticketReceived: guest.ticketReceived === true,
  bookedAt: guest.bookedAt ?? null,
})
