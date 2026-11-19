/**
 * Figma 에서 받은 SVG 파일을 그대로 쓰되, 색만 CSS 로 바꿉니다.
 *
 * 파일을 열어 path 를 고치거나 인라인으로 베끼지 않습니다.
 * mask-image 로 얹고 background-color 에 currentColor 를 넣으면
 * 탭 활성/비활성처럼 상태에 따라 색이 달라지는 자리도 원본 파일 하나로 해결됩니다.
 */

const iconFiles = import.meta.glob('../assets/icon-*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const tabFiles = import.meta.glob('../assets/tab-*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const registry: Record<string, string> = {}
for (const [path, url] of Object.entries({ ...iconFiles, ...tabFiles })) {
  const base = path.split('/').pop()!.replace(/\.svg$/, '')
  registry[base] = url                       // icon-bell, tab-home
  registry[base.replace(/^icon-/, '')] = url // bell
}

export type IconName = string

interface IconProps {
  name: IconName
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

const Icon = ({ name, size = 18, color, className, style }: IconProps) => {
  const url = registry[name] ?? registry[`icon-${name}`]
  if (!url) {
    // 아직 내려받지 않은 아이콘 — 자리만 비워 두고 콘솔로 알립니다.
    if (import.meta.env.DEV) console.warn(`[lightui] 아이콘 없음: ${name}`)
    return <span style={{ width: size, height: size, display: 'block', flex: 'none' }} />
  }
  // 빌드하면 작은 SVG 는 data URI 로 인라인되는데, 그 안에 작은따옴표가 들어 있습니다.
  // 따옴표 없이 url(...) 로 쓰면 CSS 값이 무효가 되어 마스크가 통째로 무시되고
  // background-color 만 남아 네모로 보입니다. 큰따옴표로 감싸 둡니다.
  const cssUrl = `url("${url.replace(/"/g, '%22')}")`
  return (
    <span
      aria-hidden
      className={`lui-icon${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        color,
        WebkitMaskImage: cssUrl,
        maskImage: cssUrl,
        ...style,
      }}
    />
  )
}

export default Icon
