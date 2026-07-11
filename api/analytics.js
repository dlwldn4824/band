import { handleAnalyticsRequest } from '../server/lib/analyticsApi.js'

export default function handler(req, res) {
  return handleAnalyticsRequest(req, res)
}
