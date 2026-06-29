import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../config/firebase'
import { FIRESTORE_PATHS } from '../config/firestorePaths'
import type { AnalyticsEventDoc, AnalyticsEventName } from '../analytics/types'

const MAX_EVENTS = 5000

export type AnalyticsDateRange = 'today' | '7d' | '30d' | 'all'

export interface RawAnalyticsEvent extends AnalyticsEventDoc {
  id: string
  timestamp?: { toDate?: () => Date }
}

export interface FunnelStep {
  label: string
  count: number
  rate?: number
}

export interface LabeledCount {
  label: string
  count: number
}

export interface AnalyticsSummary {
  totalEvents: number
  fetchedEvents: number
  truncated: boolean
  uniqueClients: number
  uniqueSessions: number
  eventDayEvents: number
  avgSessionSec: number | null
  eventCounts: LabeledCount[]
  pageViews: LabeledCount[]
  deviceSplit: LabeledCount[]
  loginFunnel: FunnelStep[]
  bookingFunnel: FunnelStep[]
  drinkFunnel: FunnelStep[]
  topSongs: LabeledCount[]
  topCtas: LabeledCount[]
  bannerStats: Array<{ bannerId: string; impressions: number; clicks: number; ctr: number }>
  utmSources: LabeledCount[]
  loginFailReasons: LabeledCount[]
  abandonedFunnels: LabeledCount[]
  bookingsBySource: LabeledCount[]
  chatStats: { pageViews: number; blocked: number; messages: number }
  engagement: { performances: number; songOpens: number; comments: number; games: number }
}

function getEventTime(event: RawAnalyticsEvent): number {
  if (event.timestamp?.toDate) {
    return event.timestamp.toDate().getTime()
  }
  return event.createdAtClient || 0
}

function isInRange(timeMs: number, range: AnalyticsDateRange): boolean {
  if (range === 'all' || !timeMs) return true
  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  if (range === 'today') return timeMs >= startOfToday.getTime()
  if (range === '7d') return timeMs >= now - 7 * 24 * 60 * 60 * 1000
  if (range === '30d') return timeMs >= now - 30 * 24 * 60 * 60 * 1000
  return true
}

function inc(map: Record<string, number>, key: string, amount = 1) {
  if (!key) return
  map[key] = (map[key] || 0) + amount
}

function toSortedList(map: Record<string, number>, topN = 10): LabeledCount[] {
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

function buildFunnel(steps: Array<{ label: string; count: number }>): FunnelStep[] {
  const base = steps[0]?.count || 0
  return steps.map((step, index) => ({
    label: step.label,
    count: step.count,
    rate: index === 0 ? 100 : base > 0 ? Math.round((step.count / base) * 100) : 0,
  }))
}

const EVENT_LABELS: Partial<Record<AnalyticsEventName, string>> = {
  page_view: '페이지 조회',
  login_attempted: '로그인 시도',
  login_succeeded: '로그인 성공',
  login_failed: '로그인 실패',
  session_started: '세션 시작',
  session_ended: '세션 종료',
  dashboard_viewed: '홈 조회',
  performances_viewed: '공연 정보 조회',
  drink_order_submitted: '주류 주문',
  drink_payment_confirmed: '주류 입금 확인',
  drink_order_provided: '주류 제공 완료',
  chat_message_sent: '채팅 메시지',
  booking_submitted: '예매 완료',
  booking_page_viewed: '예매 페이지',
  banner_impression: '배너 노출',
  cta_clicked: 'CTA 클릭',
  song_detail_opened: '곡 상세',
  song_comment_posted: '곡 응원 댓글',
  manage_page_viewed: '관리 페이지',
}

export async function fetchAnalyticsEvents(): Promise<{
  events: RawAnalyticsEvent[]
  truncated: boolean
}> {
  try {
    const q = query(
      collection(db, FIRESTORE_PATHS.ANALYTICS_EVENTS),
      orderBy('createdAtClient', 'desc'),
      limit(MAX_EVENTS)
    )
    const snap = await getDocs(q)
    return {
      events: snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as RawAnalyticsEvent),
      truncated: snap.size >= MAX_EVENTS,
    }
  } catch {
    const snap = await getDocs(collection(db, FIRESTORE_PATHS.ANALYTICS_EVENTS))
    const events = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as RawAnalyticsEvent)
      .sort((a, b) => getEventTime(b) - getEventTime(a))
      .slice(0, MAX_EVENTS)
    return { events, truncated: snap.size > MAX_EVENTS }
  }
}

export function summarizeAnalytics(
  events: RawAnalyticsEvent[],
  range: AnalyticsDateRange,
  truncated: boolean
): AnalyticsSummary {
  const filtered = events.filter((event) => isInRange(getEventTime(event), range))

  const clients = new Set<string>()
  const sessions = new Set<string>()
  const eventNameCounts: Record<string, number> = {}
  const pagePathCounts: Record<string, number> = {}
  const deviceCounts: Record<string, number> = {}
  const songCounts: Record<string, number> = {}
  const ctaCounts: Record<string, number> = {}
  const utmCounts: Record<string, number> = {}
  const failReasonCounts: Record<string, number> = {}
  const abandonCounts: Record<string, number> = {}
  const bookingSourceCounts: Record<string, number> = {}
  const bannerImpressions: Record<string, number> = {}
  const bannerClicks: Record<string, number> = {}

  let eventDayEvents = 0
  let loginAttempted = 0
  let loginSucceeded = 0
  let loginFailed = 0
  let bookingPageViewed = 0
  let bookingFormStarted = 0
  let bookingConfirmation = 0
  let bookingSubmitted = 0
  let drinkModal = 0
  let drinkSubmitted = 0
  let drinkPaid = 0
  let drinkProvided = 0
  let chatPageViews = 0
  let chatBlocked = 0
  let chatMessages = 0
  let performancesViewed = 0
  let songOpens = 0
  let songComments = 0
  let gamesStarted = 0

  const sessionDurations: number[] = []

  for (const event of filtered) {
    inc(eventNameCounts, event.eventName)
    if (event.clientId) clients.add(event.clientId)
    if (event.sessionId) sessions.add(event.sessionId)
    if (event.isEventDay) eventDayEvents += 1
    inc(deviceCounts, event.deviceType || 'unknown')

    const props = event.properties || {}

    switch (event.eventName) {
      case 'page_view':
        inc(pagePathCounts, String(props.page_path || event.pagePath || '/'))
        break
      case 'login_attempted':
        loginAttempted += 1
        break
      case 'login_succeeded':
        loginSucceeded += 1
        break
      case 'login_failed':
        loginFailed += 1
        inc(failReasonCounts, String(props.fail_reason || 'unknown'))
        break
      case 'booking_page_viewed':
        bookingPageViewed += 1
        break
      case 'booking_form_started':
        bookingFormStarted += 1
        break
      case 'booking_confirmation_viewed':
        bookingConfirmation += 1
        break
      case 'booking_submitted':
        bookingSubmitted += 1
        inc(bookingSourceCounts, String(props.source || 'unknown'))
        break
      case 'drink_modal_opened':
        drinkModal += 1
        break
      case 'drink_order_submitted':
        drinkSubmitted += 1
        break
      case 'drink_payment_confirmed':
        drinkPaid += 1
        break
      case 'drink_order_provided':
        drinkProvided += 1
        break
      case 'chat_page_viewed':
        chatPageViews += 1
        break
      case 'chat_blocked_viewed':
        chatBlocked += 1
        break
      case 'chat_message_sent':
        chatMessages += 1
        break
      case 'performances_viewed':
        performancesViewed += 1
        break
      case 'song_detail_opened':
        songOpens += 1
        inc(songCounts, String(props.song_name || 'unknown'))
        break
      case 'song_comment_posted':
        songComments += 1
        break
      case 'game_started':
        gamesStarted += 1
        break
      case 'cta_clicked':
        inc(ctaCounts, String(props.cta_name || 'unknown'))
        if (props.banner_id) {
          inc(bannerClicks, String(props.banner_id))
        }
        break
      case 'banner_impression':
        inc(bannerImpressions, String(props.banner_id || 'unknown'))
        break
      case 'abandoned_funnel_step':
        inc(abandonCounts, `${props.funnel_name || '?'} → ${props.last_step || '?'}`)
        break
      case 'session_ended':
        if (typeof props.duration_sec === 'number' && props.duration_sec > 0) {
          sessionDurations.push(props.duration_sec)
        }
        break
      default:
        break
    }

    const utmSource = props.utm_source as string | undefined
    if (utmSource) inc(utmCounts, utmSource)
  }

  const bannerIds = new Set([...Object.keys(bannerImpressions), ...Object.keys(bannerClicks)])
  const bannerStats = [...bannerIds].map((bannerId) => {
    const impressions = bannerImpressions[bannerId] || 0
    const clicks = bannerClicks[bannerId] || 0
    return {
      bannerId,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 100) : 0,
    }
  }).sort((a, b) => b.impressions - a.impressions)

  const eventCounts = toSortedList(eventNameCounts, 15).map((item) => ({
    label: EVENT_LABELS[item.label as AnalyticsEventName] || item.label,
    count: item.count,
  }))

  const avgSessionSec =
    sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((sum, v) => sum + v, 0) / sessionDurations.length)
      : null

  return {
    totalEvents: filtered.length,
    fetchedEvents: events.length,
    truncated,
    uniqueClients: clients.size,
    uniqueSessions: sessions.size,
    eventDayEvents,
    avgSessionSec,
    eventCounts,
    pageViews: toSortedList(pagePathCounts, 8),
    deviceSplit: toSortedList(deviceCounts, 5),
    loginFunnel: buildFunnel([
      { label: '로그인 시도', count: loginAttempted },
      { label: '로그인 성공', count: loginSucceeded },
      { label: '로그인 실패', count: loginFailed },
    ]),
    bookingFunnel: buildFunnel([
      { label: '예매 페이지', count: bookingPageViewed },
      { label: '폼 입력 시작', count: bookingFormStarted },
      { label: '확인 화면', count: bookingConfirmation },
      { label: '예매 완료', count: bookingSubmitted },
    ]),
    drinkFunnel: buildFunnel([
      { label: '주류 모달', count: drinkModal },
      { label: '주문 제출', count: drinkSubmitted },
      { label: '입금 확인', count: drinkPaid },
      { label: '제공 완료', count: drinkProvided },
    ]),
    topSongs: toSortedList(songCounts, 8),
    topCtas: toSortedList(ctaCounts, 8),
    bannerStats,
    utmSources: toSortedList(utmCounts, 8),
    loginFailReasons: toSortedList(failReasonCounts, 6),
    abandonedFunnels: toSortedList(abandonCounts, 8),
    bookingsBySource: toSortedList(bookingSourceCounts, 6),
    chatStats: { pageViews: chatPageViews, blocked: chatBlocked, messages: chatMessages },
    engagement: {
      performances: performancesViewed,
      songOpens,
      comments: songComments,
      games: gamesStarted,
    },
  }
}
