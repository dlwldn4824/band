import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from './trackEvent'
import { detectEntryType, getReferrer } from './device'
import { captureUtmFromUrl, getUtmProperties } from './utm'
import { incrementPagesVisited } from './session'

/** API·봇 스캔 URL은 페이지뷰에서 제외 (예: /api/verify-admin-code/1234) */
function shouldTrackPagePath(pathname: string): boolean {
  if (!pathname || pathname === '/') return true
  if (pathname.startsWith('/api/')) return false
  return true
}

export function usePageTracking(): void {
  const location = useLocation()
  const enterTimeRef = useRef<number>(Date.now())
  const prevPathRef = useRef<string>(location.pathname)

  useEffect(() => {
    if (!shouldTrackPagePath(location.pathname)) {
      return
    }

    const prevPath = prevPathRef.current
    const now = Date.now()
    const dwellSec = Math.round((now - enterTimeRef.current) / 1000)

    if (prevPath !== location.pathname && dwellSec > 0) {
      import('./trackEvent').then(({ trackEvent }) => {
        void trackEvent('page_dwell_time', {
          page_path: prevPath,
          duration_sec: dwellSec,
        })
      })
    }

    enterTimeRef.current = now
    prevPathRef.current = location.pathname
    incrementPagesVisited()

    const entryType = detectEntryType(location.pathname)
    captureUtmFromUrl(location.search)

    trackPageView({
      page_path: location.pathname,
      referrer: getReferrer(),
      entry_type: entryType,
      token_present: location.pathname.startsWith('/t/'),
      ...getUtmProperties(),
    })

    if (entryType !== 'direct') {
      import('./trackEvent').then(({ trackEvent }) => {
        void trackEvent('entry_source_detected', {
          entry_type: entryType,
          page_path: location.pathname,
        })
      })
    }
  }, [location.pathname, location.key])
}
