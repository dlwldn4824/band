import type { BookingInfo } from '../contexts/DataContext'

const ADMIN_TOKEN_KEY = 'adminApiToken'

export async function saveBookingInfo(info: BookingInfo): Promise<boolean> {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    const res = await fetch('/api/booking-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ info }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}
