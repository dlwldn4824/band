import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { tapToConnect as t } from '../../mocks/bandyLight'
import { withParticle } from '../korean'
import './P5Tap.css'

/**
 * P5 휴대폰 맞대기 (NFC) — Figma 297:2 에서 가운데 그림을 바꿨습니다.
 *
 * 원래는 동심원 하나였는데 P3 도 큰 동그라미로 시작해서 두 화면이 닮아 보였습니다.
 * 여기서는 휴대폰 두 대가 마주 보고 그 사이에서 신호가 퍼지는 그림으로 두고,
 * 「찾는 중」 이라는 걸 글로도 말합니다 — 끝난 화면이 아니라 진행 중인 화면이니까요.
 *
 * `?with=이름` 으로 들어오면 누구와 맞대는 중인지 제목에 붙습니다 (P4 에서 사람 카드를 누른 경우).
 */
const P5Tap = () => {
  const navigate = useNavigate()
  const { showId = 'glow' } = useParams()
  const [params] = useSearchParams()
  const withName = params.get('with')

  return (
    <Phone time="18:42">
      <TopBar
        title={withName ? `${withName}${withParticle(withName)} 연결` : '연결하기'}
        right={<span className="lui-topbar__side" />}
      />
      <div className="lui-body">
        <div className="p5">
          {/* 마주 본 휴대폰 두 대 + 그 사이로 퍼지는 신호 */}
          <div className="p5__scene" aria-hidden>
            <span className="p5__phone p5__phone--a" />
            <span className="p5__wave" />
            <span className="p5__wave p5__wave--2" />
            <span className="p5__phone p5__phone--b" />
          </div>

          <h1 className="p5__headline">
            {t.headline[0]}
            <br />
            {t.headline[1]}
          </h1>
          <p className="p5__lines">
            {t.lines[0]}
            <br />
            {t.lines[1]}
          </p>

          <p className="p5__status">
            {withName ? `${withName}의 휴대폰을 찾는 중` : t.status}
            <span className="p5__dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </p>

          <span className="p5__hint">{t.hint}</span>
        </div>
      </div>

      <div className="lui-bottombar p5__bottom">
        {/* 규칙 1 — QR 폴백은 보조 동작이라 외곽선 */}
        <Button variant="ghost" onClick={() => navigate(P.livePeople(showId))}>
          QR로 연결하기
        </Button>
        <p className="p5__notice">{t.notice}</p>
      </div>
    </Phone>
  )
}

export default P5Tap
