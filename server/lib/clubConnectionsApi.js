import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { checkRateLimit, recordRateLimitFailure, getClientIp } from './rateLimit.js'
import {
  CLUBS_COLLECTION,
  CLUB_CONNECTIONS_COLLECTION,
  normalizeText,
  serializeConnection,
  verifyManageCode,
} from './bandyCore.js'

/**
 * 교류 — 동아리 간 연결입니다.
 * 신청과 응답 모두 해당 동아리의 운영진 코드로만 가능하고,
 * 수락된 연결만 공개 프로필에 노출됩니다.
 */

const CLUB_ACTIONS = new Set(['request', 'inbox', 'respond', 'withdraw'])
const ADMIN_ACTIONS = new Set(['list-all'])

const REQUEST_SCOPE = 'club-connection-request'

function connectionDocId(fromClubId, toClubId) {
  return `${fromClubId}__${toClubId}`
}

async function requireClubAccess(db, body, clubIdField = 'clubId') {
  const clubId = normalizeText(body[clubIdField], 80)
  if (!clubId) return { error: { status: 400, json: { ok: false, error: 'invalid_club_id' } } }

  const snap = await db.collection(CLUBS_COLLECTION).doc(clubId).get()
  if (!snap.exists) return { error: { status: 404, json: { ok: false, error: 'club_not_found' } } }

  if (body.__adminOverride === true) return { clubId, club: snap.data() || {} }

  const code = normalizeText(body.manageCode, 32)
  if (!verifyManageCode(clubId, code, snap.data()?.manageCodeHash)) {
    return { error: { status: 403, json: { ok: false, error: 'invalid_manage_code' } } }
  }
  return { clubId, club: snap.data() || {} }
}

async function recountAcceptedConnections(db, clubId) {
  const [fromSnap, toSnap] = await Promise.all([
    db
      .collection(CLUB_CONNECTIONS_COLLECTION)
      .where('fromClubId', '==', clubId)
      .where('status', '==', 'accepted')
      .get(),
    db
      .collection(CLUB_CONNECTIONS_COLLECTION)
      .where('toClubId', '==', clubId)
      .where('status', '==', 'accepted')
      .get(),
  ])
  await db
    .collection(CLUBS_COLLECTION)
    .doc(clubId)
    .set({ connectionCount: fromSnap.size + toSnap.size, updatedAt: new Date() }, { merge: true })
}

async function handleRequest(db, body, req) {
  const access = await requireClubAccess(db, body, 'fromClubId')
  if (access.error) return access.error

  const fromClubId = access.clubId
  const toClubId = normalizeText(body.toClubId, 80)
  const message = normalizeText(body.message, 600)

  if (!toClubId) return { status: 400, json: { ok: false, error: 'invalid_target_club' } }
  if (toClubId === fromClubId) return { status: 400, json: { ok: false, error: 'same_club' } }
  if (message.length < 10) return { status: 400, json: { ok: false, error: 'message_too_short' } }

  const clientIp = getClientIp(req)
  const limit = await checkRateLimit(REQUEST_SCOPE, clientIp, {
    maxFailures: 15,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return { status: 429, json: { ok: false, error: 'rate_limited', retryAfterMs: limit.retryAfterMs } }
  }

  const toSnap = await db.collection(CLUBS_COLLECTION).doc(toClubId).get()
  if (!toSnap.exists) return { status: 404, json: { ok: false, error: 'club_not_found' } }

  const toClub = toSnap.data() || {}
  if (toClub.openToExchange === false) {
    return { status: 409, json: { ok: false, error: 'not_open_to_exchange' } }
  }

  // 같은 방향의 기존 신청이 대기/수락 상태면 중복 신청을 막습니다.
  const forwardRef = db.collection(CLUB_CONNECTIONS_COLLECTION).doc(connectionDocId(fromClubId, toClubId))
  const reverseRef = db.collection(CLUB_CONNECTIONS_COLLECTION).doc(connectionDocId(toClubId, fromClubId))
  const [forwardSnap, reverseSnap] = await Promise.all([forwardRef.get(), reverseRef.get()])

  for (const snap of [forwardSnap, reverseSnap]) {
    if (!snap.exists) continue
    const status = snap.data()?.status
    if (status === 'accepted') return { status: 409, json: { ok: false, error: 'already_connected' } }
    if (status === 'pending') return { status: 409, json: { ok: false, error: 'already_requested' } }
  }

  await recordRateLimitFailure(REQUEST_SCOPE, clientIp, { windowMs: 60 * 60 * 1000 })

  const payload = {
    fromClubId,
    fromClubName: access.club.name || '',
    toClubId,
    toClubName: toClub.name || '',
    status: 'pending',
    message,
    requesterName: normalizeText(body.requesterName, 40) || `${access.club.name || ''} 운영진`,
    requesterContact: normalizeText(body.requesterContact, 80) || access.club.instagram || '',
    createdAt: new Date(),
    respondedAt: null,
    updatedAt: new Date(),
  }

  await forwardRef.set(payload, { merge: true })

  return {
    status: 200,
    json: { ok: true, connection: serializeConnection(forwardRef.id, payload) },
  }
}

async function handleInbox(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error

  const clubId = access.clubId
  const [receivedSnap, sentSnap] = await Promise.all([
    db.collection(CLUB_CONNECTIONS_COLLECTION).where('toClubId', '==', clubId).get(),
    db.collection(CLUB_CONNECTIONS_COLLECTION).where('fromClubId', '==', clubId).get(),
  ])

  const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  const received = receivedSnap.docs.map((d) => serializeConnection(d.id, d.data())).sort(byNewest)
  const sent = sentSnap.docs.map((d) => serializeConnection(d.id, d.data())).sort(byNewest)

  const answered = received.filter((c) => c.status !== 'pending')
  const summary = {
    receivedTotal: received.length,
    receivedPending: received.filter((c) => c.status === 'pending').length,
    receivedAccepted: received.filter((c) => c.status === 'accepted').length,
    sentTotal: sent.length,
    sentAccepted: sent.filter((c) => c.status === 'accepted').length,
    /** 받은 교류 중 수락한 비율 */
    acceptRate:
      answered.length > 0
        ? Math.round((received.filter((c) => c.status === 'accepted').length / answered.length) * 100)
        : 0,
  }

  return { status: 200, json: { ok: true, received, sent, summary } }
}

async function handleRespond(db, body) {
  // 응답 권한은 신청을 받은 동아리(toClubId)에 있습니다.
  const connectionId = normalizeText(body.connectionId, 200)
  if (!connectionId) return { status: 400, json: { ok: false, error: 'invalid_connection_id' } }

  const ref = db.collection(CLUB_CONNECTIONS_COLLECTION).doc(connectionId)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'connection_not_found' } }

  const data = snap.data() || {}
  const access = await requireClubAccess(db, { ...body, clubId: data.toClubId })
  if (access.error) return access.error

  const decision = body.decision === 'accept' ? 'accepted' : body.decision === 'decline' ? 'declined' : null
  if (!decision) return { status: 400, json: { ok: false, error: 'invalid_decision' } }

  await ref.set({ status: decision, respondedAt: new Date(), updatedAt: new Date() }, { merge: true })

  // 양쪽 동아리의 연결 수를 다시 집계
  await Promise.all([
    recountAcceptedConnections(db, data.fromClubId),
    recountAcceptedConnections(db, data.toClubId),
  ])

  const updated = await ref.get()
  return { status: 200, json: { ok: true, connection: serializeConnection(updated.id, updated.data()) } }
}

async function handleWithdraw(db, body) {
  // 철회 권한은 신청한 동아리(fromClubId)에 있습니다.
  const connectionId = normalizeText(body.connectionId, 200)
  if (!connectionId) return { status: 400, json: { ok: false, error: 'invalid_connection_id' } }

  const ref = db.collection(CLUB_CONNECTIONS_COLLECTION).doc(connectionId)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'connection_not_found' } }

  const data = snap.data() || {}
  const access = await requireClubAccess(db, { ...body, clubId: data.fromClubId })
  if (access.error) return access.error

  if (data.status === 'pending') {
    await ref.delete()
  } else {
    await ref.set({ status: 'declined', respondedAt: new Date(), updatedAt: new Date() }, { merge: true })
    await Promise.all([
      recountAcceptedConnections(db, data.fromClubId),
      recountAcceptedConnections(db, data.toClubId),
    ])
  }

  return { status: 200, json: { ok: true, withdrawn: true } }
}

async function handleListAll(db) {
  const snap = await db.collection(CLUB_CONNECTIONS_COLLECTION).get()
  const connections = snap.docs
    .map((d) => serializeConnection(d.id, d.data()))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return { status: 200, json: { ok: true, connections } }
}

export async function handleClubConnectionsRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  const isClub = CLUB_ACTIONS.has(action)
  const isAdmin = ADMIN_ACTIONS.has(action)

  if (!isClub && !isAdmin) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  const hasAdminToken = verifyAdminToken(getBearerToken(req))
  if (isAdmin && !hasAdminToken) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  if (isClub && hasAdminToken) body.__adminOverride = true

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
      case 'request':
        result = await handleRequest(db, body, req)
        break
      case 'inbox':
        result = await handleInbox(db, body)
        break
      case 'respond':
        result = await handleRespond(db, body)
        break
      case 'withdraw':
        result = await handleWithdraw(db, body)
        break
      case 'list-all':
        result = await handleListAll(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[clubConnectionsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
