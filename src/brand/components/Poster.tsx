import { photos } from '../content'

/**
 * 히어로 띠에 들어가는 공연 포스터.
 *
 * 레이아웃은 `Bandy Landing v3` 시안의 포스터 틀을 그대로 옮겼습니다 —
 * solo(lSolo) · spot(lSpot) · war(lWar) · pink(lPink) · sky(lSky).
 * 치수는 전부 `cqw` 라서 띠에서 작게 나와도 조판 비율이 유지됩니다.
 *
 * 날짜 칸은 비워 뒀습니다. 아직 안 잡힌 공연이라 넣으면 지어내는 셈이고,
 * 연도도 마찬가지입니다. 정해지면 아래 `upcoming` 에 넣고 자리에 꽂으면 됩니다.
 */
export interface PosterData {
  variant: 'solo' | 'spot' | 'war' | 'pink' | 'sky'
  /** 라틴 조판에 쓰는 이름 — 한글은 Anton·Lobster·Bebas 가 그리지 못합니다 */
  en: string
  title: string
  note: string
  club?: string
  venue?: string
  /** war — 왼쪽에 크게 박히는 약자 */
  abbr?: string
  /** spot — 오른쪽 큰 흘림체 두 줄 */
  script?: [string, string]
  /** sky — 오른쪽 위 지역 */
  region?: string
  photo: string
}

export default function Poster({ p }: { p: PosterData }) {
  if (p.variant === 'spot') {
    const [a, b] = p.script ?? ['Live', 'Stage']
    return (
      <div className="b-po b-po--spot">
        <div className="b-po__bg" style={{ backgroundImage: `url("${p.photo}")` }} />
        <div className="b-po__sweep" />
        <span className="b-po__dot" />
        <div className="b-po__kicker">{p.en}</div>
        <div className="b-po__script">
          {a}
          <br />
          {b}
        </div>
        <div className="b-po__foot">
          <div className="b-po__foot-a">{p.title}</div>
          <div className="b-po__foot-b">{p.note}</div>
        </div>
      </div>
    )
  }

  if (p.variant === 'war') {
    return (
      <div className="b-po b-po--war">
        <div className="b-po__war-top">
          <span className="b-po__war-abbr">{p.abbr ?? p.en.slice(0, 3)}</span>
          <span className="b-po__war-tour">
            LIVE
            <br />
            TOUR
          </span>
        </div>
        <div className="b-po__war-ph" style={{ backgroundImage: `url("${p.photo}")` }} />
        <div className="b-po__war-foot">
          <div className="b-po__war-club">{p.club}</div>
          <div className="b-po__war-region">{p.region ?? 'NOWON SEOUL'}</div>
          <div className="b-po__war-row">
            <span>
              {p.title}
              <br />
              {p.note}
            </span>
            <span className="b-po__war-en">{p.en}</span>
          </div>
        </div>
      </div>
    )
  }

  if (p.variant === 'pink') {
    return (
      <div className="b-po b-po--pink">
        <div className="b-po__pink-ph" style={{ backgroundImage: `url("${p.photo}")` }} />
        <div className="b-po__pink-top">+ {p.en} LIVE +</div>
        <div className="b-po__rail b-po__rail--l">
          <span>JOIN THE {p.en} CLUB</span>
        </div>
        <div className="b-po__rail b-po__rail--r">
          <span>JOIN THE {p.en} CLUB</span>
        </div>
        <div className="b-po__pink-mid">
          <div className="b-po__pink-script">{p.club}</div>
          <div className="b-po__pink-pill">{p.title}</div>
          <div className="b-po__pink-note">{p.note}</div>
        </div>
        <div className="b-po__pink-bar">At {p.venue}</div>
      </div>
    )
  }

  if (p.variant === 'sky') {
    return (
      <div className="b-po b-po--sky">
        <div className="b-po__sky-circle">
          <div style={{ backgroundImage: `url("${p.photo}")` }} />
        </div>
        <div className="b-po__sky-ring" />
        <div className="b-po__sky-text">
          <div className="b-po__sky-head">
            <span>
              {p.en} LIVE
              <br />
              {p.venue}
            </span>
            <span>IN {p.region ?? 'NOWON'}</span>
          </div>
          <div className="b-po__sky-title">{p.title}</div>
          {/* 한 줄로 둡니다 — 두 줄이면 아래 원과 겹칩니다 */}
          <div className="b-po__sky-sub">
            {p.note} · <span>{p.club}</span>
          </div>
        </div>
        <div className="b-po__sky-bar">
          <span>BANDY</span>
          <span>{p.venue}</span>
          <span>예매 bandy.kr</span>
        </div>
      </div>
    )
  }

  return (
    <div className="b-po b-po--solo">
      <div className="b-po__top">
        <span>BANDY LIVE</span>
        <span>PROUDLY PRESENTS</span>
      </div>
      <div className="b-po__mid">
        <div className="b-po__pre">LIVE CONCERT OF</div>
        <div className="b-po__big">{p.en}</div>
      </div>
      <div className="b-po__band" style={{ backgroundImage: `url("${p.photo}")` }} />
      <div className="b-po__meta">
        <div>
          <b>{p.title}</b>
          <span>{p.note}</span>
        </div>
        <div className="b-po__meta-r">
          <b>{p.club}</b>
          <span>{p.venue}</span>
        </div>
      </div>
      <div className="b-po__rule">
        <span>NO SIGN-UP · TICKET BY SMS</span>
        <span>BANDY.KR</span>
      </div>
    </div>
  )
}

/** 아직 포스터가 없는, 곧 열릴 공연들 — 날짜가 잡힌 건은 아직 없습니다 */
export const upcoming: PosterData[] = [
  {
    variant: 'solo',
    en: 'MELOD.IC',
    title: '겨울의 소리',
    note: '단독 공연',
    club: '멜로딕',
    venue: '라디오가가',
    photo: photos.stage,
  },
  {
    variant: 'spot',
    en: 'BANDY',
    title: '3월 연합 공연',
    note: '팀 구하는 중',
    script: ['March', 'Stage'],
    photo: photos.wall,
  },
  {
    variant: 'solo',
    en: 'LEXA',
    title: '합동 공연',
    note: '날짜 조율 중',
    club: '렉사',
    venue: '장소 조율 중',
    photo: photos.entry,
  },
  {
    variant: 'spot',
    en: 'HARMONIC',
    title: '봄 정기공연',
    note: '팀 구하는 중',
    script: ['Spring', 'Stage'],
    photo: photos.stage,
  },
  {
    variant: 'solo',
    en: 'SORIUL',
    title: '첫 합동 무대',
    note: '팀 구하는 중',
    club: '소리울',
    venue: '장소 조율 중',
    photo: photos.wall,
  },
  {
    variant: 'war',
    en: 'ACAPELLA',
    abbr: 'ACA',
    title: '합동 무대',
    note: '팀 구하는 중',
    club: '아카펠라',
    region: 'NOWON SEOUL',
    photo: photos.entry,
  },
  {
    variant: 'pink',
    en: 'SONAREUM',
    title: '정기공연',
    note: '날짜 조율 중',
    club: '손아름',
    venue: '인덕대',
    photo: photos.stage,
  },
  {
    variant: 'sky',
    en: 'BLUENOTE',
    title: '겨울 무대',
    note: '팀 구하는 중',
    club: '블루노트',
    venue: '광운대',
    region: 'NOWON',
    photo: photos.wall,
  },
]
