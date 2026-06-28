import { parseKoreanDate } from '../analytics/device'
import { normalizePhone } from './guestUtils'

export type BookingSource = 'web_login' | 'onsite' | 'admin_approve' | 'excel_import'

export function getBookingDocId(phone: string): string {
  return normalizePhone(phone)
}

function parseExcelSerialDate(serial: number): number | null {
  if (!Number.isFinite(serial) || serial <= 0) return null
  // Excel 1900 date system (rough; sufficient for booking dates)
  const utcDays = Math.floor(serial - 25569)
  return utcDays * 86400 * 1000
}

export function parseBookedAt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    if (value > 1_000_000_000_000) return value
    if (value > 1_000_000_000) return value * 1000
    return parseExcelSerialDate(value)
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime()
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(date.getTime()) ? null : date.getTime()
    } catch {
      return null
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const korean = parseKoreanDate(trimmed)
    if (korean) {
      const hasTime = /\d{1,2}:\d{2}/.test(trimmed)
      if (!hasTime) {
        korean.setHours(12, 0, 0, 0)
      }
      return korean.getTime()
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
  }

  return null
}

const BOOKED_AT_ROW_KEYS = [
  'bookedAt',
  '예매일시',
  '예매일',
  '예매 날짜',
  '예매날짜',
  '등록일',
  '등록일시',
  '신청일',
  '신청일시',
  'createdAt',
  'CreatedAt',
] as const

export function parseBookedAtFromRow(row: Record<string, unknown>): number | null {
  for (const key of BOOKED_AT_ROW_KEYS) {
    const parsed = parseBookedAt(row[key])
    if (parsed) return parsed
  }
  return null
}

export function getDaysBeforePerformance(
  performanceDate: string | null | undefined,
  bookedAtMs: number
): number | null {
  if (!performanceDate) return null
  const eventDate = parseKoreanDate(performanceDate)
  if (!eventDate) return null

  const eventDay = new Date(eventDate)
  eventDay.setHours(0, 0, 0, 0)

  const bookedDay = new Date(bookedAtMs)
  bookedDay.setHours(0, 0, 0, 0)

  const diffMs = eventDay.getTime() - bookedDay.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

export function getHoursSinceBooking(bookedAtMs: number | null | undefined, now = Date.now()): number | undefined {
  if (!bookedAtMs) return undefined
  const hours = (now - bookedAtMs) / (60 * 60 * 1000)
  return Math.round(hours * 10) / 10
}

export function getBookingLeadTimeMetrics(
  guest: { bookedAt?: number; [key: string]: unknown },
  bookingDatesMap: Record<string, unknown> | undefined,
  performanceDate: string | null | undefined,
  now = Date.now()
): { hours_since_booking?: number; days_before_performance_at_booking?: number } {
  const bookedAt = resolveGuestBookedAt(guest, bookingDatesMap)
  if (!bookedAt) return {}
  return {
    hours_since_booking: getHoursSinceBooking(bookedAt, now),
    days_before_performance_at_booking: getDaysBeforePerformance(performanceDate, bookedAt) ?? undefined,
  }
}
export function resolveGuestBookedAt(
  guest: { bookedAt?: number; [key: string]: unknown },
  bookingDatesMap?: Record<string, unknown>
): number | null {
  if (guest.bookedAt) return guest.bookedAt

  const phone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
  const name = String(guest.name || guest['이름'] || guest.Name || '')
  const phoneKey = normalizePhone(phone)
  const legacyKey = phoneKey ? `${name}_${phoneKey}` : ''

  if (bookingDatesMap) {
    const fromMap =
      (phoneKey && bookingDatesMap[phoneKey]) ||
      (legacyKey && bookingDatesMap[legacyKey])
    const parsed = parseBookedAt(fromMap)
    if (parsed) return parsed
  }

  return null
}
