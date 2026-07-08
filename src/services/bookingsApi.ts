const ADMIN_TOKEN_KEY = 'adminApiToken'

export interface BookingRecord {
  id: string
  name: string
  phone: string
  email: string
  approved: boolean
  deleted: boolean
  isWalkIn: boolean
  bookedAt: number | null
  createdAt: number | null
  approvedAt: number | null
  source: string
}

export interface BookingStatusResult {
  ok: boolean
  exists: boolean
  booking?: BookingRecord
  error?: string
}

function getAdminApiToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

async function callBookingsApi<T>(
  action: string,
  body: Record<string, unknown> = {},
  admin = false
): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (admin) {
      const token = getAdminApiToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...body }),
    })

    try {
      return (await res.json()) as T
    } catch {
      return null
    }
  } catch {
    return null
  }
}

export async function getBookingStatus(
  phone: string,
  name?: string
): Promise<BookingStatusResult> {
  const body: Record<string, unknown> = { phone }
  if (name) body.name = name
  const result = await callBookingsApi<BookingStatusResult>('status', body)
  return result ?? { ok: false, exists: false }
}

export async function updateBooking(params: {
  phone: string
  name: string
  newPhone?: string
  originalName?: string
  email?: string
}): Promise<{ ok: boolean; booking?: BookingRecord }> {
  const result = await callBookingsApi<{ ok: boolean; booking?: BookingRecord }>('update', {
    phone: params.phone,
    newPhone: params.newPhone,
    name: params.name,
    originalName: params.originalName,
    email: params.email ?? '',
  })
  return result ?? { ok: false }
}

interface AdminBookingsResponse {
  ok: boolean
  bookings?: BookingRecord[]
  error?: string
}

export async function adminListBookings(): Promise<BookingRecord[] | null> {
  const result = await callBookingsApi<AdminBookingsResponse>('list', {}, true)
  return result?.ok && Array.isArray(result.bookings) ? result.bookings : null
}

export async function adminListPendingBookings(): Promise<BookingRecord[] | null> {
  const result = await callBookingsApi<AdminBookingsResponse>('list-pending', {}, true)
  return result?.ok && Array.isArray(result.bookings) ? result.bookings : null
}

export async function adminApproveBooking(params: {
  id?: string
  phone: string
  name?: string
}): Promise<boolean> {
  const result = await callBookingsApi<{ ok: boolean }>('approve', params, true)
  return result?.ok === true
}

export async function adminDeleteBooking(params: {
  id?: string
  phone: string
  name?: string
}): Promise<boolean> {
  const result = await callBookingsApi<{ ok: boolean; deleted?: boolean }>('delete', params, true)
  return result?.ok === true
}
