import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

const COLLECTION = 'analytics_events'
const MAX_EVENTS = 5000

const PUBLIC_ACTIONS = new Set(['track'])
const ADMIN_ACTIONS = new Set(['list'])

async function handleTrack(db, body) {
  const events = Array.isArray(body.events) ? body.events : body.event ? [body.event] : []
  if (events.length === 0) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const batch = db.batch()
  const now = new Date()
  events.forEach((event) => {
    if (!event || typeof event !== 'object') return
    const ref = db.collection(COLLECTION).doc()
    batch.set(ref, {
      ...event,
      timestamp: now,
    })
  })
  await batch.commit()

  return { status: 200, json: { ok: true, count: events.length } }
}

async function handleList(db) {
  const snap = await db
    .collection(COLLECTION)
    .orderBy('timestamp', 'desc')
    .limit(MAX_EVENTS)
    .get()
    .catch(async () => {
      const fallback = await db.collection(COLLECTION).limit(MAX_EVENTS).get()
      return fallback
    })

  const events = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  return { status: 200, json: { ok: true, events, truncated: snap.size >= MAX_EVENTS } }
}

export async function handleAnalyticsRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  if (!PUBLIC_ACTIONS.has(action) && !ADMIN_ACTIONS.has(action)) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  if (ADMIN_ACTIONS.has(action)) {
    const token = getBearerToken(req)
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' })
    }
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
      case 'track':
        result = await handleTrack(db, body)
        break
      case 'list':
        result = await handleList(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[analyticsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
