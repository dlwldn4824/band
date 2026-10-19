/** BANDY 플랫폼 화면의 표시 포맷 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatEventDate(ms?: number | null): string {
  if (!ms) return '일정 미정'
  const d = new Date(ms)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

export function formatEventDateTime(ms?: number | null): string {
  if (!ms) return '일정 미정'
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatEventDate(ms)} ${hh}:${mm}`
}

/** 목록 카드용 — "D-12" / "오늘" / "지난 행사" */
export function formatCountdown(ms?: number | null): string {
  if (!ms) return ''
  const startOfDay = (value: number) => {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const days = Math.round((startOfDay(ms) - startOfDay(Date.now())) / (24 * 60 * 60 * 1000))
  if (days === 0) return '오늘'
  if (days === 1) return '내일'
  if (days > 0) return `D-${days}`
  return '지난 행사'
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return '무료'
  return `${price.toLocaleString('ko-KR')}원`
}

export function formatRelativeTime(ms?: number | null): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return formatEventDate(ms)
}

/** 입력받은 날짜·시각을 timestamp 로 — 행사 등록 폼에서 사용 */
export function toTimestamp(date: string, time: string): number | null {
  if (!date) return null
  const parsed = Date.parse(`${date}T${time || '00:00'}:00`)
  return Number.isNaN(parsed) ? null : parsed
}

/** timestamp 를 <input type="date"> 값으로 */
export function toDateInputValue(ms?: number | null): string {
  if (!ms) return ''
  const d = new Date(ms)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function toTimeInputValue(ms?: number | null): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 남은 좌석 표시 — 정원이 없으면 빈 문자열 */
export function formatSeats(seatsLeft: number | null, capacity: number): string {
  if (capacity <= 0 || seatsLeft === null) return '정원 제한 없음'
  if (seatsLeft <= 0) return '예약 마감'
  return `${seatsLeft}석 남음`
}
