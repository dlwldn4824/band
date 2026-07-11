import { callApi } from './apiClient'

export async function addSongComment(data: {
  name: string
  phone: string
  songName: string
  message: string
  nickname?: string
}) {
  const res = await callApi<{ ok: boolean; id?: string }>(
    '/api/song-comments',
    'add',
    data
  )
  return res?.ok === true
}

export async function adminListSongComments() {
  const res = await callApi<{ ok: boolean; comments?: Array<Record<string, unknown>> }>(
    '/api/song-comments',
    'list',
    {},
    true
  )
  return res?.ok ? res.comments ?? [] : null
}

export async function adminClearSongComments() {
  const res = await callApi<{ ok: boolean }>('/api/song-comments', 'clear', {}, true)
  return res?.ok === true
}
