import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

const ROULETTE_DOC = 'roulette/current'
const ENTRY_DRAW_DOC = 'entryDraw/current'

const ADMIN_ACTIONS = new Set(['spin-roulette', 'draw-entry', 'reset-roulette', 'reset-entry-draw'])

async function handleSpinRoulette(db, body) {
  const items = Array.isArray(body.items) ? body.items : []
  const rotation = Number(body.rotation) || 0
  const isSpinning = body.isSpinning === true
  const result = typeof body.result === 'string' ? body.result : ''
  const startTime = body.startTime ? new Date(body.startTime) : new Date()

  await db.doc(ROULETTE_DOC).set(
    {
      isSpinning,
      rotation,
      result,
      items,
      startTime,
    },
    { merge: body.merge !== false }
  )

  return { status: 200, json: { ok: true } }
}

async function handleDrawEntry(db, body) {
  const payload = {
    isDrawing: body.isDrawing === true,
    currentNumber: body.currentNumber ?? null,
    selectedGuest: body.selectedGuest ?? null,
    eligibleGuests: Array.isArray(body.eligibleGuests) ? body.eligibleGuests : [],
    startTime: body.startTime ? new Date(body.startTime) : new Date(),
  }

  await db.doc(ENTRY_DRAW_DOC).set(payload, { merge: body.merge !== false })
  return { status: 200, json: { ok: true } }
}

async function handleResetRoulette(db) {
  await db.doc(ROULETTE_DOC).set({
    isSpinning: false,
    rotation: 0,
    result: '',
    items: [],
    startTime: null,
  })
  return { status: 200, json: { ok: true } }
}

async function handleResetEntryDraw(db) {
  await db.doc(ENTRY_DRAW_DOC).set({
    isDrawing: false,
    currentNumber: null,
    selectedGuest: null,
    eligibleGuests: [],
    startTime: null,
  })
  return { status: 200, json: { ok: true } }
}

export async function handleGamesRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  if (!ADMIN_ACTIONS.has(action)) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  const token = getBearerToken(req)
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  let db
  try {
    db = getAdminDb()
  } catch (error) {
    const status = error?.code === 'not_configured' ? 503 : 500
    return res.status(status).json({ ok: false, error: 'server_not_configured' })
  }

  try {
    let result
    switch (action) {
      case 'spin-roulette':
        result = await handleSpinRoulette(db, body)
        break
      case 'draw-entry':
        result = await handleDrawEntry(db, body)
        break
      case 'reset-roulette':
        result = await handleResetRoulette(db)
        break
      case 'reset-entry-draw':
        result = await handleResetEntryDraw(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[gamesApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
