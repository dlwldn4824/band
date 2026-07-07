import crypto from 'crypto'
import { issueAdminToken } from './adminToken.js'

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

  if (result.ok) {
    // 운영진 코드 검증 성공 시 관리자용 API 토큰 발급
    const token = issueAdminToken()
    return res.status(200).json({ ok: true, ...(token ? { token } : {}) })
  }

  return res.status(200).json({ ok: false })
}
