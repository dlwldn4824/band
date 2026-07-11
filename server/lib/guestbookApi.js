import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName } from './guestNormalize.js'

const COLLECTION = 'messages'

const PUBLIC_ACTIONS = new Set(['add'])
const ADMIN_ACTIONS = new Set(['clear'])

async function handleAdd(db, body) {
  const message = body.message
  if (!message || typeof message !== 'object') {
    return { status: 400, json: { ok: false, error: 'invalid_message' } }
  }

  const id = message.id || String(Date.now())
  const name = normalizeName(message.name || body.name)
  if (!name) return { status: 400, json: { ok: false, error: 'invalid_name' } }

  await db.collection(COLLECTION).doc(id).set({
    ...message,
    name,
    timestamp: message.timestamp || new Date(),
  })

  return { status: 200, json: { ok: true, id } }
}

async function handleClear(db) {
  const snap = await db.collection(COLLECTION).get()
  if (snap.empty) return { status: 200, json: { ok: true, deletedCount: 0 } }

  const batch = db.batch()
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref))
  await batch.commit()
  return { status: 200, json: { ok: true, deletedCount: snap.size } }
}

export async function handleGuestbookRequest(req, res) {
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
      case 'add':
        result = await handleAdd(db, body)
        break
      case 'clear':
        result = await handleClear(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[guestbookApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
