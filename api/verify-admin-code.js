import { handleVerifyAdminCodeRequest } from '../server/lib/verifyAdminCode.js'

export default function handler(req, res) {
  return handleVerifyAdminCodeRequest(req, res)
}
