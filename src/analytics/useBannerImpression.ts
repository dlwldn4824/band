import { useEffect, useRef } from 'react'
import { trackEvent } from './trackEvent'

const impressedBanners = new Set<string>()

export function useBannerImpression(
  ref: React.RefObject<HTMLElement | null>,
  bannerId: string,
  placement: string,
  enabled = true
): void {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !ref.current || trackedRef.current) return

    const key = `${bannerId}:${placement}`
    if (impressedBanners.has(key)) {
      trackedRef.current = true
      return
    }

    const element = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)
        if (!visible || trackedRef.current || impressedBanners.has(key)) return

        trackedRef.current = true
        impressedBanners.add(key)
        void trackEvent('banner_impression', { banner_id: bannerId, placement })
      },
      { threshold: 0.5 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, bannerId, placement, enabled])
}
