import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'
import {
  CLUBS_COLLECTION,
  CLUB_EVENTS_COLLECTION,
  CLUB_CONNECTIONS_COLLECTION,
  CLUB_CATEGORIES,
  normalizeCategory,
  normalizeText,
  normalizeTags,
  normalizeCount,
  serializeClub,
  serializeClubEvent,
  serializeConnection,
  slugify,
  generateManageCode,
  hashManageCode,
  verifyManageCode,
} from './bandyCore.js'
import { SEED_CLUBS, SEED_EVENTS, SEED_CONNECTIONS } from './bandySeedData.js'

const PUBLIC_ACTIONS = new Set(['list', 'get', 'categories'])
const CLUB_ACTIONS = new Set(['verify-code', 'update-profile'])
const ADMIN_ACTIONS = new Set(['upsert', 'delete', 'seed-demo', 'reset-manage-code'])

const DAY_MS = 24 * 60 * 60 * 1000

function matchesQuery(club, q) {
  if (!q) return true
  const needle = q.toLowerCase()
  return [club.name, club.university, club.tagline, club.intro, ...(club.tags || [])]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle))
}

async function handleList(db, body) {
  const category = body.category ? normalizeCategory(body.category) : ''
  const university = normalizeText(body.university, 60)
  const q = normalizeText(body.q, 60)

  const snap = await db.collection(CLUBS_COLLECTION).get()
  let clubs = snap.docs.map((d) => serializeClub(d.id, d.data()))

  if (category) clubs = clubs.filter((c) => c.category === category)
  if (university) clubs = clubs.filter((c) => c.university === university)
  if (q) clubs = clubs.filter((c) => matchesQuery(c, q))

  // 교류 연결이 많은 동아리를 먼저 — 탐색 첫 화면의 기본 정렬
  clubs.sort((a, b) => b.connectionCount - a.connectionCount || a.name.localeCompare(b.name, 'ko'))

  const universities = Array.from(
    new Set(snap.docs.map((d) => d.data()?.university).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), 'ko'))

  return { status: 200, json: { ok: true, clubs, universities, categories: CLUB_CATEGORIES } }
}

async function handleGet(db, body) {
  const id = normalizeText(body.clubId || body.id, 80)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_club_id' } }

  const snap = await db.collection(CLUBS_COLLECTION).doc(id).get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'club_not_found' } }

  const club = serializeClub(snap.id, snap.data())

  const eventsSnap = await db
    .collection(CLUB_EVENTS_COLLECTION)
    .where('clubId', '==', id)
    .get()
  const events = eventsSnap.docs
    .map((d) => serializeClubEvent(d.id, d.data()))
    .sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0))

  // 수락된 교류만 공개 — 대기/거절 건은 동아리 콘솔에서만 보입니다.
  const [fromSnap, toSnap] = await Promise.all([
    db
      .collection(CLUB_CONNECTIONS_COLLECTION)
      .where('fromClubId', '==', id)
      .where('status', '==', 'accepted')
      .get(),
    db
      .collection(CLUB_CONNECTIONS_COLLECTION)
      .where('toClubId', '==', id)
      .where('status', '==', 'accepted')
      .get(),
  ])

  const partnerIds = new Set()
  for (const d of [...fromSnap.docs, ...toSnap.docs]) {
    const data = d.data() || {}
    const partnerId = data.fromClubId === id ? data.toClubId : data.fromClubId
    if (partnerId) partnerIds.add(partnerId)
  }

  let connectedClubs = []
  if (partnerIds.size > 0) {
    const partnerDocs = await db.getAll(
      ...Array.from(partnerIds).map((pid) => db.collection(CLUBS_COLLECTION).doc(pid))
    )
    connectedClubs = partnerDocs
      .filter((d) => d.exists)
      .map((d) => serializeClub(d.id, d.data()))
  }

  return { status: 200, json: { ok: true, club, events, connectedClubs } }
}

async function requireClubAccess(db, body) {
  const clubId = normalizeText(body.clubId, 80)
  if (!clubId) return { error: { status: 400, json: { ok: false, error: 'invalid_club_id' } } }

  const ref = db.collection(CLUBS_COLLECTION).doc(clubId)
  const snap = await ref.get()
  if (!snap.exists) return { error: { status: 404, json: { ok: false, error: 'club_not_found' } } }

  const data = snap.data() || {}
  const code = normalizeText(body.manageCode, 32)
  if (!verifyManageCode(clubId, code, data.manageCodeHash)) {
    return { error: { status: 403, json: { ok: false, error: 'invalid_manage_code' } } }
  }

  return { clubId, ref, data }
}

async function handleVerifyCode(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error
  return {
    status: 200,
    json: { ok: true, club: serializeClub(access.clubId, access.data) },
  }
}

async function handleUpdateProfile(db, body) {
  const access = await requireClubAccess(db, body)
  if (access.error) return access.error

  const patch = { updatedAt: new Date() }
  if (body.tagline !== undefined) patch.tagline = normalizeText(body.tagline, 60)
  if (body.intro !== undefined) patch.intro = normalizeText(body.intro, 1200)
  if (body.tags !== undefined) patch.tags = normalizeTags(body.tags)
  if (body.instagram !== undefined) patch.instagram = normalizeText(body.instagram, 40)
  if (body.contactEmail !== undefined) patch.contactEmail = normalizeText(body.contactEmail, 80)
  if (body.memberCount !== undefined) {
    patch.memberCount = normalizeCount(body.memberCount, { max: 2000, fallback: 0 })
  }
  if (body.openToExchange !== undefined) patch.openToExchange = body.openToExchange === true

  await access.ref.set(patch, { merge: true })
  const updated = await access.ref.get()
  return { status: 200, json: { ok: true, club: serializeClub(updated.id, updated.data()) } }
}

async function handleAdminUpsert(db, body) {
  const name = normalizeText(body.name, 60)
  if (!name) return { status: 400, json: { ok: false, error: 'invalid_name' } }

  const id = normalizeText(body.clubId || body.id, 80) || slugify(name, 'club')
  const ref = db.collection(CLUBS_COLLECTION).doc(id)
  const existing = await ref.get()

  const payload = {
    name,
    university: normalizeText(body.university, 60),
    category: normalizeCategory(body.category),
    tagline: normalizeText(body.tagline, 60),
    intro: normalizeText(body.intro, 1200),
    tags: normalizeTags(body.tags),
    memberCount: normalizeCount(body.memberCount, { max: 2000, fallback: 0 }),
    foundedYear: normalizeCount(body.foundedYear, { min: 1900, max: 2100, fallback: 0 }) || null,
    emblem: normalizeText(body.emblem, 8),
    accent: normalizeText(body.accent, 16),
    instagram: normalizeText(body.instagram, 40),
    contactEmail: normalizeText(body.contactEmail, 80),
    openToExchange: body.openToExchange !== false,
    updatedAt: new Date(),
  }

  let manageCode = null
  if (!existing.exists) {
    payload.createdAt = new Date()
    payload.connectionCount = 0
    payload.eventCount = 0
    manageCode = generateManageCode()
    payload.manageCodeHash = hashManageCode(id, manageCode)
  }

  await ref.set(payload, { merge: true })
  const saved = await ref.get()

  return {
    status: 200,
    json: { ok: true, club: serializeClub(saved.id, saved.data()), manageCode },
  }
}

async function handleAdminDelete(db, body) {
  const id = normalizeText(body.clubId || body.id, 80)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_club_id' } }
  await db.collection(CLUBS_COLLECTION).doc(id).delete()
  return { status: 200, json: { ok: true, deleted: true } }
}

async function handleAdminResetManageCode(db, body) {
  const id = normalizeText(body.clubId || body.id, 80)
  if (!id) return { status: 400, json: { ok: false, error: 'invalid_club_id' } }

  const ref = db.collection(CLUBS_COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return { status: 404, json: { ok: false, error: 'club_not_found' } }

  const manageCode = generateManageCode()
  await ref.set({ manageCodeHash: hashManageCode(id, manageCode), updatedAt: new Date() }, { merge: true })
  return { status: 200, json: { ok: true, clubId: id, manageCode } }
}

/**
 * 파일럿 시드 — 동아리·행사·교류를 한 번에 생성합니다.
 * 운영진 코드는 저장하지 않고(해시만 보관) 이 응답으로 한 번만 돌려줍니다.
 */
async function handleSeedDemo(db, body) {
  const overwrite = body.overwrite === true
  const now = Date.now()
  const batch = db.batch()
  const manageCodes = {}

  const clubById = new Map(SEED_CLUBS.map((c) => [c.id, c]))

  // 교류 수락 건수를 미리 집계해 동아리 카드에 노출
  const connectionCounts = new Map()
  for (const conn of SEED_CONNECTIONS) {
    if (conn.status !== 'accepted') continue
    connectionCounts.set(conn.fromClubId, (connectionCounts.get(conn.fromClubId) || 0) + 1)
    connectionCounts.set(conn.toClubId, (connectionCounts.get(conn.toClubId) || 0) + 1)
  }
  const eventCounts = new Map()
  for (const ev of SEED_EVENTS) {
    eventCounts.set(ev.clubId, (eventCounts.get(ev.clubId) || 0) + 1)
  }

  let clubsWritten = 0
  for (const club of SEED_CLUBS) {
    const ref = db.collection(CLUBS_COLLECTION).doc(club.id)
    const existing = await ref.get()
    if (existing.exists && !overwrite) continue

    const manageCode = generateManageCode()
    manageCodes[club.id] = manageCode

    const { id, ...rest } = club
    batch.set(
      ref,
      {
        ...rest,
        connectionCount: connectionCounts.get(club.id) || 0,
        eventCount: eventCounts.get(club.id) || 0,
        manageCodeHash: hashManageCode(club.id, manageCode),
        createdAt: existing.exists ? existing.data()?.createdAt || new Date() : new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    )
    clubsWritten += 1
  }

  let eventsWritten = 0
  for (const ev of SEED_EVENTS) {
    const ref = db.collection(CLUB_EVENTS_COLLECTION).doc(ev.id)
    const existing = await ref.get()
    if (existing.exists && !overwrite) continue

    const club = clubById.get(ev.clubId)
    const { id, daysFromNow, ...rest } = ev

    // 시작 시각은 해당 날짜의 입장 시각에 맞춥니다.
    // (시드한 시점의 시:분이 그대로 남으면 "일시"와 "입장"이 어긋납니다.)
    const startsAt = new Date(now + daysFromNow * DAY_MS)
    const [doorHour, doorMinute] = String(ev.doorsAt || '19:00')
      .split(':')
      .map((part) => Number(part))
    startsAt.setHours(
      Number.isFinite(doorHour) ? doorHour : 19,
      Number.isFinite(doorMinute) ? doorMinute : 0,
      0,
      0
    )

    batch.set(
      ref,
      {
        ...rest,
        clubName: club?.name || '',
        university: club?.university || '',
        startsAt,
        status: 'upcoming',
        createdAt: existing.exists ? existing.data()?.createdAt || new Date() : new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    )
    eventsWritten += 1
  }

  let connectionsWritten = 0
  for (const conn of SEED_CONNECTIONS) {
    // 시드 교류는 결정적 ID로 — 재시드 시 중복 생성 방지
    const connId = `${conn.fromClubId}__${conn.toClubId}`
    const ref = db.collection(CLUB_CONNECTIONS_COLLECTION).doc(connId)
    const existing = await ref.get()
    if (existing.exists && !overwrite) continue

    const fromClub = clubById.get(conn.fromClubId)
    const toClub = clubById.get(conn.toClubId)
    const createdAt = new Date(now - (conn.daysAgo || 0) * DAY_MS)
    batch.set(
      ref,
      {
        fromClubId: conn.fromClubId,
        fromClubName: fromClub?.name || '',
        toClubId: conn.toClubId,
        toClubName: toClub?.name || '',
        status: conn.status,
        message: conn.message,
        requesterName: conn.requesterName,
        requesterContact: conn.requesterContact,
        createdAt,
        respondedAt: conn.status === 'pending' ? null : new Date(createdAt.getTime() + DAY_MS),
        updatedAt: new Date(),
      },
      { merge: true }
    )
    connectionsWritten += 1
  }

  await batch.commit()

  return {
    status: 200,
    json: {
      ok: true,
      clubsWritten,
      eventsWritten,
      connectionsWritten,
      /** 평문 운영진 코드는 여기서만 확인할 수 있습니다. */
      manageCodes,
    },
  }
}

export async function handleClubsRequest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { action, ...body } = req.body || {}
  const isPublic = PUBLIC_ACTIONS.has(action)
  const isClub = CLUB_ACTIONS.has(action)
  const isAdmin = ADMIN_ACTIONS.has(action)

  if (!isPublic && !isClub && !isAdmin) {
    return res.status(400).json({ ok: false, error: 'unknown_action' })
  }

  if (isAdmin && !verifyAdminToken(getBearerToken(req))) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  if (action === 'categories') {
    return res.status(200).json({ ok: true, categories: CLUB_CATEGORIES })
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
      case 'list':
        result = await handleList(db, body)
        break
      case 'get':
        result = await handleGet(db, body)
        break
      case 'verify-code':
        result = await handleVerifyCode(db, body)
        break
      case 'update-profile':
        result = await handleUpdateProfile(db, body)
        break
      case 'upsert':
        result = await handleAdminUpsert(db, body)
        break
      case 'delete':
        result = await handleAdminDelete(db, body)
        break
      case 'reset-manage-code':
        result = await handleAdminResetManageCode(db, body)
        break
      case 'seed-demo':
        result = await handleSeedDemo(db, body)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }
    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[clubsApi] error:', error)
    const mapped = mapFirestoreError(error)
    return res.status(mapped === 'internal_error' ? 500 : 503).json({ ok: false, error: mapped })
  }
}
