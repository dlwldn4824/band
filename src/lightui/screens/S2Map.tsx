import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import ShowMap from '../components/ShowMap'
import Icon from '../components/Icon'
import { P } from '../paths'
import { mapShows, mapHome, myLocation, mapFilters, type MapShow } from '../../mocks/bandyLight'
import './S2Map.css'

/**
 * S2 탐색 · 지도 — Figma 205:2
 *
 * 지도만 Figma 의 점·레이더 일러스트 대신 실제 지도(Leaflet + OpenStreetMap)를 씁니다.
 * 지도를 움직이면 아래 시트의 「이 지역 공연 N개」 가 화면 안에 들어온 공연으로 바뀝니다 —
 * 노원에서 신촌·홍대로, 다시 부산으로 옮겨 가며 볼 수 있습니다.
 */
const S2Map = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState(mapFilters[0])
  const [visible, setVisible] = useState<MapShow[]>(mapShows)
  const [selected, setSelected] = useState<string | undefined>()

  // 칩은 핀과 아래 목록을 함께 거릅니다 — 선택 표시만 바뀌면 누른 뜻이 없습니다
  const filtered = useMemo(() => {
    switch (filter) {
      case '오늘':
        return mapShows.filter((s) => s.when === 'today')
      case '이번 주':
        return mapShows.filter((s) => s.when === 'today' || s.when === 'week')
      case '무료':
        return mapShows.filter((s) => s.free)
      case '전체':
        return mapShows
      default:
        return mapShows.filter((s) => s.genre === filter)
    }
  }, [filter])

  const handleView = useCallback((shows: MapShow[]) => setVisible(shows), [])

  return (
    <Phone>
      <div className="lui-body">
        <div className="s2__top">
          <div className="s2__gap" />
          <button type="button" className="s2__search" onClick={() => navigate(P.search)}>
            공연 · 동아리 · 공연장 검색
          </button>
          <div className="s2__gap" />
          <div className="s2__filters">
            {mapFilters.map((f) => (
              <button
                key={f}
                type="button"
                className={`s2-chip${f === filter ? ' s2-chip--on' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="s2__gap" />
        </div>

        <ShowMap
          shows={filtered}
          center={mapHome}
          me={myLocation}
          selectedId={selected}
          onSelect={(s) => setSelected(s.id)}
          onViewChange={handleView}
          height={430}
        />

        <div className="lui-mapsheet">
          <div className="lui-mapsheet__grip" />
          <SectionHeader
            title={`이 지역 공연 ${visible.length}개`}
            aside="목록으로"
            onAside={() => navigate(P.search)}
          />
          {visible.length === 0 ? (
            <p className="s2__empty">
              {filtered.length === 0
                ? `「${filter}」 조건에 맞는 공연이 없어요. 다른 조건으로 보세요.`
                : filter === '전체'
                  ? '이 지역에는 아직 올라온 공연이 없어요. 지도를 움직여 보세요.'
                  : `지금 보이는 지역에 「${filter}」 공연이 없어요. 지도를 움직여 보세요.`}
            </p>
          ) : (
            <div className="s2__cards">
              {visible.map((show) => (
                <button
                  key={show.id}
                  type="button"
                  className="s2-card"
                  onClick={() => navigate(P.show(show.id))}
                >
                  <span className="s2-card__poster">
                    {show.poster && <img src={show.poster} alt="" />}
                    <span className="s2-card__like">
                      <Icon name="heart" size={16} />
                    </span>
                  </span>
                  <span className="s2-card__meta">
                    <span className="s2-card__title">{show.title}</span>
                    <span className="s2-card__sub">
                      {show.venue} · {show.distance ?? show.region}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <TabBar active="map" />
    </Phone>
  )
}

export default S2Map
