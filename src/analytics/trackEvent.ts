import type { AnalyticsEventName, EventProperties, AnalyticsEventDoc } from './types'
import { getAnalyticsContext, getDeviceTypeForEvent } from './context'
import { enqueueEvent } from './queue'
import { touchSession } from './session'
import { CORE_FEATURES, type CoreFeature } from './events'
import { sanitizePagePath } from './sanitizePath'

const CORE_FEATURE_KEY = 'analytics_core_features'
const CORE_FEATURE_USED_KEY = 'analytics_core_feature_used'

function recordCoreFeature(feature: CoreFeature): void {
  try {
    const raw = sessionStorage.getItem(CORE_FEATURE_KEY)
    const features = new Set<CoreFeature>(raw ? JSON.parse(raw) : [])
    features.add(feature)
    sessionStorage.setItem(CORE_FEATURE_KEY, JSON.stringify([...features]))

    if (features.size >= 2 && !sessionStorage.getItem(CORE_FEATURE_USED_KEY)) {
      sessionStorage.setItem(CORE_FEATURE_USED_KEY, '1')
      void trackEvent('core_feature_used', { features: [...features] })
    }
  } catch {
    // ignore
  }
}

const EVENT_TO_CORE_FEATURE: Partial<Record<AnalyticsEventName, CoreFeature>> = {
  performances_viewed: 'setlist',
  song_detail_opened: 'setlist',
  chat_page_viewed: 'chat',
  chat_message_sent: 'chat',
  events_page_viewed: 'events',
  drink_modal_opened: 'drink',
  drink_order_submitted: 'drink',
}

export async function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties?: EventProperties<E>,
  options?: { immediate?: boolean; pagePath?: string }
): Promise<void> {
  try {
    touchSession()
    const ctx = getAnalyticsContext(options?.pagePath)
    const safePagePath = sanitizePagePath(ctx.pagePath)

    const rawProperties = (properties ?? {}) as Record<string, unknown>
    const sanitizedProperties: Record<string, unknown> = { ...rawProperties }
    if (typeof sanitizedProperties.page_path === 'string') {
      sanitizedProperties.page_path = sanitizePagePath(sanitizedProperties.page_path)
    }
    if (typeof sanitizedProperties.from_page === 'string') {
      sanitizedProperties.from_page = sanitizePagePath(sanitizedProperties.from_page)
    }
    if (typeof sanitizedProperties.to_page === 'string') {
      sanitizedProperties.to_page = sanitizePagePath(sanitizedProperties.to_page)
    }

    const doc: AnalyticsEventDoc = {
      eventName,
      properties: sanitizedProperties,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      userRole: ctx.userRole,
      pagePath: safePagePath,
      deviceType: getDeviceTypeForEvent(),
      performanceId: ctx.performanceId,
      isEventDay: ctx.isEventDay,
      clientId: ctx.clientId,
      createdAtClient: Date.now(),
    }

    if (import.meta.env.DEV) {
      console.debug('[analytics]', eventName, doc.properties)
    }

    enqueueEvent(doc, options?.immediate)

    const coreFeature = EVENT_TO_CORE_FEATURE[eventName]
    if (coreFeature && CORE_FEATURES.includes(coreFeature)) {
      recordCoreFeature(coreFeature)
    }
  } catch {
    // analytics must not block UX
  }
}

export function trackPageView(overrides?: {
  page_path?: string
  referrer?: string
  entry_type?: 'direct' | 'token' | 'qr'
  token_present?: boolean
}): void {
  void trackEvent('page_view', {
    page_path: sanitizePagePath(overrides?.page_path ?? window.location.pathname),
    referrer: overrides?.referrer ?? document.referrer,
    entry_type: overrides?.entry_type,
    token_present: overrides?.token_present,
  })
}

export function trackNavTab(tabName: string, fromPage: string, toPage: string): void {
  void trackEvent('nav_tab_clicked', { tab_name: tabName, from_page: fromPage, to_page: toPage })
}

const modalOpenTimes = new Map<string, number>()

export function trackModal(
  modalName: string,
  action: 'opened' | 'closed',
  meta?: { source?: string }
): void {
  if (action === 'opened') {
    modalOpenTimes.set(modalName, Date.now())
    void trackEvent('modal_opened', { modal_name: modalName, source: meta?.source })
  } else {
    const openedAt = modalOpenTimes.get(modalName)
    const duration_sec = openedAt ? Math.round((Date.now() - openedAt) / 1000) : undefined
    modalOpenTimes.delete(modalName)
    void trackEvent('modal_closed', { modal_name: modalName, source: meta?.source, duration_sec })
  }
}

export function trackError(error: unknown, context?: string, pagePath?: string): void {
  void trackEvent('error_occurred', {
    error_code: error instanceof Error ? error.name : 'unknown',
    error_context: context ?? (error instanceof Error ? error.message : String(error)),
    page_path: pagePath ?? window.location.pathname,
  })
}

export function setLastActiveFeature(feature: string): void {
  import('./session').then(({ setLastActiveFeature: set }) => set(feature))
}
