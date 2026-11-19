/** 설정 토글 — Figma S8 211:102 */
const Toggle = ({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (next: boolean) => void
  label: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`lui-toggle${on ? ' lui-toggle--on' : ''}`}
    onClick={() => onChange(!on)}
  >
    <span className="lui-toggle__knob" />
  </button>
)

export default Toggle
