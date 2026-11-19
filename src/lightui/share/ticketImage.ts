/**
 * 티켓 이미지 합성 (클라이언트 canvas).
 *
 * MOCK: 원래는 공연 id 별 서버 엔드포인트(`/api/og/:eventId`)가 1200×630 을 만들어
 * OG 썸네일로 쓰는 그림입니다. 서버가 붙기 전까지는 브라우저에서 같은 레이아웃을 그려
 * S15 「보낼 모습」 미리보기와 스토리 이미지 저장에 씁니다.
 * 서버로 옮길 때 이 파일의 그리기 순서를 그대로 옮기면 같은 그림이 나옵니다.
 */

export type TicketImageSize = 'og' | 'story'

const SIZES: Record<TicketImageSize, { w: number; h: number }> = {
  og: { w: 1200, h: 630 }, // 문자·메신저 썸네일
  story: { w: 1080, h: 1920 }, // 인스타 스토리
}

export interface TicketImageInput {
  title: string
  when: string
  venue: string
  /** 포스터 이미지 URL (같은 출처여야 canvas 가 오염되지 않습니다) */
  poster?: string
  link: string
}

const INK = '#17181C'
const ACCENT = '#FF5A5A'
const SUB = '#9BA0A8'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** 가운데를 기준으로 잘라 채웁니다 (object-fit: cover) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 티켓 가장자리의 반원 노치 (배경색으로 파냅니다) */
function notches(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, r: number, bg: string) {
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export async function renderTicketImage(
  input: TicketImageInput,
  size: TicketImageSize = 'og',
): Promise<Blob> {
  const { w, h } = SIZES[size]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 를 쓸 수 없어요')

  // Pretendard 가 올라온 뒤에 그려야 글자가 시스템 폰트로 새지 않습니다
  try {
    await document.fonts.ready
  } catch {
    /* 폰트 API 가 없으면 그냥 진행 */
  }

  const font = (weight: number, px: number) => `${weight} ${px}px Pretendard, 'Noto Sans KR', sans-serif`

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, w, h)

  const poster = input.poster ? await loadImage(input.poster) : null

  if (size === 'og') {
    const pad = 56
    const posterW = 420
    const cardY = pad
    const cardH = h - pad * 2

    // 포스터
    ctx.save()
    roundRect(ctx, pad, cardY, posterW, cardH, 24)
    ctx.clip()
    ctx.fillStyle = '#26272C'
    ctx.fillRect(pad, cardY, posterW, cardH)
    if (poster) drawCover(ctx, poster, pad, cardY, posterW, cardH)
    ctx.restore()

    // 가운데 점선 (티켓 절취선)
    const lineX = pad + posterW + 48
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 14])
    ctx.beginPath()
    ctx.moveTo(lineX, cardY + 24)
    ctx.lineTo(lineX, cardY + cardH - 24)
    ctx.stroke()
    ctx.setLineDash([])
    notches(ctx, lineX, cardY - 8, 0, 22, INK)
    notches(ctx, lineX, cardY + cardH + 8, 0, 22, INK)

    // 글자
    const tx = lineX + 56
    const tw = w - tx - pad
    ctx.fillStyle = ACCENT
    ctx.font = font(700, 26)
    ctx.fillText('BANDY · 공연 초대', tx, cardY + 92)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = font(800, 56)
    wrapText(ctx, input.title, tx, cardY + 180, tw, 70, 2)

    ctx.fillStyle = SUB
    ctx.font = font(400, 30)
    ctx.fillText(input.when, tx, cardY + 330)
    ctx.fillText(input.venue, tx, cardY + 380)

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = font(400, 24)
    ctx.fillText(input.link, tx, cardY + cardH - 40)
  } else {
    // 스토리 — 포스터를 위에 크게, 아래에 글자
    const pad = 72
    const posterH = 1180
    ctx.save()
    roundRect(ctx, pad, 220, w - pad * 2, posterH, 36)
    ctx.clip()
    ctx.fillStyle = '#26272C'
    ctx.fillRect(pad, 220, w - pad * 2, posterH)
    if (poster) drawCover(ctx, poster, pad, 220, w - pad * 2, posterH)
    ctx.restore()

    ctx.fillStyle = ACCENT
    ctx.font = font(700, 34)
    ctx.fillText('BANDY · 공연 초대', pad, 150)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = font(800, 68)
    wrapText(ctx, input.title, pad, 1520, w - pad * 2, 86, 2)

    ctx.fillStyle = SUB
    ctx.font = font(400, 38)
    ctx.fillText(input.when, pad, 1700)
    ctx.fillText(input.venue, pad, 1760)

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = font(400, 30)
    ctx.fillText(input.link, pad, 1850)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png')
  })
}

/** 긴 제목을 maxLines 줄까지만 접습니다 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(' ')
  let line = ''
  let drawn = 0
  for (let i = 0; i < words.length; i += 1) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + drawn * lineHeight)
      drawn += 1
      line = words[i]
      if (drawn === maxLines - 1 && i < words.length - 1) {
        // 마지막 줄 — 남은 걸 합쳐서 말줄임
        let rest = words.slice(i).join(' ')
        while (rest && ctx.measureText(`${rest}…`).width > maxWidth) rest = rest.slice(0, -1)
        ctx.fillText(words.slice(i).join(' ').length > rest.length ? `${rest}…` : rest, x, y + drawn * lineHeight)
        return
      }
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y + drawn * lineHeight)
}
