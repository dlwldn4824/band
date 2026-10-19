import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import { normalizeName, normalizePhone } from './guestNormalize.js'
import { checkRateLimit, recordRateLimitFailure, getClientIp } from './rateLimit.js'
import {
  CLUBS_COLLECTION,
  CLUB_EVENTS_COLLECTION,
  CLUB_CONNECTIONS_COLLECTION,
  EVENT_RESERVATIONS_COLLECTION,
  normalizeCategory,
  normalizeText,
  normalizeTags,
  normalizeCount,
  serializeClubEvent,
  serializeReservation,
  slugify,
  randomId,
  verifyManageCode,
  toMillis,
} from './bandyCore.js'

const PUBLIC_ACTIONS = new Set(['list', 'get', 'reserve', 'my-reservations', 'cancel'])
const CLUB_ACTIONS = new Set([
  'club-reservations',
  'mark-attended',
  'club-upsert-event',
  'club-delete-event',
])
const ADMIN_ACTIONS = new Set(['upsert', 'delete', 'all-reservations', 'stats'])

const RESERVE_SCOPE = 'club-event-reserve'
const LOOKUP_SCOPE = 'club-event-lookup'

function reservationId(eventId, phone) {
  // 한 행사 · 한 연락처 = 한 예약 (재예약은 같은 문서를 갱신)
  return `${eventId}__${normalizePhone(phone)}`
}

async function handleList(db, body) {
  const category = body.category ? normalizeCategory(body.category) : ''
  const clubId = normalizeText(body.clubId, 80)
  const university = normalizeText(body.university, 60)
  const q = normalizeText(body.q, 60).toLowerCase()
  const includePast = body.includePast === true

  const snap = await db.collection(CLUB_EVENTS_COLLECTION).get()
  let events = snap.docs.map((d) => serializeClubEvent(d.id, d.data()))

  if (category) events = events.filter((e) => e.category === category)
  if (clubId) events = events.filter((e) => e.clubId === clubId)
  if (university) events = events.filter((e) => e.university === university)
  if (q) {
    events = events.filter((e) =>
      [e.title, e.clubName, e.university, e.venueName, e.description, ...(e.tags || [])]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    )
  }

  const now = Date.now()
  if (!includePast) {
    events = events.filter((e) => !e.startsAt || e.startsAt >= now - 12 * 60 * 60 * 1000)
  }

  // 가까운 행사 먼저 — 탐색·홈 모두 같은 정렬을 씁니다.
  events.sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0))

  return { status: 200, json: { ok: true, events } }
}

async function handleGet(db, body) {
  const id = normalizeText(body.eventId || body.id, 120)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_event_id' } }

  const snap = await db.collection(CLUB_EVENTS_COLLECTION).doc(id).get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'event_not_found' } }

  const event = serializeClubEvent(snap.id, snap.data())

  let club = null
  if (event.clubId) {
    const clubSnap = await db.collection(CLUBS_COLLECTION).doc(event.clubId).get()
    if (clubSnap.exists) {
      const data = clubSnap.data() || {}
      club = {
        id: clubSnap.id,
        name: data.name || '',
        university: data.university || '',
        category: normalizeCategory(data.category),
        emblem: data.emblem || '',
        accent: data.accent || '',
        tagline: data.tagline || '',
      }
    }
  }

  return { status: 200, json: { ok: true, event, club } }
}

/**
 * 예약 — 정원을 초과하지 않도록 트랜잭션에서 reservedCount 를 갱신합니다.
 * sourceClubId 가 있고 두 동아리가 수락된 교류 관계면 viaConnection 으로 표시해
 * "교류를 통해 유입된 관객" 지표로 집계합니다.
 */
async function handleReserve(db, body, req) {
  const eventId = normalizeText(body.eventId, 120)
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  const headcount = normalizeCount(body.headcount, { min: 1, max: 10, fallback: 1 })
  const sourceClubId = normalizeText(body.sourceClubId, 80)

  if (!eventId || !name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const clientIp = getClientIp(req)
  const limit = await checkRateLimit(RESERVE_SCOPE, clientIp, {
    maxFailures: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (!limit.allowed) {
    return { status: 429, json: { ok: false, error: 'rate_limited', retryAfterMs: limit.retryAfterMs } }
  }
  await recordRateLimitFailure(RESERVE_SCOPE, clientIp, { windowMs: 10 * 60 * 1000 })

  const eventRef = db.collection(CLUB_EVENTS_COLLECTION).doc(eventId)
  const resRef = db.collection(EVENT_RESERVATIONS_COLLECTION).doc(reservationId(eventId, phone))

  // 교류 경유 여부는 트랜잭션 밖에서 미리 확인 (읽기 전용)
  let viaConnection = false
  if (sourceClubId) {
    const eventSnap = await eventRef.get()
    const hostClubId = eventSnap.exists ? eventSnap.data()?.clubId : ''
    if (hostClubId && hostClubId !== sourceClubId) {
      const [a, b] = await Promise.all([
        db
          .collection(CLUB_CONNECTIONS_COLLECTION)
          .where('fromClubId', '==', sourceClubId)
          .where('toClubId', '==', hostClubId)
          .where('status', '==', 'accepted')
          .limit(1)
          .get(),
        db
          .collection(CLUB_CONNECTIONS_COLLECTION)
          .where('fromClubId', '==', hostClubId)
          .where('toClubId', '==', sourceClubId)
          .where('status', '==', 'accepted')
          .limit(1)
          .get(),
      ])
      viaConnection = !a.empty || !b.empty
    }
  }

  const outcome = await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef)
    if (!eventSnap.exists) return { error: 'event_not_found' }

    const eventData = eventSnap.data() || {}
    if (eventData.status === 'closed') return { error: 'event_closed' }

    const capacity = normalizeCount(eventData.capacity, { fallback: 0 })
    const reservedCount = normalizeCount(eventData.reservedCount, { fallback: 0 })

    const existingSnap = await tx.get(resRef)
    const existing = existingSnap.exists ? existingSnap.data() || {} : null
    const previousHeadcount =
      existing && existing.status === 'reserved'
        ? normalizeCount(existing.headcount, { min: 1, max: 20, fallback: 1 })
        : 0

    const nextReserved = reservedCount - previousHeadcount + headcount
    if (capacity > 0 && nextReserved > capacity) {
      return { error: 'sold_out', seatsLeft: Math.max(0, capacity - reservedCount + previousHeadcount) }
    }

    const payload = {
      eventId,
      eventTitle: eventData.title || '',
      clubId: eventData.clubId || '',
      clubName: eventData.clubName || '',
      name,
      phone,
      headcount,
      viaConnection: viaConnection || existing?.viaConnection === true,
      sourceClubId: sourceClubId || existing?.sourceClubId || '',
      status: 'reserved',
      startsAt: eventData.startsAt || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    tx.set(resRef, payload, { merge: true })
    tx.set(eventRef, { reservedCount: nextReserved, updatedAt: new Date() }, { merge: true })

    return {
      reservation: payload,
      seatsLeft: capacity > 0 ? Math.max(0, capacity - nextReserved) : null,
      updated: previousHeadcount > 0,
    }
  })

  if (outcome.error) {
    const status = outcome.error === 'event_not_found' ? 404 : 409
    return { status, json: { ok: false, error: outcome.error, seatsLeft: outcome.seatsLeft ?? null } }
  }

  return {
    status: 200,
    json: {
      ok: true,
      reservation: serializeReservation(resRef.id, outcome.reservation, { includePhone: true }),
      seatsLeft: outcome.seatsLeft,
      updated: outcome.updated,
    },
  }
}

/**
 * 예약 문서는 생성 시점의 행사 제목·일시를 복사해 둡니다.
 * 행사가 나중에 수정되면 어긋나므로, 조회할 때 현재 행사 정보로 덮어씁니다.
 */
async function withCurrentEventInfo(db, reservations) {
  const eventIds = Array.from(new Set(reservations.map((r) => r.eventId).filter(Boolean)))
  if (eventIds.length === 0) return reservations

  const docs = await db.getAll(
    ...eventIds.map((id) => db.collection(CLUB_EVENTS_COLLECTION).doc(id))
  )
  const byId = new Map(docs.filter((d) => d.exists).map((d) => [d.id, d.data() || {}]))

  return reservations.map((reservation) => {
    const event = byId.get(reservation.eventId)
    if (!event) return reservation
    return {
      ...reservation,
      eventTitle: event.title || reservation.eventTitle,
      startsAt: toMillis(event.startsAt) ?? reservation.startsAt,
    }
  })
}

async function handleMyReservations(db, body, req) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_identity' } }
  }

  const clientIp = getClientIp(req)
  const limit = await checkRateLimit(LOOKUP_SCOPE, clientIp, {
    maxFailures: 60,
    windowMs: 10 * 60 * 1000,
  })
  if (!limit.allowed) {
    return { status: 429, json: { ok: false, error: 'rate_limited' } }
  }
  await recordRateLimitFailure(LOOKUP_SCOPE, clientIp, { windowMs: 10 * 60 * 1000 })

  const snap = await db
    .collection(EVENT_RESERVATIONS_COLLECTION)
    .where('phone', '==', phone)
    .get()

  const reservations = await withCurrentEventInfo(
    db,
    snap.docs
      .map((d) => serializeReservation(d.id, d.data(), { includePhone: true }))
      .filter((r) => normalizeName(r.name) === name)
  )
  reservations.sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0))

  return { status: 200, json: { ok: true, reservations } }
}

async function handleCancel(db, body) {
  const eventId = normalizeText(body.eventId, 120)
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!eventId || !name || phone.length < 9) {
    return { status: 400, json: { ok: false, error: 'invalid_payload' } }
  }

  const eventRef = db.collection(CLUB_EVENTS_COLLECTION).doc(eventId)
  const resRef = db.collection(EVENT_RESERVATIONS_COLLECTION).doc(reservationId(eventId, phone))

  const outcome = await db.runTransaction(async (tx) => {
    const resSnap = await tx.get(resRef)
    if (!resSnap.exists) return { error: 'reservation_not_found' }

    const data = resSnap.data() || {}
    if (normalizeName(data.name) !== name) return { error: 'reservation_not_found' }
    if (data.status === 'cancelled') return { alreadyCancelled: true }

    const eventSnap = await tx.get(eventRef)
    const headcount = normalizeCount(data.headcount, { min: 1, max: 20, fallback: 1 })

    if (eventSnap.exists) {
      const reservedCount = normalizeCount(eventSnap.data()?.reservedCount, { fallback: 0 })
      tx.set(
        eventRef,
        { reservedCount: Math.max(0, reservedCount - headcount), updatedAt: new Date() },
        { merge: true }
      )
    }

    tx.set(resRef, { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() }, { merge: true })
    return { cancelled: true }
  })

  if (outcome.error) return { status: 404, json: { ok: false, error: outcome.error } }
  return { status: 200, json: { ok: true, cancelled: true } }
}

async function requireClubAccess(db, body) {
  const clubId = normalizeText(body.clubId, 80)
  if (!clubId) return { error: { status: 400, json: { ok: false, error: 'invalid_club_id' } } }

  // 플랫폼 관리자 토큰은 모든 동아리에 대한 우회 경로로 둡니다.
  if (body.__adminOverride === true) return { clubId }

  const snap = await db.collection(CLUBS_COLLECTION).doc(clubId).get()
  if (!snap.exists) return { error: { status: 404, json: { ok: false, error: 'club_not_found' } } }

  const code = normalizeText(body.manageCode, 32)
  if (!verifyManageCode(clubId, code, snap.data()?.manageCodeHash)) {
    return { error: { status: 403, json: { ok: false, error: 'invalid_manage_code' } } }
  }
  return { clubId }
}

async function handleClubReservations(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error

  const snap = await db
    .collection(EVENT_RESERVATIONS_COLLECTION)
    .where('clubId', '==', access.clubId)
    .get()

  const reservations = await withCurrentEventInfo(
    db,
    snap.docs.map((d) => serializeReservation(d.id, d.data(), { includePhone: true }))
  )
  reservations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  const active = reservations.filter((r) => r.status !== 'cancelled')
  const summary = {
    total: active.length,
    headcount: active.reduce((sum, r) => sum + r.headcount, 0),
    viaConnection: active.filter((r) => r.viaConnection).length,
    attended: reservations.filter((r) => r.status === 'attended').length,
    cancelled: reservations.filter((r) => r.status === 'cancelled').length,
  }
  summary.attendanceRate = active.length > 0 ? Math.round((summary.attended / active.length) * 100) : 0
  summary.viaConnectionRate =
    active.length > 0 ? Math.round((summary.viaConnection / active.length) * 100) : 0

  return { status: 200, json: { ok: true, reservations, summary } }
}

async function handleMarkAttended(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error

  const id = normalizeText(body.reservationId, 200)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_reservation_id' } }

  const ref = db.collection(EVENT_RESERVATIONS_COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'reservation_not_found' } }
  if (snap.data()?.clubId !== access.clubId) {
    return { status: 403, json: { ok: false, error: 'forbidden' } }
  }

  const attended = body.attended !== false
  await ref.set(
    {
      status: attended ? 'attended' : 'reserved',
      attendedAt: attended ? new Date() : null,
      updatedAt: new Date(),
    },
    { merge: true }
  )

  const updated = await ref.get()
  return {
    status: 200,
    json: { ok: true, reservation: serializeReservation(updated.id, updated.data(), { includePhone: true }) },
  }
}

function buildEventPayload(body, club) {
  const title = normalizeText(body.title, 80)
  if (!title) return { error: 'invalid_title' }

  const startsAtMs = toMillis(body.startsAt)
  if (!startsAtMs) return { error: 'invalid_starts_at' }

  return {
    payload: {
      clubId: normalizeText(body.clubId, 80),
      clubName: club?.name || normalizeText(body.clubName, 60),
      university: club?.university || normalizeText(body.university, 60),
      title,
      category: normalizeCategory(body.category || club?.category),
      description: normalizeText(body.description, 2000),
      startsAt: new Date(startsAtMs),
      doorsAt: normalizeText(body.doorsAt, 10),
      venueName: normalizeText(body.venueName, 80),
      venueAddress: normalizeText(body.venueAddress, 160),
      price: normalizeCount(body.price, { max: 1000000, fallback: 0 }),
      capacity: normalizeCount(body.capacity, { max: 100000, fallback: 0 }),
      poster: normalizeText(body.poster, 8),
      accent: normalizeText(body.accent, 16) || club?.accent || '',
      tags: normalizeTags(body.tags),
      hubPath: normalizeText(body.hubPath, 120),
      status: body.status === 'closed' ? 'closed' : 'upcoming',
      updatedAt: new Date(),
    },
  }
}

async function upsertEvent(db, body) {
  const clubId = normalizeText(body.clubId, 80)
  const clubSnap = clubId ? await db.collection(CLUBS_COLLECTION).doc(clubId).get() : null
  const club = clubSnap?.exists ? clubSnap.data() : null

  const built = buildEventPayload(body, club)
  if (built.error) return { status: 400, json: { ok: false, error: built.error } }

  const id = normalizeText(body.eventId || body.id, 120) || slugify(built.payload.title, 'event')
  const ref = db.collection(CLUB_EVENTS_COLLECTION).doc(id)
  const existing = await ref.get()

  if (!existing.exists) {
    built.payload.reservedCount = 0
    built.payload.createdAt = new Date()
  }

  await ref.set(built.payload, { merge: true })

  // 동아리 카드의 행사 수 갱신
  if (clubId) {
    const countSnap = await db
      .collection(CLUB_EVENTS_COLLECTION)
      .where('clubId', '==', clubId)
      .get()
    await db
      .collection(CLUBS_COLLECTION)
      .doc(clubId)
      .set({ eventCount: countSnap.size, updatedAt: new Date() }, { merge: true })
  }

  const saved = await ref.get()
  return { status: 200, json: { ok: true, event: serializeClubEvent(saved.id, saved.data()) } }
}

async function handleClubUpsertEvent(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error
  return upsertEvent(db, body)
}

async function deleteEvent(db, body) {
  const id = normalizeText(body.eventId || body.id, 120)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_event_id' } }

  const ref = db.collection(CLUB_EVENTS_COLLECTION).doc(id)
  const snap = await ref.get()
  const clubId = snap.exists ? snap.data()?.clubId : ''

  await ref.delete()

  if (clubId) {
    const countSnap = await db.collection(CLUB_EVENTS_COLLECTION).where('clubId', '==', clubId).get()
    await db
      .collection(CLUBS_COLLECTION)
      .doc(clubId)
      .set({ eventCount: countSnap.size, updatedAt: new Date() }, { merge: true })
  }

  return { status: 200, json: { ok: true, deleted: true } }
}

async function handleClubDeleteEvent(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error

  const id = normalizeText(body.eventId || body.id, 120)
  const snap = await db.collection(CLUB_EVENTS_COLLECTION).doc(id).get()
  if (snap.exists && snap.data()?.clubId !== access.clubId) {
    return { status: 403, json: { ok: false, error: 'forbidden' } }
  }
  return deleteEvent(db, body)
}

async function handleAllReservations(db) {
  const snap = await db.collection(EVENT_RESERVATIONS_COLLECTION).get()
  const reservations = snap.docs
    .map((d) => serializeReservation(d.id, d.data(), { includePhone: true }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return { status: 200, json: { ok: true, reservations } }
}

/** 파일럿 성과 지표 — 사업계획서의 검증 항목과 같은 정의 */
async function handleStats(db) {
  const [clubsSnap, eventsSnap, connectionsSnap, reservationsSnap] = await Promise.all([
    db.collection(CLUBS_COLLECTION).get(),
    db.collection(CLUB_EVENTS_COLLECTION).get(),
    db.collection(CLUB_CONNECTIONS_COLLECTION).get(),
    db.collection(EVENT_RESERVATIONS_COLLECTION).get(),
  ])

  const connections = connectionsSnap.docs.map((d) => d.data() || {})
  const answered = connections.filter((c) => c.status === 'accepted' || c.status === 'declined')
  const accepted = connections.filter((c) => c.status === 'accepted')

  const reservations = reservationsSnap.docs.map((d) => d.data() || {})
  const active = reservations.filter((r) => r.status !== 'cancelled')
  const attended = reservations.filter((r) => r.status === 'attended')
  const viaConnection = active.filter((r) => r.viaConnection === true)

  const headcount = active.reduce(
    (sum, r) => sum + normalizeCount(r.headcount, { min: 1, max: 20, fallback: 1 }),
    0
  )
  const grossValue = active.reduce((sum, r) => {
    const event = eventsSnap.docs.find((d) => d.id === r.eventId)
    const price = normalizeCount(event?.data()?.price, { fallback: 0 })
    return sum + price * normalizeCount(r.headcount, { min: 1, max: 20, fallback: 1 })
  }, 0)

  return {
    status: 200,
    json: {
      ok: true,
      stats: {
        clubs: clubsSnap.size,
        events: eventsSnap.size,
        connections: connections.length,
        connectionsAccepted: accepted.length,
        /** 교류 요청 수락률 — 응답된 건 기준 */
        connectionAcceptRate: answered.length > 0 ? Math.round((accepted.length / answered.length) * 100) : 0,
        connectionsPending: connections.filter((c) => c.status === 'pending').length,
        reservations: active.length,
        headcount,
        attended: attended.length,
        /** 예약 대비 실제 방문율 */
        attendanceRate: active.length > 0 ? Math.round((attended.length / active.length) * 100) : 0,
        /** 교류로 유입된 신규 관객 비율 — 기존 인맥 밖 유입 검증 지표 */
        viaConnection: viaConnection.length,
        viaConnectionRate: active.length > 0 ? Math.round((viaConnection.length / active.length) * 100) : 0,
        /** 거래액(예약 기준) — 수수료 매출 추정의 기초 */
        grossValue,
      },
    },
  }
}

export async function handleClubEventsRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  const isPublic = PUBLIC_ACTIONS.has(action)
  const isClub = CLUB_ACTIONS.has(action)
  const isAdmin = ADMIN_ACTIONS.has(action)

  if (!isPublic && !isClub && !isAdmin) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  const hasAdminToken = verifyAdminToken(getBearerToken(req))
  if (isAdmin && !hasAdminToken) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  // 동아리 액션은 운영진 코드 또는 플랫폼 관리자 토큰으로 수행
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
      case 'list':
        result = await handleList(db, body)
        break
      case 'get':
        result = await handleGet(db, body)
        break
      case 'reserve':
        result = await handleReserve(db, body, req)
        break
      case 'my-reservations':
        result = await handleMyReservations(db, body, req)
        break
      case 'cancel':
        result = await handleCancel(db, body)
        break
      case 'club-reservations':
        result = await handleClubReservations(db, body)
        break
      case 'mark-attended':
        result = await handleMarkAttended(db, body)
        break
      case 'club-upsert-event':
        result = await handleClubUpsertEvent(db, body)
        break
      case 'club-delete-event':
        result = await handleClubDeleteEvent(db, body)
        break
      case 'upsert':
        result = await upsertEvent(db, body)
        break
      case 'delete':
        result = await deleteEvent(db, body)
        break
      case 'all-reservations':
        result = await handleAllReservations(db)
        break
      case 'stats':
        result = await handleStats(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[clubEventsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
