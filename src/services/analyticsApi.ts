import { callApi } from './apiClient'
import type { AnalyticsEventDoc } from '../analytics/types'

export async function trackAnalyticsEvents(events: AnalyticsEventDoc[]) {
  if (events.length === 0) return true
  const res = await callApi<{ ok: boolean }>('/api/analytics', 'track', { events })
  return res?.ok === true
}

export async function adminListAnalyticsEvents() {
  const res = await callApi<{
    ok: boolean
    events?: Array<AnalyticsEventDoc & { id: string }>
    truncated?: boolean
  }>('/api/analytics', 'list', {}, true)
  return res?.ok ? res : null
}
