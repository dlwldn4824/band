import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  exchangeProfileCard,
  getCardByShareCode,
  getMyProfileCard,
  profileCardErrorMessage,
} from '../services/profileCardsApi'
import type { ProfileCard } from '../types/bandy'
import { validatePhoneNumber } from '../utils/phoneFormat'
import { loadBandyIdentity, saveBandyIdentity, type BandyIdentity } from '../utils/bandyIdentity'
import './Bandy.css'

/**
 * 현장 프로필 카드 열람 · 교환 (`/card/:shareCode`).
 *
 * NFC 태그를 태그했을 때, QR을 스캔했을 때, 링크를 받았을 때 모두 이 화면으로 들어옵니다.
 * 교환하면 서로의 "교환한 프로필" 목록에 함께 남습니다.
 */
const NfcCard = () => {
  const { shareCode = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('event') || ''

  const [card, setCard] = useState<ProfileCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [identity, setIdentity] = useState<BandyIdentity | null>(() => loadBandyIdentity())
  const [hasMyCard, setHasMyCard] = useState<boolean | null>(null)
  const [exchanged, setExchanged] = useState(false)
  const [exchangeError, setExchangeError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      const result = await getCardByShareCode(shareCode)
      if (cancelled) return
      if (!result.ok || !result.card) {
        setLoadError(profileCardErrorMessage(result.error))
      } else {
        setCard(result.card)
      }
      setIsLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [shareCode])

  // 내 카드가 있어야 교환할 수 있으므로 미리 확인합니다.
  useEffect(() => {
    if (!identity) {
      setHasMyCard(null)
      return
    }
    let cancelled = false
    getMyProfileCard(identity.name, identity.phone).then((myCard) => {
      if (!cancelled) setHasMyCard(Boolean(myCard))
    })
    return () => {
      cancelled = true
    }
  }, [identity])

  const handleExchange = useCallback(async () => {
    if (!identity) return
    setExchangeError('')
    setIsBusy(true)
    const result = await exchangeProfileCard({
      name: identity.name,
      phone: identity.phone,
      shareCode,
      eventId: eventId || undefined,
    })
    setIsBusy(false)

    if (!result.ok) {
      setExchangeError(profileCardErrorMessage(result.error))
      if (result.error === 'card_required') setHasMyCard(false)
      return
    }
    // 교환 후에는 상대가 동의한 연락 수단이 응답에 포함됩니다.
    if (result.card) setCard(result.card)
    setExchanged(true)
  }, [identity, shareCode, eventId])

  if (isLoading) {
    return (
      <div className="bandy">
        <div className="bandy-loading">프로필을 불러오는 중…</div>
      </div>
    )
  }

  if (loadError || !card) {
    return (
      <div className="bandy">
        <div className="bandy-head">
          <h2>프로필 카드</h2>
        </div>
        <div className="bandy-empty">{loadError || '프로필 카드를 찾을 수 없습니다.'}</div>
        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-ghost"
            onClick={() => navigate('/explore')}
          >
            BANDY 둘러보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bandy">
      <div className="bandy-head">
        <h2>{exchanged ? '프로필을 교환했습니다' : '프로필 카드'}</h2>
        <p>
          {exchanged
            ? '서로의 내 BANDY에 저장되었습니다. 공개한 연락 수단으로 이어서 연락할 수 있습니다.'
            : '행사 현장에서 전달받은 카드입니다. 교환하면 서로의 목록에 저장됩니다.'}
        </p>
      </div>

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

        {(card.instagram || card.phone) && (
          <dl className="bandy-rows">
            {card.instagram && (
              <div className="bandy-row">
                <dt>인스타</dt>
                <dd>@{card.instagram}</dd>
              </div>
            )}
            {card.phone && (
              <div className="bandy-row">
                <dt>연락처</dt>
                <dd>{card.phone}</dd>
              </div>
            )}
          </dl>
        )}

        {!card.instagram && !card.phone && (
          <div className="bandy-note bandy-note-info" style={{ marginTop: '1rem', marginBottom: 0 }}>
            이 사람은 연락 수단을 공개하지 않았습니다.
          </div>
        )}
      </div>

      {exchangeError && <div className="bandy-note bandy-note-error">{exchangeError}</div>}

      {exchanged ? (
        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-primary"
            onClick={() => navigate('/my')}
          >
            내 BANDY에서 보기
          </button>
        </div>
      ) : !identity ? (
        <ExchangeIdentityGate onIdentified={setIdentity} />
      ) : hasMyCard === false ? (
        <>
          <div className="bandy-note bandy-note-info">
            교환은 서로의 카드를 주고받는 것이라, 먼저 내 프로필 카드를 만들어야 합니다.
          </div>
          <div className="bandy-actions">
            <button
              type="button"
              className="bandy-btn bandy-btn-primary"
              onClick={() => navigate('/my')}
            >
              내 프로필 카드 만들기
            </button>
          </div>
        </>
      ) : (
        <div className="bandy-actions">
          <button
            type="button"
            className="bandy-btn bandy-btn-primary"
            onClick={handleExchange}
            disabled={isBusy || hasMyCard === null}
          >
            {isBusy ? '교환 중…' : '프로필 교환하기'}
          </button>
          <button
            type="button"
            className="bandy-btn bandy-btn-ghost"
            onClick={() => navigate('/explore')}
          >
            BANDY 둘러보기
          </button>
        </div>
      )}
    </div>
  )
}

const ExchangeIdentityGate = ({
  onIdentified,
}: {
  onIdentified: (identity: BandyIdentity) => void
}) => {
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
    <div className="bandy-hero">
      <div className="bandy-note bandy-note-info">
        교환하려면 내가 누구인지 먼저 확인해야 합니다. 예약할 때 쓴 이름과 연락처를 입력해 주세요.
      </div>

      {error && <div className="bandy-note bandy-note-error">{error}</div>}

      <div className="bandy-field">
        <label htmlFor="exchange-name">이름</label>
        <input
          id="exchange-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="bandy-field">
        <label htmlFor="exchange-phone">연락처</label>
        <input
          id="exchange-phone"
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
          확인
        </button>
      </div>
    </div>
  )
}

export default NfcCard
