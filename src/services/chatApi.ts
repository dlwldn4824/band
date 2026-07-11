import { callApi } from './apiClient'

export async function sendChatMessage(data: {
  name: string
  phone: string
  message: string
  user?: string
  nickname?: string
  isAdmin?: boolean
}) {
  const res = await callApi<{ ok: boolean; id?: string }>('/api/chat', 'send', data)
  return res?.ok === true
}

export async function upsertChatPresence(data: {
  name: string
  phone: string
  userId?: string
  nickname?: string
  isAdmin?: boolean
}) {
  const res = await callApi<{ ok: boolean }>('/api/chat', 'presence-upsert', data)
  return res?.ok === true
}

export async function removeChatPresence(userId: string) {
  const res = await callApi<{ ok: boolean }>('/api/chat', 'presence-remove', { userId })
  return res?.ok === true
}

export async function adminClearChat() {
  const res = await callApi<{ ok: boolean; deletedCount?: number }>(
    '/api/chat',
    'clear',
    {},
    true
  )
  return res?.ok === true
}
