import { handleChatRequest } from '../server/lib/chatApi.js'

export default function handler(req, res) {
  return handleChatRequest(req, res)
}
