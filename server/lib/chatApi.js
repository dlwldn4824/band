import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { verifyGuest } from './guestAuth.js'

const CHAT_COLLECTION = 'chat'
const ONLINE_COLLECTION = 'onlineUsers'

const PUBLIC_ACTIONS = new Set(['send', 'presence-upsert', 'presence-remove'])
const ADMIN_ACTIONS = new Set(['clear'])

async function handleSend(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const isAdmin = phone === 'admin' || body.isAdmin === true

  if (!message) return { status: 400, json: { ok: false, error: 'invalid_message' } }

  if (!isAdmin) {
    const auth = await verifyGuest(db, { name, phone, requirePayment: true })
    if (!auth.ok) return { status: 403, json: { ok: false, error: auth.error } }
  }

  const displayUser = body.user || body.nickname || name
  const ref = await db.collection(CHAT_COLLECTION).add({
    user: displayUser,
    message,
    timestamp: new Date(),
  })

  return { status: 200, json: { ok: true, id: ref.id } }
}

async function handlePresenceUpsert(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const isAdmin = phone === 'admin' || body.isAdmin === true
  const userId = body.userId || phone

  if (!userId || !name) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  if (!isAdmin) {
    const auth = await verifyGuest(db, { name, phone, requirePayment: true })
    if (!auth.ok) return { status: 403, json: { ok: false, error: auth.error } }
  }

  const displayName = body.nickname || name
  await db.collection(ONLINE_COLLECTION).doc(userId).set(
    {
      name,
      phone: body.phone || phone,
      nickname: displayName,
      lastSeen: new Date(),
    },
    { merge: true }
  )

  return { status: 200, json: { ok: true } }
}

async function handlePresenceRemove(db, body) {
  const userId = body.userId || normalizePhone(body.phone)
  if (!userId) return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  await db.collection(ONLINE_COLLECTION).doc(userId).delete()
  return { status: 200, json: { ok: true } }
}

async function handleClear(db) {
  const snap = await db.collection(CHAT_COLLECTION).get()
  if (snap.empty) return { status: 200, json: { ok: true, deletedCount: 0 } }

  const batch = db.batch()
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref))
  await batch.commit()
  return { status: 200, json: { ok: true, deletedCount: snap.size } }
}

export async function handleChatRequest(req, res) {
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
      case 'send':
        result = await handleSend(db, body)
        break
      case 'presence-upsert':
        result = await handlePresenceUpsert(db, body)
        break
      case 'presence-remove':
        result = await handlePresenceRemove(db, body)
        break
      case 'clear':
        result = await handleClear(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[chatApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
