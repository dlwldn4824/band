import { handlePerformanceDataRequest } from '../server/lib/performanceDataApi.js'

export default function handler(req, res) {
  return handlePerformanceDataRequest(req, res)
}
