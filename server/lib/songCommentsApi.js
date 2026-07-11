import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { verifyGuest } from './guestAuth.js'

const COLLECTION = 'songComments'

const PUBLIC_ACTIONS = new Set(['add'])
const ADMIN_ACTIONS = new Set(['list', 'clear'])

async function handleAdd(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const songName = typeof body.songName === 'string' ? body.songName.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !songName || !message) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const auth = await verifyGuest(db, { name, phone, allowAdmin: true })
  if (!auth.ok && phone !== 'admin') {
    return { status: 403, json: { ok: false, error: auth.error } }
  }

  const ref = await db.collection(COLLECTION).add({
    songName,
    userName: name,
    userNickname: body.nickname || undefined,
    message,
    timestamp: new Date(),
  })

  return { status: 200, json: { ok: true, id: ref.id } }
}

async function handleList(db) {
  const snap = await db.collection(COLLECTION).get()
  const comments = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  return { status: 200, json: { ok: true, comments } }
}

async function handleClear(db) {
  const snap = await db.collection(COLLECTION).get()
  if (snap.empty) return { status: 200, json: { ok: true, deletedCount: 0 } }

  const batch = db.batch()
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref))
  await batch.commit()
  return { status: 200, json: { ok: true, deletedCount: snap.size } }
}

export async function handleSongCommentsRequest(req, res) {
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
      case 'list':
        result = await handleList(db)
        break
      case 'clear':
        result = await handleClear(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[songCommentsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
