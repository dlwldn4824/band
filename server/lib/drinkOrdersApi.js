import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { verifyGuest, resolveDrinkOrderId } from './guestAuth.js'

const COLLECTION = 'drinkOrders'

const PUBLIC_ACTIONS = new Set(['get', 'submit'])
const ADMIN_ACTIONS = new Set([
  'list',
  'toggle-payment',
  'toggle-provided',
  'delete',
  'delete-history',
  'delete-all',
])

function serializeOrder(id, data) {
  return { id, ...data }
}

async function handleGet(db, body) {
  const name = normalizeName(body.name)
  const phone = body.phone || ''
  const isAdmin = phone === 'admin'
  const orderId = body.orderId || resolveDrinkOrderId({ name, phone, isAdmin })

  if (!orderId) return { status: 400, json: { ok: false, error: 'invalid_identity' } }

  if (!isAdmin) {
    const auth = await verifyGuest(db, { name, phone })
    if (!auth.ok) return { status: 403, json: { ok: false, error: auth.error } }
  }

  const snap = await db.collection(COLLECTION).doc(orderId).get()
  if (!snap.exists) {
    return { status: 200, json: { ok: true, order: null } }
  }
  return { status: 200, json: { ok: true, order: serializeOrder(snap.id, snap.data()) } }
}

async function handleSubmit(db, body) {
  const name = normalizeName(body.name)
  const phone = body.phone || ''
  const isAdmin = phone === 'admin'
  const orderId = body.orderId || resolveDrinkOrderId({ name, phone, isAdmin })

  if (!orderId || !name) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  if (!isAdmin) {
    const auth = await verifyGuest(db, { name, phone })
    if (!auth.ok) return { status: 403, json: { ok: false, error: auth.error } }
  }

  const beerQty = Number(body.beerQuantity) || 0
  const mojitoQty = Number(body.mojitoQuantity) || 0
  if (beerQty < 0 || mojitoQty < 0) {
    return { status: 400, json: { ok: false, error: 'invalid_quantity' } }
  }

  const ref = db.collection(COLLECTION).doc(orderId)
  const snap = await ref.get()
  const existing = snap.exists ? snap.data() : {}
  const now = new Date()

  let orderHistory = Array.isArray(existing.orderHistory) ? [...existing.orderHistory] : []
  const existingBeer = existing.beerQuantity || 0
  const existingMojito = existing.mojitoQuantity || 0

  if (beerQty > 0 || mojitoQty > 0) {
    orderHistory.push({
      beerQuantity: beerQty,
      mojitoQuantity: mojitoQty,
      unitPrice: body.unitPrice,
      createdAt: now,
      provided: false,
      providedAt: null,
    })
  }

  const totalBeer = existingBeer + beerQty
  const totalMojito = existingMojito + mojitoQty
  let totalAmount = 0
  orderHistory.forEach((item) => {
    const price = item.unitPrice || (isAdmin ? 0 : 3500)
    totalAmount += (item.beerQuantity || 0) * price + (item.mojitoQuantity || 0) * price
  })

  const payload = {
    userId: orderId,
    name,
    phone,
    beerQuantity: totalBeer,
    mojitoQuantity: totalMojito,
    totalAmount: body.totalAmount ?? totalAmount,
    confirmed: true,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    orderHistory,
  }

  await ref.set(payload, { merge: true })
  const updated = await ref.get()
  return { status: 200, json: { ok: true, order: serializeOrder(orderId, updated.data()) } }
}

async function handleAdminList(db) {
  const snap = await db.collection(COLLECTION).get()
  const orders = snap.docs
    .map((docSnap) => serializeOrder(docSnap.id, docSnap.data()))
    .filter((o) => o.confirmed === true)
  return { status: 200, json: { ok: true, orders } }
}

async function handleTogglePayment(db, body) {
  const orderId = body.orderId
  if (!orderId) return { status: 400, json: { ok: false, error: 'invalid_order_id' } }

  const ref = db.collection(COLLECTION).doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'not_found' } }

  const data = snap.data()
  const willBeConfirmed = body.paymentConfirmed ?? !data.paymentConfirmed
  const now = new Date()
  await ref.set(
    {
      paymentConfirmed: willBeConfirmed,
      paymentConfirmedAt: willBeConfirmed ? now : null,
      updatedAt: now,
    },
    { merge: true }
  )
  const updated = await ref.get()
  return { status: 200, json: { ok: true, order: serializeOrder(orderId, updated.data()) } }
}

async function handleToggleProvided(db, body) {
  const orderId = body.orderId
  const historyIndex = body.historyIndex
  if (!orderId) return { status: 400, json: { ok: false, error: 'invalid_order_id' } }

  const ref = db.collection(COLLECTION).doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'not_found' } }

  const data = snap.data()
  const now = new Date()

  if (Array.isArray(data.orderHistory) && typeof historyIndex === 'number') {
    const orderHistory = [...data.orderHistory]
    const item = orderHistory[historyIndex]
    if (!item) return { status: 400, json: { ok: false, error: 'invalid_history_index' } }
    const willBeProvided = !item.provided
    orderHistory[historyIndex] = {
      ...item,
      provided: willBeProvided,
      providedAt: willBeProvided ? now : null,
    }
    const allProvided = orderHistory.every((h) => h.provided === true)
    await ref.set(
      { orderHistory, provided: allProvided, providedAt: allProvided ? now : null, updatedAt: now },
      { merge: true }
    )
  } else {
    const willBeProvided = body.provided ?? !data.provided
    await ref.set(
      { provided: willBeProvided, providedAt: willBeProvided ? now : null, updatedAt: now },
      { merge: true }
    )
  }

  const updated = await ref.get()
  return { status: 200, json: { ok: true, order: serializeOrder(orderId, updated.data()) } }
}

async function handleDelete(db, body) {
  const orderId = body.orderId
  if (!orderId) return { status: 400, json: { ok: false, error: 'invalid_order_id' } }
  await db.collection(COLLECTION).doc(orderId).delete()
  return { status: 200, json: { ok: true, deleted: true } }
}

async function handleDeleteHistory(db, body) {
  const orderId = body.orderId
  const historyIndex = body.historyIndex
  if (!orderId || typeof historyIndex !== 'number') {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const ref = db.collection(COLLECTION).doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'not_found' } }

  const data = snap.data()
  const orderHistory = Array.isArray(data.orderHistory) ? [...data.orderHistory] : []

  if (orderHistory.length <= 1) {
    await ref.delete()
    return { status: 200, json: { ok: true, deleted: true, order: null } }
  }

  const updatedHistory = orderHistory.filter((_, idx) => idx !== historyIndex)
  let totalBeer = 0
  let totalMojito = 0
  updatedHistory.forEach((h) => {
    totalBeer += h.beerQuantity || 0
    totalMojito += h.mojitoQuantity || 0
  })
  const totalAmount = totalBeer * 3500 + totalMojito * 3500
  const now = new Date()

  await ref.set(
    {
      orderHistory: updatedHistory,
      beerQuantity: totalBeer,
      mojitoQuantity: totalMojito,
      totalAmount,
      updatedAt: now,
    },
    { merge: true }
  )
  const updated = await ref.get()
  return { status: 200, json: { ok: true, deleted: false, order: serializeOrder(orderId, updated.data()) } }
}

async function handleDeleteAll(db) {
  const snap = await db.collection(COLLECTION).get()
  if (snap.empty) return { status: 200, json: { ok: true, deletedCount: 0 } }
  const batch = db.batch()
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref))
  await batch.commit()
  return { status: 200, json: { ok: true, deletedCount: snap.size } }
}

export async function handleDrinkOrdersRequest(req, res) {
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
      case 'submit':
        result = await handleSubmit(db, body)
        break
      case 'list':
        result = await handleAdminList(db)
        break
      case 'toggle-payment':
        result = await handleTogglePayment(db, body)
        break
      case 'toggle-provided':
        result = await handleToggleProvided(db, body)
        break
      case 'delete':
        result = await handleDelete(db, body)
        break
      case 'delete-history':
        result = await handleDeleteHistory(db, body)
        break
      case 'delete-all':
        result = await handleDeleteAll(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[drinkOrdersApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
