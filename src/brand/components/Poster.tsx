import { photos } from '../content'

/**
 * 히어로 띠에 들어가는 공연 포스터.
 *
 * 레이아웃은 `Bandy Landing v3` 시안의 포스터 틀(lSolo · lSpot)을 그대로 옮겼습니다.
 * 치수는 전부 `cqw` 라서 띠에서 작게 나와도 조판 비율이 유지됩니다.
 *
 * 날짜 칸은 비워 뒀습니다 — 아직 안 잡힌 공연이라 넣으면 지어내는 셈이 됩니다.
 * 날짜가 정해지면 `content.ts` 의 `upcoming` 에 `date` 를 넣고 아래 자리에 꽂으면 됩니다.
 */
export interface PosterData {
  variant: 'solo' | 'spot'
  /** 라틴 조판에 쓰는 이름 — 한글은 Anton·Lobster 가 그리지 못합니다 */
  en: string
  title: string
  note: string
  club?: string
  venue?: string
  photo: string
}

export default function Poster({ p }: { p: PosterData }) {
  if (p.variant === 'spot') {
    return (
      <div className="b-po b-po--spot">
        <div className="b-po__bg" style={{ backgroundImage: `url("${p.photo}")` }} />
        <div className="b-po__sweep" />
        <span className="b-po__dot" />
        <div className="b-po__kicker">{p.en}</div>
        <div className="b-po__script">
          March
          <br />
          Stage
        </div>
        <div className="b-po__foot">
          <div className="b-po__foot-a">{p.title}</div>
          <div className="b-po__foot-b">{p.note}</div>
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

/** 아직 포스터가 없는, 곧 열릴 공연들 — 아는 사실만 적습니다 */
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
]
