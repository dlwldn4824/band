const UTM_STORAGE_KEY = 'analytics_utm'

export interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

const UTM_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export function captureUtmFromUrl(search?: string): UtmParams {
  try {
    const params = new URLSearchParams(search ?? window.location.search)
    const captured: UtmParams = {}
    let hasAny = false

    for (const key of UTM_QUERY_KEYS) {
      const value = params.get(key)?.trim()
      if (value) {
        captured[key] = value
        hasAny = true
      }
    }

    if (hasAny) {
      const existing = getUtmParams()
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ ...existing, ...captured }))
      return { ...existing, ...captured }
    }

    return getUtmParams()
  } catch {
    return {}
  }
}

export function getUtmParams(): UtmParams {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as UtmParams
  } catch {
    return {}
  }
}

export function getUtmProperties(): Record<string, string> {
  const utm = getUtmParams()
  const props: Record<string, string> = {}
  if (utm.utm_source) props.utm_source = utm.utm_source
  if (utm.utm_medium) props.utm_medium = utm.utm_medium
  if (utm.utm_campaign) props.utm_campaign = utm.utm_campaign
  if (utm.utm_content) props.utm_content = utm.utm_content
  if (utm.utm_term) props.utm_term = utm.utm_term
  return props
}
