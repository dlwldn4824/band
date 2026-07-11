import type { PerformanceData } from '../contexts/DataContext'

const ADMIN_TOKEN_KEY = 'adminApiToken'

export async function savePerformanceData(data: PerformanceData): Promise<boolean> {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    const res = await fetch('/api/performance-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) return false
    const result = (await res.json()) as { ok?: boolean }
    return result.ok === true
  } catch {
    return false
  }
}
