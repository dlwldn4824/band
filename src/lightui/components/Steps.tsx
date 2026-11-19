/** 예매 단계 표시 — Figma D2 184:19 / D3 185:19 */
const DEFAULT_LABELS = ['매수', '정보', '입금']

const Steps = ({ current, labels = DEFAULT_LABELS }: { current: 1 | 2 | 3; labels?: string[] }) => (
  <div className="lui-steps">
    {labels.map((label, i) => (
      <div key={label} style={{ display: 'contents' }}>
        {i > 0 && <span className="lui-steps__line" />}
        <div className={`lui-steps__item${i + 1 <= current ? ' lui-steps__item--on' : ''}`}>
          <span className="lui-steps__n">{i + 1}</span>
          <span className="lui-steps__label">{label}</span>
        </div>
      </div>
    ))}
  </div>
)

export default Steps
