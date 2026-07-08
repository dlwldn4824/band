import { handleBookingsRequest } from '../server/lib/bookingsApi.js'

export default function handler(req, res) {
  return handleBookingsRequest(req, res)
}
