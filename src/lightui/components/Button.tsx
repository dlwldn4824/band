import { ButtonHTMLAttributes, ReactNode } from 'react'
import glossSoft from '../assets/gloss-soft.svg'
import glossSpec from '../assets/gloss-spec.svg'

/**
 * 규칙 1 — 한 화면에 primary 는 하나. 보조 동작은 ghost 나 링크.
 * 규칙 6 — 글로스(그라데이션 + 광택 + 그림자)는 primary 에만, 좁은 버튼은 약하게.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  block?: boolean
  /** Figma 가 글로스 없이 평평하게 그린 자리 (S1 204:20) */
  flat?: boolean
  children: ReactNode
}

const Button = ({
  variant = 'primary',
  size = 'md',
  block,
  flat,
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={[
      'lui-btn',
      `lui-btn--${variant}`,
      size === 'sm' ? 'lui-btn--sm' : '',
      flat ? 'lui-btn--flat' : '',
      block ? 'lui-btn--block' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {variant === 'primary' && !flat && (
      <>
        <span className="lui-gloss lui-gloss--soft" aria-hidden>
          <img src={glossSoft} alt="" />
        </span>
        <span className="lui-gloss lui-gloss--spec" aria-hidden>
          <img src={glossSpec} alt="" />
        </span>
      </>
    )}
    <span>{children}</span>
  </button>
)

export default Button
