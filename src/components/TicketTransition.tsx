import { useEffect, useState } from 'react'

type TearDirection = 'vertical' | 'horizontal'

type Props = {
  ticketImageUrl: string
  tearDirection?: TearDirection
  tearAtPercent?: number // vertical: 왼쪽 기준 %, horizontal: 위쪽 기준 %
  onDone?: () => void
  info?: {
    name?: string
    date?: string
    seat?: string
    entryNumber?: number
    isWalkIn?: boolean
    paymentConfirmed?: boolean
  }
}

export default function TicketTransition({
  ticketImageUrl,
  tearDirection = 'vertical',
  tearAtPercent = 78.5,
  onDone,
  info,
}: Props) {
  const [start, setStart] = useState(false)
  const [finished, setFinished] = useState(false)
  const isVertical = tearDirection === 'vertical'

  useEffect(() => {
    if (finished) return

    const t1 = setTimeout(() => setStart(true), 150)
    const t2 = setTimeout(() => {
      setFinished(true)
      onDone?.()
    }, 1500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [finished, onDone])

  const tearStyle = { ['--tear' as string]: `${tearAtPercent}%` }

  return (
    <div
      className="tt_wrap"
      aria-label="티켓 발권 완료"
      onClick={() => onDone?.()}
      style={{ cursor: 'pointer' }}
    >
      <div
        className={`tt_ticket ${isVertical ? 'tt_ticket--vertical' : 'tt_ticket--horizontal'} ${start ? 'is-tearing' : ''}`}
      >
        <div
          className={`tt_piece ${isVertical ? 'tt_left' : 'tt_top'}`}
          style={tearStyle}
        >
          <img className="tt_img" src={ticketImageUrl} alt="티켓" />
        </div>

        <div
          className={`tt_piece ${isVertical ? 'tt_right' : 'tt_bottom'}`}
          style={tearStyle}
        >
          <img className="tt_img" src={ticketImageUrl} alt="" aria-hidden />
        </div>

        <div
          className={`tt_perforation ${isVertical ? 'tt_perforation--vertical' : 'tt_perforation--horizontal'}`}
          style={isVertical ? { left: `${tearAtPercent}%` } : { top: `${tearAtPercent}%` }}
        >
          <span className="tt_scissor" aria-hidden>
            ✂︎
          </span>
        </div>

        {info?.entryNumber && (() => {
          const isWalkIn = info.isWalkIn === true
          const paymentConfirmed = info.paymentConfirmed === true

          if (isWalkIn) {
            return (
              <div className={`tt_stamp ${start ? 'is-show' : ''}`}>
                <div className="tt_stampType">현장예약</div>
                <div className="tt_stampTitle">입장번호 {info.entryNumber}번!</div>
              </div>
            )
          }

          if (paymentConfirmed) {
            return (
              <div className={`tt_stamp ${start ? 'is-show' : ''}`}>
                <div className="tt_stampType">사전예약</div>
                <div className="tt_stampTitle">입장번호 {info.entryNumber}번!</div>
              </div>
            )
          }

          return (
            <div className={`tt_stamp ${start ? 'is-show' : ''}`} style={{ borderColor: '#ff4444' }}>
              <div className="tt_stampType" style={{ color: '#ff4444' }}>
                입금 미확인
                <br />
                확인중..
              </div>
            </div>
          )
        })()}
      </div>

      <div className={`tt_hint ${start ? 'is-hide' : ''}`}>티켓을 발권하는 중…</div>

      <style>{css}</style>
    </div>
  )
}

const css = `
.tt_wrap{
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100dvh;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  padding: 24px;
  overflow:hidden;
}

.tt_ticket{
  position:relative;
  width:min(640px, 95vw);
  border-radius: 8px;
  transform: translateY(8px) scale(0.98);
  opacity: 0;
  animation: tt_popIn 420ms ease-out forwards;
}

.tt_ticket--vertical{
  aspect-ratio: 1024 / 480;
}

.tt_ticket--horizontal{
  aspect-ratio: 3331 / 1551;
}

@keyframes tt_popIn{
  to { transform: translateY(0) scale(1); opacity:1; }
}

.tt_piece{
  position:absolute;
  inset:0;
  border-radius: 8px;
  overflow:hidden;
}

.tt_img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  image-rendering: -webkit-optimize-contrast;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

/* 세로 절취: 왼쪽 본표 / 오른쪽 스텁 */
.tt_left{
  clip-path: inset(0 calc(100% - var(--tear)) 0 0 round 8px);
}
.tt_right{
  clip-path: inset(0 0 0 var(--tear) round 8px);
}

/* 가로 절취 (레거시) */
.tt_top{
  clip-path: inset(0 0 calc(100% - var(--tear)) 0 round 8px);
}
.tt_bottom{
  clip-path: inset(var(--tear) 0 0 0 round 8px);
}

.tt_perforation{
  position:absolute;
  pointer-events:none;
}

.tt_perforation--vertical{
  top: 8%;
  height: 84%;
  width: 0;
  border-left: 2px dashed rgba(255,255,255,0.55);
  transform: translateX(-1px);
}

.tt_perforation--horizontal{
  left: 8%;
  width: 84%;
  height: 0;
  border-top: 2px dashed rgba(0,0,0,0.3);
  transform: translateY(-1px);
}

.tt_scissor{
  position:absolute;
  font-size: 18px;
  opacity: 0.9;
}

.tt_perforation--vertical .tt_scissor{
  top: 50%;
  left: -12px;
  transform: translateY(-50%) rotate(90deg);
}

.tt_perforation--horizontal .tt_scissor{
  right: -10px;
  top: -14px;
  transform: rotate(-8deg);
}

.tt_stamp{
  position:absolute;
  left: 58%;
  bottom: 14%;
  padding: 3px 6px;
  border: 3px solid #EC3E33;
  color: #EC3E33;
  border-radius: 6px;
  width: auto;
  min-width: 90px;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(-15deg);
  background: rgba(255, 255, 255, 0.6);
  opacity:0;
  z-index: 10;
  box-sizing: border-box;
  box-shadow:
    0 4px 12px rgba(236, 62, 51, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.3);
  font-family: 'DNFBitBitv2', sans-serif;
  font-weight: 700;
  pointer-events: none;
  gap: 2px;
}

.tt_ticket--horizontal .tt_stamp{
  left: auto;
  right: 14px;
  top: 14px;
  bottom: auto;
}

.tt_stamp.is-show{
  animation: tt_stampIn 520ms 200ms ease-out forwards;
}

@keyframes tt_stampIn{
  0% { opacity:0; transform: rotate(-15deg) scale(0.92); }
  70% { opacity:1; transform: rotate(-15deg) scale(1.03); }
  100% { opacity:1; transform: rotate(-15deg) scale(1); }
}

.tt_stampType{
  font-weight: 900;
  letter-spacing: 0.05em;
  font-size: 16px;
  text-align: center;
  line-height: 1.2;
  color: #EC3E33;
  white-space: nowrap;
}

.tt_stampTitle{
  font-weight: 900;
  letter-spacing: 0.05em;
  font-size: 16px;
  text-align: center;
  line-height: 1.2;
  color: #EC3E33;
  white-space: nowrap;
}

.tt_ticket.is-tearing.tt_ticket--vertical .tt_left{
  animation: tt_tearLeft 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing.tt_ticket--vertical .tt_right{
  animation: tt_tearRight 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing.tt_ticket--horizontal .tt_top{
  animation: tt_tearTop 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing.tt_ticket--horizontal .tt_bottom{
  animation: tt_tearBottom 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing .tt_perforation{
  animation: tt_tearLine 980ms 120ms ease-out forwards;
}

@keyframes tt_tearLeft{
  0%   { transform: translateX(0) rotate(0deg); }
  35%  { transform: translateX(-6px) rotate(-0.8deg); }
  100% { transform: translateX(-72px) rotate(-2.5deg); opacity:0.95; }
}

@keyframes tt_tearRight{
  0%   { transform: translateX(0) rotate(0deg); }
  35%  { transform: translateX(6px) rotate(0.8deg); }
  100% { transform: translateX(88px) rotate(2.5deg); opacity:0.95; }
}

@keyframes tt_tearTop{
  0%   { transform: translateY(0) rotate(0deg); }
  35%  { transform: translateY(-8px) rotate(-1.2deg); }
  100% { transform: translateY(-90px) rotate(-4deg); opacity:0.95; }
}

@keyframes tt_tearBottom{
  0%   { transform: translateY(0) rotate(0deg); }
  35%  { transform: translateY(8px) rotate(1.2deg); }
  100% { transform: translateY(110px) rotate(4deg); opacity:0.95; }
}

@keyframes tt_tearLine{
  0% { opacity: 1; }
  60% { opacity: 1; }
  100% { opacity: 0; filter: blur(1px); }
}

.tt_hint{
  position: absolute;
  bottom: 28px;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  letter-spacing: 0.02em;
  transition: opacity 240ms ease;
}
.tt_hint.is-hide{ opacity:0; }

@media (max-width: 768px) {
  .tt_stampType,
  .tt_stampTitle {
    font-size: 13px;
  }
  .tt_stamp {
    min-width: 76px;
    left: 52%;
    bottom: 10%;
  }
}
`
