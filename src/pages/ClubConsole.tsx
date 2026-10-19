import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearClubSession,
  listClubs,
  loadClubSession,
  verifyClubCode,
} from '../services/clubsApi'
import {
  loadConnectionInbox,
  respondToConnection,
  withdrawConnection,
  connectionErrorMessage,
} from '../services/clubConnectionsApi'
import {
  deleteClubEvent,
  listClubEvents,
  listClubReservations,
  markReservationAttended,
  upsertClubEvent,
} from '../services/clubEventsApi'
import { CLUB_CATEGORIES } from '../types/bandy'
import type {
  Club,
  ClubConnection,
  ClubEvent,
  ClubSession,
  ConnectionSummary,
  EventReservation,
  ReservationSummary,
} from '../types/bandy'
import {
  formatCountdown,
  formatEventDate,
  formatEventDateTime,
  formatPrice,
  formatRelativeTime,
  toDateInputValue,
  toTimeInputValue,
  toTimestamp,
} from '../utils/bandyFormat'
import './Bandy.css'

type Tab = 'connections' | 'events' | 'reservations'

/**
 * 동아리 콘솔 — 운영진이 교류 신청에 응답하고, 행사를 올리고,
 * 예약·방문 현황을 확인하는 화면입니다.
 *
 * 로그인은 동아리별 운영진 코드로 합니다. (플랫폼 관리자 토큰으로도 접근 가능)
 */
const ClubConsole = () => {
  const [session, setSession] = useState<ClubSession | null>(() => loadClubSession())
  const [tab, setTab] = useState<Tab>('connections')

  if (!session) {
    return <ClubCodeGate onVerified={setSession} />
  }

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>{session.clubName} 콘솔</h2>
        <p>
          교류 신청에 응답하고 행사와 예약 현황을 관리합니다.{' '}
          <button
            type="button"
            className="bandy-btn bandy-btn-sm bandy-btn-ghost"
            onClick={() => {
              clearClubSession()
              setSession(null)
            }}
          >
            로그아웃
          </button>
        </p>
      </div>

      <div className="bandy-segment">
        <button
          type="button"
          className={tab === 'connections' ? 'active' : ''}
          onClick={() => setTab('connections')}
        >
          교류
        </button>
        <button
          type="button"
          className={tab === 'events' ? 'active' : ''}
          onClick={() => setTab('events')}
        >
          행사
        </button>
        <button
          type="button"
          className={tab === 'reservations' ? 'active' : ''}
          onClick={() => setTab('reservations')}
        >
          예약
        </button>
      </div>

      {tab === 'connections' && <ConnectionsTab session={session} />}
      {tab === 'events' && <EventsTab session={session} />}
      {tab === 'reservations' && <ReservationsTab session={session} />}
    </div>
  )
}

const ClubCodeGate = ({ onVerified }: { onVerified: (session: ClubSession) => void }) => {
  const [clubs, setClubs] = useState<Club[]>([])
  const [clubId, setClubId] = useState('')
  const [manageCode, setManageCode] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    listClubs().then((result) => setClubs(result.clubs))
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!clubId) {
      setError('동아리를 선택해 주세요.')
      return
    }
    if (!manageCode.trim()) {
      setError('운영진 코드를 입력해 주세요.')
      return
    }

    setIsBusy(true)
    const result = await verifyClubCode(clubId, manageCode.trim())
    setIsBusy(false)

    if (!result.ok) {
      setError(connectionErrorMessage(result.error))
      return
    }
    onVerified({ clubId, clubName: result.club.name, manageCode: manageCode.trim() })
  }

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>동아리 콘솔</h2>
        <p>운영진 코드로 로그인하면 교류 신청과 행사·예약을 관리할 수 있습니다.</p>
      </div>

      <div className="bandy-hero">
        {error && <div className="bandy-note bandy-note-error">{error}</div>}

        <div className="bandy-field">
          <label htmlFor="console-club">동아리</label>
          <select id="console-club" value={clubId} onChange={(e) => setClubId(e.target.value)}>
            <option value="">선택해 주세요</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.university})
              </option>
            ))}
          </select>
        </div>

        <div className="bandy-field">
          <label htmlFor="console-code">운영진 코드</label>
          <input
            id="console-code"
            type="text"
            value={manageCode}
            autoCapitalize="characters"
            placeholder="6자리 코드"
            onChange={(e) => setManageCode(e.target.value.toUpperCase())}
          />
          <p className="bandy-field-hint">
            코드는 동아리 등록 시 발급됩니다. 분실하면 BANDY 운영진에게 재발급을 요청하세요.
          </p>
        </div>

        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-primary"
            onClick={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? '확인 중…' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}

const statusBadge = (status: ClubConnection['status']) => {
  if (status === 'accepted') return <span className="bandy-badge good">수락</span>
  if (status === 'declined') return <span className="bandy-badge muted">거절</span>
  return <span className="bandy-badge warn">대기 중</span>
}

const ConnectionsTab = ({ session }: { session: ClubSession }) => {
  const navigate = useNavigate()
  const [received, setReceived] = useState<ClubConnection[]>([])
  const [sent, setSent] = useState<ClubConnection[]>([])
  const [summary, setSummary] = useState<ConnectionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    const inbox = await loadConnectionInbox(session)
    setReceived(inbox.received)
    setSent(inbox.sent)
    setSummary(inbox.summary)
    setIsLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  const handleRespond = async (connection: ClubConnection, decision: 'accept' | 'decline') => {
    setError('')
    setBusyId(connection.id)
    const result = await respondToConnection(session, connection.id, decision)
    setBusyId('')
    if (!result.ok) {
      setError(connectionErrorMessage(result.error))
      return
    }
    load()
  }

  const handleWithdraw = async (connection: ClubConnection) => {
    setBusyId(connection.id)
    await withdrawConnection(session, connection.id)
    setBusyId('')
    load()
  }

  if (isLoading) return <div className="bandy-loading">불러오는 중…</div>

  return (
    <>
      {error && <div className="bandy-note bandy-note-error">{error}</div>}

      {summary && (
        <div className="bandy-stats">
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.receivedPending}</div>
            <div className="bandy-stat-label">응답 대기</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.receivedAccepted + summary.sentAccepted}</div>
            <div className="bandy-stat-label">교류 중인 동아리</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.acceptRate}%</div>
            <div className="bandy-stat-label">받은 신청 수락률</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.sentTotal}</div>
            <div className="bandy-stat-label">보낸 신청</div>
          </div>
        </div>
      )}

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>받은 교류 신청</h3>
          <span className="bandy-section-count">{received.length}건</span>
        </div>
        {received.length === 0 ? (
          <div className="bandy-empty">아직 받은 교류 신청이 없습니다.</div>
        ) : (
          <div className="bandy-list">
            {received.map((connection) => (
              <div key={connection.id} className="bandy-card" style={{ cursor: 'default' }}>
                <div className="bandy-card-top">
                  <div className="bandy-emblem">🤝</div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">{connection.fromClubName}</p>
                    <p className="bandy-card-sub">
                      {connection.requesterName}
                      {connection.createdAt ? ` · ${formatRelativeTime(connection.createdAt)}` : ''}
                    </p>
                  </div>
                </div>

                <p className="bandy-card-note" style={{ WebkitLineClamp: 6 }}>
                  {connection.message}
                </p>

                <div className="bandy-meta">
                  {statusBadge(connection.status)}
                  {connection.requesterContact && (
                    <span className="bandy-badge muted">@{connection.requesterContact}</span>
                  )}
                </div>

                <div className="bandy-actions">
                  {connection.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="bandy-btn bandy-btn-primary"
                        onClick={() => handleRespond(connection, 'accept')}
                        disabled={busyId === connection.id}
                      >
                        수락
                      </button>
                      <button
                        type="button"
                        className="bandy-btn bandy-btn-danger"
                        onClick={() => handleRespond(connection, 'decline')}
                        disabled={busyId === connection.id}
                      >
                        거절
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="bandy-btn bandy-btn-ghost"
                      onClick={() => navigate(`/clubs/${connection.fromClubId}`)}
                    >
                      {connection.fromClubName} 프로필 보기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>보낸 교류 신청</h3>
          <span className="bandy-section-count">{sent.length}건</span>
        </div>
        {sent.length === 0 ? (
          <div className="bandy-empty">
            아직 보낸 신청이 없습니다.
            <br />
            탐색에서 관심 있는 동아리에 교류를 신청해 보세요.
          </div>
        ) : (
          <div className="bandy-list">
            {sent.map((connection) => (
              <div key={connection.id} className="bandy-card" style={{ cursor: 'default' }}>
                <div className="bandy-card-top">
                  <div className="bandy-emblem">📨</div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">{connection.toClubName}</p>
                    <p className="bandy-card-sub">
                      {connection.createdAt ? formatRelativeTime(connection.createdAt) : ''}
                    </p>
                  </div>
                </div>

                <div className="bandy-meta">{statusBadge(connection.status)}</div>

                <div className="bandy-actions">
                  <button
                    type="button"
                    className="bandy-btn bandy-btn-ghost"
                    onClick={() => navigate(`/clubs/${connection.toClubId}`)}
                  >
                    프로필 보기
                  </button>
                  {connection.status === 'pending' && (
                    <button
                      type="button"
                      className="bandy-btn bandy-btn-danger"
                      onClick={() => handleWithdraw(connection)}
                      disabled={busyId === connection.id}
                    >
                      신청 철회
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const EventsTab = ({ session }: { session: ClubSession }) => {
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<ClubEvent | 'new' | null>(null)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    const list = await listClubEvents({ clubId: session.clubId, includePast: true })
    setEvents(list)
    setIsLoading(false)
  }, [session.clubId])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (event: ClubEvent) => {
    setBusyId(event.id)
    await deleteClubEvent(session, event.id)
    setBusyId('')
    load()
  }

  if (isLoading) return <div className="bandy-loading">불러오는 중…</div>

  return (
    <>
      <div className="bandy-actions">
        <button
          type="button"
          className="bandy-btn bandy-btn-primary"
          onClick={() => setEditing('new')}
        >
          행사 등록
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bandy-empty">
          아직 등록한 행사가 없습니다.
          <br />첫 행사를 올리면 다른 동아리 구성원이 탐색에서 발견할 수 있습니다.
        </div>
      ) : (
        <div className="bandy-list">
          {events.map((event) => (
            <div key={event.id} className="bandy-card" style={{ cursor: 'default' }}>
              <div className="bandy-card-top">
                <div className="bandy-emblem">{event.poster || '🎫'}</div>
                <div className="bandy-card-body">
                  <p className="bandy-card-title">{event.title}</p>
                  <p className="bandy-card-sub">
                    {formatEventDate(event.startsAt)} · {event.venueName}
                  </p>
                </div>
              </div>

              <div className="bandy-meta">
                {formatCountdown(event.startsAt) && (
                  <span className="bandy-badge accent">{formatCountdown(event.startsAt)}</span>
                )}
                <span className="bandy-badge">{formatPrice(event.price)}</span>
                <span className="bandy-badge muted">
                  예약 {event.reservedCount}
                  {event.capacity > 0 ? ` / ${event.capacity}` : ''}
                </span>
                {event.status === 'closed' && <span className="bandy-badge warn">마감</span>}
              </div>

              <div className="bandy-actions">
                <button
                  type="button"
                  className="bandy-btn bandy-btn-ghost"
                  onClick={() => setEditing(event)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="bandy-btn bandy-btn-danger"
                  onClick={() => handleDelete(event)}
                  disabled={busyId === event.id}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EventEditorModal
          session={session}
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

const EventEditorModal = ({
  session,
  event,
  onClose,
  onSaved,
}: {
  session: ClubSession
  event: ClubEvent | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [title, setTitle] = useState(event?.title || '')
  const [category, setCategory] = useState(event?.category || 'band')
  const [date, setDate] = useState(toDateInputValue(event?.startsAt))
  const [time, setTime] = useState(toTimeInputValue(event?.startsAt) || '19:00')
  const [doorsAt, setDoorsAt] = useState(event?.doorsAt || '')
  const [venueName, setVenueName] = useState(event?.venueName || '')
  const [venueAddress, setVenueAddress] = useState(event?.venueAddress || '')
  const [price, setPrice] = useState(String(event?.price ?? 0))
  const [capacity, setCapacity] = useState(String(event?.capacity ?? 0))
  const [poster, setPoster] = useState(event?.poster || '')
  const [description, setDescription] = useState(event?.description || '')
  const [tagsText, setTagsText] = useState((event?.tags || []).join(', '))
  const [hubPath, setHubPath] = useState(event?.hubPath || '')
  const [status, setStatus] = useState<'upcoming' | 'closed'>(event?.status || 'upcoming')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const handleSave = async () => {
    setError('')
    if (!title.trim()) {
      setError('행사명을 입력해 주세요.')
      return
    }
    const startsAt = toTimestamp(date, time)
    if (!startsAt) {
      setError('행사 일시를 정확히 입력해 주세요.')
      return
    }

    setIsBusy(true)
    const result = await upsertClubEvent(session, {
      eventId: event?.id,
      title: title.trim(),
      category,
      startsAt,
      doorsAt: doorsAt.trim(),
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      price: Number(price) || 0,
      capacity: Number(capacity) || 0,
      poster: poster.trim(),
      description: description.trim(),
      tags: tagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      hubPath: hubPath.trim(),
      status,
    })
    setIsBusy(false)

    if (!result.ok) {
      setError(
        result.error === 'invalid_starts_at'
          ? '행사 일시를 정확히 입력해 주세요.'
          : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      )
      return
    }
    onSaved()
  }

  return (
    <div className="bandy-modal-backdrop" onClick={onClose}>
      <div className="bandy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{event ? '행사 수정' : '행사 등록'}</h3>
        <p className="bandy-modal-sub">
          등록한 행사는 탐색에서 다른 대학 동아리 구성원에게 노출됩니다.
        </p>

        {error && <div className="bandy-note bandy-note-error">{error}</div>}

        <div className="bandy-field">
          <label htmlFor="event-title">행사명</label>
          <input
            id="event-title"
            type="text"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="event-category">분야</label>
          <select
            id="event-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ClubEvent['category'])}
          >
            {CLUB_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bandy-field-row">
          <div className="bandy-field">
            <label htmlFor="event-date">날짜</label>
            <input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="bandy-field">
            <label htmlFor="event-time">시작 시각</label>
            <input
              id="event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="bandy-field">
          <label htmlFor="event-doors">입장 시각 (표시용)</label>
          <input
            id="event-doors"
            type="text"
            value={doorsAt}
            placeholder="예: 18:30"
            maxLength={10}
            onChange={(e) => setDoorsAt(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="event-venue">장소</label>
          <input
            id="event-venue"
            type="text"
            value={venueName}
            maxLength={80}
            onChange={(e) => setVenueName(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="event-address">주소</label>
          <input
            id="event-address"
            type="text"
            value={venueAddress}
            maxLength={160}
            onChange={(e) => setVenueAddress(e.target.value)}
          />
        </div>

        <div className="bandy-field-row">
          <div className="bandy-field">
            <label htmlFor="event-price">가격 (원)</label>
            <input
              id="event-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="bandy-field">
            <label htmlFor="event-capacity">정원</label>
            <input
              id="event-capacity"
              type="number"
              inputMode="numeric"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
        </div>

        <p className="bandy-field-hint" style={{ marginTop: '-0.5rem', marginBottom: '0.875rem' }}>
          가격 0원은 무료, 정원 0은 제한 없음으로 표시됩니다.
        </p>

        <div className="bandy-field">
          <label htmlFor="event-poster">대표 이모지</label>
          <input
            id="event-poster"
            type="text"
            value={poster}
            placeholder="🎸"
            maxLength={4}
            onChange={(e) => setPoster(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="event-description">행사 소개</label>
          <textarea
            id="event-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="event-tags">태그</label>
          <input
            id="event-tags"
            type="text"
            value={tagsText}
            placeholder="정기공연, 합동무대"
            onChange={(e) => setTagsText(e.target.value)}
          />
          <p className="bandy-field-hint">쉼표로 구분해 최대 6개까지 적을 수 있습니다.</p>
        </div>

        <div className="bandy-field">
          <label htmlFor="event-hub">당일 허브 경로 (선택)</label>
          <input
            id="event-hub"
            type="text"
            value={hubPath}
            placeholder="/dashboard"
            maxLength={120}
            onChange={(e) => setHubPath(e.target.value)}
          />
          <p className="bandy-field-hint">
            티켓·셋리스트·채팅·방명록을 운영하는 당일 허브가 있으면 경로를 적어 주세요. 행사
            상세에서 바로 이어집니다.
          </p>
        </div>

        <div className="bandy-field">
          <label htmlFor="event-status">예약 상태</label>
          <select
            id="event-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'upcoming' | 'closed')}
          >
            <option value="upcoming">예약 받는 중</option>
            <option value="closed">예약 마감</option>
          </select>
        </div>

        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-primary"
            onClick={handleSave}
            disabled={isBusy}
          >
            {isBusy ? '저장 중…' : '저장'}
          </button>
          <button type="button" className="bandy-btn bandy-btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

const ReservationsTab = ({ session }: { session: ClubSession }) => {
  const [reservations, setReservations] = useState<EventReservation[]>([])
  const [summary, setSummary] = useState<ReservationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    const result = await listClubReservations(session)
    setReservations(result.reservations)
    setSummary(result.summary)
    setIsLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  const handleToggleAttended = async (reservation: EventReservation) => {
    setBusyId(reservation.id)
    const updated = await markReservationAttended(
      session,
      reservation.id,
      reservation.status !== 'attended'
    )
    setBusyId('')
    if (updated) load()
  }

  if (isLoading) return <div className="bandy-loading">불러오는 중…</div>

  const active = reservations.filter((r) => r.status !== 'cancelled')

  return (
    <>
      {summary && (
        <div className="bandy-stats">
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.headcount}</div>
            <div className="bandy-stat-label">예약 인원</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.attendanceRate}%</div>
            <div className="bandy-stat-label">예약 대비 방문율</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.viaConnection}</div>
            <div className="bandy-stat-label">교류로 유입된 관객</div>
          </div>
          <div className="bandy-stat">
            <div className="bandy-stat-value">{summary.viaConnectionRate}%</div>
            <div className="bandy-stat-label">신규 관객 비율</div>
          </div>
        </div>
      )}

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>예약자</h3>
          <span className="bandy-section-count">{active.length}건</span>
        </div>

        {active.length === 0 ? (
          <div className="bandy-empty">아직 예약이 없습니다.</div>
        ) : (
          <div className="bandy-list">
            {active.map((reservation) => (
              <div key={reservation.id} className="bandy-card" style={{ cursor: 'default' }}>
                <div className="bandy-card-top">
                  <div className="bandy-emblem">
                    {reservation.status === 'attended' ? '✓' : '🎫'}
                  </div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">
                      {reservation.name} · {reservation.headcount}명
                    </p>
                    <p className="bandy-card-sub">
                      {reservation.eventTitle}
                      <br />
                      {reservation.phone} · {formatEventDateTime(reservation.startsAt)}
                    </p>
                  </div>
                </div>

                <div className="bandy-meta">
                  {reservation.status === 'attended' ? (
                    <span className="bandy-badge good">방문 확인</span>
                  ) : (
                    <span className="bandy-badge muted">미방문</span>
                  )}
                  {reservation.viaConnection && (
                    <span className="bandy-badge accent">교류 유입</span>
                  )}
                  {reservation.createdAt && (
                    <span className="bandy-badge muted">
                      {formatRelativeTime(reservation.createdAt)} 예약
                    </span>
                  )}
                </div>

                <div className="bandy-actions">
                  <button
                    type="button"
                    className={`bandy-btn ${
                      reservation.status === 'attended' ? 'bandy-btn-ghost' : 'bandy-btn-primary'
                    }`}
                    onClick={() => handleToggleAttended(reservation)}
                    disabled={busyId === reservation.id}
                  >
                    {reservation.status === 'attended' ? '방문 확인 취소' : '방문 확인'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bandy-note bandy-note-info">
        방문 확인은 현장 입장 시 눌러 주세요. 예약 대비 방문율과 교류로 유입된 관객 비율이 함께
        집계됩니다.
      </div>
    </>
  )
}

export default ClubConsole
