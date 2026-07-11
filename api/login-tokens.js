import { handleLoginTokensRequest } from '../server/lib/loginTokensApi.js'

export default function handler(req, res) {
  return handleLoginTokensRequest(req, res)
}
