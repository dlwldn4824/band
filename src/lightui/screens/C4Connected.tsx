import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import Button from '../components/Button'
import { P } from '../paths'
import Cable from '../components/Cable'
import { connected as c } from '../../mocks/bandyLight'
import './C4Connected.css'

/** C4 연결되었어요 (성사 순간) — Figma 267:2 */
const C4Connected = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <div className="lui-body">
        <div className="c4">
          <span className="c4__badge">{c.badge}</span>
          <Cable state="signal" width={312} onDark className="c4__cable" />
          <h1 className="c4__headline">
            {c.headline[0]}
            <br />
            {c.headline[1]}
          </h1>
          <p className="c4__lines">
            {c.lines[0]}
            <br />
            {c.lines[1]}
          </p>
          <div className="c4__pair">
            <span className="c4__avatar">{c.pair[0]}</span>
            <span className="c4__x">×</span>
            <span className="c4__avatar">{c.pair[1]}</span>
          </div>
        </div>
      </div>

      <div className="lui-bottombar lui-bottombar--stack">
        {/* 규칙 1 — 기본 버튼 하나. Figma 가 평평하게 그렸습니다 */}
        <Button flat onClick={() => navigate(P.connection('lexa'))}>
          우리 사이 기록 보기
        </Button>
        <Button variant="ghost" onClick={() => navigate(P.showNew)}>
          3월 연합 공연 같이 지원
        </Button>
      </div>
    </Phone>
  )
}

export default C4Connected
