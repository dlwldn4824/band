import crypto from 'crypto'
import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { verifyGuest } from './guestAuth.js'

const COLLECTION = 'loginTokens'
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

const PUBLIC_ACTIONS = new Set(['resolve', 'create'])
const ADMIN_ACTIONS = new Set(['create-admin', 'revoke'])

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex')
}

function isOpaqueToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token.trim())
}

async function handleResolve(db, body) {
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) {
    return { status: 400, json: { ok: false, error: 'invalid_token' } }
  }

  // 레거시 base64(이름|전화) 토큰은 더 이상 허용하지 않음
  if (!isOpaqueToken(token)) {
    return { status: 400, json: { ok: false, error: 'legacy_token_invalid' } }
  }

  const snap = await db.collection(COLLECTION).doc(token).get()
  if (!snap.exists) {
    return { status: 404, json: { ok: false, error: 'not_found' } }
  }

  const data = snap.data() || {}
  if (data.revoked === true) {
    return { status: 410, json: { ok: false, error: 'revoked' } }
  }

  const expiresAt = data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : null)
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return { status: 410, json: { ok: false, error: 'expired' } }
  }

  const name = normalizeName(data.name)
  const phone = normalizePhone(data.phone)
  if (!name || !phone) {
    return { status: 500, json: { ok: false, error: 'invalid_token_data' } }
  }

  return { status: 200, json: { ok: true, name, phone } }
}

async function createTokenDoc(db, { name, phone }) {
  const token = createOpaqueToken()
  const now = new Date()
  await db.collection(COLLECTION).doc(token).set({
    name,
    phone,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    revoked: false,
  })
  return token
}

async function handleCreate(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || !phone) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const auth = await verifyGuest(db, { name, phone, allowAdmin: false })
  if (!auth.ok) {
    return { status: 403, json: { ok: false, error: auth.error } }
  }

  const token = await createTokenDoc(db, { name, phone })
  return { status: 200, json: { ok: true, token } }
}

async function handleCreateAdmin(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || !phone) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const token = await createTokenDoc(db, { name, phone })
  return { status: 200, json: { ok: true, token } }
}

async function handleRevoke(db, body) {
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token || !isOpaqueToken(token)) {
    return { status: 400, json: { ok: false, error: 'invalid_token' } }
  }
  await db.collection(COLLECTION).doc(token).set({ revoked: true, revokedAt: new Date() }, { merge: true })
  return { status: 200, json: { ok: true } }
}

export async function handleLoginTokensRequest(req, res) {
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
      case 'resolve':
        result = await handleResolve(db, body)
        break
      case 'create':
        result = await handleCreate(db, body)
        break
      case 'create-admin':
        result = await handleCreateAdmin(db, body)
        break
      case 'revoke':
        result = await handleRevoke(db, body)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[loginTokensApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
