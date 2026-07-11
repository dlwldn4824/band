import {
  normalizePhone,
  normalizeName,
  getGuestPhone,
  getGuestName,
  makeGuestKey,
  isSameGuestIdentity,
} from './guestNormalize.js'

const GUESTS_COLLECTION = 'guests_v2'
const GUESTS_DOC_ID = 'all'

function guestsDocRef(db) {
  return db.collection(GUESTS_COLLECTION).doc(GUESTS_DOC_ID)
}

function parseGuestsSnapshot(snap) {
  if (!snap.exists) return { guests: [], cleared: null }
  const data = snap.data() || {}
  const guests = Array.isArray(data.guests) ? data.guests : []
  return { guests }
}

function findActiveGuest(guests, name, phone) {
  const normalizedPhone = normalizePhone(phone)
  const normalizedName = normalizeName(name)
  if (!normalizedPhone || !normalizedName) return null

  return (
    guests.find(
      (g) => g.isDeleted !== true && isSameGuestIdentity(g, normalizedName, normalizedPhone)
    ) || null
  )
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{ name?: string, phone?: string, requirePayment?: boolean, allowAdmin?: boolean }} options
 */
export async function verifyGuest(db, options = {}) {
  const { requirePayment = false, allowAdmin = true } = options
  const name = normalizeName(options.name)
  const phone = normalizePhone(options.phone)

  if (allowAdmin && phone === 'admin' && name) {
    return {
      ok: true,
      guest: {
        name,
        phone: 'admin',
        paymentConfirmed: true,
        isAdmin: true,
      },
    }
  }

  if (!name || !phone) {
    return { ok: false, error: 'invalid_identity' }
  }

  const snap = await guestsDocRef(db).get()
  const { guests } = parseGuestsSnapshot(snap)
  const guest = findActiveGuest(guests, name, phone)

  if (!guest) {
    return { ok: false, error: 'not_found' }
  }

  const paymentConfirmed = guest.paymentConfirmed === true || guest.confirmPayment === true

  if (requirePayment && !paymentConfirmed) {
    return { ok: false, error: 'payment_required' }
  }

  return {
    ok: true,
    guest: {
      name: getGuestName(guest),
      phone: normalizePhone(getGuestPhone(guest)),
      paymentConfirmed,
      entryNumber: guest.entryNumber ?? null,
      nickname: guest.nickname,
    },
    profileId: makeGuestKey(getGuestName(guest), getGuestPhone(guest)),
  }
}

export function resolveDrinkOrderId({ name, phone, isAdmin }) {
  if (isAdmin || phone === 'admin') {
    const adminName = normalizeName(name) || 'admin'
    return `admin_${adminName}`.replace(/\s+/g, '_')
  }
  return normalizePhone(phone)
}
