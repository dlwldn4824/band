/**
 * /api/verify-admin-code/1234 같은 봇 스캔 경로 — SPA로 떨어지지 않고 404 반환
 */
export default function handler(_req, res) {
  return res.status(404).json({ ok: false })
}
