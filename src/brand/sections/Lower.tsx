import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { audienceReasons, clubs, exchanges, links, photos, posters, tickets } from '../content'
import { useReducedMotion } from '../useReducedMotion'
import { useScrollIndex } from '../useScrollIndex'

const EASE = [0.19, 1, 0.22, 1] as const

function Rise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
 * 06 챕터 — 풀블리드 공연 사진 위에 문장 하나.
 * 사진만 놓여 있던 자리에 문장과 버튼을 올려, 아래 섹션으로 넘어가는 문을 만듭니다.
 * ────────────────────────────────────────────────────────── */
export function Chapter() {
  return (
    <section className="b-chapter" id="start">
      <div className="b-chapter__ph" style={{ backgroundImage: `url("${photos.stage}")` }} role="img" aria-label="공연 중인 무대" />
      <div className="b-chapter__in">
        <Rise>
          <h2>
            공연을 만드는 건 결국
            <br />
            사람이 모이는 일입니다.
          </h2>
        </Rise>
        <Rise delay={0.08}>
          <p>
            공연장은 비는 날에 수익이 없고, 밴드는 대관료 150만 원이 부담이라 무대에 못 섭니다.
            BANDY는 그 빈 날에 밴드를 붙이고, 같이 설 팀과 보러 올 사람까지 모읍니다.
            밴드는 팀당 5만 원만 냅니다.
          </p>
          <div className="b-chapter__acts">
            <Link className="b-pill b-pill--lg b-pill--onblack" to={links.joinClub}>
              동아리로 시작하기
            </Link>
            <span className="b-chapter__note">동아리 운영진 코드로 들어갑니다.</span>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
 * 07 보러 가는 쪽이라면 — 왼쪽에 펼침 목록, 오른쪽에 붙어 따라오는 화면 한 장.
 * 고른 항목에 맞춰 오른쪽 그림만 바뀝니다 (한 화면에 움직임 하나).
 * ────────────────────────────────────────────────────────── */
const LINEUP = ['멜로딕', '렉사', '하모닉', '아카펠라']

function StepArt({ i }: { i: number }) {
  if (i === 1) {
    return (
      <div className="b-art b-art--ticket">
        <div className="b-art__cap">실제로 발행한 티켓</div>
        <div className="b-art__shot" style={{ backgroundImage: `url("${tickets.screen}")` }} />
        <div className="b-art__price">
          <b>5,000</b>
          <span>~</span>
          <b>10,000</b>
          <em>원</em>
        </div>
        <p className="b-art__foot">앱 설치 없이 링크로 예매하고, 당일엔 폰에 뜨는 QR 로 들어갑니다.</p>
      </div>
    )
  }
  if (i === 2) {
    return (
      <div className="b-art b-art--card">
        <div className="b-art__cap">공연장에서</div>
        <div className="b-art__swap">
          <div className="b-art__who"><b>멜로딕</b><small>광운대</small></div>
          <span className="b-art__arrow" aria-hidden="true">↔</span>
          <div className="b-art__who"><b>렉사</b><small>서울과기대</small></div>
        </div>
        <p className="b-art__foot">프로필을 주고받으면 다음 공연이 먼저 보입니다.</p>
      </div>
    )
  }
  return (
    <div className="b-art b-art--lineup">
      <div className="b-art__cap">오늘 라인업</div>
      <ol className="b-art__lineup">
        {LINEUP.map((n, k) => (
          <li key={n} data-known={k === 0 ? '1' : '0'}>
            <span>{String(k + 1).padStart(2, '0')}</span>
            <b>{n}</b>
            {k === 0 ? <em>아는 밴드</em> : <i>처음 보는 밴드</i>}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Steps() {
  /* 스크롤만 내려도 01 → 02 → 03 이 차례로 펼쳐집니다.
     올려놓거나 누르는 건 먼저 보고 싶을 때를 위한 보조입니다. */
  const [ref, on, setOn] = useScrollIndex(audienceReasons.length, { start: 'start 0.75', end: 'end 0.55' })

  return (
    <section className="b-steps" id="audience" ref={ref}>
      <div className="b-steps__text">
        <p className="b-kicker">보러 가는 쪽이라면</p>
        <h2 className="b-steps__h">
          모르던 밴드가
          <br />
          아는 밴드가 되는 곳.
        </h2>

        <div className="b-steps__list">
          {audienceReasons.map((r, i) => (
            <button
              key={r.head}
              type="button"
              className="b-steps__item"
              data-on={i === on ? '1' : '0'}
              aria-expanded={i === on}
              onClick={() => setOn(i)}
              onMouseEnter={() => setOn(i)}
            >
              <span className="b-steps__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="b-steps__body">
                <b>{r.head}</b>
                <span className="b-steps__p">{r.body}</span>
              </span>
            </button>
          ))}
        </div>

        <Link className="b-pill b-pill--lg b-steps__cta" to={links.shows}>
          이번 주 공연 보기
        </Link>
      </div>

      <div className="b-steps__art" aria-hidden="true">
        <div className="b-steps__stick">
          <StepArt i={on} />
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
 * 08 다른 학교 밴드와도 이어져요 — 왼쪽 목록, 오른쪽 연결도.
 * 지리적 지도가 아니라 우리가 실제로 가진 연결만 그립니다.
 * ────────────────────────────────────────────────────────── */
const HOME = { name: '멜로딕', uni: '광운대' }

export function MapConnect() {
  /* 여기도 마찬가지입니다 — 내려가는 동안 이어진 동아리가 하나씩 켜집니다 */
  const [ref, on, setOn] = useScrollIndex(exchanges.length, { start: 'start 0.75', end: 'end 0.55' })
  const picked = exchanges[on]

  return (
    <section className="b-map" id="connect" ref={ref}>
      <div className="b-map__text">
        <p className="b-kicker">같이 설 팀 찾기</p>
        <h2 className="b-map__h">
          다른 학교 밴드와도
          <br />
          이어져요.
        </h2>
        <p className="b-map__sub">
          서로 음악이 맞으면 학교는 상관없습니다. 이미 이어져 있는 동아리를 보고, 다음 무대를
          같이 잡습니다.
        </p>

        <div className="b-map__list">
          {exchanges.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className="b-map__row"
              data-on={i === on ? '1' : '0'}
              onMouseEnter={() => setOn(i)}
              onFocus={() => setOn(i)}
              onClick={() => setOn(i)}
            >
              <span className="b-map__dot">{c.short}</span>
              <b>{c.name}</b>
              <small>{c.uni}</small>
            </button>
          ))}
        </div>

        <p className="b-map__meta">
          지금은 노원 5개 대학부터 시작합니다 — 광운대 · 서울과기대 · 삼육대 · 서울여대 · 인덕대.
          <br />
          다음은 서울 동북권이고, 밴드 동아리가 있는 학교라면 어디든 열려 있습니다.
        </p>
      </div>

      <div className="b-map__art">
        <div className="b-map__plot">
          <svg viewBox="0 0 440 440" className="b-map__svg" aria-hidden="true">
            <circle cx="220" cy="220" r="150" className="b-map__ring" />
            <circle cx="220" cy="220" r="95" className="b-map__ring" />
            {exchanges.map((c, i) => {
              const rad = (c.deg * Math.PI) / 180
              const x = 220 + Math.cos(rad) * (c.r * 0.86)
              const y = 220 + Math.sin(rad) * (c.r * 0.86)
              return (
                <line
                  key={c.name}
                  x1="220"
                  y1="220"
                  x2={x}
                  y2={y}
                  className="b-map__link"
                  data-on={i === on ? '1' : '0'}
                />
              )
            })}
          </svg>

          <div className="b-map__hub">
            <b>{HOME.name}</b>
            <small>{HOME.uni}</small>
          </div>

          {exchanges.map((c, i) => {
            const rad = (c.deg * Math.PI) / 180
            const x = 50 + (Math.cos(rad) * (c.r * 0.86)) / 4.4
            const y = 50 + (Math.sin(rad) * (c.r * 0.86)) / 4.4
            return (
              <span
                key={c.name}
                className="b-map__node"
                data-on={i === on ? '1' : '0'}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {c.short}
              </span>
            )
          })}
        </div>

        <div className="b-map__card">
          <div className="b-map__card-top">
            <span className="b-map__dot b-map__dot--lg">{picked.short}</span>
            <div>
              <b>{picked.name}</b>
              <small>{picked.uni}</small>
            </div>
          </div>
          <div className="b-map__card-row">
            <div><em>{picked.together}</em><span>함께 선 공연</span></div>
            <div><em>{picked.cheer}</em><span>응원 간 공연</span></div>
            <div><em>{picked.meet}</em><span>만난 사람</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
 * 09 같이한 기록 — 숫자 표가 아니라 읽히는 한 줄로.
 * 0 은 적지 않습니다. 없던 일을 0 으로 적어 두면 빈칸이 성적처럼 보입니다.
 * ────────────────────────────────────────────────────────── */
type Row = (typeof exchanges)[number]

/** 있었던 일만 골라 문장 조각으로 만듭니다 */
function deeds(c: Row) {
  const out: { n: number; before: string; after: string }[] = []
  if (c.together) out.push({ n: c.together, before: '같이 ', after: '번 섰습니다' })
  if (c.cheer) out.push({ n: c.cheer, before: '응원 ', after: '번 갔습니다' })
  if (c.meet) out.push({ n: c.meet, before: '', after: '명과 프로필을 주고받았습니다' })
  return out
}

export function Record() {
  const rows = [...exchanges].sort(
    (a, b) => b.together + b.cheer + b.meet - (a.together + a.cheer + a.meet)
  )
  const sum = (k: 'together' | 'cheer' | 'meet') => exchanges.reduce((t, c) => t + c[k], 0)

  return (
    <section className="b-rec" id="record">
      <div className="b-rec__head">
        <p className="b-kicker">공연이 끝난 뒤</p>
        <h2 className="b-rec__h">같이한 기록이 남습니다.</h2>
        <p className="b-rec__sub">
          멜로딕이 지금까지 만난 동아리 {exchanges.length}곳 — 같이 선 공연 {sum('together')}번,
          응원 간 공연 {sum('cheer')}번, 프로필을 주고받은 사람 {sum('meet')}명.
        </p>
      </div>

      <ul className="b-rec__log">
        {rows.map((c, i) => (
          /* 한 덩어리로 나타나면 스크롤과 따로 노는 느낌이 납니다 —
             줄마다 제 차례에 올라옵니다 */
          <motion.li
            className="b-rec__row"
            key={c.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, delay: Math.min(i, 2) * 0.04, ease: EASE }}
          >
            <span className="b-map__dot">{c.short}</span>
            <span className="b-rec__name">
              <b>{c.name}</b>
              <small>{c.uni}</small>
            </span>
            <span className="b-rec__deeds">
              {deeds(c).map((d, i) => (
                <span className="b-rec__deed" key={d.after}>
                  {i > 0 && <i aria-hidden="true">·</i>}
                  {d.before}
                  <em>{d.n}</em>
                  {d.after}
                </span>
              ))}
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="b-rec__note">
        점수나 온도가 아니라 실제로 있었던 일만 적습니다. 활동이 없다고 깎이지도 않습니다.
      </p>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
 * 10 BANDY 로 치른 공연 — 포스터 가로 배열 + 전체 보기.
 * ────────────────────────────────────────────────────────── */
export function Week() {
  return (
    <section className="b-week">
      <div className="b-week__head">
        <div>
          <p className="b-kicker">BANDY로 치른 공연</p>
          <h2 className="b-week__h">이렇게 올렸습니다.</h2>
        </div>
        <Link className="b-pill b-week__all" to={links.shows}>
          전체 공연 보기
        </Link>
      </div>

      <div className="b-week__row">
        {posters.slice(0, 3).map((p, i) => (
          <motion.figure
            className="b-week__card"
            key={p.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.07, ease: EASE }}
          >
            <div className="b-week__ph" style={{ backgroundImage: `url("${p.src}")` }} />
            <figcaption>
              <b>{p.title}</b>
              <small>{p.sub}</small>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
 * 11 어느 쪽 입장권이 필요하세요? — 티켓 모양 타일 두 장.
 * ────────────────────────────────────────────────────────── */
function Perf() {
  return <span className="b-tk__perf" aria-hidden="true" />
}

export function Tickets() {
  return (
    <section className="b-tk">
      <h2 className="b-tk__h">어느 쪽 입장권이 필요하세요?</h2>

      <div className="b-tk__row">
        <Link className="b-tk__card" to={links.joinClub}>
          <div className="b-tk__art" style={{ backgroundImage: `url("${tickets.nostalgic.src}")` }}>
            <span className="b-tk__side">무대에 서는 쪽</span>
          </div>
          <Perf />
          <div className="b-tk__main">
            <small>{tickets.nostalgic.title} · {tickets.nostalgic.sub}</small>
            <b>공연 올리기</b>
            <p>공연을 올리고 예매를 받습니다. 입장 확인과 정산까지 한 곳에서.</p>
            <span className="b-pill b-pill--sm">동아리로 시작하기</span>
          </div>
        </Link>

        <Link className="b-tk__card b-tk__card--alt" to={links.joinAudience}>
          <div className="b-tk__art" style={{ backgroundImage: `url("${tickets.custom.src}")` }}>
            <span className="b-tk__side">보러 가는 쪽</span>
          </div>
          <Perf />
          <div className="b-tk__main">
            <small>{tickets.custom.title} · {tickets.custom.sub}</small>
            <b>공연 보러 가기</b>
            <p>가까운 공연을 찾고, 링크 하나로 예매하고, 폰으로 입장합니다.</p>
            <span className="b-pill b-pill--sm">가까운 공연 찾기</span>
          </div>
        </Link>
      </div>

      <p className="b-tk__note">
        함께 공연해 온 동아리 — {clubs.map((c) => c.name).join(' · ')}
      </p>
    </section>
  )
}
