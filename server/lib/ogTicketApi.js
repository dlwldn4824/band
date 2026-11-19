/**
 * 공연별 OG 티켓 이미지 — 자리만 잡아 둔 라우트입니다.
 *
 * MOCK: 아직 이미지를 서버에서 만들지 않습니다. 지금은 정적 placeholder 로 보냅니다.
 * 붙일 때 할 일:
 *   1. 공연 id 로 포스터·공연명·일시·장소를 읽어 온다
 *   2. 1200×630 PNG 로 합성한다 (레이아웃은 src/lightui/share/ticketImage.ts 와 동일하게)
 *   3. `Cache-Control: public, max-age=…` 를 주고, 바뀌면 ?v= 를 올려 무효화한다
 */
export async function handleOgTicketRequest(req, res, eventId) {
  if (!eventId) {
    return res.status(400).json({ ok: false, error: 'event_id_required' })
  }
  // MOCK: 공연별 이미지가 생기기 전까지는 공용 placeholder 로 보냅니다
  res.setHeader('Cache-Control', 'public, max-age=60')
  return res.redirect(302, '/og-ticket-placeholder.png')
}
