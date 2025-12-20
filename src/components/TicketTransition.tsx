import { useEffect, useState } from "react";

type Props = {
  ticketImageUrl: string;
  tearAtPercent?: number; // 절취선 위치 (0~100)
  onDone?: () => void;    // 애니메이션 끝나면 실행 (메인 이동 등)
  info?: {
    name?: string;
    date?: string;
    seat?: string;
  };
};

export default function TicketTransition({
  ticketImageUrl,
  tearAtPercent = 72,
  onDone,
  info,
}: Props) {
  const [start, setStart] = useState(false);

  useEffect(() => {
    // 살짝 딜레이 후 시작 (화면 렌더 안정화)
    const t1 = setTimeout(() => setStart(true), 150);

    // 애니메이션 끝나면 콜백 (메인으로 이동)
    const t2 = setTimeout(() => onDone?.(), 150 + 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="tt_wrap" aria-label="티켓 발권 완료">
      <div className={`tt_ticket ${start ? "is-tearing" : ""}`}>
        {/* 위 조각 */}
        <div
          className="tt_piece tt_top"
          style={{ ["--tear" as any]: `${tearAtPercent}%` }}
        >
          <img className="tt_img" src={ticketImageUrl} alt="티켓" />
        </div>

        {/* 아래 조각 */}
        <div
          className="tt_piece tt_bottom"
          style={{ ["--tear" as any]: `${tearAtPercent}%` }}
        >
          <img className="tt_img" src={ticketImageUrl} alt="" aria-hidden />
        </div>

        {/* 절취선 */}
        <div className="tt_perforation" style={{ top: `${tearAtPercent}%` }}>
          <span className="tt_scissor" aria-hidden>✂︎</span>
        </div>

        {/* 체크인 정보 오버레이 (선택) */}
        {(info?.name || info?.date || info?.seat) && (
          <div className={`tt_stamp ${start ? "is-show" : ""}`}>
            <div className="tt_stampTitle">CHECKED IN</div>
            <div className="tt_stampRow">{info?.name}</div>
            <div className="tt_stampRow">{info?.date}</div>
            <div className="tt_stampRow">{info?.seat}</div>
          </div>
        )}
      </div>

      <div className={`tt_hint ${start ? "is-hide" : ""}`}>
        티켓을 발권하는 중…
      </div>

      <style>{css}</style>
    </div>
  );
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
  background: transparent;
  padding: 24px;
  overflow:hidden;
}

.tt_ticket{
  position:relative;
  width:min(600px, 95vw);
  aspect-ratio: 3331 / 1551; /* 너가 올린 이미지 비율에 맞춤(대충) */
  border-radius: 8px;
  transform: translateY(8px) scale(0.98);
  opacity: 0;
  animation: tt_popIn 420ms ease-out forwards;
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
  image-rendering: high-quality;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 절취선 기준으로 이미지의 위/아래를 잘라 보여주기 */
.tt_top{
  clip-path: inset(0 0 calc(100% - var(--tear)) 0 round 8px);
}
.tt_bottom{
  clip-path: inset(var(--tear) 0 0 0 round 8px);
}

/* 절취선 (점선 + 살짝 흔들림) */
.tt_perforation{
  position:absolute;
  left: 8%;
  width: 84%;
  height: 0;
  border-top: 2px dashed rgba(0,0,0,0.3);
  transform: translateY(-1px);
  pointer-events:none;
}

.tt_scissor{
  position:absolute;
  right: -10px;
  top: -14px;
  font-size: 18px;
  opacity: 0.9;
  transform: rotate(-8deg);
}

/* 도장(선택) */
.tt_stamp{
  position:absolute;
  right: 14px;
  top: 14px;
  padding: 10px 12px;
  border: 2px solid rgba(255, 76, 76, 0.7);
  color: rgba(255, 76, 76, 0.9);
  border-radius: 10px;
  transform: rotate(-10deg) scale(0.96);
  opacity:0;
  backdrop-filter: blur(2px);
}
.tt_stamp.is-show{
  animation: tt_stampIn 520ms 200ms ease-out forwards;
}
@keyframes tt_stampIn{
  0% { opacity:0; transform: rotate(-10deg) scale(0.92); }
  70% { opacity:1; transform: rotate(-10deg) scale(1.03); }
  100% { opacity:1; transform: rotate(-10deg) scale(1); }
}
.tt_stampTitle{ font-weight: 900; letter-spacing: 0.08em; font-size: 12px; }
.tt_stampRow{ font-weight: 700; font-size: 11px; opacity: 0.9; }

/* 찢어지는 애니메이션 */
.tt_ticket.is-tearing .tt_top{
  animation: tt_tearTop 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing .tt_bottom{
  animation: tt_tearBottom 980ms 120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.tt_ticket.is-tearing .tt_perforation{
  animation: tt_tearLine 980ms 120ms ease-out forwards;
}

@keyframes tt_tearTop{
  0%   { transform: translateY(0) rotate(0deg); filter: none; }
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
  60% { opacity: 1; filter: blur(0); }
  100% { opacity: 0; filter: blur(1px); }
}

.tt_hint{
  position: absolute;
  bottom: 28px;
  color: rgba(0,0,0,0.6);
  font-size: 13px;
  letter-spacing: 0.02em;
  transition: opacity 240ms ease;
}
.tt_hint.is-hide{ opacity:0; }
`;
