import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TabBar from '../components/TabBar'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import { P } from '../paths'
import { connections as c } from '../../mocks/bandyLight'
import ConnectionGraph from '../components/ConnectionGraph'
import './C1Connections.css'

/**
 * C1 우리가 만난 밴드 (연결 지도) — Figma 264:2
 *
 * 관계 그래프는 React Flow(ConnectionGraph)로 그립니다.
 * 선 굵기는 함께한 횟수이고, 활동이 없다고 가늘어지지 않습니다.
 */
const C1Connections = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <TopBar
        title="우리의 연결"
        right={
          <MoreMenu
            items={[
              { label: '교류 단계란?', sub: '어떻게 올라가는지 보기', to: P.connectionStages },
              { label: '최근 연결된 동아리', to: P.connected },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="c1">
          <div className="c1__gap-14" />
          <h1 className="c1__headline">
            {c.headline[0]}
            <br />
            {c.headline[1]}
          </h1>

          <div className="c1__gap-14" />
          <p className="c1__lead">{c.lead}</p>

          <div className="c1__gap-14" />
          <ConnectionGraph onSelect={(id) => navigate(P.connection(id))} />

          <div className="c1__gap-14" />
          <div className="c1__legend">
            {c.legend.map((item) => (
              <span key={item.label} className="c1__legend-item">
                <span className={`c1__legend-bar c1__legend-bar--${item.tone}`} />
                {item.label}
              </span>
            ))}
          </div>

          <div className="c1__gap-26" />
          <SectionHeader title="연결된 밴드" aside={`${c.list.length}팀`} />
          <div className="lui-card c1__list">
            {c.list.map((row) => (
              <button
                key={row.name}
                type="button"
                className="c1-row"
                onClick={() => navigate(P.connection(row.name))}
              >
                <span className="c1-row__avatar">{row.initial}</span>
                <span className="c1-row__main">
                  <span className="c1-row__name">{row.name}</span>
                  <span className="c1-row__sub">{row.sub}</span>
                  <span className="c1-row__track">
                    <span
                      className={`c1-row__fill${row.warm ? ' c1-row__fill--warm' : ''}`}
                      style={{ width: `${row.ratio * 100}%` }}
                    />
                  </span>
                </span>
                <span className="c1-row__chev">›</span>
              </button>
            ))}
          </div>

          <div className="c1__gap-26" />
          <div className="lui-card c1__archive">
            <ListRow
              avatar={c.archive.initial}
              title={c.archive.title}
              sub={c.archive.sub}
              chevron
              onClick={() => navigate(P.connected)}
            />
            {/* 설명 화면(C3)으로 가는 길 — 평소엔 눈에 띌 필요가 없어 맨 아래에 둡니다 */}
            <ListRow
              avatar={c.stagesRow.initial}
              title={c.stagesRow.title}
              sub={c.stagesRow.sub}
              chevron
              onClick={() => navigate(P.connectionStages)}
            />
          </div>

          <div className="c1__gap-14" />
          <p className="c1__notice">{c.notice}</p>
        </div>
      </div>
      <TabBar active="club" />
    </Phone>
  )
}

export default C1Connections
