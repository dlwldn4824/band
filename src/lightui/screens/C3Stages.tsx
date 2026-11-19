import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import Cable from '../components/Cable'
import { connectionStages as c } from '../../mocks/bandyLight'
import './C3Stages.css'

/**
 * C3 연결 상태 4단계 — Figma 266:2
 *
 * 네 단계 모두 같은 Cable 컴포넌트이고 state 만 다릅니다.
 */
const C3Stages = () => (
  <Phone>
    <TopBar title="연결이 만들어지는 과정" right={<span className="lui-topbar__side" />} />
    <div className="lui-body">
      <div className="c3">
        <div className="c3__gap-14" />
        <div className="c3__list">
          {c.stages.map((stage) => (
            <div key={stage.no} className="lui-card c3-stage">
              <div className="c3-stage__head">
                <span className="c3-stage__no">{stage.no}</span>
                <span className="c3-stage__tag">{stage.tag}</span>
              </div>
              <div className="c3-stage__art">
                <Cable state={stage.art} width={310} />
              </div>
              <p className="c3-stage__text">
                {stage.lines[0]}
                <br />
                {stage.lines[1]}
              </p>
            </div>
          ))}
        </div>

        <div className="c3__gap-26" />
        <SectionHeader title="무엇을 언제 기록할까" />
        <div className="c3__record">
          <Cable state={c.recordArt} width={310} />
        </div>

        <div className="c3__gap-14" />
        <p className="c3__notice">{c.notice}</p>
      </div>
    </div>
  </Phone>
)

export default C3Stages
