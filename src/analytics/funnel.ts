import { trackEvent } from './trackEvent'

const abandonTimers = new Map<string, ReturnType<typeof setTimeout>>()
const followUpFlags = new Map<string, boolean>()

export function trackFunnelAbandon(
  funnelName: string,
  lastStep: string,
  delayMs = 60_000
): () => void {
  const key = `${funnelName}:${lastStep}`
  const existing = abandonTimers.get(key)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    if (!followUpFlags.get(key)) {
      void trackEvent('abandoned_funnel_step', { funnel_name: funnelName, last_step: lastStep })
    }
    abandonTimers.delete(key)
  }, delayMs)

  abandonTimers.set(key, timer)

  return () => {
    followUpFlags.set(key, true)
    const t = abandonTimers.get(key)
    if (t) clearTimeout(t)
    abandonTimers.delete(key)
  }
}

export function trackButtonClickNoFollow(
  buttonName: string,
  followUpEventName: string,
  delayMs = 30_000
): () => void {
  const key = `btn:${buttonName}:${followUpEventName}`
  followUpFlags.set(key, false)

  const timer = setTimeout(() => {
    if (!followUpFlags.get(key)) {
      void trackEvent('button_click_no_follow', { button_name: buttonName })
    }
  }, delayMs)

  return () => {
    followUpFlags.set(key, true)
    clearTimeout(timer)
  }
}

export function markFunnelComplete(funnelName: string, lastStep: string): void {
  followUpFlags.set(`${funnelName}:${lastStep}`, true)
}

export function trackFeatureDenied(reason: 'events_disabled' | 'chat_blocked' | 'not_logged_in' | string): void {
  void trackEvent('feature_access_denied', { reason })
}
