import crypto from 'crypto'

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14 // 14일

function getSecret() {
  return (
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.ADMIN_ACTION_PASSWORD ||
    process.env.ADMIN_LOGIN_CODE ||
    ''
  )
}

function sign(payloadBase64) {
  return crypto.createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url')
}

export function issueAdminToken() {
  if (!getSecret()) return null
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + TOKEN_TTL_MS })
  const payloadBase64 = Buffer.from(payload, 'utf8').toString('base64url')
  return `${payloadBase64}.${sign(payloadBase64)}`
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !getSecret()) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [payloadBase64, signature] = parts
  const expected = sign(payloadBase64)

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return false
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    return payload.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}
