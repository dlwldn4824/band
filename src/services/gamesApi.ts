import { callApi } from './apiClient'

export async function adminSpinRoulette(data: {
  isSpinning: boolean
  rotation: number
  result?: string
  items: string[]
  startTime?: number
  merge?: boolean
}) {
  const res = await callApi<{ ok: boolean }>('/api/games', 'spin-roulette', data, true)
  return res?.ok === true
}

export async function adminDrawEntry(data: {
  isDrawing: boolean
  currentNumber?: number | null
  selectedGuest?: unknown
  eligibleGuests: unknown[]
  startTime?: number
  merge?: boolean
}) {
  const res = await callApi<{ ok: boolean }>('/api/games', 'draw-entry', data, true)
  return res?.ok === true
}

export async function adminResetRoulette() {
  const res = await callApi<{ ok: boolean }>('/api/games', 'reset-roulette', {}, true)
  return res?.ok === true
}

export async function adminResetEntryDraw() {
  const res = await callApi<{ ok: boolean }>('/api/games', 'reset-entry-draw', {}, true)
  return res?.ok === true
}
