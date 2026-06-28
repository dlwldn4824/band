import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import directionsImage from '../assets/background/monghyang-map.jpg'
import { DEFAULT_VENUE_NAME, DEFAULT_VENUE_ADDRESS } from '../utils/venueDefaults'
import { trackEvent, trackModal } from '../analytics'
import './VenueDirections.css'
import '../pages/Events.css'

const VenueDirections = () => {
  const { performanceData, eventsFeatures } = useData()
  const [showModal, setShowModal] = useState(false)

  if (!eventsFeatures.directions) return null

  const venueName = performanceData?.ticket?.venue || DEFAULT_VENUE_NAME
  const venueAddress = performanceData?.ticket?.venueAddress || DEFAULT_VENUE_ADDRESS

  const openModal = () => {
    setShowModal(true)
    void trackEvent('directions_modal_opened', {})
    void trackEvent('feature_card_clicked', { feature_name: 'directions' })
    trackModal('directions', 'opened', { source: 'dashboard' })
  }

  const closeModal = () => {
    setShowModal(false)
    trackModal('directions', 'closed', { source: 'dashboard' })
  }

  const handleKakaoMap = () => {
    const address = encodeURIComponent(venueAddress)
    void trackEvent('kakao_map_opened', {})
    window.open(`https://map.kakao.com/link/search/${address}`, '_blank')
  }

  return (
    <>
      <section className="dashboard-section venue-directions-section">
        <div className="events-header">
          <h2>위치 안내</h2>
        </div>
        <div className="venue-directions-card">
          <button
            type="button"
            className="venue-directions-map-preview"
            onClick={openModal}
            aria-label="공연장 위치 지도 보기"
          >
            <img
              src={directionsImage}
              alt=""
              className="venue-directions-map-image"
              loading="lazy"
              decoding="async"
            />
          </button>
          <div className="venue-directions-info">
            <h3 className="venue-directions-name">{venueName}</h3>
            <p className="venue-directions-address">{venueAddress}</p>
          </div>
          <button type="button" className="venue-directions-button" onClick={openModal}>
            길찾기
          </button>
        </div>
      </section>

      {showModal && (
        <div className="directions-modal-overlay" onClick={closeModal}>
          <div className="directions-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="directions-modal-close"
              onClick={closeModal}
              aria-label="닫기"
            />
            <div className="directions-modal-content">
              <h2 className="directions-modal-title">공연장 위치</h2>
              <div className="directions-image-container">
                <img
                  src={directionsImage}
                  alt="복합문화공간 몽향 위치"
                  className="directions-image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="directions-address">
                <p className="directions-address-title">{venueName}</p>
                <p className="directions-address-text">{venueAddress}</p>
              </div>
              <button type="button" className="directions-kakao-button" onClick={handleKakaoMap}>
                카카오맵에서 길찾기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VenueDirections
