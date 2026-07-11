import { handleVerifyAdminCodeRequest } from '../server/lib/verifyAdminCode.js'
import { handleGuestsRequest } from '../server/lib/guestsApi.js'
import { handleBookingInfoRequest } from '../server/lib/bookingInfoApi.js'
import { handlePerformanceDataRequest } from '../server/lib/performanceDataApi.js'
import { handleBookingsRequest } from '../server/lib/bookingsApi.js'
import { handleSendEmailRequest } from '../server/lib/sendEmailApi.js'
import { handleUserProfilesRequest } from '../server/lib/userProfilesApi.js'
import { handleDrinkOrdersRequest } from '../server/lib/drinkOrdersApi.js'
import { handleChatRequest } from '../server/lib/chatApi.js'
import { handleGuestbookRequest } from '../server/lib/guestbookApi.js'
import { handleSongCommentsRequest } from '../server/lib/songCommentsApi.js'
import { handleGamesRequest } from '../server/lib/gamesApi.js'
import { handleAnalyticsRequest } from '../server/lib/analyticsApi.js'
import { handleLoginTokensRequest } from '../server/lib/loginTokensApi.js'

/**
 * Hobby 플랜 함수 개수 제한 대응 — /api/* → 이 단일 함수로 rewrite
 */
export default async function handler(req, res) {
  let route = ''

  const pathQuery = req.query?.path
  if (typeof pathQuery === 'string' && pathQuery.length > 0) {
    route = pathQuery.replace(/^\/+|\/+$/g, '')
  } else if (Array.isArray(pathQuery) && pathQuery.length > 0) {
    route = pathQuery.filter(Boolean).join('/')
  } else if (typeof req.url === 'string') {
    // fallback: /api/guests → guests
    const pathname = req.url.split('?')[0]
    route = pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '')
  }

  const segments = route ? route.split('/').filter(Boolean) : []

  // 봇 스캔: /api/verify-admin-code/1234 → 404
  if (segments[0] === 'verify-admin-code' && segments.length > 1) {
    return res.status(404).json({ ok: false })
  }

  switch (segments.join('/')) {
    case 'verify-admin-code':
      return handleVerifyAdminCodeRequest(req, res)
    case 'guests':
      return handleGuestsRequest(req, res)
    case 'booking-info':
      return handleBookingInfoRequest(req, res)
    case 'performance-data':
      return handlePerformanceDataRequest(req, res)
    case 'bookings':
      return handleBookingsRequest(req, res)
    case 'send-email':
      return handleSendEmailRequest(req, res)
    case 'user-profiles':
      return handleUserProfilesRequest(req, res)
    case 'drink-orders':
      return handleDrinkOrdersRequest(req, res)
    case 'chat':
      return handleChatRequest(req, res)
    case 'guestbook':
      return handleGuestbookRequest(req, res)
    case 'song-comments':
      return handleSongCommentsRequest(req, res)
    case 'games':
      return handleGamesRequest(req, res)
    case 'analytics':
      return handleAnalyticsRequest(req, res)
    case 'login-tokens':
      return handleLoginTokensRequest(req, res)
    default:
      return res.status(404).json({ ok: false, error: 'not_found', route: segments.join('/') })
  }
}
