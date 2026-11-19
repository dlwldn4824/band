import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import Icon from '../components/Icon'
import MoreMenu from '../components/MoreMenu'
import Sheet from '../components/Sheet'
import Button from '../components/Button'
import { P } from '../paths'
import { signOut } from '../auth/kakao'
import DeleteAccount from '../auth/DeleteAccount'
import { useBlocked } from '../safety/report'
import { useRole, type ClubRole } from '../auth/role'
import { me } from '../../mocks/bandyLight'
import { THEME_LABELS, useTheme, type ThemeMode } from '../theme'
import './S14Me.css'

/** S14 마이 — Figma 217:2 */
const MenuRow = ({
  title,
  value,
  onClick,
}: {
  title: string
  value?: string
  onClick?: () => void
}) => (
  <button type="button" className="s14-menu-row" onClick={onClick}>
    <span className="s14-menu-row__title">{title}</span>
    {value && <span className="s14-menu-row__value">{value}</span>}
    <Icon name="chevron-right" size={18} className="s14-menu-row__chev" />
  </button>
)

const MODES: ThemeMode[] = ['system', 'light', 'dark']
const ROLES: { key: ClubRole; label: string }[] = [
  { key: 'manager', label: '운영진' },
  { key: 'member', label: '부원' },
]

const S14Me = () => {
  const navigate = useNavigate()
  const { mode, resolved, setMode } = useTheme()
  const { role, setRole, isManager } = useRole()
  const [joinOpen, setJoinOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const { count: blockedCount } = useBlocked()

  return (
    <Phone>
      <div className="lui-body">
        <div className="s14">
          <div className="s14__gap-14" />
          <div className="s14__head">
            <h1 className="s14__title">마이</h1>
            <MoreMenu
              items={[
                { label: '프로필 수정', to: P.onboarding() },
                { label: '알림 설정', to: P.notifications },
              ]}
            />
          </div>

          <div className="s14__gap-14" />
          <div className="lui-card s14__profile">
            <ListRow
              avatar={me.initial}
              title={me.name}
              sub={me.sub}
              chevron
              onClick={() => navigate(P.onboarding())}
            />
          </div>

          <div className="s14__gap-26" />
          <SectionHeader title="내 동아리" aside={String(me.clubs.length)} />
          <div className="lui-card s14__group">
            {me.clubs.map((club) => (
              <ListRow
                key={club.name}
                avatar={club.initial}
                title={club.name}
                sub={club.sub}
                slot={<span className="lui-pill lui-pill--lg">{club.badge}</span>}
                onClick={() => navigate(P.club('melodic'))}
              />
            ))}
            <ListRow
              avatar={me.joinClub.initial}
              title={me.joinClub.title}
              sub={me.joinClub.sub}
              chevron
              onClick={() => setJoinOpen(true)}
            />
          </div>

          {/* 운영진에게만 — 입금·입장·정산 화면으로 들어가는 상설 입구 */}
          {isManager && (
            <>
              <div className="s14__gap-26" />
              <SectionHeader title="운영" />
              <div className="lui-card s14__menu">
                <MenuRow
                  title="공연 관리"
                  value="입금 · 입장 · 정산"
                  onClick={() => navigate(P.console)}
                />
              </div>
            </>
          )}

          <div className="s14__gap-26" />
          <SectionHeader title="예매" />
          <div className="lui-card s14__menu">
            {me.booking.map((row) => (
              <MenuRow
                key={row.title}
                title={row.title}
                value={row.value}
                onClick={() => navigate(P.tickets)}
              />
            ))}
          </div>

          <div className="s14__gap-26" />
          <SectionHeader title="설정" />
          <div className="lui-card s14__menu">
            {/* 화면 테마 — 기본은 시스템 설정을 따릅니다 */}
            <div className="s14-theme-row">
              <div className="s14-theme-row__head">
                <span className="s14-theme-row__title">화면 테마</span>
                <span className="s14-theme-row__now">
                  {mode === 'system' ? `시스템 · 지금 ${THEME_LABELS[resolved]}` : THEME_LABELS[mode]}
                </span>
              </div>
              <div className="lui-themepick" role="group" aria-label="화면 테마">
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`lui-themepick__opt${m === mode ? ' lui-themepick__opt--on' : ''}`}
                    aria-pressed={m === mode}
                    onClick={() => setMode(m)}
                  >
                    {THEME_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
            {/* 운영진만 할 수 있는 일이 있어서, 두 눈으로 다 볼 수 있게 둡니다 */}
            <div className="s14-theme-row">
              <div className="s14-theme-row__head">
                <span className="s14-theme-row__title">계정 권한</span>
                <span className="s14-theme-row__now">
                  {role === 'manager' ? '운영진 · 전부 할 수 있어요' : '부원 · 보기만 할 수 있어요'}
                </span>
              </div>
              <div className="lui-themepick" role="group" aria-label="계정 권한">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`lui-themepick__opt${r.key === role ? ' lui-themepick__opt--on' : ''}`}
                    aria-pressed={r.key === role}
                    onClick={() => setRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {me.settings.map((row) => (
              <MenuRow
                key={row.title}
                title={row.title}
                value={row.value}
                onClick={() => (row.title === '알림 설정' ? navigate(P.notifications) : undefined)}
              />
            ))}
          </div>

          <div className="s14__gap-26" />
          <SectionHeader title="안전" />
          <div className="lui-card s14__menu">
            <MenuRow
              title="차단한 사람"
              value={blockedCount > 0 ? `${blockedCount}명` : '없음'}
              onClick={() => navigate(P.blocked)}
            />
          </div>

          <div className="s14__gap-26" />
          <SectionHeader title="약관과 정책" />
          <div className="lui-card s14__menu">
            <MenuRow title="이용약관" onClick={() => navigate(P.legal('terms'))} />
            <MenuRow title="개인정보 처리방침" onClick={() => navigate(P.legal('privacy'))} />
            <MenuRow title="취소 · 환불 규정" onClick={() => navigate(P.legal('refund'))} />
          </div>

          {/* 계정 삭제는 앱 안에 있어야 합니다 (Apple 5.1.1(v)).
              되돌릴 수 없는 동작이라 다른 설정과 섞지 않고 맨 아래 따로 둡니다. */}
          <div className="s14__gap-26" />
          <SectionHeader title="계정" />
          <div className="lui-card s14__menu">
            <MenuRow
              title="로그아웃"
              onClick={() => {
                signOut()
                navigate(P.start())
              }}
            />
            <button type="button" className="s14-menu-row s14-menu-row--danger" onClick={() => setDelOpen(true)}>
              <span className="s14-menu-row__title">계정 삭제</span>
              <Icon name="chevron-right" size={18} className="s14-menu-row__chev" />
            </button>
          </div>

          <div className="s14__gap-26" />
          <p className="s14__version">{me.version}</p>
        </div>
      </div>
      <Sheet open={joinOpen} title="동아리 만들기 · 참여하기" onClose={() => setJoinOpen(false)}>
        <p className="lui-menu__note">
          이미 있는 동아리에는 운영진이 알려 준 참여 코드로 들어갑니다. 새로 만들면 만든 사람이 첫
          운영진이 됩니다.
        </p>
        <Button block onClick={() => setJoinOpen(false)}>
          확인
        </Button>
      </Sheet>
      <DeleteAccount open={delOpen} onClose={() => setDelOpen(false)} />
      <TabBar active="my" />
    </Phone>
  )
}

export default S14Me
