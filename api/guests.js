import { handleGuestsRequest } from '../server/lib/guestsApi.js'

export default function handler(req, res) {
  return handleGuestsRequest(req, res)
}
