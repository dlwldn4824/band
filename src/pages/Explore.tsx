import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listClubs } from '../services/clubsApi'
import { listClubEvents } from '../services/clubEventsApi'
import { CLUB_CATEGORIES, categoryLabel } from '../types/bandy'
import type { Club, ClubEvent } from '../types/bandy'
import { formatCountdown, formatEventDate, formatPrice, formatSeats } from '../utils/bandyFormat'
import './Bandy.css'

type Mode = 'clubs' | 'events'

/**
 * 탐색 — 분야별로 동아리와 행사를 함께 둘러보는 첫 화면입니다.
 * 동아리에서 들어가 그 동아리의 행사로, 행사에서 들어가 주최 동아리로
 * 양방향으로 이동할 수 있게 구성했습니다.
 */
const Explore = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode: Mode = searchParams.get('mode') === 'events' ? 'events' : 'clubs'
  const category = searchParams.get('category') || ''
  const university = searchParams.get('university') || ''

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [universities, setUniversities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timeoutId)
  }, [query])

  const patchParams = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        if (mode === 'clubs') {
          const result = await listClubs({ category, university, q: debouncedQuery })
          if (cancelled) return
          setClubs(result.clubs)
          if (result.universities.length > 0) setUniversities(result.universities)
        } else {
          const result = await listClubEvents({ category, university, q: debouncedQuery })
          if (cancelled) return
          setEvents(result)
        }
      } catch {
        if (!cancelled) setLoadError('목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [mode, category, university, debouncedQuery])

  // 행사 탭에서도 대학 필터를 쓰려면 동아리 목록의 대학 목록이 필요합니다.
  useEffect(() => {
    if (universities.length > 0) return
    let cancelled = false
    listClubs().then((result) => {
      if (!cancelled && result.universities.length > 0) setUniversities(result.universities)
    })
    return () => {
      cancelled = true
    }
  }, [universities.length])

  const isEmpty = useMemo(
    () => (mode === 'clubs' ? clubs.length === 0 : events.length === 0),
    [mode, clubs.length, events.length]
  )

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>같은 관심사를 가진 동아리를 찾아보세요</h2>
        <p>
          분야별로 동아리와 행사를 둘러보고, 교류를 신청하거나 바로 예약할 수 있습니다.
        </p>
      </div>

      <div className="bandy-segment">
        <button
          type="button"
          className={mode === 'clubs' ? 'active' : ''}
          onClick={() => patchParams({ mode: '' })}
        >
          동아리
        </button>
        <button
          type="button"
          className={mode === 'events' ? 'active' : ''}
          onClick={() => patchParams({ mode: 'events' })}
        >
          행사
        </button>
      </div>

      <div className="bandy-search">
        <input
          type="search"
          value={query}
          placeholder={mode === 'clubs' ? '동아리명 · 대학 · 키워드' : '행사명 · 동아리 · 장소'}
          onChange={(e) => {
            setQuery(e.target.value)
            patchParams({ q: e.target.value })
          }}
        />
      </div>

      <div className="bandy-chips">
        <button
          type="button"
          className={`bandy-chip ${category === '' ? 'active' : ''}`}
          onClick={() => patchParams({ category: '' })}
        >
          전체 분야
        </button>
        {CLUB_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`bandy-chip ${category === c.id ? 'active' : ''}`}
            onClick={() => patchParams({ category: category === c.id ? '' : c.id })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {universities.length > 0 && (
        <div className="bandy-chips">
          <button
            type="button"
            className={`bandy-chip ${university === '' ? 'active' : ''}`}
            onClick={() => patchParams({ university: '' })}
          >
            전체 대학
          </button>
          {universities.map((u) => (
            <button
              key={u}
              type="button"
              className={`bandy-chip ${university === u ? 'active' : ''}`}
              onClick={() => patchParams({ university: university === u ? '' : u })}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {loadError && <div className="bandy-note bandy-note-error">{loadError}</div>}

      {isLoading ? (
        <div className="bandy-loading">불러오는 중…</div>
      ) : isEmpty ? (
        <div className="bandy-empty">
          조건에 맞는 {mode === 'clubs' ? '동아리' : '행사'}가 없습니다.
          <br />
          분야나 대학 필터를 바꿔 보세요.
        </div>
      ) : mode === 'clubs' ? (
        <div className="bandy-list">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              className="bandy-card"
              onClick={() => navigate(`/clubs/${club.id}`)}
            >
              <div className="bandy-card-top">
                <div
                  className="bandy-emblem"
                  style={club.accent ? { borderColor: club.accent } : undefined}
                >
                  {club.emblem || club.name.slice(0, 1)}
                </div>
                <div className="bandy-card-body">
                  <p className="bandy-card-title">{club.name}</p>
                  <p className="bandy-card-sub">
                    {club.university} · {categoryLabel(club.category)}
                  </p>
                </div>
              </div>
              {club.tagline && <p className="bandy-card-note">{club.tagline}</p>}
              <div className="bandy-meta">
                {club.connectionCount > 0 && (
                  <span className="bandy-badge accent">교류 {club.connectionCount}곳</span>
                )}
                {club.eventCount > 0 && (
                  <span className="bandy-badge">행사 {club.eventCount}건</span>
                )}
                {club.memberCount ? (
                  <span className="bandy-badge muted">{club.memberCount}명</span>
                ) : null}
                {club.openToExchange ? (
                  <span className="bandy-badge good">교류 가능</span>
                ) : (
                  <span className="bandy-badge muted">교류 중단</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bandy-list">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="bandy-card"
              onClick={() => navigate(`/shows/${event.id}`)}
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
                    {event.clubName} · {event.university}
                  </p>
                </div>
              </div>
              <p className="bandy-card-note">
                {formatEventDate(event.startsAt)}
                {event.doorsAt ? ` ${event.doorsAt}` : ''} · {event.venueName}
              </p>
              <div className="bandy-meta">
                {formatCountdown(event.startsAt) && (
                  <span className="bandy-badge accent">{formatCountdown(event.startsAt)}</span>
                )}
                <span className="bandy-badge">{formatPrice(event.price)}</span>
                <span
                  className={`bandy-badge ${
                    event.seatsLeft !== null && event.seatsLeft <= 0 ? 'warn' : 'muted'
                  }`}
                >
                  {formatSeats(event.seatsLeft, event.capacity)}
                </span>
                <span className="bandy-badge muted">{categoryLabel(event.category)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Explore
