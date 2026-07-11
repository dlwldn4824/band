import crypto from 'crypto'
import { getAdminDb } from './firebaseAdmin.js'

const RATE_LIMITS_COLLECTION = 'rateLimits'

/**
 * @param {import('express').Request | { headers?: Record<string, string | string[] | undefined> }} req
 */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(',')[0].trim()
  }
  return 'unknown'
}

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32)
}

/**
 * @param {string} scope e.g. verify-admin-code
 * @param {string} clientIp
 * @param {{ maxFailures?: number, windowMs?: number }} options
 */
export async function checkRateLimit(scope, clientIp, options = {}) {
  const maxFailures = options.maxFailures ?? 5
  const windowMs = options.windowMs ?? 15 * 60 * 1000
  const docId = `${scope}_${hashKey(clientIp)}`

  let db
  try {
    db = getAdminDb()
  } catch {
    // 서버 미설정 시 rate limit 생략 (기존 동작 유지)
    return { allowed: true }
  }

  const ref = db.collection(RATE_LIMITS_COLLECTION).doc(docId)
  const now = Date.now()

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() || {} : {}
    const windowStart = typeof data.windowStart === 'number' ? data.windowStart : now
    const failures = typeof data.failures === 'number' ? data.failures : 0

    if (now - windowStart > windowMs) {
      tx.set(ref, { failures: 0, windowStart: now, updatedAt: new Date() }, { merge: true })
      return { allowed: true, failures: 0 }
    }

    if (failures >= maxFailures) {
      return { allowed: false, failures, retryAfterMs: windowMs - (now - windowStart) }
    }

    return { allowed: true, failures }
  })
}

export async function recordRateLimitFailure(scope, clientIp, options = {}) {
  const maxFailures = options.maxFailures ?? 5
  const windowMs = options.windowMs ?? 15 * 60 * 1000
  const docId = `${scope}_${hashKey(clientIp)}`

  let db
  try {
    db = getAdminDb()
  } catch {
    return
  }

  const ref = db.collection(RATE_LIMITS_COLLECTION).doc(docId)
  const now = Date.now()

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() || {} : {}
    const windowStart = typeof data.windowStart === 'number' ? data.windowStart : now
    let failures = typeof data.failures === 'number' ? data.failures : 0

    if (now - windowStart > windowMs) {
      failures = 0
    }

    tx.set(
      ref,
      {
        failures: failures + 1,
        windowStart: now - windowStart > windowMs ? now : windowStart,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  })

  void maxFailures
}

export async function resetRateLimit(scope, clientIp) {
  const docId = `${scope}_${hashKey(clientIp)}`

  let db
  try {
    db = getAdminDb()
  } catch {
    return
  }

  await db.collection(RATE_LIMITS_COLLECTION).doc(docId).set(
    { failures: 0, windowStart: Date.now(), updatedAt: new Date() },
    { merge: true }
  )
}
