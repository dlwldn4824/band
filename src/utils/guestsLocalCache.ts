import type { Guest } from '../contexts/DataContext'
import { getGuestsStorageKey } from '../config/firestorePaths'

const LEGACY_KEYS = ['guests', 'guests_v2'] as const

function parseGuestArray(raw: string): Guest[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Guest[]
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { guests?: Guest[] }).guests)) {
      const guests = (parsed as { guests: Guest[] }).guests
      return guests.length > 0 ? guests : null
    }
  } catch {
    // ignore
  }
  return null
}

export function loadGuestsFromLocalCache(): Guest[] | null {
  const keys = [getGuestsStorageKey(), ...LEGACY_KEYS]
  const seen = new Set<string>()

  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const raw = localStorage.getItem(key)
    if (!raw) continue
    const guests = parseGuestArray(raw)
    if (guests) {
      return guests.filter((g) => g.isDeleted !== true)
    }
  }

  return null
}

export function saveGuestsToLocalCache(guests: Guest[]): void {
  try {
    localStorage.setItem(getGuestsStorageKey(), JSON.stringify(guests))
  } catch {
    // ignore quota errors
  }
}

export function describeLocalGuestsBackup(): { key: string; count: number } | null {
  const keys = [getGuestsStorageKey(), ...LEGACY_KEYS]
  const seen = new Set<string>()

  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const raw = localStorage.getItem(key)
    if (!raw) continue
    const guests = parseGuestArray(raw)
    if (guests) {
      return { key, count: guests.filter((g) => g.isDeleted !== true).length }
    }
  }

  return null
}
