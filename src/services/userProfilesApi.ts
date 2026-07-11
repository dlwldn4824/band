import { callApi } from './apiClient'

export interface UserProfile {
  id: string
  name: string
  phone: string
  nickname?: string
  ticketShown?: boolean
  updatedAt?: unknown
}

export async function getUserProfile(name: string, phone: string) {
  const res = await callApi<{ ok: boolean; profile: UserProfile | null }>(
    '/api/user-profiles',
    'get',
    { name, phone }
  )
  return res?.ok ? res.profile : null
}

export async function upsertUserProfile(data: {
  name: string
  phone: string
  nickname?: string
  ticketShown?: boolean
}) {
  const res = await callApi<{ ok: boolean; profile?: UserProfile }>(
    '/api/user-profiles',
    'upsert',
    data
  )
  return res?.ok ? res.profile ?? null : null
}

export async function checkNicknameAvailable(
  nickname: string,
  name: string,
  phone: string
) {
  const res = await callApi<{ ok: boolean; available?: boolean }>(
    '/api/user-profiles',
    'check-nickname',
    { nickname, name, phone }
  )
  return res?.ok ? res.available !== false : true
}

export async function adminListUserProfiles() {
  const res = await callApi<{ ok: boolean; profiles?: UserProfile[] }>(
    '/api/user-profiles',
    'list',
    {},
    true
  )
  return res?.ok ? res.profiles ?? [] : null
}

export async function adminDeleteUserProfile(id: string) {
  const res = await callApi<{ ok: boolean }>('/api/user-profiles', 'delete', { id }, true)
  return res?.ok === true
}

export async function adminBulkDeleteNonAdminProfiles() {
  const res = await callApi<{ ok: boolean; deletedCount?: number }>(
    '/api/user-profiles',
    'bulk-delete-non-admin',
    {},
    true
  )
  return res?.ok === true
}

export async function adminResetAdminNicknames() {
  const res = await callApi<{ ok: boolean; resetCount?: number }>(
    '/api/user-profiles',
    'reset-admin-nicknames',
    {},
    true
  )
  return res?.ok === true ? res.resetCount ?? 0 : null
}

export async function adminSyncAdminProfiles(performers: string[]) {
  const res = await callApi<{ ok: boolean }>(
    '/api/user-profiles',
    'sync-admin-profiles',
    { performers },
    true
  )
  return res?.ok === true
}
