import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import MoreMenu from '../components/MoreMenu'
import TopBar from '../components/TopBar'
import SectionHeader from '../components/SectionHeader'
import Cable from '../components/Cable'
import Button from '../components/Button'
import { P } from '../paths'
import { relationEmptyLog, relationFor } from '../../mocks/bandyLight'
import './C2Relation.css'

/** C2 우리 사이 (관계 상세) — Figma 265:2 */
const C2Relation = () => {
  const navigate = useNavigate()
  const { relationId = 'lexa' } = useParams()
  // 밴드마다 다른 관계입니다 — 예전에는 어느 밴드를 눌러도 멜로딕 × 렉사가 나왔습니다
  const r = relationFor(relationId)

  return (
    <Phone>
      <TopBar
        title={r.title}
        right={
          <MoreMenu
            items={[
              { label: '대화 열기', to: P.chat('1') },
              { label: '동아리 소개 보기', to: P.club() },
              {
                label: '신고하기',
                danger: true,
                note: '신고 내용은 운영팀만 봅니다. 상대 동아리에는 누가 신고했는지 전해지지 않습니다.',
              },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="c2">
          <div className="c2__gap-14" />
          <div className="c2__hero">
            {/* 좌우 밴드 + 가운데 케이블. 선보다 아래 기록 배지가 주인공입니다. */}
            <div className="c2__cablerow">
              <span className="c2__band">
                <span className="c2__bubble c2__bubble--ours">{r.cable.left.initial}</span>
                <span className="c2__band-name">{r.cable.left.name}</span>
                <span className="c2__band-school">{r.cable.left.school}</span>
              </span>
              <Cable state="signal" width={212} className="c2__cable" />
              <span className="c2__band">
                <span className="c2__bubble c2__bubble--theirs">{r.cable.right.initial}</span>
                <span className="c2__band-name">{r.cable.right.name}</span>
                <span className="c2__band-school">{r.cable.right.school}</span>
              </span>
            </div>
            <p className="c2__caption">{r.caption}</p>
          </div>

          <div className="c2__gap-14" />
          <div className="c2__stats">
            {r.stats.map((s) => (
              <div key={s.k} className="c2__stat">
                <span className={`c2__stat-v${'accent' in s && s.accent ? ' c2__stat-v--accent' : ''}`}>
                  {s.v}
                </span>
                <span className="c2__stat-k">{s.k}</span>
              </div>
            ))}
          </div>

          <div className="c2__gap-26" />
          {/* 건수는 목록에서 셉니다 — 적어 둔 숫자와 목록이 어긋나던 적이 있습니다 */}
          <SectionHeader title="함께한 기록" aside={`${r.log.length}건`} />
          <div className="lui-card c2__log">
            {r.log.length === 0 && <p className="c2__empty">{relationEmptyLog}</p>}
            {r.log.map((row) => (
              <div key={row.title} className="c2-log">
                <span className={`c2-log__dot${row.strong ? ' c2-log__dot--on' : ''}`} />
                <span className="c2-log__main">
                  <span className="c2-log__title">{row.title}</span>
                  <span className="c2-log__sub">{row.sub}</span>
                </span>
                <span className="c2-log__at">{row.at}</span>
              </div>
            ))}
          </div>

          <div className="c2__gap-26" />
          <SectionHeader title="다음 연결" />
          <div className="lui-card c2__next">
            <div className="c2__next-main">
              <span className="c2__next-title">{r.next.title}</span>
              <span className="c2__next-sub">{r.next.sub}</span>
            </div>
            <div className="c2__next-actions">
              {/* 규칙 1 — 이 화면의 유일한 기본 버튼. Figma 가 평평하게 그렸습니다 */}
              <Button flat onClick={() => navigate(P.showNew)}>
                같이 지원하기
              </Button>
              <Button variant="ghost" onClick={() => navigate(P.chat('lexa'))}>
                대화
              </Button>
            </div>
          </div>

          <div className="c2__gap-14" />
          <p className="c2__notice">{r.notice}</p>
        </div>
      </div>
    </Phone>
  )
}

export default C2Relation
