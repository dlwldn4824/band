import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapShow } from '../../mocks/bandyLight'

/**
 * 공연 지도.
 *
 * Figma(205:30)는 이 자리에 점·레이더 일러스트를 두었지만, 실제로 서울·신촌·부산처럼
 * 떨어진 지역의 공연을 돌려 보려면 진짜 지도가 있어야 해서 Leaflet + OpenStreetMap 으로
 * 바꿨습니다. 마커 생김새는 Figma 의 검은 점 · 빨간 내 위치 · 레이더 원을 그대로 옮겼습니다.
 *
 * 카카오맵으로 바꾸려면 이 파일 하나만 고치면 됩니다. 카카오는 JS 키와 도메인 등록이
 * 필요해서, 키가 없어도 지금 바로 뜨는 OSM 을 기본으로 두었습니다.
 */

interface ShowMapProps {
  shows: MapShow[]
  center: { lat: number; lng: number; zoom: number }
  /** 내 위치 (레이더 원의 중심) */
  me?: { lat: number; lng: number }
  selectedId?: string
  onSelect?: (show: MapShow) => void
  /** 지도를 움직일 때마다 화면 안에 들어온 공연들을 알려 줍니다 */
  onViewChange?: (visible: MapShow[]) => void
  height?: number
}

const markerIcon = (selected: boolean) =>
  L.divIcon({
    className: 'lui-map__pin-wrap',
    html: `<span class="lui-map__pin${selected ? ' lui-map__pin--on' : ''}"></span>`,
    iconSize: [selected ? 30 : 22, selected ? 30 : 22],
    iconAnchor: [selected ? 15 : 11, selected ? 15 : 11],
  })

const meIcon = () =>
  L.divIcon({
    className: 'lui-map__me-wrap',
    html: '<span class="lui-map__radar"></span><span class="lui-map__radar lui-map__radar--2"></span><span class="lui-map__me"></span>',
    iconSize: [160, 160],
    iconAnchor: [80, 80],
  })

const ShowMap = ({
  shows,
  center,
  me,
  selectedId,
  onSelect,
  onViewChange,
  height = 430,
}: ShowMapProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange

  // 지도 생성 (한 번만)
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return
    const map = L.map(boxRef.current, {
      center: [center.lat, center.lng],
      zoom: center.zoom,
      zoomControl: false,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // 컨테이너 크기가 늦게 잡히면 타일이 좌측 상단만 깔립니다.
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(boxRef.current)

    const report = () => {
      const bounds = map.getBounds()
      onViewChangeRef.current?.(shows.filter((s) => bounds.contains([s.lat, s.lng])))
    }
    map.on('moveend', report)
    report()

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
    // center/shows 는 최초 1회만 씁니다 — 이후에는 사용자가 움직인 위치를 유지합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마커 다시 그리기
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (me) L.marker([me.lat, me.lng], { icon: meIcon(), interactive: false }).addTo(layer)

    shows.forEach((show) => {
      L.marker([show.lat, show.lng], {
        icon: markerIcon(show.id === selectedId),
        title: show.title,
      })
        .on('click', () => onSelect?.(show))
        .addTo(layer)
    })
  }, [shows, selectedId, me, onSelect])

  return <div ref={boxRef} className="lui-map" style={{ height }} />
}

export default ShowMap
