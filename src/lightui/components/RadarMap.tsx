import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { MAP_BASE, MAP_ME, MAP_PINS, MAP_VIEWBOX } from '../assets/mapArt'

/**
 * 레이더 미니맵 — L1 「내 주변」 카드.
 *
 * 화면에 들어오면 한 번만 재생합니다. 루프하지 않습니다.
 *   1. 내 위치에서 원형 파동 2개가 0.5초 간격으로 바깥으로 퍼짐 (1.6초)
 *   2. 그 위로 부채꼴이 1회전 (2초, linear)
 *   3. 스윕이 지나가는 순간 그 자리의 핀이 뿅 하고 생김
 *   4. 다 끝나면 `onDone` — 호출한 쪽에서 숫자 카운트업을 시작합니다
 *
 * 지도는 인라인 SVG 입니다. `<img>` 로 깔면 SVG 안에서 테마 변수를 읽지 못해
 * 다크 전용 파일을 따로 들고 있어야 하는데, 그 파일이 밝은 회색 한 장이라
 * 다크에서 지도만 하얗게 보였습니다. 이제 색은 전부 `--lui-map-*` 토큰입니다.
 *
 * 애니메이션은 CSS keyframes 로 둡니다 — 리렌더가 일어나도 재생이 끊기지 않습니다.
 * `prefers-reduced-motion` 이면 전부 건너뛰고 최종 상태로 바로 보여 줍니다.
 */

const SWEEP_SEC = 2

/** 핀이 중심에서 몇 도 방향에 있는지 (12시 = 0도, 시계 방향) */
function angleOf(cx: number, cy: number) {
  const deg = (Math.atan2(cy - MAP_ME.y, cx - MAP_ME.x) * 180) / Math.PI + 90
  return (deg + 360) % 360
}

interface RadarMapProps {
  /** 뷰포트에 들어오면 한 번 재생 */
  sweepOnMount?: boolean
  /** 스윕이 끝났을 때 */
  onDone?: () => void
  /** 미니맵 대신 다른 지도를 깔고 싶을 때 (S2 처럼) */
  children?: React.ReactNode
  className?: string
}

const RadarMap = ({ sweepOnMount = true, onDone, children, className }: RadarMapProps) => {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(!sweepOnMount)

  useEffect(() => {
    if (!sweepOnMount) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setArmed(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArmed(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)

    /* 일부 환경(백그라운드 탭·임베드 미리보기)에서는 IntersectionObserver 가
       아예 발화하지 않습니다. 그럴 때도 한 번은 재생되도록, 잠깐 기다렸다가
       화면 안에 있으면 직접 켭니다. */
    const fallback = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.bottom > 0 && r.top < window.innerHeight) setArmed(true)
    }, 400)

    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [sweepOnMount])

  const play = armed && !reduced

  // 스윕이 끝나면 알려 줍니다 (모션을 끈 경우엔 바로)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    if (!armed) return
    if (reduced) {
      onDoneRef.current?.()
      return
    }
    const t = window.setTimeout(() => onDoneRef.current?.(), SWEEP_SEC * 1000)
    return () => window.clearTimeout(t)
  }, [armed, reduced])

  // 스윕·파동이 카드 밖까지 닿도록 — 중심에서 가장 먼 모서리까지
  const reach = Math.hypot(
    Math.max(MAP_ME.x, MAP_VIEWBOX.w - MAP_ME.x),
    Math.max(MAP_ME.y, MAP_VIEWBOX.h - MAP_ME.y),
  )
  const mePct = { x: (MAP_ME.x / MAP_VIEWBOX.w) * 100, y: (MAP_ME.y / MAP_VIEWBOX.h) * 100 }
  const sizePct = ((reach * 2) / MAP_VIEWBOX.w) * 100
  const round = { left: `${mePct.x}%`, top: `${mePct.y}%`, width: `${sizePct}%` }

  return (
    <div
      ref={ref}
      className={`lui-radar${className ? ` ${className}` : ''}`}
      data-play={play ? '1' : undefined}
    >
      {children ?? (
        <svg
          className="lui-radar__base"
          viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: MAP_BASE }}
        />
      )}

      {play && (
        <>
          <span className="lui-radar__ripple" style={round} />
          <span className="lui-radar__ripple lui-radar__ripple--2" style={round} />
          <span className="lui-radar__sweep" style={round} />
        </>
      )}

      <svg
        className="lui-radar__pins"
        viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        {MAP_PINS.map((pin) => (
          <g
            key={`${pin.cx}-${pin.cy}`}
            className="lui-radar__pin"
            style={
              {
                transformOrigin: `${pin.cx}px ${pin.cy}px`,
                // 스윕이 이 핀을 지나는 순간에 맞춥니다
                '--pin-delay': `${(angleOf(pin.cx, pin.cy) / 360) * SWEEP_SEC}s`,
              } as React.CSSProperties
            }
          >
            <ellipse className="lui-radar__pin-shadow" cx={pin.cx} cy={pin.cy + 2} rx={7} ry={2.6} />
            <g dangerouslySetInnerHTML={{ __html: pin.markup }} />
          </g>
        ))}
      </svg>
    </div>
  )
}

export default RadarMap
