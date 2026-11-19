import Button from './Button'
import Cable from './Cable'
import { connected as c } from '../../mocks/bandyLight'
import '../screens/C4Connected.css'

/**
 * C4 「연결되었어요」 — 화면이 아니라 결과입니다.
 *
 * 제안을 수락한 순간(S6 상세 · L2-b 목록) 그 화면 위에 전체로 덮이고,
 * `/ui/connections/new` 로 직접 들어오면 한 장짜리 화면으로도 열립니다.
 * `overlay` 는 그 차이(덮을 것인가, 자리에 깔 것인가)만 가릅니다.
 */

interface ConnectedResultProps {
  overlay?: boolean
  /** 아바타 두 글자 — 수락한 상대에 맞춰 바뀝니다 */
  pair?: [string, string]
  headline?: [string, string]
  /** [우리 사이 기록 보기] */
  onSeeRecord: () => void
  /** 두 번째 버튼 — 목록 위에서는 「닫기」 */
  secondaryLabel?: string
  onSecondary: () => void
}

const ConnectedResult = ({
  overlay,
  pair,
  headline,
  onSeeRecord,
  secondaryLabel = '닫기',
  onSecondary,
}: ConnectedResultProps) => {
  const lines = headline ?? c.headline
  const faces = pair ?? (c.pair as [string, string])

  return (
    <div className={overlay ? 'c4-overlay' : 'c4-screen'} role={overlay ? 'dialog' : undefined} aria-modal={overlay}>
      <div className="c4">
        <span className="c4__badge">{c.badge}</span>
        <Cable state="signal" width={312} onDark className="c4__cable" />
        <h1 className="c4__headline">
          {lines[0]}
          <br />
          {lines[1]}
        </h1>
        <p className="c4__lines">
          {c.lines[0]}
          <br />
          {c.lines[1]}
        </p>
        <div className="c4__pair">
          <span className="c4__avatar">{faces[0]}</span>
          <span className="c4__x">×</span>
          <span className="c4__avatar">{faces[1]}</span>
        </div>
      </div>

      <div className="lui-bottombar lui-bottombar--stack">
        {/* 규칙 1 — 기본 버튼 하나. Figma 가 평평하게 그렸습니다 */}
        <Button flat onClick={onSeeRecord}>
          우리 사이 기록 보기
        </Button>
        <Button variant="ghost" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      </div>
    </div>
  )
}

export default ConnectedResult
