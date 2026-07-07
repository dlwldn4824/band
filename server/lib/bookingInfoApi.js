import { getAdminDb } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

export async function handleBookingInfoRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false })
  }

  const token = getBearerToken(req)
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const { info } = req.body || {}
  if (!info || typeof info !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_payload' })
  }

  try {
    const db = getAdminDb()
    await db.collection('bookingInfo').doc('main').set(
      {
        ...info,
        updatedAt: new Date(),
      },
      { merge: true }
    )
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('[bookingInfoApi] error:', error)
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
}
