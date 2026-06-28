import type { AnalyticsContext } from './types'
import { getClientId, getOrCreateSessionId } from './session'
import { getDeviceType, isEventDay } from './device'

type ContextGetter = () => Partial<AnalyticsContext> & {
  userPhone?: string | null
  adminName?: string | null
  isAdmin?: boolean
  performanceDate?: string | null
  performanceId?: string | null
}

let contextGetter: ContextGetter = () => ({})

export function setAnalyticsContextGetter(getter: ContextGetter): void {
  contextGetter = getter
}

let resolvedUserId: string | null = null

export function setResolvedUserId(userId: string | null): void {
  resolvedUserId = userId
}

export function getAnalyticsContext(pagePath?: string): AnalyticsContext {
  const extra = contextGetter()
  const { sessionId } = getOrCreateSessionId()

  let userRole: AnalyticsContext['userRole'] = 'anonymous'
  if (extra.isAdmin) {
    userRole = 'admin'
  } else if (resolvedUserId && resolvedUserId.startsWith('guest_')) {
    userRole = 'guest'
  } else if (extra.userPhone && extra.userPhone !== 'admin') {
    userRole = 'guest'
  }

  return {
    userId: resolvedUserId ?? extra.userId ?? null,
    userRole: extra.userRole ?? userRole,
    pagePath: pagePath ?? extra.pagePath ?? window.location.pathname,
    performanceId: extra.performanceId ?? null,
    isEventDay: extra.isEventDay ?? isEventDay(extra.performanceDate),
    clientId: getClientId(),
    sessionId,
  }
}

export function getDeviceTypeForEvent(): string {
  return getDeviceType()
}
