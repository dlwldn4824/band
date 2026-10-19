import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getClub,
  listClubs,
  loadClubSession,
  verifyClubCode,
  clearClubSession,
} from '../services/clubsApi'
import { requestConnection, connectionErrorMessage } from '../services/clubConnectionsApi'
import { categoryLabel } from '../types/bandy'
import type { Club, ClubEvent, ClubSession } from '../types/bandy'
import { formatCountdown, formatEventDate, formatPrice, formatSeats } from '../utils/bandyFormat'
import './Bandy.css'

/**
 * 동아리 프로필 — 소개와 행사, 그리고 이미 수락된 교류 동아리를 함께 보여줍니다.
 * 교류 신청은 신청하는 쪽 동아리의 운영진 코드로 본인 확인을 거칩니다.
 */
const ClubProfile = () => {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()

  const [club, setClub] = useState<Club | null>(null)
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [connectedClubs, setConnectedClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [showRequest, setShowRequest] = useState(false)
  const [session, setSession] = useState<ClubSession | null>(() => loadClubSession())

  const load = useCallback(async () => {
    setIsLoading(true)
    const detail = await getClub(clubId)
    if (!detail) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setClub(detail.club)
    setEvents(detail.events)
    setConnectedClubs(detail.connectedClubs)
    setNotFound(false)
    setIsLoading(false)
  }, [clubId])

  useEffect(() => {
    load()
  }, [load])

  if (isLoading) {
    return (
      <div className="bandy">
        <div className="bandy-loading">불러오는 중…</div>
      </div>
    )
  }

  if (notFound || !club) {
    return (
      <div className="bandy">
        <button type="button" className="bandy-back" onClick={() => navigate('/explore')}>
          ← 탐색으로
        </button>
        <div className="bandy-empty">동아리를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const upcoming = events.filter((e) => e.status === 'upcoming')
  const isOwnClub = session?.clubId === club.id

  return (
    <div className="bandy">
      <button type="button" className="bandy-back" onClick={() => navigate('/explore')}>
        ← 탐색으로
      </button>

      <div className="bandy-hero">
        <div className="bandy-hero-top">
          <div
            className="bandy-emblem"
            style={club.accent ? { borderColor: club.accent } : undefined}
          >
            {club.emblem || club.name.slice(0, 1)}
          </div>
          <div>
            <h2>{club.name}</h2>
            <p className="bandy-hero-sub">
              {club.university} · {categoryLabel(club.category)}
            </p>
          </div>
        </div>

        {club.tagline && <p className="bandy-hero-intro">{club.tagline}</p>}

        <div className="bandy-meta">
          {club.connectionCount > 0 && (
            <span className="bandy-badge accent">교류 {club.connectionCount}곳</span>
          )}
          {club.memberCount ? <span className="bandy-badge">{club.memberCount}명</span> : null}
          {club.foundedYear ? (
            <span className="bandy-badge muted">{club.foundedYear}년 개설</span>
          ) : null}
          {club.tags.map((tag) => (
            <span key={tag} className="bandy-badge muted">
              #{tag}
            </span>
          ))}
        </div>

        <div className="bandy-actions">
          {isOwnClub ? (
            <button
              type="button"
              className="bandy-btn bandy-btn-ghost"
              onClick={() => navigate('/club-console')}
            >
              내 동아리입니다 · 콘솔로 이동
            </button>
          ) : club.openToExchange ? (
            <button
              type="button"
              className="bandy-btn bandy-btn-primary"
              onClick={() => setShowRequest(true)}
            >
              교류 신청하기
            </button>
          ) : (
            <button type="button" className="bandy-btn bandy-btn-ghost" disabled>
              현재 교류 신청을 받지 않습니다
            </button>
          )}
        </div>
      </div>

      {club.intro && (
        <div className="bandy-section">
          <div className="bandy-section-head">
            <h3>소개</h3>
          </div>
          <div className="bandy-hero">
            <p className="bandy-hero-intro">{club.intro}</p>
          </div>
        </div>
      )}

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>다가오는 행사</h3>
          <span className="bandy-section-count">{upcoming.length}건</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="bandy-empty">아직 등록된 행사가 없습니다.</div>
        ) : (
          <div className="bandy-list">
            {upcoming.map((event) => (
              <button
                key={event.id}
                type="button"
                className="bandy-card"
                onClick={() =>
                  // 어느 동아리를 거쳐 들어온 예약인지 서버가 알 수 있도록 출처를 넘깁니다.
                  navigate(
                    `/shows/${event.id}${session ? `?from=${encodeURIComponent(session.clubId)}` : ''}`
                  )
                }
              >
                <div className="bandy-card-top">
                  <div
                    className="bandy-emblem"
                    style={event.accent ? { borderColor: event.accent } : undefined}
                  >
                    {event.poster || '🎫'}
                  </div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">{event.title}</p>
                    <p className="bandy-card-sub">
                      {formatEventDate(event.startsAt)}
                      {event.doorsAt ? ` ${event.doorsAt}` : ''} · {event.venueName}
                    </p>
                  </div>
                </div>
                <div className="bandy-meta">
                  {formatCountdown(event.startsAt) && (
                    <span className="bandy-badge accent">{formatCountdown(event.startsAt)}</span>
                  )}
                  <span className="bandy-badge">{formatPrice(event.price)}</span>
                  <span className="bandy-badge muted">
                    {formatSeats(event.seatsLeft, event.capacity)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>교류 중인 동아리</h3>
          <span className="bandy-section-count">{connectedClubs.length}곳</span>
        </div>
        {connectedClubs.length === 0 ? (
          <div className="bandy-empty">
            아직 교류 중인 동아리가 없습니다.
            <br />첫 교류를 신청해 보세요.
          </div>
        ) : (
          <div className="bandy-list">
            {connectedClubs.map((partner) => (
              <button
                key={partner.id}
                type="button"
                className="bandy-card"
                onClick={() => navigate(`/clubs/${partner.id}`)}
              >
                <div className="bandy-card-top">
                  <div
                    className="bandy-emblem"
                    style={partner.accent ? { borderColor: partner.accent } : undefined}
                  >
                    {partner.emblem || partner.name.slice(0, 1)}
                  </div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">{partner.name}</p>
                    <p className="bandy-card-sub">
                      {partner.university} · {categoryLabel(partner.category)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showRequest && (
        <ConnectionRequestModal
          targetClub={club}
          session={session}
          onSessionChange={setSession}
          onClose={() => setShowRequest(false)}
          onSent={() => {
            setShowRequest(false)
            load()
          }}
        />
      )}
    </div>
  )
}

/** 교류 신청 — 운영진 코드로 신청 주체를 확인한 뒤 메시지를 보냅니다. */
const ConnectionRequestModal = ({
  targetClub,
  session,
  onSessionChange,
  onClose,
  onSent,
}: {
  targetClub: Club
  session: ClubSession | null
  onSessionChange: (session: ClubSession | null) => void
  onClose: () => void
  onSent: () => void
}) => {
  const [myClubs, setMyClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [manageCode, setManageCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (session) return
    listClubs().then((result) => {
      setMyClubs(result.clubs.filter((c) => c.id !== targetClub.id))
    })
  }, [session, targetClub.id])

  const handleVerify = async () => {
    setError('')
    if (!selectedClubId) {
      setError('신청하는 동아리를 선택해 주세요.')
      return
    }
    if (!manageCode.trim()) {
      setError('운영진 코드를 입력해 주세요.')
      return
    }

    setIsBusy(true)
    const result = await verifyClubCode(selectedClubId, manageCode.trim())
    setIsBusy(false)

    if (!result.ok) {
      setError(connectionErrorMessage(result.error))
      return
    }
    onSessionChange({
      clubId: selectedClubId,
      clubName: result.club.name,
      manageCode: manageCode.trim(),
    })
  }

  const handleSend = async () => {
    if (!session) return
    setError('')
    if (message.trim().length < 10) {
      setError('소개 메시지를 10자 이상 적어 주세요.')
      return
    }

    setIsBusy(true)
    const result = await requestConnection(session, {
      toClubId: targetClub.id,
      message: message.trim(),
    })
    setIsBusy(false)

    if (!result.ok) {
      setError(connectionErrorMessage(result.error))
      return
    }
    setSuccess(`${targetClub.name}에 교류 신청을 보냈습니다. 상대 동아리가 수락하면 알 수 있습니다.`)
    setTimeout(onSent, 1600)
  }

  return (
    <div className="bandy-modal-backdrop" onClick={onClose}>
      <div className="bandy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{targetClub.name}에 교류 신청</h3>
        <p className="bandy-modal-sub">
          교류가 수락되면 서로의 프로필에 연결이 표시되고, 상대 동아리 구성원이 우리 행사를
          추천받게 됩니다.
        </p>

        {error && <div className="bandy-note bandy-note-error">{error}</div>}
        {success && <div className="bandy-note bandy-note-success">{success}</div>}

        {!session ? (
          <>
            <div className="bandy-note bandy-note-info">
              교류는 동아리 사이의 연결이라 신청하는 동아리의 운영진 코드가 필요합니다.
            </div>
            <div className="bandy-field">
              <label htmlFor="request-club">신청하는 동아리</label>
              <select
                id="request-club"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
              >
                <option value="">선택해 주세요</option>
                {myClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.university})
                  </option>
                ))}
              </select>
            </div>
            <div className="bandy-field">
              <label htmlFor="request-code">운영진 코드</label>
              <input
                id="request-code"
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
                onClick={handleVerify}
                disabled={isBusy}
              >
                {isBusy ? '확인 중…' : '다음'}
              </button>
              <button type="button" className="bandy-btn bandy-btn-ghost" onClick={onClose}>
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bandy-note bandy-note-info">
              <strong>{session.clubName}</strong> 이름으로 신청합니다.{' '}
              <button
                type="button"
                className="bandy-btn bandy-btn-sm bandy-btn-ghost"
                onClick={() => {
                  clearClubSession()
                  onSessionChange(null)
                }}
              >
                동아리 변경
              </button>
            </div>
            <div className="bandy-field">
              <label htmlFor="request-message">소개 메시지</label>
              <textarea
                id="request-message"
                value={message}
                placeholder={`안녕하세요, ${session.clubName}입니다. 어떤 활동을 함께 하고 싶은지 적어 주세요.`}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={600}
              />
              <p className="bandy-field-hint">{message.length}/600자</p>
            </div>
            <div className="bandy-actions">
              <button
                type="button"
                className="bandy-btn bandy-btn-primary"
                onClick={handleSend}
                disabled={isBusy || Boolean(success)}
              >
                {isBusy ? '보내는 중…' : '교류 신청 보내기'}
              </button>
              <button type="button" className="bandy-btn bandy-btn-ghost" onClick={onClose}>
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ClubProfile
