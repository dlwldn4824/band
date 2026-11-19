import { useTheme } from '../theme'
import markLight from '../assets/logo-mark.png'
import markDark from '../assets/logo-mark-red.png'
import wordLight from '../assets/logo-wordmark.png'
import wordDark from '../assets/logo-wordmark-red.png'
import lockupLight from '../assets/logo-bandy.png'
import lockupDark from '../assets/logo-bandy-red.png'

/**
 * 로고 — 테마마다 다른 파일을 씁니다.
 *
 * 검정 로고를 필터로 반전하면 3D 하이라이트까지 뒤집혀 네거티브처럼 보여서,
 * 다크용은 별도 에셋을 씁니다. 지금 다크는 브랜드 레드(#FF5A5A) 안입니다. 원래의 흰 재질은
 * `logo-*-dark.png` 로 그대로 남아 있어서, 되돌리려면 위 import 만 바꾸면 됩니다.
 */

type LogoKind = 'mark' | 'wordmark' | 'lockup'

const SRC: Record<LogoKind, { light: string; dark: string }> = {
  mark: { light: markLight, dark: markDark },
  wordmark: { light: wordLight, dark: wordDark },
  lockup: { light: lockupLight, dark: lockupDark },
}

const Logo = ({
  kind = 'lockup',
  className,
  alt = '',
}: {
  kind?: LogoKind
  className?: string
  alt?: string
}) => {
  const { resolved } = useTheme()
  return <img className={className} src={SRC[kind][resolved]} alt={alt} />
}

export default Logo
