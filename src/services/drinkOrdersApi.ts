import { callApi } from './apiClient'

export interface DrinkOrder {
  id: string
  userId?: string
  name?: string
  phone?: string
  beerQuantity?: number
  mojitoQuantity?: number
  totalAmount?: number
  confirmed?: boolean
  createdAt?: unknown
  updatedAt?: unknown
  orderHistory?: Array<{
    beerQuantity: number
    mojitoQuantity: number
    unitPrice?: number
    createdAt: unknown
    provided?: boolean
    providedAt?: unknown
  }>
  paymentConfirmed?: boolean
  paymentConfirmedAt?: unknown
  provided?: boolean
  providedAt?: unknown
}

export async function getDrinkOrder(name: string, phone: string, orderId?: string) {
  const res = await callApi<{ ok: boolean; order: DrinkOrder | null }>(
    '/api/drink-orders',
    'get',
    { name, phone, orderId }
  )
  return res?.ok ? res.order : null
}

export async function submitDrinkOrder(data: {
  name: string
  phone: string
  beerQuantity: number
  mojitoQuantity: number
  unitPrice?: number
  totalAmount?: number
  orderId?: string
}) {
  const res = await callApi<{ ok: boolean; order?: DrinkOrder }>(
    '/api/drink-orders',
    'submit',
    data
  )
  return res?.ok ? res.order ?? null : null
}

export async function adminListDrinkOrders() {
  const res = await callApi<{ ok: boolean; orders?: DrinkOrder[] }>(
    '/api/drink-orders',
    'list',
    {},
    true
  )
  return res?.ok ? res.orders ?? [] : null
}

export async function adminToggleDrinkPayment(orderId: string, paymentConfirmed?: boolean) {
  const res = await callApi<{ ok: boolean; order?: DrinkOrder }>(
    '/api/drink-orders',
    'toggle-payment',
    { orderId, paymentConfirmed },
    true
  )
  return res?.ok ? res.order ?? null : null
}

export async function adminToggleDrinkProvided(
  orderId: string,
  historyIndex?: number,
  provided?: boolean
) {
  const res = await callApi<{ ok: boolean; order?: DrinkOrder }>(
    '/api/drink-orders',
    'toggle-provided',
    { orderId, historyIndex, provided },
    true
  )
  return res?.ok ? res.order ?? null : null
}

export async function adminDeleteDrinkOrder(orderId: string) {
  const res = await callApi<{ ok: boolean }>('/api/drink-orders', 'delete', { orderId }, true)
  return res?.ok === true
}

export async function adminDeleteAllDrinkOrders() {
  const res = await callApi<{ ok: boolean; deletedCount?: number }>(
    '/api/drink-orders',
    'delete-all',
    {},
    true
  )
  return res?.ok === true ? res.deletedCount ?? 0 : null
}

export async function adminDeleteDrinkOrderHistory(orderId: string, historyIndex: number) {
  const res = await callApi<{ ok: boolean; deleted?: boolean; order?: DrinkOrder | null }>(
    '/api/drink-orders',
    'delete-history',
    { orderId, historyIndex },
    true
  )
  return res
}
