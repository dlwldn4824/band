import Icon from './Icon'

/** 매수 · 옵션 수량 스테퍼 — Figma D2 184:63 */
const Stepper = ({
  value,
  min = 0,
  max = 4,
  onChange,
  label,
}: {
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
  label?: string
}) => (
  <div className="lui-stepper">
    <button
      type="button"
      className="lui-stepper__btn"
      disabled={value <= min}
      onClick={() => onChange(value - 1)}
      aria-label={`${label ?? ''} 하나 줄이기`}
    >
      <Icon name="minus" size={16} />
    </button>
    <span className="lui-stepper__n">{value}</span>
    <button
      type="button"
      className="lui-stepper__btn"
      disabled={value >= max}
      onClick={() => onChange(value + 1)}
      aria-label={`${label ?? ''} 하나 늘리기`}
    >
      <Icon name="plus" size={16} />
    </button>
  </div>
)

export default Stepper
