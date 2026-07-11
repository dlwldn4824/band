import { handleUserProfilesRequest } from '../server/lib/userProfilesApi.js'

export default function handler(req, res) {
  return handleUserProfilesRequest(req, res)
}
