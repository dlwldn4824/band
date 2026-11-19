import { motion, useReducedMotion } from 'framer-motion'

/**
 * 연결 케이블 — 로고의 3D 글로시 케이블 B 와 같은 모티프입니다.
 *
 * 이미지가 아니라 SVG path 로 그려서, 같은 컴포넌트가 상태에 따라 모습을 바꿉니다.
 * 공연 성사·교류 수락 같은 다른 자리에서도 `width` 만 줄여 작게 쓸 수 있습니다.
 *
 *  idle       미연결 · 대기 — 두 플러그가 34px 떨어져 있고 사이에 연한 점선
 *  connected  연결됨      — 플러그가 맞물리고 접점에 빨간 원 + 반투명 글로우
 *  signal     합동 공연 성사 — 케이블을 따라 빨간 점이 흐르고 글로우가 커짐
 *  cheer      응원 방문    — 음표 하나가 케이블을 타고 건너감
 */

export type CableState = 'idle' | 'connected' | 'signal' | 'cheer'

const ACCENT = '#FF5A5A'

/**
 * 밝은 배경 / 어두운 배경용 재질.
 * 검은 케이블을 어두운 배경에 그대로 두면 묻혀서, 다크에서는 코드·몸체를 밝게 뒤집습니다.
 */
const SKIN = {
  light: { cord: '#19191C', body: '#19191C', gloss: 'rgba(255,255,255,0.22)', metal: '#AEB4BC', tip: '#D2D7DD', dotted: '#D9DADD' },
  dark: { cord: '#3A3D44', body: '#ECEEF1', gloss: 'rgba(255,255,255,0.65)', metal: '#8D939C', tip: '#F2F3F5', dotted: '#4A4E56' },
} as const

type Skin = (typeof SKIN)[keyof typeof SKIN]

/** 한쪽 플러그(코드 + 몸체 + 금속부 + 팁). 오른쪽을 보고 있습니다. */
const Plug = ({ flip, skin }: { flip?: boolean; skin: Skin }) => (
  <g transform={flip ? 'scale(-1,1) translate(-320,0)' : undefined}>
    {/* 코드 */}
    <line x1="6" y1="42" x2="106" y2="42" stroke={skin.cord} strokeWidth="10" strokeLinecap="round" />
    {/* 몸체 */}
    <rect x="100" y="29" width="38" height="26" rx="8" fill={skin.body} />
    {/* 윗면 광택 */}
    <rect x="105" y="33" width="28" height="3.5" rx="1.75" fill={skin.gloss} />
    {/* 금속부 */}
    <rect x="138" y="36" width="12" height="12" rx="2.5" fill={skin.metal} />
    {/* 팁 */}
    <circle cx="156" cy="42" r="6.5" fill={skin.tip} />
    <circle cx="153.6" cy="39.6" r="1.8" fill="#fff" opacity="0.9" />
  </g>
)

/** 케이블을 타고 흐르는 점 — signal 상태에서만 */
const FlowDots = ({ still }: { still: boolean }) =>
  (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={`l${i}`}
          cy="42"
          r="3"
          fill={ACCENT}
          initial={{ cx: 24, opacity: 0 }}
          animate={still ? { cx: 60 + i * 24, opacity: 0.8 } : { cx: [24, 104], opacity: [0, 1, 0] }}
          transition={still ? undefined : { duration: 1.6, repeat: Infinity, delay: i * 0.45, ease: 'linear' }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={`r${i}`}
          cy="42"
          r="3"
          fill={ACCENT}
          initial={{ cx: 296, opacity: 0 }}
          animate={still ? { cx: 260 - i * 24, opacity: 0.8 } : { cx: [296, 216], opacity: [0, 1, 0] }}
          transition={still ? undefined : { duration: 1.6, repeat: Infinity, delay: i * 0.45, ease: 'linear' }}
        />
      ))}
    </>
  )

interface CableProps {
  state?: CableState
  /** 그려질 폭(px). 높이는 비율로 따라갑니다. */
  width?: number
  /** 어두운 배경 위에 올릴 때 (C4 성사 화면 · 다크 테마) */
  onDark?: boolean
  className?: string
}

const Cable = ({ state = 'connected', width = 310, onDark, className }: CableProps) => {
  const skin = onDark ? SKIN.dark : SKIN.light
  const reduced = useReducedMotion()
  const apart = state === 'idle'
  /** 떨어져 있을 때 한쪽이 바깥으로 밀려나는 거리 — 두 팁 사이가 34px 이 됩니다 */
  const offset = apart ? 13 : 0

  const glow = state === 'signal' ? { r: 26, opacity: 0.2 } : { r: 16, opacity: 0.16 }

  return (
    <svg
      className={className}
      width={width}
      height={(width * 84) / 320}
      viewBox="0 0 320 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* 떨어져 있을 때 사이를 잇는 연한 점선 */}
      {apart && (
        <line
          x1="145"
          y1="42"
          x2="175"
          y2="42"
          stroke={skin.dotted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 5"
        />
      )}

      {/* 맞물린 접점의 글로우 */}
      {!apart && (
        <motion.circle
          cx="160"
          cy="42"
          fill={ACCENT}
          initial={false}
          animate={
            reduced
              ? { r: glow.r, opacity: glow.opacity }
              : { r: [glow.r * 0.8, glow.r, glow.r * 0.8], opacity: [glow.opacity * 0.7, glow.opacity, glow.opacity * 0.7] }
          }
          transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.g initial={false} animate={{ x: -offset }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <Plug skin={skin} />
      </motion.g>
      <motion.g initial={false} animate={{ x: offset }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <Plug flip skin={skin} />
      </motion.g>

      {state === 'signal' && <FlowDots still={!!reduced} />}

      {/* 맞물린 접점 */}
      {!apart && <circle cx="160" cy="42" r="5.5" fill={ACCENT} />}

      {/* 응원 방문 — 음표 하나가 건너갑니다 */}
      {state === 'cheer' && (
        <motion.text
          y="30"
          fontSize="18"
          fill={ACCENT}
          fontWeight="700"
          initial={{ x: 236, opacity: 0 }}
          animate={reduced ? { x: 160, opacity: 1 } : { x: [236, 84], opacity: [0, 1, 1, 0] }}
          transition={reduced ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♪
        </motion.text>
      )}
    </svg>
  )
}

export { Plug }
export default Cable
