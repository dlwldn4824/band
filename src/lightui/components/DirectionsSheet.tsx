import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import Icon from './Icon'
import { copyLink } from '../share/share'
import type { VenuePlace } from '../../mocks/bandyLight'

/**
 * 「공연장 길찾기」 — 앱 안의 지도 탭으로 보내지 않고 시트를 엽니다.
 *
 * 지도 탭은 공연을 둘러보는 곳이지 길을 알려 주는 곳이 아닙니다. 길은 쓰던 지도 앱이
 * 제일 잘 안내하니, 여기서는 어디로 넘길지만 고르게 합니다.
 *
 * 주소 복사가 막히는 브라우저(권한·사생활 보호 모드)가 있어서, 실패하면 주소를
 * 그대로 드러내 길게 눌러 복사할 수 있게 둡니다.
 */

interface App {
  key: string
  label: string
  sub: string
  href: (v: VenuePlace) => string
}

const APPS: App[] = [
  {
    key: 'kakao',
    label: '카카오맵',
    sub: '길찾기 열기',
    href: (v) => `https://map.kakao.com/link/to/${encodeURIComponent(v.name)},${v.lat},${v.lng}`,
  },
  {
    key: 'naver',
    label: '네이버 지도',
    sub: '주소로 찾기',
    href: (v) => `https://map.naver.com/p/search/${encodeURIComponent(v.address)}`,
  },
  {
    key: 'google',
    label: '구글 지도',
    sub: '길찾기 열기',
    href: (v) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`,
  },
]

const DirectionsSheet = ({
  venue,
  open,
  onClose,
}: {
  venue: VenuePlace
  open: boolean
  onClose: () => void
}) => {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  // 다시 열면 지난번 결과는 지웁니다
  useEffect(() => {
    if (!open) {
      setCopied(false)
      setCopyFailed(false)
    }
  }, [open])

  const copy = async () => {
    const result = await copyLink(venue.address)
    if (result === 'copied') {
      setCopied(true)
      setCopyFailed(false)
    } else {
      setCopyFailed(true)
    }
  }

  return (
    <Sheet open={open} title="공연장 길찾기" onClose={onClose}>
      <div className="lui-dirs">
        <p className="lui-dirs__name">{venue.name}</p>
        <p className="lui-dirs__addr">{venue.address}</p>

        <div className="lui-dirs__apps">
          {APPS.map((app) => (
            <a
              key={app.key}
              className="lui-dirs__row"
              href={app.href(venue)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              <span className="lui-dirs__main">
                <span className="lui-dirs__label">{app.label}</span>
                <span className="lui-dirs__sub">{app.sub}</span>
              </span>
              <Icon name="chevron-right" size={18} className="lui-dirs__chev" />
            </a>
          ))}

          <button type="button" className="lui-dirs__row" onClick={copy}>
            <span className="lui-dirs__main">
              <span className="lui-dirs__label">주소 복사</span>
              <span className="lui-dirs__sub">
                {copied ? '복사했어요' : copyFailed ? '복사가 막혀 있어요' : venue.address}
              </span>
            </span>
            {copied && <Icon name="check" size={16} className="lui-dirs__done" />}
          </button>
        </div>

        {/* 클립보드가 막혔을 때 — 직접 긁어 갈 수 있게 */}
        {copyFailed && (
          <p className="lui-dirs__fallback">
            <span className="lui-dirs__pick">{venue.address}</span>
            길게 눌러 복사해 주세요.
          </p>
        )}
      </div>
    </Sheet>
  )
}

export default DirectionsSheet
