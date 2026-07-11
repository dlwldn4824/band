import type { AnalyticsEventDoc } from './types'
import { trackAnalyticsEvents } from '../services/analyticsApi'

const FLUSH_INTERVAL_MS = 3000
const MAX_BATCH_SIZE = 20

let queue: AnalyticsEventDoc[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let isFlushing = false

async function flushQueue(): Promise<void> {
  if (isFlushing || queue.length === 0) return
  isFlushing = true

  const batchItems = queue.splice(0, MAX_BATCH_SIZE)

  try {
    await trackAnalyticsEvents(batchItems)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[analytics] flush failed', error)
    }
  } finally {
    isFlushing = false
    if (queue.length > 0) {
      void flushQueue()
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, FLUSH_INTERVAL_MS)
}

export function enqueueEvent(doc: AnalyticsEventDoc, immediate = false): void {
  queue.push(doc)
  if (immediate) {
    void flushQueue()
  } else {
    scheduleFlush()
  }
}

export function flushAnalyticsNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  void flushQueue()
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAnalyticsNow()
    }
  })
  window.addEventListener('beforeunload', () => {
    flushAnalyticsNow()
  })
}
