/**
 * 「올해 만난 밴드」 카드 (클라이언트 canvas).
 *
 * C1 의 연결 지도를 그대로 사진으로 옮긴 것입니다. 동아리가 한 해를 정리해서
 * 인스타에 올릴 때 쓰라고 만든 그림이라, 화면과 달리 숫자와 이름이 크게 들어갑니다.
 *
 * 티켓 이미지(ticketImage.ts)와 같은 방식입니다 — 서버로 옮길 때 그리는 순서를
 * 그대로 가져가면 같은 그림이 나옵니다.
 */

export interface ConnectionImageInput {
  /** 가운데 — 우리 동아리 */
  owner: string
  year: number
  /** 둘레에 놓이는 밴드들 */
  bands: { initial: string; name: string; sub: string; warm: boolean }[]
  caption: string
}

const BG = '#141416'
const CARD = '#1C1D21'
const INK = '#F2F2F3'
const SUB = '#9A9DA4'
const ACCENT = '#FF5A5A'
const LINE = '#2A2C31'

const W = 1080
const H = 1350 // 인스타 세로 4:5

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.closePath()
}

export async function renderConnectionImage(input: ConnectionImageInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 를 쓸 수 없습니다')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // 머리글
  ctx.fillStyle = ACCENT
  ctx.font = '700 30px system-ui, -apple-system, sans-serif'
  ctx.fillText('BANDY CONNECTION', 72, 104)

  ctx.fillStyle = INK
  ctx.font = '800 68px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${input.year}년 ${input.owner}이`, 72, 196)
  ctx.fillText(`만난 밴드 ${input.bands.length}팀`, 72, 278)

  // 연결 지도 — 가운데에 우리, 둘레에 만난 밴드
  const cx = W / 2
  const cy = 700
  const R = 230

  // 이름표는 원 바로 아래가 아니라 중심에서 더 바깥으로 밀어냅니다 —
  // 아래에 두면 옆 밴드의 원과 겹칩니다.
  const LABEL_R = R + 112
  const pts = input.bands.map((b, i) => {
    const a = (-Math.PI / 2) + (i * Math.PI * 2) / input.bands.length
    return {
      ...b,
      x: cx + Math.cos(a) * R,
      y: cy + Math.sin(a) * R,
      lx: cx + Math.cos(a) * LABEL_R,
      ly: cy + Math.sin(a) * LABEL_R,
    }
  })

  // 선을 먼저 — 같이 선 적 있는 밴드는 굵고 빨갛게
  for (const p of pts) {
    ctx.strokeStyle = p.warm ? ACCENT : LINE
    ctx.lineWidth = p.warm ? 7 : 3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  // 둘레 밴드
  for (const p of pts) {
    ctx.fillStyle = CARD
    circle(ctx, p.x, p.y, 54)
    ctx.fill()
    ctx.strokeStyle = p.warm ? ACCENT : LINE
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = p.warm ? ACCENT : SUB
    ctx.font = '700 34px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(p.initial, p.x, p.y + 12)

    ctx.fillStyle = INK
    ctx.font = '700 28px system-ui, -apple-system, sans-serif'
    ctx.fillText(p.name, p.lx, p.ly + 2)
    ctx.fillStyle = SUB
    ctx.font = '400 21px system-ui, -apple-system, sans-serif'
    ctx.fillText(p.sub, p.lx, p.ly + 32)
    ctx.textAlign = 'left'
  }

  // 가운데 — 우리
  ctx.fillStyle = INK
  circle(ctx, cx, cy, 76)
  ctx.fill()
  ctx.fillStyle = BG
  ctx.font = '800 34px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(input.owner, cx, cy + 12)
  ctx.textAlign = 'left'

  // 맺음말
  const boxY = H - 230
  ctx.fillStyle = CARD
  roundRect(ctx, 72, boxY, W - 144, 128, 28)
  ctx.fill()

  ctx.fillStyle = SUB
  ctx.font = '400 26px system-ui, -apple-system, sans-serif'
  ctx.fillText(input.caption, 112, boxY + 56)
  ctx.fillStyle = INK
  ctx.font = '700 26px system-ui, -apple-system, sans-serif'
  ctx.fillText('bandy.kr', 112, boxY + 96)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했습니다'))), 'image/png')
  })
}
