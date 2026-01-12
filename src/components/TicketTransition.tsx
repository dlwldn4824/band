import { useEffect, useState } from "react";

type Props = {
  ticketImageUrl: string;
  tearAtPercent?: number; // 절취선 위치 (0~100)
  onDone?: () => void;    // 애니메이션 끝나면 실행 (메인 이동 등)
  info?: {
    name?: string;
    date?: string;
    seat?: string;
    entryNumber?: number;
  };
};

export default function TicketTransition({
  ticketImageUrl,
  tearAtPercent = 72,
  onDone,
  info,
}: Props) {
  const [start, setStart] = useState(false);

  // 디버깅용 콘솔 로그
  console.log('[TicketTransition] info:', info)
  console.log('[TicketTransition] info?.entryNumber:', info?.entryNumber)
  console.log('[TicketTransition] 스탬프 표시 여부:', !!info?.entryNumber)

  useEffect(() => {
    // 살짝 딜레이 후 시작 (화면 렌더 안정화)
    const t1 = setTimeout(() => setStart(true), 150);

    // 애니메이션 끝나면 콜백 (메인으로 이동)
    // 찢어지는 애니메이션: 150ms 딜레이 + 120ms 시작 딜레이 + 980ms 애니메이션 = 1250ms
    // 여유를 두고 1500ms 후에 콜백 호출
    const t2 = setTimeout(() => {
      console.log('[TicketTransition] 애니메이션 완료, onDone 호출')
      onDone?.()
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div 
      className="tt_wrap" 
      aria-label="티켓 발권 완료"
      onClick={() => {
        // 클릭하면 바로 다음 단계로
        console.log('[TicketTransition] 사용자 클릭, onDone 호출')
        onDone?.()
      }}
      style={{ cursor: 'pointer' }}
    >
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

        {/* 입장번호 스탬프 오버레이 (선택) */}
        {info?.entryNumber && (
          <div className={`tt_stamp ${start ? "is-show" : ""}`}>
            <div className="tt_stampTitle">입장번호</div>
            <div className="tt_stampRow">{info.entryNumber}</div>
            <div className="tt_stampSubtitle">번</div>
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
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
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
  padding: 12px;
  border: 4px solid #d32f2f;
  color: #d32f2f;
  border-radius: 50%;
  width: 110px;
  height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(-15deg);
  background: rgba(255, 255, 255, 1);
  opacity:0;
  z-index: 10;
  box-sizing: border-box;
  box-shadow: 
    0 4px 12px rgba(211, 47, 47, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(255, 255, 255, 0.9);
  font-family: 'Arial', 'Helvetica', sans-serif;
  pointer-events: none;
}
.tt_stamp::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(15deg);
  width: 85%;
  height: 85%;
  border: 2px dashed #d32f2f;
  border-radius: 50%;
  opacity: 0.4;
}
.tt_stamp::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 70%;
  border: 1px solid #d32f2f;
  border-radius: 50%;
  opacity: 0.2;
}
.tt_stamp.is-show{
  animation: tt_stampIn 520ms 200ms ease-out forwards;
}
@keyframes tt_stampIn{
  0% { opacity:0; transform: rotate(-15deg) scale(0.92); }
  70% { opacity:1; transform: rotate(-15deg) scale(1.03); }
  100% { opacity:1; transform: rotate(-15deg) scale(1); }
}
.tt_stampTitle{ 
  font-weight: 900; 
  letter-spacing: 0.08em; 
  font-size: 10px; 
  margin-bottom: 4px;
  text-align: center;
  text-transform: uppercase;
  line-height: 1.1;
  position: relative;
  z-index: 1;
}
.tt_stampRow{ 
  font-weight: 900; 
  font-size: 32px; 
  text-align: center;
  line-height: 1;
  letter-spacing: 0;
  position: relative;
  z-index: 1;
}
.tt_stampSubtitle {
  font-weight: 700;
  font-size: 12px;
  text-align: center;
  line-height: 1;
  margin-top: 2px;
  position: relative;
  z-index: 1;
}

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
