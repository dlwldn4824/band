import { resolveGuestBookedAt } from './bookingTime'

export function formatBookedAtDisplay(
  guest: { bookedAt?: number; name?: string; phone?: string; [key: string]: unknown },
  bookingDatesMap?: Record<string, unknown>
): string {
  const bookedAt = resolveGuestBookedAt(guest, bookingDatesMap)
  if (!bookedAt) return ''
  return new Date(bookedAt).toLocaleString('ko-KR')
}
