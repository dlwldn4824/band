import { LOCAL_STORAGE_KEYS } from '../config/firestorePaths'

const SESSION_ID_KEY = 'analytics_session_id'
const SESSION_START_KEY = 'analytics_session_start'
const LAST_SESSION_AT_KEY = 'analytics_last_session_at'
const PAGES_VISITED_KEY = 'analytics_pages_visited'
const LAST_ACTIVE_FEATURE_KEY = 'analytics_last_feature'

const SESSION_TIMEOUT_MS = 30 * 60 * 1000

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function getOrCreateSessionId(): { sessionId: string; isNewSession: boolean; isReturning: boolean; daysSinceLast: number } {
  const now = Date.now()
  const lastSessionAt = localStorage.getItem(LAST_SESSION_AT_KEY)
  const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY)
  const sessionStart = sessionStorage.getItem(SESSION_START_KEY)

  let daysSinceLast = 0
  if (lastSessionAt) {
    daysSinceLast = Math.floor((now - Number(lastSessionAt)) / (24 * 60 * 60 * 1000))
  }

  const isReturning = Boolean(lastSessionAt)
  const sessionExpired =
    !storedSessionId ||
    !sessionStart ||
    now - Number(sessionStart) > SESSION_TIMEOUT_MS

  if (sessionExpired) {
    const newId = generateId()
    sessionStorage.setItem(SESSION_ID_KEY, newId)
    sessionStorage.setItem(SESSION_START_KEY, String(now))
    sessionStorage.setItem(PAGES_VISITED_KEY, '0')
    return { sessionId: newId, isNewSession: true, isReturning, daysSinceLast }
  }

  return { sessionId: storedSessionId!, isNewSession: false, isReturning, daysSinceLast }
}

export function touchSession(): void {
  sessionStorage.setItem(SESSION_START_KEY, String(Date.now()))
}

export function endSession(): void {
  localStorage.setItem(LAST_SESSION_AT_KEY, String(Date.now()))
}

export function incrementPagesVisited(): number {
  const current = Number(sessionStorage.getItem(PAGES_VISITED_KEY) || '0') + 1
  sessionStorage.setItem(PAGES_VISITED_KEY, String(current))
  return current
}

export function getPagesVisitedCount(): number {
  return Number(sessionStorage.getItem(PAGES_VISITED_KEY) || '0')
}

export function getSessionStartTime(): number {
  return Number(sessionStorage.getItem(SESSION_START_KEY) || Date.now())
}

export function setLastActiveFeature(feature: string): void {
  sessionStorage.setItem(LAST_ACTIVE_FEATURE_KEY, feature)
}

export function getLastActiveFeature(): string | undefined {
  return sessionStorage.getItem(LAST_ACTIVE_FEATURE_KEY) || undefined
}

export function getClientId(): string {
  let clientId = localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENT_ID)
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIENT_ID, clientId)
  }
  return clientId
}
