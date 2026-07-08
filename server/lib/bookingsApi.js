import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { normalizePhone, normalizeName } from './guestNormalize.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

const BOOKINGS_COLLECTION = 'bookings'

const PUBLIC_ACTIONS = new Set(['status', 'update'])
const ADMIN_ACTIONS = new Set(['list', 'list-pending', 'approve', 'delete'])

function parseBookedAt(value) {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    if (value > 1_000_000_000_000) return value
    if (value > 1_000_000_000) return value * 1000
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime()
  }

  if (typeof value === 'object' && value !== null && typeof value.toDate === 'function') {
    try {
      const date = value.toDate()
      return Number.isNaN(date.getTime()) ? null : date.getTime()
    } catch {
      return null
    }
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
  }

  return null
}

function serializeBooking(docId, data) {
  const phone = normalizePhone(data.phone || docId)
  const bookedAt = parseBookedAt(data.bookedAt ?? data.createdAt)
  const createdAt = parseBookedAt(data.createdAt)
  const approvedAt = parseBookedAt(data.approvedAt)

  return {
    id: docId,
    name: data.name || '',
    phone,
    email: data.email || '',
    approved: data.approved === true,
    deleted: data.deleted === true,
    isWalkIn: data.isWalkIn === true,
    bookedAt,
    createdAt,
    approvedAt,
    source: data.source || '',
  }
}

async function findBookingDoc(db, { phone, name, id }) {
  const normalizedPhone = normalizePhone(phone || id)
  if (!normalizedPhone && !id) return null

  if (normalizedPhone) {
    const snap = await db.collection(BOOKINGS_COLLECTION).doc(normalizedPhone).get()
    if (snap.exists && snap.data().deleted !== true) {
      return { ref: snap.ref, data: snap.data(), id: snap.id }
    }
  }

  if (id && id !== normalizedPhone) {
    const snap = await db.collection(BOOKINGS_COLLECTION).doc(id).get()
    if (snap.exists && snap.data().deleted !== true) {
      return { ref: snap.ref, data: snap.data(), id: snap.id }
    }
  }

  if (name && normalizedPhone) {
    const legacyId = `${normalizeName(name)}_${normalizedPhone}`
    const snap = await db.collection(BOOKINGS_COLLECTION).doc(legacyId).get()
    if (snap.exists && snap.data().deleted !== true) {
      return { ref: snap.ref, data: snap.data(), id: snap.id }
    }
  }

  return null
}

async function handlePublicStatus(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) {
    return { status: 400, json: { ok: false, error: 'invalid_phone' } }
  }

  const found = await findBookingDoc(db, { phone, name: body.name, id: body.id })
  if (!found) {
    return { status: 200, json: { ok: true, exists: false } }
  }

  return {
    status: 200,
    json: {
      ok: true,
      exists: true,
      booking: serializeBooking(found.id, found.data),
    },
  }
}

async function handlePublicUpdate(db, body) {
  const originalPhone = normalizePhone(body.phone)
  const newPhone = normalizePhone(body.newPhone || body.phone)
  const name = normalizeName(body.name)
  const email = typeof body.email === 'string' ? body.email : ''

  if (!originalPhone || !newPhone || !name) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const found = await findBookingDoc(db, {
    phone: originalPhone,
    name: body.originalName,
    id: body.id,
  })

  const baseData = found?.data || {}
  const now = new Date()
  const payload = {
    ...baseData,
    name,
    phone: newPhone,
    email,
    approved: baseData.approved === true ? true : false,
    updatedAt: now,
    ...(baseData.createdAt ? {} : { createdAt: now }),
  }

  if (newPhone !== originalPhone || (found && found.id !== newPhone)) {
    await db.collection(BOOKINGS_COLLECTION).doc(newPhone).set(payload, { merge: true })

    const oldId = found?.id || originalPhone
    if (oldId && oldId !== newPhone) {
      await db.collection(BOOKINGS_COLLECTION).doc(oldId).set(
        { deleted: true, updatedAt: now },
        { merge: true }
      )
    }
  } else {
    const docId = found?.id || newPhone
    await db.collection(BOOKINGS_COLLECTION).doc(docId).set(payload, { merge: true })
  }

  return {
    status: 200,
    json: {
      ok: true,
      booking: serializeBooking(newPhone, payload),
    },
  }
}

async function handleAdminList(db) {
  const snap = await db.collection(BOOKINGS_COLLECTION).get()
  const bookings = []

  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.deleted === true) return
    bookings.push(serializeBooking(docSnap.id, data))
  })

  return { status: 200, json: { ok: true, bookings } }
}

async function handleAdminListPending(db) {
  const snap = await db.collection(BOOKINGS_COLLECTION).get()
  const bookings = []

  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.deleted === true) return
    if (data.approved === true) return
    bookings.push(serializeBooking(docSnap.id, data))
  })

  bookings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return { status: 200, json: { ok: true, bookings } }
}

async function handleAdminApprove(db, body) {
  const id = body.id || body.phone
  const found = await findBookingDoc(db, { phone: body.phone, name: body.name, id })
  if (!found) {
    return { status: 404, json: { ok: false, error: 'not_found' } }
  }

  const now = new Date()
  await found.ref.set(
    {
      approved: true,
      approvedAt: now,
      updatedAt: now,
    },
    { merge: true }
  )

  return {
    status: 200,
    json: {
      ok: true,
      booking: serializeBooking(found.id, { ...found.data, approved: true, approvedAt: now }),
    },
  }
}

async function handleAdminDelete(db, body) {
  const found = await findBookingDoc(db, { phone: body.phone, name: body.name, id: body.id })
  if (!found) {
    return { status: 200, json: { ok: true, deleted: false } }
  }

  const now = new Date()
  await found.ref.set({ deleted: true, updatedAt: now }, { merge: true })

  return { status: 200, json: { ok: true, deleted: true, id: found.id } }
}

export async function handleBookingsRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false })
  }

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
      case 'status':
        result = await handlePublicStatus(db, body)
        break
      case 'update':
        result = await handlePublicUpdate(db, body)
        break
      case 'list':
        result = await handleAdminList(db)
        break
      case 'list-pending':
        result = await handleAdminListPending(db)
        break
      case 'approve':
        result = await handleAdminApprove(db, body)
        break
      case 'delete':
        result = await handleAdminDelete(db, body)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }

    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[bookingsApi] error:', error)
    const mapped = mapFirestoreError(error)
    const status = mapped === 'internal_error' ? 500 : 503
    return res.status(status).json({ ok: false, error: mapped })
  }
}
