import { getAdminDb } from './firebaseAdmin.js'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

export async function handlePerformanceDataRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false })
  }

  const token = getBearerToken(req)
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const { data } = req.body || {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' })
  }

  try {
    const db = getAdminDb()
    await db.collection('performanceData').doc('main').set(
      {
        ...data,
        updatedAt: new Date(),
      },
      { merge: true }
    )
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('[performanceDataApi] error:', error)
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
}
