import { useCallback, useEffect, useState } from 'react'
import { adminResetManageCode, adminSeedDemo, listClubs } from '../../services/clubsApi'
import { adminPlatformStats } from '../../services/clubEventsApi'
import { adminListConnections } from '../../services/clubConnectionsApi'
import type { Club, ClubConnection, PlatformStats } from '../../types/bandy'
import { categoryLabel } from '../../types/bandy'
import { formatRelativeTime } from '../../utils/bandyFormat'
import '../../pages/Admin.css'
import '../../pages/Bandy.css'

/**
 * BANDY 플랫폼 운영 — 동아리·행사·교류 현황과 파일럿 지표.
 *
 * 사업계획서의 검증 항목(교류 수락률, 예약 대비 방문율,
 * 교류로 유입된 신규 관객 비율, 거래액)을 그대로 지표로 둡니다.
 */
const BandyPlatformSection = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [connections, setConnections] = useState<ClubConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  /** 시드·재발급으로 새로 만든 운영진 코드 — 이 화면을 벗어나면 다시 볼 수 없습니다. */
  const [issuedCodes, setIssuedCodes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setIsLoading(true)
    const [statsResult, clubsResult, connectionsResult] = await Promise.all([
      adminPlatformStats(),
      listClubs(),
      adminListConnections(),
    ])
    setStats(statsResult)
    setClubs(clubsResult.clubs)
    setConnections(connectionsResult)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSeed = async (overwrite: boolean) => {
    const confirmText = overwrite
      ? '시드 데이터를 덮어씁니다. 기존 동아리·행사·교류 문서의 내용이 시드 값으로 교체되고 운영진 코드도 모두 새로 발급됩니다. 계속할까요?'
      : '파일럿 시드 데이터(동아리 8곳 · 행사 10건 · 교류 7건)를 생성합니다. 이미 있는 문서는 건드리지 않습니다. 계속할까요?'
    if (!window.confirm(confirmText)) return

    setError('')
    setNotice('')
    setIsBusy(true)
    const result = await adminSeedDemo(overwrite)
    setIsBusy(false)

    if (!result.ok) {
      setError(
        result.error === 'unauthorized'
          ? '관리자 토큰이 만료되었습니다. 다시 로그인해 주세요.'
          : '시드 생성에 실패했습니다.'
      )
      return
    }

    setNotice(
      `동아리 ${result.clubsWritten ?? 0}곳 · 행사 ${result.eventsWritten ?? 0}건 · 교류 ${
        result.connectionsWritten ?? 0
      }건을 생성했습니다.`
    )
    if (result.manageCodes) setIssuedCodes((prev) => ({ ...prev, ...result.manageCodes }))
    load()
  }

  const handleResetCode = async (club: Club) => {
    if (!window.confirm(`${club.name}의 운영진 코드를 새로 발급합니다. 기존 코드는 즉시 무효가 됩니다. 계속할까요?`))
      return

    setError('')
    setIsBusy(true)
    const result = await adminResetManageCode(club.id)
    setIsBusy(false)

    if (!result.ok || !result.manageCode) {
      setError('코드 재발급에 실패했습니다.')
      return
    }
    setIssuedCodes((prev) => ({ ...prev, [club.id]: result.manageCode as string }))
    setNotice(`${club.name}의 새 운영진 코드를 발급했습니다.`)
  }

  const pending = connections.filter((c) => c.status === 'pending')

  return (
    <div className="admin-section ui-card">
      <h2 className="admin-section-title">BANDY 플랫폼</h2>
      <p className="section-description">
        분야별 동아리·행사 탐색, 동아리 간 교류, 행사 예약, 현장 프로필 교환의 운영 현황입니다.
      </p>

      {notice && <div className="bandy-note bandy-note-success">{notice}</div>}
      {error && <div className="bandy-note bandy-note-error">{error}</div>}

      {isLoading ? (
        <div className="bandy-loading">불러오는 중…</div>
      ) : (
        <>
          {stats ? (
            <>
              <div className="bandy-stats">
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.clubs}</div>
                  <div className="bandy-stat-label">참여 동아리</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.events}</div>
                  <div className="bandy-stat-label">등록 행사</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.connectionsAccepted}</div>
                  <div className="bandy-stat-label">수락된 교류</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.connectionAcceptRate}%</div>
                  <div className="bandy-stat-label">교류 요청 수락률</div>
                </div>
              </div>

              <div className="bandy-stats" style={{ marginTop: '0.5rem' }}>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.headcount}</div>
                  <div className="bandy-stat-label">예약 인원</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.attendanceRate}%</div>
                  <div className="bandy-stat-label">예약 대비 방문율</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">{stats.viaConnectionRate}%</div>
                  <div className="bandy-stat-label">교류로 유입된 관객</div>
                </div>
                <div className="bandy-stat">
                  <div className="bandy-stat-value">
                    {stats.grossValue.toLocaleString('ko-KR')}
                  </div>
                  <div className="bandy-stat-label">예약 기준 거래액(원)</div>
                </div>
              </div>
            </>
          ) : (
            <div className="bandy-note bandy-note-info">
              지표를 불러올 수 없습니다. 서버 설정(FIREBASE_SERVICE_ACCOUNT)과 관리자 로그인을
              확인해 주세요.
            </div>
          )}

          <div className="admin-btn-row admin-btn-row--spaced" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="bandy-btn bandy-btn-primary bandy-btn-sm"
              onClick={() => handleSeed(false)}
              disabled={isBusy}
            >
              파일럿 시드 생성
            </button>
            <button
              type="button"
              className="bandy-btn bandy-btn-ghost bandy-btn-sm"
              onClick={() => handleSeed(true)}
              disabled={isBusy}
            >
              시드 덮어쓰기
            </button>
            <button
              type="button"
              className="bandy-btn bandy-btn-ghost bandy-btn-sm"
              onClick={load}
              disabled={isBusy}
            >
              새로고침
            </button>
          </div>

          {Object.keys(issuedCodes).length > 0 && (
            <div className="bandy-note bandy-note-info" style={{ marginTop: '1rem' }}>
              <strong>새로 발급된 운영진 코드</strong>
              <br />
              코드는 해시로만 저장되므로 이 화면을 벗어나면 다시 확인할 수 없습니다. 해당 동아리에
              전달해 주세요.
              <dl className="bandy-rows">
                {Object.entries(issuedCodes).map(([clubId, code]) => (
                  <div className="bandy-row" key={clubId}>
                    <dt>{clubs.find((c) => c.id === clubId)?.name || clubId}</dt>
                    <dd style={{ letterSpacing: '0.1em', fontWeight: 700 }}>{code}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="bandy-section">
            <div className="bandy-section-head">
              <h3>응답 대기 중인 교류</h3>
              <span className="bandy-section-count">{pending.length}건</span>
            </div>
            {pending.length === 0 ? (
              <div className="bandy-empty">대기 중인 교류 신청이 없습니다.</div>
            ) : (
              <dl className="bandy-rows">
                {pending.map((connection) => (
                  <div className="bandy-row" key={connection.id}>
                    <dt>{connection.createdAt ? formatRelativeTime(connection.createdAt) : ''}</dt>
                    <dd>
                      {connection.fromClubName} → {connection.toClubName}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="bandy-section">
            <div className="bandy-section-head">
              <h3>동아리</h3>
              <span className="bandy-section-count">{clubs.length}곳</span>
            </div>
            {clubs.length === 0 ? (
              <div className="bandy-empty">
                등록된 동아리가 없습니다. 위에서 파일럿 시드를 생성해 보세요.
              </div>
            ) : (
              <div className="bandy-list">
                {clubs.map((club) => (
                  <div key={club.id} className="bandy-card" style={{ cursor: 'default' }}>
                    <div className="bandy-card-top">
                      <div className="bandy-emblem">{club.emblem || club.name.slice(0, 1)}</div>
                      <div className="bandy-card-body">
                        <p className="bandy-card-title">{club.name}</p>
                        <p className="bandy-card-sub">
                          {club.university} · {categoryLabel(club.category)}
                        </p>
                      </div>
                    </div>
                    <div className="bandy-meta">
                      <span className="bandy-badge">교류 {club.connectionCount}곳</span>
                      <span className="bandy-badge">행사 {club.eventCount}건</span>
                      {club.isHostClub && <span className="bandy-badge accent">당일 허브 보유</span>}
                      {!club.openToExchange && (
                        <span className="bandy-badge muted">교류 중단</span>
                      )}
                    </div>
                    <div className="admin-btn-row" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="bandy-btn bandy-btn-ghost bandy-btn-sm"
                        onClick={() => handleResetCode(club)}
                        disabled={isBusy}
                      >
                        운영진 코드 재발급
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default BandyPlatformSection
