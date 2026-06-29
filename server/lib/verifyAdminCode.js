import crypto from 'crypto'

/**
 * @param {'login' | 'action'} type
 * @param {string} code
 */
export function verifyAdminCode(type, code) {
  if (type !== 'login' && type !== 'action') {
    return { ok: false, status: 400 }
  }

  const expected =
    type === 'login' ? process.env.ADMIN_LOGIN_CODE : process.env.ADMIN_ACTION_PASSWORD

  if (!expected) {
    return { ok: false, status: 503, error: 'not_configured' }
  }

  const inputHash = crypto.createHash('sha256').update(String(code ?? '').trim()).digest()
  const expectedHash = crypto.createHash('sha256').update(String(expected).trim()).digest()
  const ok = crypto.timingSafeEqual(inputHash, expectedHash)

  return { ok, status: 200 }
}

export function handleVerifyAdminCodeRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false })
  }

  const { type, code } = req.body || {}
  const result = verifyAdminCode(type, code)

  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error })
  }

  if (result.status !== 200) {
    return res.status(result.status).json({ ok: false })
  }

  return res.status(200).json({ ok: result.ok })
}
