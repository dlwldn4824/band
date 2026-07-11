import { handleSendEmailRequest } from '../server/lib/sendEmailApi.js'

export default function handler(req, res) {
  return handleSendEmailRequest(req, res)
}
