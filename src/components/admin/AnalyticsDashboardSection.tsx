import { useCallback, useEffect, useState } from 'react'
import {
  fetchAnalyticsEvents,
  summarizeAnalytics,
  type AnalyticsDateRange,
  type AnalyticsSummary,
} from '../../utils/analyticsDashboard'
import '../../pages/Admin.css'
import './AnalyticsDashboardSection.css'

const RANGE_OPTIONS: Array<{ value: AnalyticsDateRange; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
]

const FAIL_REASON_LABELS: Record<string, string> = {
  not_found: '게스트 없음',
  phone_mismatch: '전화번호 불일치',
  deleted: '삭제된 게스트',
  empty_guests: '게스트 목록 비어있음',
  unknown: '기타',
}

const BOOKING_SOURCE_LABELS: Record<string, string> = {
  web_login: '웹 로그인',
  onsite: '현장 예매',
  admin_approve: '관리자 승인',
  excel_import: '엑셀 업로드',
  unknown: '기타',
}

function formatDuration(sec: number | null): string {
  if (sec === null) return '-'
  if (sec < 60) return `${sec}초`
  const min = Math.floor(sec / 60)
  const rest = sec % 60
  return rest > 0 ? `${min}분 ${rest}초` : `${min}분`
}

function FunnelChart({ steps }: { steps: AnalyticsSummary['loginFunnel'] }) {
  const max = Math.max(...steps.map((s) => s.count), 1)
  return (
    <div className="analytics-funnel">
      {steps.map((step) => (
        <div key={step.label} className="analytics-funnel-row">
          <div className="analytics-funnel-label">
            <span>{step.label}</span>
            <span className="analytics-funnel-count">
              {step.count.toLocaleString()}
              {step.rate !== undefined && step.rate < 100 ? ` (${step.rate}%)` : ''}
            </span>
          </div>
          <div className="analytics-funnel-bar-track">
            <div
              className="analytics-funnel-bar-fill"
              style={{ width: `${Math.max((step.count / max) * 100, step.count > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function CountTable({
  title,
  rows,
  emptyText,
  labelMap,
}: {
  title: string
  rows: Array<{ label: string; count: number }>
  emptyText: string
  labelMap?: Record<string, string>
}) {
  return (
    <div className="analytics-panel">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="analytics-empty">{emptyText}</p>
      ) : (
        <div className="guest-list-table analytics-table">
          <table>
            <thead>
              <tr>
                <th>항목</th>
                <th>건수</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{labelMap?.[row.label] || row.label}</td>
                  <td>{row.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const AnalyticsDashboardSection = () => {
  const [range, setRange] = useState<AnalyticsDateRange>('7d')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { events, truncated } = await fetchAnalyticsEvents()
      setSummary(summarizeAnalytics(events, range, truncated))
    } catch (err) {
      console.error('[AnalyticsDashboard] load failed', err)
      setError('분석 데이터를 불러오지 못했습니다. Firestore 규칙 배포 여부를 확인해주세요.')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="admin-section analytics-dashboard">
      <div className="section-header">
        <div>
          <h2>데이터 분석 대시보드</h2>
          <p className="section-description">
            수집 중인 이용 데이터를 요약해서 보여줍니다. 최근 {summary?.fetchedEvents.toLocaleString() ?? '-'}건 기준
            {summary?.truncated ? ' (상한 도달 — 더 오래된 이벤트는 제외됨)' : ''}.
          </p>
        </div>
        <div className="analytics-toolbar">
          <div className="analytics-range-tabs">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`analytics-range-tab ${range === option.value ? 'active' : ''}`}
                onClick={() => setRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="config-button" onClick={() => void load()} disabled={loading}>
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </div>

      {error && <div className="status-message error">{error}</div>}

      {loading && !summary ? (
        <p className="analytics-loading">데이터를 불러오는 중입니다…</p>
      ) : summary ? (
        <>
          <div className="stats-container">
            <div className="stats-item">
              <div className="stats-label">총 이벤트</div>
              <div className="stats-value">{summary.totalEvents.toLocaleString()}</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">고유 방문자</div>
              <div className="stats-value">{summary.uniqueClients.toLocaleString()}</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">세션 수</div>
              <div className="stats-value">{summary.uniqueSessions.toLocaleString()}</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">평균 세션 시간</div>
              <div className="stats-value">{formatDuration(summary.avgSessionSec)}</div>
            </div>
            <div className="stats-item">
              <div className="stats-label">공연일 이벤트</div>
              <div className="stats-value">{summary.eventDayEvents.toLocaleString()}</div>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-panel">
              <h3>로그인 퍼널</h3>
              <FunnelChart steps={summary.loginFunnel} />
            </div>
            <div className="analytics-panel">
              <h3>예매 퍼널</h3>
              <FunnelChart steps={summary.bookingFunnel} />
            </div>
            <div className="analytics-panel">
              <h3>주류 구매 퍼널</h3>
              <FunnelChart steps={summary.drinkFunnel} />
            </div>
            <div className="analytics-panel">
              <h3>참여 지표</h3>
              <div className="analytics-kv-list">
                <div><span>공연 정보 조회</span><strong>{summary.engagement.performances}</strong></div>
                <div><span>곡 상세 열람</span><strong>{summary.engagement.songOpens}</strong></div>
                <div><span>곡 응원 댓글</span><strong>{summary.engagement.comments}</strong></div>
                <div><span>게임 시작</span><strong>{summary.engagement.games}</strong></div>
                <div><span>채팅 페이지</span><strong>{summary.chatStats.pageViews}</strong></div>
                <div><span>채팅 차단 화면</span><strong>{summary.chatStats.blocked}</strong></div>
                <div><span>채팅 메시지</span><strong>{summary.chatStats.messages}</strong></div>
              </div>
            </div>
          </div>

          <div className="analytics-grid analytics-grid--wide">
            <CountTable title="인기 페이지" rows={summary.pageViews} emptyText="페이지 조회 데이터가 없습니다." />
            <CountTable title="이벤트 TOP" rows={summary.eventCounts} emptyText="이벤트 데이터가 없습니다." />
            <CountTable title="기기 비율" rows={summary.deviceSplit} emptyText="기기 데이터가 없습니다." />
            <CountTable
              title="예매 경로"
              rows={summary.bookingsBySource}
              emptyText="예매 완료 데이터가 없습니다."
              labelMap={BOOKING_SOURCE_LABELS}
            />
            <CountTable
              title="로그인 실패 사유"
              rows={summary.loginFailReasons}
              emptyText="로그인 실패 데이터가 없습니다."
              labelMap={FAIL_REASON_LABELS}
            />
            <CountTable title="인기 곡" rows={summary.topSongs} emptyText="곡 상세 조회 데이터가 없습니다." />
            <CountTable title="CTA 클릭" rows={summary.topCtas} emptyText="CTA 클릭 데이터가 없습니다." />
            <CountTable title="UTM 소스" rows={summary.utmSources} emptyText="UTM 데이터가 없습니다." />
            <CountTable
              title="퍼널 이탈"
              rows={summary.abandonedFunnels}
              emptyText="이탈 데이터가 없습니다."
            />
          </div>

          <div className="analytics-panel analytics-panel--full">
            <h3>배너 성과</h3>
            {summary.bannerStats.length === 0 ? (
              <p className="analytics-empty">배너 노출 데이터가 없습니다.</p>
            ) : (
              <div className="guest-list-table analytics-table">
                <table>
                  <thead>
                    <tr>
                      <th>배너 ID</th>
                      <th>노출</th>
                      <th>클릭</th>
                      <th>CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bannerStats.map((row) => (
                      <tr key={row.bannerId}>
                        <td>{row.bannerId}</td>
                        <td>{row.impressions.toLocaleString()}</td>
                        <td>{row.clicks.toLocaleString()}</td>
                        <td>{row.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AnalyticsDashboardSection
