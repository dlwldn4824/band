import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { cancelReservation, listMyReservations } from '../services/clubEventsApi'
import {
  cardShareUrl,
  getMyProfileCard,
  isWebNfcSupported,
  listMyExchanges,
  upsertProfileCard,
  profileCardErrorMessage,
} from '../services/profileCardsApi'
import { listClubs } from '../services/clubsApi'
import type { Club, EventReservation, ProfileCard, ProfileExchange } from '../types/bandy'
import { formatCountdown, formatEventDateTime, formatRelativeTime } from '../utils/bandyFormat'
import { validatePhoneNumber } from '../utils/phoneFormat'
import {
  clearBandyIdentity,
  loadBandyIdentity,
  saveBandyIdentity,
  type BandyIdentity,
} from '../utils/bandyIdentity'
import './Bandy.css'

type Tab = 'reservations' | 'card'

/**
 * 내 BANDY — 예약 내역과 현장 프로필 카드를 한 화면에 둡니다.
 *
 * 프로필 카드는 행사장에서 서로의 프로필을 교환하는 데 쓰이고,
 * NFC·QR·링크 중 어떤 경로로 전달해도 같은 공유 코드로 동작합니다.
 */
const MyBandy = () => {
  const [identity, setIdentity] = useState<BandyIdentity | null>(() => loadBandyIdentity())
  const [tab, setTab] = useState<Tab>('reservations')

  if (!identity) {
    return <IdentityGate onIdentified={setIdentity} />
  }

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>내 BANDY</h2>
        <p>
          {identity.name}님 · 예약한 행사와 현장에서 교환한 프로필을 확인할 수 있습니다.{' '}
          <button
            type="button"
            className="bandy-btn bandy-btn-sm bandy-btn-ghost"
            onClick={() => {
              clearBandyIdentity()
              setIdentity(null)
            }}
          >
            다른 번호로 조회
          </button>
        </p>
      </div>

      <div className="bandy-segment">
        <button
          type="button"
          className={tab === 'reservations' ? 'active' : ''}
          onClick={() => setTab('reservations')}
        >
          예약 내역
        </button>
        <button
          type="button"
          className={tab === 'card' ? 'active' : ''}
          onClick={() => setTab('card')}
        >
          현장 프로필
        </button>
      </div>

      {tab === 'reservations' ? (
        <ReservationsTab identity={identity} />
      ) : (
        <ProfileCardTab identity={identity} />
      )}
    </div>
  )
}

/** 이름·연락처로 내 예약과 카드를 찾습니다. */
const IdentityGate = ({ onIdentified }: { onIdentified: (identity: BandyIdentity) => void }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')
    if (!name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    const check = validatePhoneNumber(phone)
    if (!check.valid) {
      setError(check.message || '연락처를 정확히 입력해 주세요.')
      return
    }

    const identity = { name: name.trim(), phone: phone.replace(/\D/g, '') }
    saveBandyIdentity(identity)
    onIdentified(identity)
  }

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>내 BANDY</h2>
        <p>예약할 때 쓴 이름과 연락처로 내역을 불러옵니다.</p>
      </div>

      <div className="bandy-hero">
        {error && <div className="bandy-note bandy-note-error">{error}</div>}

        <div className="bandy-field">
          <label htmlFor="my-name">이름</label>
          <input
            id="my-name"
            type="text"
            value={name}
            placeholder="예약 시 입력한 이름"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="bandy-field">
          <label htmlFor="my-phone">연락처</label>
          <input
            id="my-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            placeholder="예: 01012345678"
            autoComplete="off"
            maxLength={11}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          />
        </div>

        <div className="bandy-actions">
          <button type="button" className="bandy-btn bandy-btn-primary" onClick={handleSubmit}>
            내역 불러오기
          </button>
        </div>
      </div>
    </div>
  )
}

const ReservationsTab = ({ identity }: { identity: BandyIdentity }) => {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<EventReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    const list = await listMyReservations(identity.name, identity.phone)
    setReservations(list)
    setIsLoading(false)
  }, [identity.name, identity.phone])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = async (reservation: EventReservation) => {
    setBusyId(reservation.id)
    await cancelReservation({
      eventId: reservation.eventId,
      name: identity.name,
      phone: identity.phone,
    })
    setBusyId('')
    load()
  }

  if (isLoading) return <div className="bandy-loading">불러오는 중…</div>

  const active = reservations.filter((r) => r.status !== 'cancelled')
  const cancelled = reservations.filter((r) => r.status === 'cancelled')

  if (reservations.length === 0) {
    return (
      <div className="bandy-empty">
        아직 예약한 행사가 없습니다.
        <br />
        탐색에서 관심 있는 행사를 찾아보세요.
      </div>
    )
  }

  return (
    <>
      <div className="bandy-list">
        {active.map((reservation) => (
          <div key={reservation.id} className="bandy-card" style={{ cursor: 'default' }}>
            <div className="bandy-card-top">
              <div className="bandy-emblem">🎫</div>
              <div className="bandy-card-body">
                <p className="bandy-card-title">{reservation.eventTitle}</p>
                <p className="bandy-card-sub">
                  {reservation.clubName} · {formatEventDateTime(reservation.startsAt)}
                </p>
              </div>
            </div>

            <div className="bandy-meta">
              {formatCountdown(reservation.startsAt) && (
                <span className="bandy-badge accent">
                  {formatCountdown(reservation.startsAt)}
                </span>
              )}
              <span className="bandy-badge">{reservation.headcount}명</span>
              {reservation.status === 'attended' && (
                <span className="bandy-badge good">방문 확인</span>
              )}
              {reservation.viaConnection && (
                <span className="bandy-badge good">교류로 발견</span>
              )}
            </div>

            <div className="bandy-actions">
              <button
                type="button"
                className="bandy-btn bandy-btn-ghost"
                onClick={() => navigate(`/shows/${reservation.eventId}`)}
              >
                행사 정보 보기
              </button>
              {reservation.status !== 'attended' && (
                <button
                  type="button"
                  className="bandy-btn bandy-btn-danger"
                  onClick={() => handleCancel(reservation)}
                  disabled={busyId === reservation.id}
                >
                  {busyId === reservation.id ? '취소 중…' : '예약 취소'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cancelled.length > 0 && (
        <div className="bandy-section">
          <div className="bandy-section-head">
            <h3>취소한 예약</h3>
            <span className="bandy-section-count">{cancelled.length}건</span>
          </div>
          <div className="bandy-list">
            {cancelled.map((reservation) => (
              <div
                key={reservation.id}
                className="bandy-card"
                style={{ cursor: 'default', opacity: 0.6 }}
              >
                <div className="bandy-card-top">
                  <div className="bandy-emblem">✕</div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">{reservation.eventTitle}</p>
                    <p className="bandy-card-sub">{reservation.clubName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const ProfileCardTab = ({ identity }: { identity: BandyIdentity }) => {
  const [card, setCard] = useState<ProfileCard | null>(null)
  const [exchanges, setExchanges] = useState<ProfileExchange[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const [myCard, myExchanges, clubList] = await Promise.all([
      getMyProfileCard(identity.name, identity.phone),
      listMyExchanges(identity.name, identity.phone),
      listClubs(),
    ])
    setCard(myCard)
    setExchanges(myExchanges)
    setClubs(clubList.clubs)
    setIsEditing(!myCard)
    setIsLoading(false)
  }, [identity.name, identity.phone])

  useEffect(() => {
    load()
  }, [load])

  if (isLoading) return <div className="bandy-loading">불러오는 중…</div>

  if (isEditing) {
    return (
      <CardEditor
        identity={identity}
        card={card}
        clubs={clubs}
        onCancel={card ? () => setIsEditing(false) : undefined}
        onSaved={(saved) => {
          setCard(saved)
          setIsEditing(false)
        }}
      />
    )
  }

  if (!card) {
    return <div className="bandy-empty">프로필 카드를 만들어 주세요.</div>
  }

  return (
    <>
      <ShareableCard card={card} />

      <div className="bandy-actions">
        <button
          type="button"
          className="bandy-btn bandy-btn-ghost"
          onClick={() => setIsEditing(true)}
        >
          프로필 수정
        </button>
      </div>

      <div className="bandy-section">
        <div className="bandy-section-head">
          <h3>교환한 프로필</h3>
          <span className="bandy-section-count">{exchanges.length}명</span>
        </div>
        {exchanges.length === 0 ? (
          <div className="bandy-empty">
            아직 교환한 프로필이 없습니다.
            <br />
            행사 현장에서 상대의 카드를 태그하거나 QR을 스캔해 보세요.
          </div>
        ) : (
          <div className="bandy-list">
            {exchanges.map((exchange) => (
              <div key={exchange.card.id} className="bandy-card" style={{ cursor: 'default' }}>
                <div className="bandy-card-top">
                  <div className="bandy-emblem">
                    {exchange.card.nickname.slice(0, 1) || exchange.card.ownerName.slice(0, 1)}
                  </div>
                  <div className="bandy-card-body">
                    <p className="bandy-card-title">
                      {exchange.card.nickname || exchange.card.ownerName}
                    </p>
                    <p className="bandy-card-sub">
                      {[exchange.card.clubName, exchange.card.university]
                        .filter(Boolean)
                        .join(' · ') || '소속 미입력'}
                    </p>
                  </div>
                </div>

                {exchange.card.bio && <p className="bandy-card-note">{exchange.card.bio}</p>}

                <div className="bandy-meta">
                  {exchange.card.interests.map((interest) => (
                    <span key={interest} className="bandy-badge muted">
                      #{interest}
                    </span>
                  ))}
                </div>

                {/* 상대가 동의한 연락 수단만 표시됩니다. */}
                {(exchange.card.instagram || exchange.card.phone) && (
                  <dl className="bandy-rows">
                    {exchange.card.instagram && (
                      <div className="bandy-row">
                        <dt>인스타</dt>
                        <dd>@{exchange.card.instagram}</dd>
                      </div>
                    )}
                    {exchange.card.phone && (
                      <div className="bandy-row">
                        <dt>연락처</dt>
                        <dd>{exchange.card.phone}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {exchange.exchangedAt && (
                  <p className="bandy-field-hint">
                    {formatRelativeTime(exchange.exchangedAt)} 교환
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/** 공유 가능한 카드 — 공유 코드 · QR · NFC 쓰기 · 링크 복사 */
const ShareableCard = ({ card }: { card: ProfileCard }) => {
  const [notice, setNotice] = useState('')
  const shareUrl = cardShareUrl(card.shareCode)
  const nfcSupported = isWebNfcSupported()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setNotice('공유 링크를 복사했습니다.')
    } catch {
      setNotice('복사에 실패했습니다. 링크를 직접 선택해 주세요.')
    }
    setTimeout(() => setNotice(''), 2500)
  }

  /**
   * NFC 태그에 공유 링크를 기록합니다.
   * Web NFC 는 일부 안드로이드 크롬에서만 동작하므로,
   * 미지원 기기에서는 QR·링크 공유가 그대로 대체 경로가 됩니다.
   */
  const handleNfcWrite = async () => {
    const NDEFReaderCtor = (window as unknown as { NDEFReader?: new () => unknown }).NDEFReader
    if (!NDEFReaderCtor) {
      setNotice('이 기기에서는 NFC 쓰기를 지원하지 않습니다. QR이나 링크를 사용해 주세요.')
      return
    }

    try {
      setNotice('NFC 태그를 기기 뒷면에 가까이 대 주세요…')
      const reader = new NDEFReaderCtor() as {
        write: (message: { records: Array<{ recordType: string; data: string }> }) => Promise<void>
      }
      await reader.write({ records: [{ recordType: 'url', data: shareUrl }] })
      setNotice('NFC 태그에 내 프로필 링크를 기록했습니다.')
    } catch {
      setNotice('NFC 쓰기에 실패했습니다. QR이나 링크를 사용해 주세요.')
    }
    setTimeout(() => setNotice(''), 4000)
  }

  return (
    <>
      <div className="bandy-profile-card">
        <div className="bandy-profile-top">
          <div className="bandy-emblem">
            {card.nickname.slice(0, 1) || card.ownerName.slice(0, 1)}
          </div>
          <div>
            <p className="bandy-profile-name">{card.nickname || card.ownerName}</p>
            <p className="bandy-profile-club">
              {[card.clubName, card.university].filter(Boolean).join(' · ') || '소속 미입력'}
            </p>
          </div>
        </div>

        {card.bio && <p className="bandy-hero-intro">{card.bio}</p>}

        {card.interests.length > 0 && (
          <div className="bandy-meta">
            {card.interests.map((interest) => (
              <span key={interest} className="bandy-badge muted">
                #{interest}
              </span>
            ))}
          </div>
        )}

        <div className="bandy-meta">
          <span className={`bandy-badge ${card.shareInstagram ? 'good' : 'muted'}`}>
            인스타 {card.shareInstagram ? '공개' : '비공개'}
          </span>
          <span className={`bandy-badge ${card.sharePhone ? 'good' : 'muted'}`}>
            연락처 {card.sharePhone ? '공개' : '비공개'}
          </span>
          {card.exchangeCount > 0 && (
            <span className="bandy-badge accent">교환 {card.exchangeCount}명</span>
          )}
        </div>

        <div className="bandy-sharecode">
          <div>
            <div className="bandy-sharecode-label">공유 코드</div>
            <div className="bandy-sharecode-value">{card.shareCode}</div>
          </div>
        </div>

        <div className="bandy-qr">
          <QRCodeSVG value={shareUrl} size={168} level="M" includeMargin={false} />
        </div>
      </div>

      {notice && <div className="bandy-note bandy-note-info">{notice}</div>}

      <div className="bandy-actions">
        <button type="button" className="bandy-btn bandy-btn-primary" onClick={handleNfcWrite}>
          NFC 태그에 기록하기
        </button>
        <button type="button" className="bandy-btn bandy-btn-ghost" onClick={handleCopy}>
          공유 링크 복사
        </button>
      </div>

      {!nfcSupported && (
        <div className="bandy-note bandy-note-info">
          이 기기는 Web NFC를 지원하지 않습니다. 현장에서는 위 QR을 상대에게 보여주거나 공유
          링크를 전달하면 같은 방식으로 교환됩니다.
        </div>
      )}
    </>
  )
}

const CardEditor = ({
  identity,
  card,
  clubs,
  onCancel,
  onSaved,
}: {
  identity: BandyIdentity
  card: ProfileCard | null
  clubs: Club[]
  onCancel?: () => void
  onSaved: (card: ProfileCard) => void
}) => {
  const [nickname, setNickname] = useState(card?.nickname || '')
  const [clubId, setClubId] = useState(card?.clubId || '')
  const [bio, setBio] = useState(card?.bio || '')
  const [interestsText, setInterestsText] = useState((card?.interests || []).join(', '))
  const [instagram, setInstagram] = useState(card?.instagram || '')
  const [shareInstagram, setShareInstagram] = useState(card?.shareInstagram ?? true)
  const [sharePhone, setSharePhone] = useState(card?.sharePhone ?? false)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const handleSave = async () => {
    setError('')
    setIsBusy(true)
    const result = await upsertProfileCard({
      name: identity.name,
      phone: identity.phone,
      nickname: nickname.trim(),
      clubId,
      bio: bio.trim(),
      interests: interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      instagram: instagram.trim().replace(/^@/, ''),
      shareInstagram,
      sharePhone,
    })
    setIsBusy(false)

    if (!result.ok || !result.card) {
      setError(profileCardErrorMessage(result.error))
      return
    }
    onSaved(result.card)
  }

  return (
    <div className="bandy-hero">
      <div className="bandy-note bandy-note-info">
        행사 현장에서 상대에게 보여줄 카드입니다. 연락처와 인스타그램은 직접 공개로 바꾼 항목만
        상대에게 전달됩니다.
      </div>

      {error && <div className="bandy-note bandy-note-error">{error}</div>}

      <div className="bandy-field">
        <label htmlFor="card-nickname">표시 이름</label>
        <input
          id="card-nickname"
          type="text"
          value={nickname}
          placeholder={identity.name}
          maxLength={24}
          onChange={(e) => setNickname(e.target.value)}
        />
        <p className="bandy-field-hint">비워 두면 예약 시 입력한 이름이 표시됩니다.</p>
      </div>

      <div className="bandy-field">
        <label htmlFor="card-club">소속 동아리</label>
        <select id="card-club" value={clubId} onChange={(e) => setClubId(e.target.value)}>
          <option value="">선택 안 함</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.university})
            </option>
          ))}
        </select>
      </div>

      <div className="bandy-field">
        <label htmlFor="card-bio">한 줄 소개</label>
        <textarea
          id="card-bio"
          value={bio}
          placeholder="어떤 활동을 하고 있고 어떤 사람을 만나고 싶은지 적어 주세요."
          maxLength={300}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: '5.5rem' }}
        />
        <p className="bandy-field-hint">{bio.length}/300자</p>
      </div>

      <div className="bandy-field">
        <label htmlFor="card-interests">관심사</label>
        <input
          id="card-interests"
          type="text"
          value={interestsText}
          placeholder="밴드, 작곡, 사진"
          onChange={(e) => setInterestsText(e.target.value)}
        />
        <p className="bandy-field-hint">쉼표로 구분해 최대 8개까지 적을 수 있습니다.</p>
      </div>

      <div className="bandy-field">
        <label htmlFor="card-instagram">인스타그램 아이디</label>
        <input
          id="card-instagram"
          type="text"
          value={instagram}
          placeholder="아이디만 입력 (@ 제외)"
          maxLength={40}
          onChange={(e) => setInstagram(e.target.value)}
        />
      </div>

      <label className="bandy-check">
        <input
          type="checkbox"
          checked={shareInstagram}
          onChange={(e) => setShareInstagram(e.target.checked)}
        />
        <span className="bandy-check-text">
          인스타그램 아이디 공개
          <span>프로필을 교환한 상대에게만 보입니다.</span>
        </span>
      </label>

      <label className="bandy-check">
        <input
          type="checkbox"
          checked={sharePhone}
          onChange={(e) => setSharePhone(e.target.checked)}
        />
        <span className="bandy-check-text">
          연락처 공개
          <span>교환한 상대에게 전화번호가 그대로 보입니다. 필요할 때만 켜 주세요.</span>
        </span>
      </label>

      <div className="bandy-actions">
        <button
          type="button"
          className="bandy-btn bandy-btn-primary"
          onClick={handleSave}
          disabled={isBusy}
        >
          {isBusy ? '저장 중…' : card ? '프로필 저장' : '프로필 카드 만들기'}
        </button>
        {onCancel && (
          <button type="button" className="bandy-btn bandy-btn-ghost" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
    </div>
  )
}

export default MyBandy
