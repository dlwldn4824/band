import { callApi } from './apiClient'

export async function addGuestbookMessage(message: Record<string, unknown>) {
  const res = await callApi<{ ok: boolean; id?: string }>(
    '/api/guestbook',
    'add',
    { message }
  )
  return res?.ok === true
}

export async function adminClearGuestbook() {
  const res = await callApi<{ ok: boolean }>('/api/guestbook', 'clear', {}, true)
  return res?.ok === true
}
