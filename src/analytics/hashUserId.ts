import { normalizePhone } from '../utils/guestUtils'

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const hashCache = new Map<string, string>()

export async function hashUserId(
  phone: string,
  prefix: 'guest' | 'admin' = 'guest'
): Promise<string> {
  const normalized = normalizePhone(phone)
  const cacheKey = `${prefix}:${normalized}`
  const cached = hashCache.get(cacheKey)
  if (cached) return cached

  const hex = await sha256Hex(normalized)
  const hashed = `${prefix}_${hex.slice(0, 16)}`
  hashCache.set(cacheKey, hashed)
  return hashed
}

export async function hashGuestId(phone: string): Promise<string> {
  return hashUserId(phone, 'guest')
}

export async function hashAdminId(name: string): Promise<string> {
  const hex = await sha256Hex(name.trim())
  return `admin_${hex.slice(0, 16)}`
}
