export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export function getDeviceType(): DeviceType {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()

  const isoMatch = trimmed.match(/(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isEventDay(performanceDate?: string | null): boolean {
  if (!performanceDate) return false
  const eventDate = parseKoreanDate(performanceDate)
  if (!eventDate) return false

  const now = new Date()
  return (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  )
}

export function getReferrer(): string {
  return document.referrer || ''
}

export function detectEntryType(pathname: string): 'direct' | 'token' | 'qr' {
  if (pathname.startsWith('/t/')) return 'token'
  const params = new URLSearchParams(window.location.search)
  if (params.get('utm_source') === 'qr' || params.get('ref') === 'qr') return 'qr'
  return 'direct'
}
