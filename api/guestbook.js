import { handleGuestbookRequest } from '../server/lib/guestbookApi.js'

export default function handler(req, res) {
  return handleGuestbookRequest(req, res)
}
