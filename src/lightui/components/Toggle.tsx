/** 설정 토글 — Figma S8 211:102 */
const Toggle = ({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean
  onChange: (next: boolean) => void
  label: string
  /** 켤 수 없는 자리 — 예: 브라우저가 알림을 막아 둔 경우 */
  disabled?: boolean
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    aria-disabled={disabled || undefined}
    disabled={disabled}
    className={`lui-toggle${on ? ' lui-toggle--on' : ''}${disabled ? ' lui-toggle--off-limits' : ''}`}
    onClick={() => onChange(!on)}
  >
    <span className="lui-toggle__knob" />
  </button>
)

export default Toggle
