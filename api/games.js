import { handleGamesRequest } from '../server/lib/gamesApi.js'

export default function handler(req, res) {
  return handleGamesRequest(req, res)
}
