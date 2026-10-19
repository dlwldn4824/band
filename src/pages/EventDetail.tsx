import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getClubEvent, reserveClubEvent } from '../services/clubEventsApi'
import { categoryLabel } from '../types/bandy'
import type { ClubEvent, EventReservation } from '../types/bandy'
import {
  formatCountdown,
  formatEventDateTime,
  formatPrice,
  formatSeats,
} from '../utils/bandyFormat'
import { validatePhoneNumber } from '../utils/phoneFormat'
import { loadBandyIdentity, saveBandyIdentity } from '../utils/bandyIdentity'
import './Bandy.css'

/**
 * 행사 상세 · 예약.
 *
 * `?from=<clubId>` 로 들어오면 어느 동아리를 거쳐 발견한 행사인지 함께 저장해,
 * "교류를 통해 유입된 관객"을 구분할 수 있게 합니다.
 */
const EventDetail = () => {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sourceClubId = searchParams.get('from') || ''

  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [club, setClub] = useState<{ id: string; name: string; emblem: string; accent: string } | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [reservation, setReservation] = useState<EventReservation | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const detail = await getClubEvent(eventId)
    if (!detail) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setEvent(detail.event)
    setClub(
      detail.club
        ? {
            id: detail.club.id,
            name: detail.club.name,
            emblem: detail.club.emblem,
            accent: detail.club.accent,
          }
        : null
    )
    setIsLoading(false)
  }, [eventId])

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

  if (notFound || !event) {
    return (
      <div className="bandy">
        <button type="button" className="bandy-back" onClick={() => navigate('/explore?mode=events')}>
          ← 탐색으로
        </button>
        <div className="bandy-empty">행사를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const soldOut = event.seatsLeft !== null && event.seatsLeft <= 0
  const closed = event.status === 'closed'

  return (
    <div className="bandy">
      <button type="button" className="bandy-back" onClick={() => navigate('/explore?mode=events')}>
        ← 탐색으로
      </button>

      <div className="bandy-hero">
        <div className="bandy-hero-top">
          <div
            className="bandy-emblem"
            style={event.accent ? { borderColor: event.accent } : undefined}
          >
            {event.poster || '🎫'}
          </div>
          <div>
            <h2>{event.title}</h2>
            <p className="bandy-hero-sub">
              {event.clubName} · {event.university}
            </p>
          </div>
        </div>

        <div className="bandy-meta">
          {formatCountdown(event.startsAt) && (
            <span className="bandy-badge accent">{formatCountdown(event.startsAt)}</span>
          )}
          <span className="bandy-badge">{categoryLabel(event.category)}</span>
          <span className={`bandy-badge ${soldOut ? 'warn' : 'muted'}`}>
            {formatSeats(event.seatsLeft, event.capacity)}
          </span>
          {sourceClubId && <span className="bandy-badge good">교류로 발견한 행사</span>}
        </div>

        <dl className="bandy-rows">
          <div className="bandy-row">
            <dt>일시</dt>
            <dd>{formatEventDateTime(event.startsAt)}</dd>
          </div>
          {event.doorsAt && (
            <div className="bandy-row">
              <dt>입장</dt>
              <dd>{event.doorsAt}</dd>
            </div>
          )}
          <div className="bandy-row">
            <dt>장소</dt>
            <dd>
              {event.venueName}
              {event.venueAddress && (
                <>
                  <br />
                  <span style={{ color: 'var(--ui-muted-2)', fontSize: '0.75rem' }}>
                    {event.venueAddress}
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="bandy-row">
            <dt>가격</dt>
            <dd>{formatPrice(event.price)}</dd>
          </div>
          {event.capacity > 0 && (
            <div className="bandy-row">
              <dt>예약</dt>
              <dd>
                {event.reservedCount} / {event.capacity}명
              </dd>
            </div>
          )}
        </dl>

        <div className="bandy-actions">
          {reservation ? (
            <>
              <div className="bandy-note bandy-note-success">
                예약이 완료되었습니다. 내 BANDY에서 예약 내역을 확인할 수 있습니다.
              </div>
              <button
                type="button"
                className="bandy-btn bandy-btn-ghost"
                onClick={() => navigate('/my')}
              >
                내 BANDY로 이동
              </button>
            </>
          ) : closed ? (
            <button type="button" className="bandy-btn bandy-btn-ghost" disabled>
              예약이 마감된 행사입니다
            </button>
          ) : soldOut ? (
            <button type="button" className="bandy-btn bandy-btn-ghost" disabled>
              정원이 모두 찼습니다
            </button>
          ) : (
            <button
              type="button"
              className="bandy-btn bandy-btn-primary"
              onClick={() => setShowReserve(true)}
            >
              예약하기
            </button>
          )}

          {club && (
            <button
              type="button"
              className="bandy-btn bandy-btn-ghost"
              onClick={() => navigate(`/clubs/${club.id}`)}
            >
              {club.name} 프로필 보기
            </button>
          )}

          {/* 당일 허브가 연결된 행사는 티켓·셋리스트·채팅·방명록으로 바로 이어집니다. */}
          {event.hubPath && (
            <button
              type="button"
              className="bandy-btn bandy-btn-ghost"
              onClick={() => navigate(event.hubPath)}
            >
              당일 공연 허브 열기
            </button>
          )}
        </div>
      </div>

      {event.description && (
        <div className="bandy-section">
          <div className="bandy-section-head">
            <h3>행사 소개</h3>
          </div>
          <div className="bandy-hero">
            <p className="bandy-hero-intro">{event.description}</p>
            {event.tags.length > 0 && (
              <div className="bandy-meta">
                {event.tags.map((tag) => (
                  <span key={tag} className="bandy-badge muted">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showReserve && (
        <ReserveModal
          event={event}
          sourceClubId={sourceClubId}
          onClose={() => setShowReserve(false)}
          onReserved={(created) => {
            setReservation(created)
            setShowReserve(false)
            load()
          }}
        />
      )}
    </div>
  )
}

const reserveErrorMessage = (error: string): string => {
  switch (error) {
    case 'sold_out':
      return '정원이 모두 찼습니다. 인원을 줄이거나 다른 행사를 확인해 주세요.'
    case 'event_closed':
      return '예약이 마감된 행사입니다.'
    case 'event_not_found':
      return '행사를 찾을 수 없습니다.'
    case 'invalid_payload':
      return '이름과 연락처를 확인해 주세요.'
    case 'rate_limited':
      return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'
    case 'server_not_configured':
      return '서버가 아직 설정되지 않았습니다.'
    default:
      return '예약에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

const ReserveModal = ({
  event,
  sourceClubId,
  onClose,
  onReserved,
}: {
  event: ClubEvent
  sourceClubId: string
  onClose: () => void
  onReserved: (reservation: EventReservation) => void
}) => {
  const saved = loadBandyIdentity()
  const [name, setName] = useState(saved?.name || '')
  const [phone, setPhone] = useState(saved?.phone || '')
  const [headcount, setHeadcount] = useState(1)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const maxHeadcount = Math.min(10, event.seatsLeft ?? 10)

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    const phoneCheck = validatePhoneNumber(phone)
    if (!phoneCheck.valid) {
      setError(phoneCheck.message || '연락처를 정확히 입력해 주세요.')
      return
    }
    const digits = phone.replace(/\D/g, '')

    setIsBusy(true)
    const result = await reserveClubEvent({
      eventId: event.id,
      name: name.trim(),
      phone: digits,
      headcount,
      sourceClubId: sourceClubId || undefined,
    })
    setIsBusy(false)

    if (!result.ok) {
      setError(reserveErrorMessage(result.error))
      return
    }

    saveBandyIdentity({ name: name.trim(), phone: digits })
    onReserved(result.reservation)
  }

  return (
    <div className="bandy-modal-backdrop" onClick={onClose}>
      <div className="bandy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{event.title}</h3>
        <p className="bandy-modal-sub">
          {formatEventDateTime(event.startsAt)} · {event.venueName}
          <br />
          {formatPrice(event.price)} · {formatSeats(event.seatsLeft, event.capacity)}
        </p>

        {error && <div className="bandy-note bandy-note-error">{error}</div>}

        <div className="bandy-field">
          <label htmlFor="reserve-name">이름</label>
          <input
            id="reserve-name"
            type="text"
            value={name}
            placeholder="실명을 입력해 주세요"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="reserve-phone">연락처</label>
          <input
            id="reserve-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            placeholder="예: 01012345678"
            autoComplete="off"
            maxLength={11}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          />
          <p className="bandy-field-hint">
            현장 확인과 예약 조회에만 사용하고, 주최 동아리에만 전달됩니다.
          </p>
        </div>

        <div className="bandy-field">
          <label htmlFor="reserve-headcount">인원</label>
          <select
            id="reserve-headcount"
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value))}
          >
            {Array.from({ length: Math.max(1, maxHeadcount) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </div>

        {event.price > 0 && (
          <div className="bandy-note bandy-note-info">
            예상 결제 금액 {formatPrice(event.price * headcount)} · 입금 안내는 주최 동아리가
            개별로 전달합니다.
          </div>
        )}

        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-primary"
            onClick={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? '예약 중…' : '예약 확정'}
          </button>
          <button type="button" className="bandy-btn bandy-btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventDetail
