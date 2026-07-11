import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../config/firebase'
import { FIRESTORE_PATHS } from '../config/firestorePaths'
import type { AnalyticsEventDoc, AnalyticsEventName } from '../analytics/types'
import type { Guest } from '../contexts/DataContext'

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
  stepRate?: number
}

export interface LabeledCount {
  label: string
  count: number
}

export interface PageDwellRow {
  label: string
  count: number
  avgSec: number
}

export interface DailyEventCount {
  date: string
  count: number
}

export interface GuestKpiSummary {
  totalBookings: number
  paymentConfirmed: number
  paymentConfirmedRate: number
  walkIn: number
  walkInRate: number
  ticketReceived: number
  ticketReceivedRate: number
  avgLeadTimeDays: number | null
  avgPaymentConfirmHours: number | null
}

export interface AnalyticsSummary {
  totalEvents: number
  fetchedEvents: number
  truncated: boolean
  uniqueClients: number
  uniqueSessions: number
  eventDayEvents: number
  avgSessionSec: number | null
  sessionTimeSource: 'session_ended' | 'page_dwell' | null
  insights: string[]
  checkinCompleted: number
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
  entrySources: LabeledCount[]
  pageDwellTimes: PageDwellRow[]
  navTabClicks: LabeledCount[]
  timelineClicks: LabeledCount[]
  loginTypes: LabeledCount[]
  bookingLeadBuckets: LabeledCount[]
  eventsByDay: DailyEventCount[]
  chatStats: { pageViews: number; blocked: number; messages: number }
  engagement: { performances: number; songOpens: number; comments: number; games: number }
}

export const PAGE_LABELS: Record<string, string> = {
  '/': '홈(로그인)',
  '/login': '로그인',
  '/dashboard': '대시보드',
  '/performances': '공연 정보',
  '/events': '이벤트',
  '/chat': '채팅',
  '/guestbook': '방명록',
  '/manage': '운영 관리',
  '/admin/login': '관리자 로그인',
  '/admin/dashboard': '관리자 대시보드',
  '/onsite': '현장 예매',
}

export const BANNER_LABELS: Record<string, string> = {
  payment_pending: '입금 대기 배너',
}

export const ENTRY_SOURCE_LABELS: Record<string, string> = {
  direct: '직접 유입',
  token: '토큰 링크',
  qr: 'QR 코드',
  unknown: '기타',
}

const ABANDON_FUNNEL_LABELS: Record<string, string> = {
  booking: '예매',
  login: '로그인',
  drink: '주류',
}

const ABANDON_STEP_LABELS: Record<string, string> = {
  booking_page_viewed: '예매 페이지',
  booking_form_started: '폼 입력',
  booking_confirmation_viewed: '확인 화면',
  booking_submitted: '예매 완료',
  login_attempted: '로그인 시도',
  login_succeeded: '로그인 성공',
}

export function formatPageLabel(path: string): string {
  if (path.startsWith('/t/')) return '토큰 링크 진입'
  return PAGE_LABELS[path] || path
}

export function formatAbandonLabel(raw: string): string {
  const [funnel, step] = raw.split(' → ')
  const funnelLabel = ABANDON_FUNNEL_LABELS[funnel] || funnel
  const stepLabel = ABANDON_STEP_LABELS[step] || step
  return `${funnelLabel}: ${stepLabel}에서 이탈`
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
  return steps.map((step, index) => {
    const prev = index > 0 ? steps[index - 1].count : base
    return {
      label: step.label,
      count: step.count,
      rate: index === 0 ? 100 : base > 0 ? Math.round((step.count / base) * 100) : 0,
      stepRate: index === 0 ? 100 : prev > 0 ? Math.round((step.count / prev) * 100) : 0,
    }
  })
}

function normalizePagePathForDwell(path: string): string {
  if (path.startsWith('/t/')) return '/t/*'
  return path
}

function aggregatePagePaths(pagePathCounts: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const [path, count] of Object.entries(pagePathCounts)) {
    if (path.startsWith('/api/')) continue
    const label = path.startsWith('/t/') ? '/t/*' : path
    inc(merged, label, count)
  }
  return merged
}

function buildInsights(params: {
  uniqueClients: number
  loginAttempted: number
  loginSucceeded: number
  bookingPageViewed: number
  bookingFormStarted: number
  bookingConfirmation: number
  bookingSubmitted: number
  checkinCompleted: number
  entrySources: LabeledCount[]
}): string[] {
  const lines: string[] = []
  const {
    uniqueClients,
    loginAttempted,
    loginSucceeded,
    bookingPageViewed,
    bookingFormStarted,
    bookingConfirmation,
    bookingSubmitted,
    checkinCompleted,
    entrySources,
  } = params

  if (uniqueClients > 0) {
    lines.push(`고유 방문자 ${uniqueClients}명이 사이트를 이용했습니다.`)
  }

  if (loginAttempted > 0) {
    const pct = Math.round((loginSucceeded / loginAttempted) * 100)
    lines.push(`로그인 시도 ${loginAttempted}건 중 ${loginSucceeded}건 성공 (${pct}%).`)
  }

  if (bookingPageViewed > 0) {
    const pct = Math.round((bookingSubmitted / bookingPageViewed) * 100)
    lines.push(
      `예매 페이지 ${bookingPageViewed}명 중 ${bookingSubmitted}명이 예매를 완료했습니다 (${pct}%).`
    )
    if (bookingConfirmation > bookingSubmitted) {
      lines.push(
        `확인 화면까지 온 ${bookingConfirmation}명 중 ${bookingConfirmation - bookingSubmitted}명이 완료 전 이탈했습니다.`
      )
    }
    if (bookingFormStarted > 0 && bookingFormStarted < bookingPageViewed) {
      const formPct = Math.round((bookingFormStarted / bookingPageViewed) * 100)
      lines.push(`예매 페이지 방문자의 ${formPct}%가 폼 입력을 시작했습니다.`)
    }
  }

  if (checkinCompleted > 0) {
    lines.push(`체크인(입장) 완료 ${checkinCompleted}건이 기록되었습니다.`)
  }

  const topEntry = entrySources[0]
  if (topEntry && topEntry.count > 0) {
    const label = ENTRY_SOURCE_LABELS[topEntry.label] || topEntry.label
    lines.push(`가장 많은 유입 경로는 ${label} (${topEntry.count}건)입니다.`)
  }

  return lines
}

const EVENT_LABELS: Partial<Record<AnalyticsEventName, string>> = {
  page_view: '페이지 조회',
  login_attempted: '로그인 시도',
  login_succeeded: '로그인 성공',
  login_failed: '로그인 실패',
  session_started: '세션 시작',
  session_ended: '세션 종료',
  page_dwell_time: '페이지 체류',
  entry_source_detected: '유입 경로 감지',
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
  checkin_completed: '체크인 완료',
  nav_tab_clicked: '탭 이동',
  timeline_event_clicked: '타임라인 클릭',
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

export function summarizeGuestKpis(
  guests: Guest[],
  performanceDate?: string | null,
  paymentConfirmHours: number[] = []
): GuestKpiSummary {
  const active = guests.filter((g) => !g.isDeleted)
  const total = active.length
  const paymentConfirmed = active.filter((g) => g.paymentConfirmed).length
  const walkIn = active.filter((g) => g.isWalkIn).length
  const ticketReceived = active.filter((g) => g.ticketReceived).length

  let avgLeadTimeDays: number | null = null
  if (performanceDate && total > 0) {
    const perfMs = new Date(performanceDate).getTime()
    if (!Number.isNaN(perfMs)) {
      const leadDays: number[] = []
      for (const guest of active) {
        if (!guest.bookedAt) continue
        const days = Math.round((perfMs - guest.bookedAt) / (24 * 60 * 60 * 1000))
        if (days >= 0) leadDays.push(days)
      }
      if (leadDays.length > 0) {
        avgLeadTimeDays = Math.round(leadDays.reduce((s, v) => s + v, 0) / leadDays.length)
      }
    }
  }

  const avgPaymentConfirmHours =
    paymentConfirmHours.length > 0
      ? Math.round(paymentConfirmHours.reduce((s, v) => s + v, 0) / paymentConfirmHours.length)
      : null

  return {
    totalBookings: total,
    paymentConfirmed,
    paymentConfirmedRate: total > 0 ? Math.round((paymentConfirmed / total) * 100) : 0,
    walkIn,
    walkInRate: total > 0 ? Math.round((walkIn / total) * 100) : 0,
    ticketReceived,
    ticketReceivedRate: total > 0 ? Math.round((ticketReceived / total) * 100) : 0,
    avgLeadTimeDays,
    avgPaymentConfirmHours,
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
  const entrySourceCounts: Record<string, number> = {}
  const pageDwellSums: Record<string, { total: number; count: number }> = {}
  const navTabCounts: Record<string, number> = {}
  const timelineCounts: Record<string, number> = {}
  const loginTypeCounts: Record<string, number> = {}
  const bookingLeadBuckets: Record<string, number> = {}
  const dayCounts: Record<string, number> = {}

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
  let checkinCompleted = 0

  const sessionDurations: number[] = []
  const dwellDurations: number[] = []

  for (const event of filtered) {
    inc(eventNameCounts, event.eventName)
    if (event.clientId) clients.add(event.clientId)
    if (event.sessionId) sessions.add(event.sessionId)
    if (event.isEventDay) eventDayEvents += 1
    inc(deviceCounts, event.deviceType || 'unknown')

    const eventTime = getEventTime(event)
    if (eventTime) {
      const d = new Date(eventTime)
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      inc(dayCounts, dayKey)
    }

    const props = event.properties || {}

    switch (event.eventName) {
      case 'page_view': {
        const pagePath = String(props.page_path || event.pagePath || '/')
        if (!pagePath.startsWith('/api/')) {
          inc(pagePathCounts, pagePath)
        }
        break
      }
      case 'login_attempted':
        loginAttempted += 1
        break
      case 'login_succeeded':
        loginSucceeded += 1
        if (props.is_walk_in === true) {
          inc(loginTypeCounts, '현장 예매')
        } else {
          inc(loginTypeCounts, '사전 예매')
        }
        if (props.payment_confirmed === true) {
          inc(loginTypeCounts, '입금 확인 완료')
        } else if (props.is_walk_in !== true) {
          inc(loginTypeCounts, '입금 대기')
        }
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
        if (typeof props.days_before_performance === 'number') {
          const days = props.days_before_performance
          if (days <= 0) inc(bookingLeadBuckets, '당일(D-0)')
          else if (days <= 3) inc(bookingLeadBuckets, 'D-3 이내')
          else if (days <= 7) inc(bookingLeadBuckets, 'D-7 이내')
          else inc(bookingLeadBuckets, 'D-7 이전')
        }
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
      case 'page_dwell_time': {
        const path = normalizePagePathForDwell(String(props.page_path || '/'))
        const sec = props.duration_sec
        if (typeof sec === 'number' && sec > 0) {
          if (!pageDwellSums[path]) pageDwellSums[path] = { total: 0, count: 0 }
          pageDwellSums[path].total += sec
          pageDwellSums[path].count += 1
          dwellDurations.push(sec)
        }
        break
      }
      case 'entry_source_detected':
        inc(entrySourceCounts, String(props.entry_type || 'unknown'))
        break
      case 'nav_tab_clicked':
        inc(navTabCounts, String(props.tab_name || 'unknown'))
        break
      case 'timeline_event_clicked':
        inc(timelineCounts, String(props.event_title || 'unknown'))
        break
      case 'checkin_completed':
        checkinCompleted += 1
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

  let avgSessionSec: number | null = null
  let sessionTimeSource: AnalyticsSummary['sessionTimeSource'] = null
  if (sessionDurations.length > 0) {
    avgSessionSec = Math.round(sessionDurations.reduce((sum, v) => sum + v, 0) / sessionDurations.length)
    sessionTimeSource = 'session_ended'
  } else if (dwellDurations.length > 0) {
    avgSessionSec = Math.round(dwellDurations.reduce((sum, v) => sum + v, 0) / dwellDurations.length)
    sessionTimeSource = 'page_dwell'
  }

  const pageDwellTimes: PageDwellRow[] = Object.entries(pageDwellSums)
    .map(([label, { total, count }]) => ({
      label,
      count,
      avgSec: Math.round(total / count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const entrySources = toSortedList(entrySourceCounts, 6)

  const eventsByDay: DailyEventCount[] = Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  const abandonedFunnels = toSortedList(abandonCounts, 8).map((item) => ({
    label: formatAbandonLabel(item.label),
    count: item.count,
  }))

  const mergedPagePaths = aggregatePagePaths(pagePathCounts)
  const pageViews = toSortedList(mergedPagePaths, 8).map((item) => ({
    label: formatPageLabel(item.label === '/t/*' ? '/t/token' : item.label),
    count: item.count,
  }))

  const insights = buildInsights({
    uniqueClients: clients.size,
    loginAttempted,
    loginSucceeded,
    bookingPageViewed,
    bookingFormStarted,
    bookingConfirmation,
    bookingSubmitted,
    checkinCompleted,
    entrySources,
  })

  return {
    totalEvents: filtered.length,
    fetchedEvents: events.length,
    truncated,
    uniqueClients: clients.size,
    uniqueSessions: sessions.size,
    eventDayEvents,
    avgSessionSec,
    sessionTimeSource,
    insights,
    checkinCompleted,
    eventCounts,
    pageViews,
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
    abandonedFunnels,
    bookingsBySource: toSortedList(bookingSourceCounts, 6),
    entrySources,
    pageDwellTimes,
    navTabClicks: toSortedList(navTabCounts, 8),
    timelineClicks: toSortedList(timelineCounts, 8),
    loginTypes: toSortedList(loginTypeCounts, 6),
    bookingLeadBuckets: toSortedList(bookingLeadBuckets, 6),
    eventsByDay,
    chatStats: { pageViews: chatPageViews, blocked: chatBlocked, messages: chatMessages },
    engagement: {
      performances: performancesViewed,
      songOpens,
      comments: songComments,
      games: gamesStarted,
    },
  }
}

// Re-export payment hours helper for guest KPI from filtered events
export function extractPaymentConfirmHours(events: RawAnalyticsEvent[], range: AnalyticsDateRange): number[] {
  const hours: number[] = []
  for (const event of events) {
    if (!isInRange(getEventTime(event), range)) continue
    if (event.eventName !== 'guest_payment_toggled') continue
    const props = event.properties || {}
    if (props.new_status === true && typeof props.hours_since_booking === 'number') {
      hours.push(props.hours_since_booking)
    }
  }
  return hours
}
