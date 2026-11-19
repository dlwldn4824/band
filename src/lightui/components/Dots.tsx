/** 모인 팀 표시 — Figma L2 174:85 */
const Dots = ({ filled, total }: { filled: number; total: number }) => (
  <span className="lui-dots">
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className={`lui-dot${i < filled ? ' lui-dot--on' : ''}`} />
    ))}
  </span>
)

export default Dots
