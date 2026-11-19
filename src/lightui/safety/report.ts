import { useSyncExternalStore } from 'react'

/**
 * 신고와 차단.
 *
 * 이용자가 글을 올리는 앱은 네 가지가 있어야 스토어를 통과합니다 — 신고,
 * 차단, 올라온 것을 거를 방법, 그리고 가입할 때 받는 동의 (Apple 1.2,
 * Google 사용자 제작 콘텐츠 정책). 밴디는 채팅 · 방명록 · 동아리 프로필 ·
 * 현장에서 주고받는 프로필이 전부 여기 해당합니다.
 *
 * 차단은 "안 보이게" 가 끝이 아닙니다. 차단한 사람의 글이 목록에서 빠져야
 * 하고, 되돌릴 수 있어야 하고, 어디서 차단했는지와 상관없이 앱 전체에
 * 적용돼야 합니다. 그래서 화면마다 상태를 들지 않고 여기 한 곳에 둡니다.
 *
 * MOCK: 지금은 이 기기에만 저장합니다. 실제로는 차단이 서버에 올라가야
 * 다른 기기에서도 같고, 신고가 운영자에게 닿습니다.
 */

const BLOCK_KEY = 'bandy.lightui.blocked'
const REPORT_KEY = 'bandy.lightui.reports'

export interface Blocked {
  id: string
  name: string
  at: string
}

export type ReportKind = 'message' | 'guestbook' | 'profile' | 'club'

export interface Report {
  id: string
  kind: ReportKind
  targetId: string
  targetName: string
  reason: string
  detail?: string
  at: string
}

/** 신고 사유 — 약관 제3조에 적어 둔 것과 같은 목록입니다 */
export const REASONS = [
  '욕설 · 혐오 표현',
  '괴롭힘 · 협박',
  '음란물 · 폭력적인 내용',
  '개인정보를 동의 없이 올림',
  '남의 글 · 사진 · 음원을 무단으로 올림',
  '광고 · 도배 · 사기',
  '그 밖에 불쾌한 내용',
] as const

const listeners = new Set<() => void>()

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 저장이 막혀도 이번 세션 동안은 동작합니다 */
  }
}

let blocked = read<Blocked>(BLOCK_KEY)
/** useSyncExternalStore 는 같은 참조를 돌려줘야 다시 그리지 않습니다 */
let snapshot = blocked

function publish() {
  snapshot = blocked
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getBlocked() {
  return snapshot
}

export function blockUser(id: string, name: string) {
  if (blocked.some((b) => b.id === id)) return
  blocked = [{ id, name, at: new Date().toISOString() }, ...blocked]
  write(BLOCK_KEY, blocked)
  publish()
  // TODO: 서버에도 올려야 다른 기기에서 같고, 상대가 나를 못 찾습니다
}

export function unblockUser(id: string) {
  blocked = blocked.filter((b) => b.id !== id)
  write(BLOCK_KEY, blocked)
  publish()
}

export function isBlocked(id: string) {
  return snapshot.some((b) => b.id === id)
}

/** 차단한 사람의 것을 목록에서 걸러 냅니다 */
export function withoutBlocked<T>(items: T[], idOf: (item: T) => string): T[] {
  if (snapshot.length === 0) return items
  return items.filter((item) => !isBlocked(idOf(item)))
}

export function useBlocked() {
  const list = useSyncExternalStore(subscribe, getBlocked, getBlocked)
  return {
    blocked: list,
    count: list.length,
    isBlocked: (id: string) => list.some((b) => b.id === id),
    blockUser,
    unblockUser,
  }
}

/**
 * 신고를 접수합니다.
 *
 * 약관에 "신고가 들어오면 24시간 안에 조치한다" 고 적어 뒀습니다. 그 약속을
 * 지키려면 신고가 운영자에게 닿아야 하는데, 지금은 기기에만 쌓입니다.
 */
export function submitReport(r: Omit<Report, 'id' | 'at'>): Report {
  const report: Report = {
    ...r,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
  }
  const all = read<Report>(REPORT_KEY)
  write(REPORT_KEY, [report, ...all])
  // TODO: 서버로 보내야 합니다. 지금은 아무에게도 닿지 않습니다.
  return report
}

export function getReports(): Report[] {
  return read<Report>(REPORT_KEY)
}
