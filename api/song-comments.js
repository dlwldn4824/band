import { handleSongCommentsRequest } from '../server/lib/songCommentsApi.js'

export default function handler(req, res) {
  return handleSongCommentsRequest(req, res)
}
