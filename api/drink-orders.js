import { handleDrinkOrdersRequest } from '../server/lib/drinkOrdersApi.js'

export default function handler(req, res) {
  return handleDrinkOrdersRequest(req, res)
}
