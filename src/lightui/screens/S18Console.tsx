import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import Icon from '../components/Icon'
import MoreMenu from '../components/MoreMenu'
import { P } from '../paths'
import { clubConsole as c } from '../../mocks/bandyLight'
import './S18Console.css'

/**
 * S18 공연 관리 — 운영진의 출발점.
 *
 * 입금 관리·입장 관리·정산 화면은 전부터 있었는데 서로의 ⋯ 메뉴로만 이어져 있어서,
 * 주소를 직접 치지 않으면 들어갈 길이 없었습니다. 이 화면이 그 입구입니다.
 * 마이 > 내 동아리와 동아리 상세의 ⋯ 에서 들어옵니다.
 */

const MenuRow = ({
  title,
  value,
  onClick,
}: {
  title: string
  value?: string
  onClick: () => void
}) => (
  <button type="button" className="s18-menu-row" onClick={onClick}>
    <span className="s18-menu-row__title">{title}</span>
    {value && <span className="s18-menu-row__value">{value}</span>}
    <Icon name="chevron-right" size={18} className="s18-menu-row__chev" />
  </button>
)

const TO: Record<(typeof c.menu)[number]['key'], string> = {
  deposits: P.deposits,
  entry: P.entry,
  settlement: P.settlement,
}

const S18Console = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <TopBar
        title="공연 관리"
        right={
          <MoreMenu
            items={[
              { label: '공연 만들기', to: P.showNew },
              { label: '모집 글 쓰기', sub: '함께 설 팀 구하기', to: P.recruitNew },
            ]}
          />
        }
      />
      <div className="lui-body">
        <div className="s18">
          <p className="s18__club">{c.club.name}</p>
          <div className="s18__gap-6" />
          <p className="s18__line">{c.summaryLine}</p>

          <div className="s18__gap-22" />
          <SectionHeader title="다가오는 공연" aside={String(c.upcoming.length)} />
          <div className="lui-card s18__group">
            {c.upcoming.map((show) => (
              <ListRow
                key={show.id}
                avatar={<img src={show.thumb} alt="" />}
                title={show.title}
                sub={show.when}
                slot={
                  /* 규칙 7 — 미입금이 남은 공연만 빨강 */
                  <span className={`lui-pill lui-pill--lg${show.urgent ? '' : ' lui-pill--outline'}`}>
                    입금 {show.paid}/{show.total}
                  </span>
                }
                chevron
                onClick={() => navigate(P.deposits)}
              />
            ))}
          </div>

          <div className="s18__gap-26" />
          <SectionHeader title="끝난 공연" aside={String(c.past.length)} />
          <div className="lui-card s18__group">
            {c.past.map((show) => (
              <ListRow
                key={show.id}
                avatar={<img src={show.thumb} alt="" />}
                title={show.title}
                sub={show.when}
                slot={<span className="lui-pill lui-pill--lg lui-pill--outline">{show.state}</span>}
                chevron
                onClick={() => navigate(P.settlement)}
              />
            ))}
          </div>

          <div className="s18__gap-26" />
          <SectionHeader title="관리" />
          <div className="lui-card s18__menu">
            {c.menu.map((row) => (
              <MenuRow
                key={row.key}
                title={row.title}
                value={row.value}
                onClick={() => navigate(TO[row.key])}
              />
            ))}
          </div>

          <div className="s18__gap-22" />
          <p className="s18__note">{c.note}</p>
        </div>
      </div>

      {/* 규칙 1 — 이 화면의 기본 버튼은 「공연 만들기」 하나 */}
      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.showNew)}>
          공연 만들기
        </Button>
      </div>
      <TabBar active="club" />
    </Phone>
  )
}

export default S18Console
