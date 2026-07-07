import { handleBookingInfoRequest } from '../server/lib/bookingInfoApi.js'

export default function handler(req, res) {
  return handleBookingInfoRequest(req, res)
}
