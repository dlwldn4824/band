import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone, makeGuestKey } from './guestNormalize.js'
import { verifyGuest } from './guestAuth.js'

const COLLECTION = 'userProfiles'

const PUBLIC_ACTIONS = new Set(['get', 'upsert', 'check-nickname'])
const ADMIN_ACTIONS = new Set(['list', 'delete', 'bulk-delete-non-admin', 'sync-admin-profiles', 'reset-admin-nicknames'])

function serializeProfile(id, data) {
  return {
    id,
    name: data.name || '',
    phone: data.phone || '',
    nickname: data.nickname || '',
    ticketShown: data.ticketShown === true,
    updatedAt: data.updatedAt || null,
  }
}

async function handleGet(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const id = body.id || makeGuestKey(name, phone)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_identity' } }

  const auth = await verifyGuest(db, { name, phone, allowAdmin: true })
  if (!auth.ok && phone !== 'admin') {
    return { status: 403, json: { ok: false, error: auth.error } }
  }

  const snap = await db.collection(COLLECTION).doc(id).get()
  if (!snap.exists) {
    return { status: 200, json: { ok: true, profile: null } }
  }
  return { status: 200, json: { ok: true, profile: serializeProfile(snap.id, snap.data()) } }
}

async function handleUpsert(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const id = makeGuestKey(name, phone) || (phone === 'admin' ? `admin_${name}`.replace(/\s+/g, '_') : '')

  if (!id || !name) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  if (phone !== 'admin') {
    const auth = await verifyGuest(db, { name, phone })
    if (!auth.ok) return { status: 403, json: { ok: false, error: auth.error } }
  }

  const payload = {
    name,
    phone: body.phone || phone,
    updatedAt: new Date(),
  }
  if (typeof body.nickname === 'string') payload.nickname = body.nickname.trim()
  if (body.ticketShown === true) payload.ticketShown = true
  if (body.ticketShown === false) payload.ticketShown = false

  await db.collection(COLLECTION).doc(id).set(payload, { merge: true })
  const snap = await db.collection(COLLECTION).doc(id).get()
  return { status: 200, json: { ok: true, profile: serializeProfile(id, snap.data()) } }
}

async function handleCheckNickname(db, body) {
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const excludeId = body.excludeId || makeGuestKey(body.name, body.phone)
  if (!nickname) return { status: 400, json: { ok: false, error: 'invalid_nickname' } }

  const snap = await db.collection(COLLECTION).get()
  const duplicate = snap.docs.find((docSnap) => {
    if (excludeId && docSnap.id === excludeId) return false
    const data = docSnap.data()
    return data.nickname && data.nickname.trim() === nickname
  })

  return { status: 200, json: { ok: true, available: !duplicate } }
}

async function handleAdminList(db) {
  const snap = await db.collection(COLLECTION).get()
  const profiles = snap.docs.map((docSnap) => serializeProfile(docSnap.id, docSnap.data()))
  return { status: 200, json: { ok: true, profiles } }
}

async function handleAdminDelete(db, body) {
  const id = body.id
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_id' } }
  await db.collection(COLLECTION).doc(id).delete()
  return { status: 200, json: { ok: true, deleted: true } }
}

async function handleBulkDeleteNonAdmin(db) {
  const snap = await db.collection(COLLECTION).get()
  const batch = db.batch()
  let count = 0
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.phone !== 'admin') {
      batch.delete(docSnap.ref)
      count++
    }
  })
  if (count > 0) await batch.commit()
  return { status: 200, json: { ok: true, deletedCount: count } }
}

async function handleSyncAdminProfiles(db, body) {
  const performers = Array.isArray(body.performers)
    ? body.performers.map((p) => normalizeName(p)).filter(Boolean)
    : []
  const performersSet = new Set(performers)

  const snap = await db.collection(COLLECTION).get()
  const batch = db.batch()
  let resetCount = 0
  let deleteCount = 0

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.phone !== 'admin' || !data.name) return
    const adminName = normalizeName(data.name)
    if (performersSet.has(adminName)) {
      batch.set(
        docSnap.ref,
        { nickname: adminName, updatedAt: new Date() },
        { merge: true }
      )
      resetCount++
    } else {
      batch.delete(docSnap.ref)
      deleteCount++
    }
  })

  if (resetCount + deleteCount > 0) await batch.commit()
  return { status: 200, json: { ok: true, resetCount, deleteCount } }
}

async function handleResetAdminNicknames(db) {
  const snap = await db.collection(COLLECTION).get()
  const batch = db.batch()
  let count = 0
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.phone === 'admin' && data.name) {
      batch.set(
        docSnap.ref,
        { nickname: normalizeName(data.name), updatedAt: new Date() },
        { merge: true }
      )
      count++
    }
  })
  if (count > 0) await batch.commit()
  return { status: 200, json: { ok: true, resetCount: count } }
}

export async function handleUserProfilesRequest(req, res) {
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
      case 'get':
        result = await handleGet(db, body)
        break
      case 'upsert':
        result = await handleUpsert(db, body)
        break
      case 'check-nickname':
        result = await handleCheckNickname(db, body)
        break
      case 'list':
        result = await handleAdminList(db)
        break
      case 'delete':
        result = await handleAdminDelete(db, body)
        break
      case 'bulk-delete-non-admin':
        result = await handleBulkDeleteNonAdmin(db)
        break
      case 'sync-admin-profiles':
        result = await handleSyncAdminProfiles(db, body)
        break
      case 'reset-admin-nicknames':
        result = await handleResetAdminNicknames(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[userProfilesApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
