import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import {
  setAnalyticsContextGetter,
  setResolvedUserId,
} from './context'
import { hashUserId, hashAdminId } from './hashUserId'
import { isEventDay } from './device'
import {
  getOrCreateSessionId,
  endSession,
  getSessionStartTime,
  getPagesVisitedCount,
  getLastActiveFeature,
} from './session'
import { trackEvent } from './trackEvent'
import { usePageTracking } from './usePageTracking'
import { getUtmProperties, captureUtmFromUrl } from './utm'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, isAdmin, adminName } = useAuth()
  const { performanceData } = useData()
  const sessionStartedRef = useRef(false)

  usePageTracking()

  useEffect(() => {
    const performanceId = performanceData?.ticket?.eventName ?? null
    const performanceDate = performanceData?.ticket?.date ?? null

    setAnalyticsContextGetter(() => ({
      pagePath: location.pathname,
      performanceId,
      performanceDate,
      isEventDay: isEventDay(performanceDate),
      isAdmin,
      userPhone: user?.phone ?? null,
      adminName: adminName ?? null,
    }))

    const resolveUserId = async () => {
      if (isAdmin && adminName) {
        setResolvedUserId(await hashAdminId(adminName))
      } else if (user?.phone && user.phone !== 'admin') {
        setResolvedUserId(await hashUserId(user.phone))
      } else {
        setResolvedUserId('anon')
      }
    }
    void resolveUserId()
  }, [location.pathname, user, isAdmin, adminName, performanceData?.ticket?.eventName, performanceData?.ticket?.date])

  useEffect(() => {
    captureUtmFromUrl(window.location.search)
    const { isNewSession, isReturning, daysSinceLast } = getOrCreateSessionId()
    if (isNewSession && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      void trackEvent('session_started', {
        is_returning: isReturning,
        days_since_last: daysSinceLast,
        ...getUtmProperties(),
      })
    }
  }, [])

  useEffect(() => {
    const handleEnd = () => {
      const durationSec = Math.round((Date.now() - getSessionStartTime()) / 1000)
      void trackEvent(
        'session_ended',
        {
          duration_sec: durationSec,
          last_page: location.pathname,
          pages_visited_count: getPagesVisitedCount(),
          last_active_feature: getLastActiveFeature(),
        },
        { immediate: true }
      )
      endSession()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleEnd()
      }
    }

    window.addEventListener('beforeunload', handleEnd)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', handleEnd)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [location.pathname])

  return <>{children}</>
}
