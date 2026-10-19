import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { checkRateLimit, recordRateLimitFailure, getClientIp } from './rateLimit.js'
import {
  CLUBS_COLLECTION,
  PROFILE_CARDS_COLLECTION,
  PROFILE_EXCHANGES_COLLECTION,
  normalizeText,
  normalizeTags,
  serializeProfileCard,
  generateShareCode,
} from './bandyCore.js'

/**
 * 현장 프로필 카드 — 행사장에서 참여자끼리 프로필을 교환하는 기능입니다.
 *
 * 카드마다 공유 코드가 있고, 그 코드를 담은 링크(`/card/:shareCode`)를
 * NFC 태그·QR·링크 공유 중 어떤 경로로 전달해도 동일하게 동작합니다.
 * 연락처와 인스타그램은 본인이 동의한 항목만 상대에게 보입니다.
 */

const PUBLIC_ACTIONS = new Set(['get-by-code', 'upsert', 'my-card', 'exchange', 'my-exchanges'])
const ADMIN_ACTIONS = new Set(['list', 'delete'])

const CARD_SCOPE = 'profile-card-write'

function cardId(phone) {
  return normalizePhone(phone)
}

async function handleUpsert(db, body, req) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const clientIp = getClientIp(req)
  const limit = await checkRateLimit(CARD_SCOPE, clientIp, {
    maxFailures: 30,
    windowMs: 10 * 60 * 1000,
  })
  if (!limit.allowed) return { status: 429, json: { ok: false, error: 'rate_limited' } }
  await recordRateLimitFailure(CARD_SCOPE, clientIp, { windowMs: 10 * 60 * 1000 })

  const id = cardId(phone)
  const ref = db.collection(PROFILE_CARDS_COLLECTION).doc(id)
  const existing = await ref.get()

  let clubName = ''
  let university = normalizeText(body.university, 60)
  const clubId = normalizeText(body.clubId, 80)
  if (clubId) {
    const clubSnap = await db.collection(CLUBS_COLLECTION).doc(clubId).get()
    if (clubSnap.exists) {
      clubName = clubSnap.data()?.name || ''
      university = university || clubSnap.data()?.university || ''
    }
  }

  const payload = {
    ownerName: name,
    phone,
    nickname: normalizeText(body.nickname, 24),
    clubId,
    clubName,
    university,
    bio: normalizeText(body.bio, 300),
    interests: normalizeTags(body.interests, 8),
    instagram: normalizeText(body.instagram, 40),
    shareInstagram: body.shareInstagram !== false,
    sharePhone: body.sharePhone === true,
    updatedAt: new Date(),
  }

  if (!existing.exists) {
    payload.shareCode = generateShareCode()
    payload.exchangeCount = 0
    payload.createdAt = new Date()
  }

  await ref.set(payload, { merge: true })
  const saved = await ref.get()
  return {
    status: 200,
    json: { ok: true, card: serializeProfileCard(saved.id, saved.data(), { viewerIsOwner: true }) },
  }
}

async function handleMyCard(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const snap = await db.collection(PROFILE_CARDS_COLLECTION).doc(cardId(phone)).get()
  if (!snap.exists) return { status: 200, json: { ok: true, card: null } }

  const data = snap.data() || {}
  if (normalizeName(data.ownerName) !== name) {
    return { status: 200, json: { ok: true, card: null } }
  }

  return {
    status: 200,
    json: { ok: true, card: serializeProfileCard(snap.id, data, { viewerIsOwner: true }) },
  }
}

/** 공유 코드로 상대 카드 보기 — 동의하지 않은 연락처는 응답에 포함되지 않습니다. */
async function handleGetByCode(db, body) {
  const shareCode = normalizeText(body.shareCode, 16).toUpperCase()
  if (!shareCode) return { status: 400, json: { ok: false, error: 'invalid_share_code' } }

  const snap = await db
    .collection(PROFILE_CARDS_COLLECTION)
    .where('shareCode', '==', shareCode)
    .limit(1)
    .get()

  if (snap.empty) return { status: 404, json: { ok: false, error: 'card_not_found' } }

  const doc = snap.docs[0]
  return {
    status: 200,
    json: { ok: true, card: serializeProfileCard(doc.id, doc.data(), { viewerIsOwner: false }) },
  }
}

/**
 * 교환 기록 — 내 카드와 상대 공유 코드를 묶어 저장합니다.
 * 같은 상대와 다시 교환해도 기록은 하나로 유지됩니다.
 */
async function handleExchange(db, body, req) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const shareCode = normalizeText(body.shareCode, 16).toUpperCase()
  const eventId = normalizeText(body.eventId, 120)

  if (!name || phone.length < 9 || !shareCode) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const clientIp = getClientIp(req)
  const limit = await checkRateLimit(CARD_SCOPE, clientIp, {
    maxFailures: 60,
    windowMs: 10 * 60 * 1000,
  })
  if (!limit.allowed) return { status: 429, json: { ok: false, error: 'rate_limited' } }

  const myRef = db.collection(PROFILE_CARDS_COLLECTION).doc(cardId(phone))
  const mySnap = await myRef.get()
  if (!mySnap.exists || normalizeName(mySnap.data()?.ownerName) !== name) {
    return { status: 403, json: { ok: false, error: 'card_required' } }
  }

  const theirSnap = await db
    .collection(PROFILE_CARDS_COLLECTION)
    .where('shareCode', '==', shareCode)
    .limit(1)
    .get()
  if (theirSnap.empty) return { status: 404, json: { ok: false, error: 'card_not_found' } }

  const theirDoc = theirSnap.docs[0]
  if (theirDoc.id === myRef.id) {
    return { status: 400, json: { ok: false, error: 'self_exchange' } }
  }

  // 양방향 교환을 한 문서로 — 두 카드 ID를 정렬해 결정적 ID 생성
  const pair = [myRef.id, theirDoc.id].sort()
  const exchangeRef = db
    .collection(PROFILE_EXCHANGES_COLLECTION)
    .doc(`${pair[0]}__${pair[1]}`)
  const existing = await exchangeRef.get()

  await exchangeRef.set(
    {
      cardIds: pair,
      initiatedBy: myRef.id,
      eventId: existing.exists ? existing.data()?.eventId || eventId : eventId,
      createdAt: existing.exists ? existing.data()?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  )

  if (!existing.exists) {
    // 교환 문서를 다시 세어 양쪽 카드의 교환 수를 맞춥니다.
    await Promise.all([recountExchanges(db, myRef.id), recountExchanges(db, theirDoc.id)])
  }

  return {
    status: 200,
    json: {
      ok: true,
      alreadyExchanged: existing.exists,
      card: serializeProfileCard(theirDoc.id, theirDoc.data(), { viewerIsOwner: false }),
    },
  }
}

async function recountExchanges(db, id) {
  const snap = await db
    .collection(PROFILE_EXCHANGES_COLLECTION)
    .where('cardIds', 'array-contains', id)
    .get()
  await db
    .collection(PROFILE_CARDS_COLLECTION)
    .doc(id)
    .set({ exchangeCount: snap.size, updatedAt: new Date() }, { merge: true })
}

async function handleMyExchanges(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const myId = cardId(phone)
  const mySnap = await db.collection(PROFILE_CARDS_COLLECTION).doc(myId).get()
  if (!mySnap.exists || normalizeName(mySnap.data()?.ownerName) !== name) {
    return { status: 200, json: { ok: true, exchanges: [] } }
  }

  const snap = await db
    .collection(PROFILE_EXCHANGES_COLLECTION)
    .where('cardIds', 'array-contains', myId)
    .get()

  const partnerIds = snap.docs
    .map((d) => (d.data()?.cardIds || []).find((id) => id !== myId))
    .filter(Boolean)

  let partners = []
  if (partnerIds.length > 0) {
    const docs = await db.getAll(
      ...partnerIds.map((id) => db.collection(PROFILE_CARDS_COLLECTION).doc(id))
    )
    partners = docs
      .filter((d) => d.exists)
      .map((d) => serializeProfileCard(d.id, d.data(), { viewerIsOwner: false }))
  }

  const metaById = new Map(
    snap.docs.map((d) => {
      const data = d.data() || {}
      const partnerId = (data.cardIds || []).find((id) => id !== myId)
      return [partnerId, { eventId: data.eventId || '', createdAt: data.createdAt || null }]
    })
  )

  const exchanges = partners
    .map((card) => ({
      card,
      eventId: metaById.get(card.id)?.eventId || '',
      exchangedAt:
        metaById.get(card.id)?.createdAt?.toMillis?.() ??
        (metaById.get(card.id)?.createdAt instanceof Date
          ? metaById.get(card.id).createdAt.getTime()
          : null),
    }))
    .sort((a, b) => (b.exchangedAt || 0) - (a.exchangedAt || 0))

  return { status: 200, json: { ok: true, exchanges } }
}

async function handleAdminList(db) {
  const snap = await db.collection(PROFILE_CARDS_COLLECTION).get()
  const cards = snap.docs.map((d) => serializeProfileCard(d.id, d.data(), { viewerIsOwner: true }))
  const exchangesSnap = await db.collection(PROFILE_EXCHANGES_COLLECTION).get()
  return {
    status: 200,
    json: { ok: true, cards, exchangeCount: exchangesSnap.size },
  }
}

async function handleAdminDelete(db, body) {
  const id = normalizeText(body.id, 80)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_id' } }
  await db.collection(PROFILE_CARDS_COLLECTION).doc(id).delete()
  return { status: 200, json: { ok: true, deleted: true } }
}

export async function handleProfileCardsRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  const isPublic = PUBLIC_ACTIONS.has(action)
  const isAdmin = ADMIN_ACTIONS.has(action)

  if (!isPublic && !isAdmin) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  if (isAdmin && !verifyAdminToken(getBearerToken(req))) {
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
      case 'upsert':
        result = await handleUpsert(db, body, req)
        break
      case 'my-card':
        result = await handleMyCard(db, body)
        break
      case 'get-by-code':
        result = await handleGetByCode(db, body)
        break
      case 'exchange':
        result = await handleExchange(db, body, req)
        break
      case 'my-exchanges':
        result = await handleMyExchanges(db, body)
        break
      case 'list':
        result = await handleAdminList(db)
        break
      case 'delete':
        result = await handleAdminDelete(db, body)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[profileCardsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
