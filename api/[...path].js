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
 * Hobby 플랜 서버리스 함수 12개 제한 대응 — /api/* 단일 라우터
 */
export default async function handler(req, res) {
  const pathParam = req.query.path
  const segments = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === 'string'
      ? pathParam.split('/').filter(Boolean)
      : []

  // URL fallback (일부 런타임에서 query.path 미설정)
  if (segments.length === 0 && typeof req.url === 'string') {
    const pathname = req.url.split('?')[0].replace(/^\/api\/?/, '')
    if (pathname) segments.push(...pathname.split('/').filter(Boolean))
  }

  const route = segments.join('/')

  // 봇 스캔: /api/verify-admin-code/1234 → 404
  if (segments[0] === 'verify-admin-code' && segments.length > 1) {
    return res.status(404).json({ ok: false })
  }

  switch (route) {
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
      return res.status(404).json({ ok: false, error: 'not_found' })
  }
}
