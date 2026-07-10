import { getAdminDb, mapFirestoreError } from './firebaseAdmin.js'
import {
  normalizePhone,
  normalizeName,
  normalizeKoreanMobile,
  getGuestPhone,
  getGuestName,
  dedupeGuests,
  toPublicGuest,
} from './guestNormalize.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

const GUESTS_COLLECTION = 'guests_v2'
const GUESTS_DOC_ID = 'all'
const BOOKINGS_COLLECTION = 'bookings'

const ADMIN_ACTIONS = new Set([
  'list',
  'upload',
  'toggle-payment',
  'toggle-ticket',
  'delete',
  'update',
  'clear',
  'deduplicate',
  'fix-phones',
])

const PUBLIC_ACTIONS = new Set(['login', 'status', 'check', 'register', 'onsite-payment'])

function guestsDocRef(db) {
  return db.collection(GUESTS_COLLECTION).doc(GUESTS_DOC_ID)
}

function parseGuestsSnapshot(snap) {
  if (!snap.exists) return { guests: [], cleared: null }
  const data = snap.data() || {}
  const guests = Array.isArray(data.guests) ? data.guests : []
  const cleared = typeof data._cleared === 'number' ? data._cleared : null
  return { guests, cleared }
}

function buildDocPayload(guests, cleared, writeSource) {
  return {
    guests,
    _cleared: cleared,
    updatedAt: new Date(),
    updatedBy: 'server',
    lastAction: writeSource,
    writeSource,
  }
}

function findByPhone(guests, phone) {
  return guests.filter((g) => normalizePhone(getGuestPhone(g)) === phone && phone !== '')
}

function activeGuests(guests) {
  return guests.filter((g) => g.isDeleted !== true)
}

// ---------------------------------------------------------------------------
// 공개 액션
// ---------------------------------------------------------------------------

async function handleLogin(db, body) {
  const phone = normalizePhone(body.phone)
  const inputName = body.name ? normalizeName(body.name) : null
  if (!phone) return { status: 400, json: { ok: false, reason: 'invalid_phone' } }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests, cleared } = parseGuestsSnapshot(snap)

    if (guests.length === 0) {
      return { status: 200, json: { ok: false, reason: 'empty_guests' } }
    }

    const matches = findByPhone(guests, phone)
    if (matches.length === 0) {
      return { status: 200, json: { ok: false, reason: 'not_found' } }
    }

    const active = matches.find((g) => g.isDeleted !== true)
    if (!active) {
      return { status: 200, json: { ok: false, reason: 'deleted' } }
    }

    if (inputName && getGuestName(active) !== inputName) {
      return { status: 200, json: { ok: false, reason: 'name_mismatch' } }
    }

    let didCheckInNow = false
    let resultGuest = active

    const hasEntryNumber = active.entryNumber !== undefined && active.entryNumber !== null
    const isPaymentConfirmed = active.paymentConfirmed === true

    if (!hasEntryNumber && !isPaymentConfirmed) {
      const maxEntryNumber = guests.reduce((max, g) => {
        const n = typeof g.entryNumber === 'number' ? g.entryNumber : 0
        return n > max ? n : max
      }, 0)

      const updatedGuests = guests.map((g) => {
        if (normalizePhone(getGuestPhone(g)) !== phone || g.isDeleted === true) return g
        return {
          ...g,
          entryNumber: maxEntryNumber + 1,
          checkedIn: true,
          checkedInAt: Date.now(),
        }
      })

      resultGuest = updatedGuests.find(
        (g) => normalizePhone(getGuestPhone(g)) === phone && g.isDeleted !== true
      )
      didCheckInNow = true

      tx.set(guestsDocRef(db), buildDocPayload(updatedGuests, cleared, 'api_login'))
    }

    return {
      status: 200,
      json: { ok: true, guest: toPublicGuest(resultGuest), didCheckInNow },
    }
  })
}

async function handleStatus(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, json: { ok: false } }

  const snap = await guestsDocRef(db).get()
  const { guests } = parseGuestsSnapshot(snap)
  const active = findByPhone(guests, phone).find((g) => g.isDeleted !== true)

  if (!active) return { status: 200, json: { ok: false } }
  return { status: 200, json: { ok: true, guest: toPublicGuest(active) } }
}

async function handleCheck(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, json: { exists: false } }

  const snap = await guestsDocRef(db).get()
  const { guests } = parseGuestsSnapshot(snap)
  const matches = findByPhone(guests, phone)
  const active = matches.find((g) => g.isDeleted !== true)

  if (active) {
    return {
      status: 200,
      json: {
        exists: true,
        isDeleted: false,
        name: getGuestName(active),
        paymentConfirmed: active.paymentConfirmed === true,
      },
    }
  }

  if (matches.length > 0) {
    return { status: 200, json: { exists: false, isDeleted: true } }
  }

  return { status: 200, json: { exists: false, isDeleted: false } }
}

async function upsertGuestByPhone(db, { name, phone, email, isWalkIn, bookedAt, paymentConfirmed, writeSource }) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests } = parseGuestsSnapshot(snap)

    const matches = findByPhone(guests, phone)
    const existingActive = matches.find((g) => g.isDeleted !== true)
    const existingDeleted = matches.find((g) => g.isDeleted === true)

    if (existingActive && !paymentConfirmed) {
      return {
        status: 200,
        json: { success: false, message: '이미 등록된 게스트입니다.', guest: toPublicGuest(existingActive) },
      }
    }

    const now = Date.now()
    const guestMap = new Map()
    guests.forEach((g) => {
      const key = normalizePhone(getGuestPhone(g))
      if (key) guestMap.set(key, g)
    })

    let entry
    if (existingActive) {
      // onsite-payment: 기존 게스트 입금 확인 처리
      entry = {
        ...existingActive,
        paymentConfirmed: true,
        paymentConfirmedAt: now,
      }
    } else if (existingDeleted) {
      entry = {
        ...existingDeleted,
        isDeleted: false,
        deletedAt: null,
        name,
        phone,
        isWalkIn,
        bookedAt: existingDeleted.bookedAt ?? bookedAt,
        ...(paymentConfirmed ? { paymentConfirmed: true, paymentConfirmedAt: now } : {}),
      }
    } else {
      entry = {
        name,
        phone,
        email: email || '',
        checkedIn: false,
        isWalkIn,
        paymentConfirmed: paymentConfirmed === true,
        ...(paymentConfirmed ? { paymentConfirmedAt: now } : {}),
        bookedAt,
      }
    }

    guestMap.set(phone, entry)
    const updatedGuests = Array.from(guestMap.values())

    // 예매 등록은 초기화 마커 해제 (_cleared: null)
    tx.set(guestsDocRef(db), buildDocPayload(updatedGuests, null, writeSource))

    return { status: 200, json: { success: true, guest: toPublicGuest(entry) } }
  })
}

async function handleRegister(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || !phone) {
    return { status: 400, json: { success: false, message: '이름과 전화번호를 입력해주세요.' } }
  }

  const isWalkIn = body.isWalkIn === true
  const confirmPayment = body.confirmPayment === true
  const bookedAt = typeof body.bookedAt === 'number' ? body.bookedAt : Date.now()

  const result = await upsertGuestByPhone(db, {
    name,
    phone,
    email: body.email,
    isWalkIn,
    bookedAt,
    paymentConfirmed: confirmPayment,
    writeSource: confirmPayment ? 'api_register_confirm' : 'api_register',
  })

  if (result.json.success) {
    const source = typeof body.source === 'string' ? body.source : isWalkIn ? 'onsite' : 'web_login'
    try {
      await db.collection(BOOKINGS_COLLECTION).doc(phone).set(
        {
          name,
          phone,
          email: body.email || '',
          isWalkIn,
          bookedAt,
          createdAt: new Date(bookedAt),
          updatedAt: new Date(),
          source,
          approved: true,
        },
        { merge: true }
      )
    } catch {
      // bookings 동기화 실패는 예매 등록을 막지 않음
    }
  }

  return result
}

async function handleOnsitePayment(db, body) {
  const name = normalizeName(body.name)
  const phone = normalizePhone(body.phone)
  if (!name || !phone) {
    return { status: 400, json: { success: false, message: '이름과 전화번호를 입력해주세요.' } }
  }

  const result = await upsertGuestByPhone(db, {
    name,
    phone,
    email: '',
    isWalkIn: true,
    bookedAt: Date.now(),
    paymentConfirmed: true,
    writeSource: 'api_onsite_payment',
  })

  if (result.json.success) {
    try {
      await db.collection(BOOKINGS_COLLECTION).doc(phone).set(
        {
          name,
          phone,
          isWalkIn: true,
          bookedAt: Date.now(),
          updatedAt: new Date(),
          source: 'onsite',
          approved: true,
        },
        { merge: true }
      )
    } catch {
      // ignore
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// 관리자 액션
// ---------------------------------------------------------------------------

async function handleAdminList(db) {
  const snap = await guestsDocRef(db).get()
  const { guests, cleared } = parseGuestsSnapshot(snap)
  return {
    status: 200,
    json: { ok: true, guests: activeGuests(guests), _cleared: cleared },
  }
}

async function handleAdminUpload(db, body) {
  const newGuests = Array.isArray(body.guests) ? body.guests : []

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests: existingGuests } = parseGuestsSnapshot(snap)

    const guestMap = new Map()
    existingGuests.forEach((g) => {
      const key = normalizePhone(getGuestPhone(g))
      if (key) guestMap.set(key, g)
    })

    newGuests.forEach((g) => {
      const key = normalizePhone(getGuestPhone(g))
      if (!key) return
      guestMap.set(key, {
        ...g,
        phone: key,
        name: getGuestName(g),
        isWalkIn: g.isWalkIn !== undefined ? g.isWalkIn : false,
        paymentConfirmed: g.paymentConfirmed !== undefined ? g.paymentConfirmed : false,
        isDeleted: false,
        deletedAt: null,
      })
    })

    const merged = Array.from(guestMap.values())
    tx.set(guestsDocRef(db), buildDocPayload(merged, null, 'api_upload'))

    return { status: 200, json: { ok: true, guests: activeGuests(merged) } }
  })
}

async function mutateGuestsByPhone(db, phone, writeSource, mutate) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests, cleared } = parseGuestsSnapshot(snap)

    const matches = findByPhone(guests, phone)
    if (matches.length === 0) {
      return { status: 404, json: { ok: false, message: '게스트를 찾을 수 없습니다.' } }
    }

    const updatedGuests = guests.map((g) => {
      if (normalizePhone(getGuestPhone(g)) !== phone) return g
      return mutate(g, matches)
    })

    tx.set(guestsDocRef(db), buildDocPayload(updatedGuests, cleared, writeSource))
    return { status: 200, json: { ok: true, guests: activeGuests(updatedGuests) } }
  })
}

async function handleAdminTogglePayment(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, json: { ok: false } }

  return mutateGuestsByPhone(db, phone, 'api_toggle_payment', (g, matches) => {
    const current = matches.some((m) => m.paymentConfirmed === true)
    const next = !current
    return {
      ...g,
      paymentConfirmed: next,
      paymentConfirmedAt: next ? Date.now() : null,
    }
  })
}

async function handleAdminToggleTicket(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, json: { ok: false } }

  return mutateGuestsByPhone(db, phone, 'api_toggle_ticket', (g, matches) => {
    const current = matches.some((m) => m.ticketReceived === true)
    const next = !current
    return {
      ...g,
      ticketReceived: next,
      ticketReceivedAt: next ? Date.now() : null,
    }
  })
}

async function handleAdminDelete(db, body) {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, json: { ok: false } }

  return mutateGuestsByPhone(db, phone, 'api_delete_guest', (g) => ({
    ...g,
    isDeleted: true,
    deletedAt: Date.now(),
  }))
}

async function handleAdminUpdate(db, body) {
  const phone = normalizePhone(body.phone)
  const updates = body.guest
  if (!phone || !updates || typeof updates !== 'object') {
    return { status: 400, json: { ok: false } }
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests, cleared } = parseGuestsSnapshot(snap)

    const index = guests.findIndex(
      (g) => normalizePhone(getGuestPhone(g)) === phone && g.isDeleted !== true
    )
    if (index === -1) {
      return { status: 404, json: { ok: false, message: '게스트를 찾을 수 없습니다.' } }
    }

    const updatedGuest = {
      ...guests[index],
      ...updates,
      name: normalizeName(updates.name ?? getGuestName(guests[index])),
      phone: normalizePhone(getGuestPhone(updates) || phone),
    }

    const updatedGuests = guests.map((g, i) => (i === index ? updatedGuest : g))
    tx.set(guestsDocRef(db), buildDocPayload(updatedGuests, cleared, 'api_update_guest'))

    return { status: 200, json: { ok: true, guests: activeGuests(updatedGuests) } }
  })
}

async function handleAdminClear(db) {
  await guestsDocRef(db).set(buildDocPayload([], Date.now(), 'api_clear'))
  return { status: 200, json: { ok: true, guests: [] } }
}

async function handleAdminDeduplicate(db) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests, cleared } = parseGuestsSnapshot(snap)

    const before = guests.length
    const deduped = dedupeGuests(guests)
    const removedCount = before - deduped.length

    if (removedCount > 0) {
      tx.set(guestsDocRef(db), buildDocPayload(deduped, cleared, 'api_deduplicate'))
    }

    return {
      status: 200,
      json: { ok: true, removedCount, guests: activeGuests(deduped) },
    }
  })
}

async function handleAdminFixPhones(db) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(guestsDocRef(db))
    const { guests, cleared } = parseGuestsSnapshot(snap)

    let fixedCount = 0
    const fixed = guests.map((g) => {
      const raw = getGuestPhone(g)
      const oldNormalized = normalizePhone(String(raw))
      const newPhone = normalizeKoreanMobile(raw)
      const newNormalized = normalizePhone(newPhone)

      if (oldNormalized !== newNormalized && oldNormalized.length === 10 && newNormalized.length === 11) {
        fixedCount++
      }

      return { ...g, phone: newPhone, 전화번호: newPhone, Phone: newPhone }
    })

    if (fixedCount > 0) {
      tx.set(guestsDocRef(db), buildDocPayload(fixed, cleared, 'api_fix_phones'))
    }

    return {
      status: 200,
      json: { ok: true, fixedCount, guests: activeGuests(fixedCount > 0 ? fixed : guests) },
    }
  })
}

// ---------------------------------------------------------------------------
// 요청 핸들러
// ---------------------------------------------------------------------------

export async function handleGuestsRequest(req, res) {
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
      case 'login':
        result = await handleLogin(db, body)
        break
      case 'status':
        result = await handleStatus(db, body)
        break
      case 'check':
        result = await handleCheck(db, body)
        break
      case 'register':
        result = await handleRegister(db, body)
        break
      case 'onsite-payment':
        result = await handleOnsitePayment(db, body)
        break
      case 'list':
        result = await handleAdminList(db)
        break
      case 'upload':
        result = await handleAdminUpload(db, body)
        break
      case 'toggle-payment':
        result = await handleAdminTogglePayment(db, body)
        break
      case 'toggle-ticket':
        result = await handleAdminToggleTicket(db, body)
        break
      case 'delete':
        result = await handleAdminDelete(db, body)
        break
      case 'update':
        result = await handleAdminUpdate(db, body)
        break
      case 'clear':
        result = await handleAdminClear(db)
        break
      case 'deduplicate':
        result = await handleAdminDeduplicate(db)
        break
      case 'fix-phones':
        result = await handleAdminFixPhones(db)
        break
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' })
    }

    return res.status(result.status).json(result.json)
  } catch (error) {
    console.error('[guestsApi] error:', error)
    const mapped = mapFirestoreError(error)
    const status = mapped === 'internal_error' ? 500 : 503
    return res.status(status).json({ ok: false, error: mapped })
  }
}
