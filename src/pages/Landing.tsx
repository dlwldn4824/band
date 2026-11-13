import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Lenis from 'lenis'
import { SERVICE_NAME, SERVICE_NAME_EN } from '../config/brand'
import './Landing.css'

/**
 * 밴디(BANDY) 소개 페이지.
 *
 * 섹션 순서와 레이아웃 패턴은 Partiful 의 랜딩 구성을 참고했습니다.
 * 히어로 → 분야 띠 → 3단 목업 → 카드 강 → 지역 → 폼 목업 →
 * 기능 3연속 → 그 이상 → 요약 → 지표 → 마무리 → 푸터.
 * 문구·이미지·연출은 전부 자체 제작이고, 강조점은 우리 것(교류 → 유입)으로 바꿨습니다.
 */

/**
 * 소개 페이지에서만 쓰는 부드러운 스크롤.
 *
 * 휠을 굴리면 지수 감속으로 미끄러지다 멈춥니다. 랜딩의 "고급스러운" 인상은
 * 대부분 애니메이션이 아니라 이 스크롤 감각에서 나옵니다.
 *
 * 이 페이지에만 겁니다. 채팅·방명록처럼 body 스크롤을 직접 잠그는 화면이
 * 따로 있어서, 전역에 걸면 그쪽 동작을 건드리게 됩니다.
 * Lenis 는 실제 스크롤 위치를 움직이므로 IntersectionObserver 기반 등장
 * 효과는 그대로 동작합니다.
 */
const useSmoothScroll = () => {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const lenis = new Lenis({
      duration: 0.6,
      // 지수 감속 — 끝에서 부드럽게 멎습니다.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let frameId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }
    frameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [])
}

/** 스크롤에 맞춰 한 번만 등장시킵니다. */
const Reveal = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isIn, setIsIn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsIn(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIn(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`lp-reveal ${isIn ? 'is-in' : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/**
 * 단계가 있는 연출을 돌리는 공통 훅.
 * timings[i] 만큼 머문 뒤 다음 단계로 가고, 마지막에서 처음으로 돌아옵니다.
 *
 * 화면에 들어온 뒤에 시작합니다. 화면 밖에서 계속 돌면 사용자가 스크롤해
 * 도착했을 때 이미 연출 중간이라, 처음부터 못 보고 지나치게 됩니다.
 * 모션을 줄인 환경에서는 마지막 단계로 고정해 결과만 보여 줍니다.
 *
 * 반환한 ref 를 연출 컨테이너에 걸어 주세요.
 */
const useLoopStep = (timings: number[]) => {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const el = ref.current
    const last = timings.length - 1

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || !el || typeof IntersectionObserver === 'undefined') {
      setStep(last)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const advance = (current: number) => {
      if (cancelled) return
      timeoutId = setTimeout(() => {
        if (cancelled) return
        const next = current >= last ? 0 : current + 1
        setStep(next)
        advance(next)
      }, timings[current])
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        setStep(0)
        advance(0)
      },
      { threshold: 0.35 }
    )
    observer.observe(el)

    return () => {
      cancelled = true
      observer.disconnect()
      clearTimeout(timeoutId)
    }
    // timings 는 모듈 상수로만 넘깁니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { step, ref }
}

const CONNECT_TIMINGS = [500, 700, 900, 800, 900, 2600]

/**
 * 히어로 연출 — 교류 신청이 수락되고, 그 연결이 행사 초대로 바뀌는 순간.
 * Partiful 이 "단톡방이 초대장이 되는 순간"을 연기한다면,
 * 우리는 "동아리 하나가 통째로 연결되는 순간"을 연기합니다.
 */
const ConnectStage = () => {
  const { step, ref } = useLoopStep(CONNECT_TIMINGS)

  return (
    <div className="lp-stage" ref={ref} aria-hidden="true">
      <div className={`lp-club lp-club--a ${step >= 1 ? 'is-on' : ''}`}>
        <div className="lp-club-emblem">🎸</div>
        <div>
          <div className="lp-club-name">소리풀</div>
          <div className="lp-club-uni">한빛대학교 · 밴드</div>
        </div>
      </div>

      <div className={`lp-club lp-club--b ${step >= 2 ? 'is-on' : ''}`}>
        <div className="lp-club-emblem">🖤</div>
        <div>
          <div className="lp-club-name">블랙노트</div>
          <div className="lp-club-uni">새길대학교 · 밴드</div>
        </div>
      </div>

      <div className={`lp-bubble ${step >= 3 ? 'is-on' : ''}`}>
        하반기에 합동공연 같이 해보고 싶어요
      </div>

      <div className={`lp-accept ${step >= 4 ? 'is-on' : ''}`}>교류 수락됨</div>

      <div className={`lp-invite ${step >= 5 ? 'is-on' : ''}`}>
        <div className="lp-invite-top">
          <div className="lp-club-emblem">🎫</div>
          <div>
            <div className="lp-invite-title">소리풀 정기공연 — Autumn Night</div>
            <div className="lp-invite-meta">11. 1(일) 18:30 · 한빛대 소극장</div>
          </div>
        </div>
        <div className="lp-chips">
          <span className="lp-chip lp-chip--hero">교류로 발견한 행사</span>
          <span className="lp-chip">8,000원</span>
          <span className="lp-chip">45석 남음</span>
        </div>
      </div>
    </div>
  )
}

/** A. 분야를 바꾸면 동아리 목록이 갈리는 탐색 데모 */
const FILTER_TABS = [
  {
    label: '밴드',
    clubs: [
      { emblem: '🎸', name: '소리풀', sub: '한빛대학교', tag: '교류 2곳' },
      { emblem: '🖤', name: '블랙노트', sub: '새길대학교', tag: '교류 1곳' },
    ],
  },
  {
    label: '댄스',
    clubs: [{ emblem: '👟', name: '스텝온', sub: '한빛대학교', tag: '교류 1곳' }],
  },
  {
    label: '아카펠라',
    clubs: [{ emblem: '🎤', name: '하모니카', sub: '도원대학교', tag: '교류 1곳' }],
  },
  {
    label: '연극·뮤지컬',
    clubs: [{ emblem: '🎭', name: '막과막사이', sub: '청림대학교', tag: '교류 2곳' }],
  },
  {
    label: '사진',
    clubs: [{ emblem: '📷', name: '찰나', sub: '도원대학교', tag: '교류 1곳' }],
  },
  {
    label: 'IT·개발',
    clubs: [
      { emblem: '💻', name: '코드모아', sub: '한빛대학교', tag: '교류 1곳' },
      { emblem: '🔀', name: '깃플로우', sub: '새길대학교', tag: '교류 1곳' },
    ],
  },
]

const FILTER_TIMINGS = FILTER_TABS.map(() => 2000)

const FilterDemo = () => {
  const { step: active, ref } = useLoopStep(FILTER_TIMINGS)
  const tab = FILTER_TABS[active]

  return (
    <div className="lp-demo" ref={ref} aria-hidden="true">
      <div className="lp-demo-chips">
        {FILTER_TABS.map((t, i) => (
          <span key={t.label} className={`lp-demo-chip ${i === active ? 'is-on' : ''}`}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="lp-demo-list">
        {tab.clubs.map((club) => (
          /* key 에 분야를 섞어 분야가 바뀔 때마다 다시 등장하게 합니다 */
          <div className="lp-demo-row" key={`${tab.label}-${club.name}`}>
            <div className="lp-demo-emblem">{club.emblem}</div>
            <div>
              <div className="lp-demo-name">{club.name}</div>
              <div className="lp-demo-sub">
                {club.sub} · {tab.label}
              </div>
            </div>
            <span className="lp-demo-tag">{club.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** C. 현장에서 프로필 카드 두 장이 맞닿아 교환되는 데모 */
/* 0: 떨어져 있음 → 1: 가까워짐 → 2: 맞닿음 → 3: 연락처 공개 후 멈춤 */
const EXCHANGE_TIMINGS = [900, 900, 700, 2600]

const ExchangeDemo = () => {
  const { step, ref } = useLoopStep(EXCHANGE_TIMINGS)
  const near = step >= 1
  const tapped = step >= 2
  const shared = step >= 3

  return (
    <div className="lp-demo" ref={ref} aria-hidden="true">
      <div className="lp-demo-swap">
        <div className={`lp-xcard lp-xcard--l ${near ? 'is-near' : ''} ${tapped ? 'is-tapped' : ''}`}>
          <div className="lp-xcard-top">
            <div className="lp-demo-emblem">지</div>
            <div>
              <div className="lp-xcard-name">지우</div>
              <div className="lp-xcard-club">소리풀 · 한빛대</div>
            </div>
          </div>
          <div className="lp-xcard-tags">
            <span className="lp-xcard-tag">#밴드</span>
            <span className="lp-xcard-tag">#작곡</span>
          </div>
          <div className={`lp-xcard-contact ${shared ? 'is-on' : ''}`}>@minseo_dr</div>
        </div>

        <div className={`lp-xcard lp-xcard--r ${near ? 'is-near' : ''} ${tapped ? 'is-tapped' : ''}`}>
          <div className="lp-xcard-top">
            <div className="lp-demo-emblem">민</div>
            <div>
              <div className="lp-xcard-name">민서</div>
              <div className="lp-xcard-club">블랙노트 · 새길대</div>
            </div>
          </div>
          <div className="lp-xcard-tags">
            <span className="lp-xcard-tag">#밴드</span>
            <span className="lp-xcard-tag">#드럼</span>
          </div>
          <div className={`lp-xcard-contact ${shared ? 'is-on' : ''}`}>@jiwoo_gtr</div>
        </div>
      </div>
      <p className="lp-demo-cap">
        공개로 둔 항목만 상대에게 전달됩니다. 연락처를 닫아 두면 교환해도 보이지 않습니다.
      </p>
    </div>
  )
}

/**
 * 분야 쇼케이스 — 큰 분야명이 바뀌면서 포스터 띠가 흐르고,
 * 가운데로 온 포스터의 행사 정보가 아래에 나타납니다.
 * 분야마다 대표 행사를 하나씩 세웠습니다(시드와 같은 가상 값).
 */
const SHOWCASE = [
  { cat: '밴드', big: '가을밤', variant: 'burst', bg: '#ff4c4c', ink: '#120404', burst: '#ffe9e9',
    title: '소리풀 정기공연 — Autumn Night', club: '소리풀', uni: '한빛대학교', date: '11.01', venue: '한빛대 소극장',
    meta: '11월 1일 · 한빛대 소극장', going: 71 },
  { cat: '댄스', big: 'FLOOR', variant: 'band', bg: '#7cc3ff', ink: '#06121c', burst: '#eaf6ff',
    title: '스텝온 정기공연 — FLOOR', club: '스텝온', uni: '한빛대학교', date: '11.15', venue: '한빛대 대강당',
    meta: '11월 15일 · 한빛대 대강당', going: 112 },
  { cat: '아카펠라', big: '목소리만', variant: 'burst', bg: '#ffd166', ink: '#1d1403', burst: '#fff6dd',
    title: '하모니카 소극장 공연 — 목소리만', club: '하모니카', uni: '도원대학교', date: '10.28', venue: '도원아트홀',
    meta: '10월 28일 · 도원아트홀', going: 44 },
  { cat: '연극·뮤지컬', big: '암전 사이', variant: 'flat', bg: '#c08cff', ink: '#140720', burst: '#f2e6ff',
    title: '막과막사이 단막극전 — 암전 사이', club: '막과막사이', uni: '청림대학교', date: '11.04', venue: '청림대 블랙박스',
    meta: '11월 4일 · 청림대 블랙박스', going: 29 },
  { cat: '영화·영상', big: '24프레임', variant: 'num', bg: '#8fe0c0', ink: '#04140e', burst: '#eafff6',
    title: '프레임워크 상영회 — 24프레임', club: '프레임워크', uni: '새길대학교', date: '11.11', venue: '새길대 영상강의실',
    meta: '11월 11일 · 새길대 영상강의실', going: 51 },
  { cat: '미술·디자인', big: '벽의 사정', variant: 'band', bg: '#ff9f68', ink: '#1a0a02', burst: '#fff1e6',
    title: '색다른 학기전 — 벽의 사정', club: '색다른', uni: '백록대학교', date: '10.25', venue: '백록대 전시실',
    meta: '10월 25일 · 백록대 전시실', going: 33 },
  { cat: '사진', big: '남는 건', variant: 'flat', bg: '#9aa7ff', ink: '#070b22', burst: '#e9ecff',
    title: '찰나 사진전 — 남는 건', club: '찰나', uni: '도원대학교', date: '11.20', venue: '도원대 갤러리',
    meta: '11월 20일 · 도원대 갤러리', going: 18 },
  { cat: 'IT·개발', big: '48시간', variant: 'num', bg: '#5ad1e6', ink: '#021519', burst: '#e3fbff',
    title: '코드모아 해커톤 — 48시간', club: '코드모아', uni: '한빛대학교', date: '11.17', venue: '한빛대 창업보육센터',
    meta: '11월 17일 · 한빛대 창업보육센터', going: 41 },
]

const SHOWCASE_TIMINGS = SHOWCASE.map(() => 2600)

/* 포스터 폭(활성/비활성)과 간격 — 트랙 이동량 계산에 그대로 씁니다 */
const POSTER = { w: 158, active: 258, gap: 12 }

const CategoryShowcase = () => {
  const { step, ref } = useLoopStep(SHOWCASE_TIMINGS)
  const [shown, setShown] = useState(step)
  const [fading, setFading] = useState(false)
  const navigate = useNavigate()

  // 제목·정보는 살짝 사라졌다 바뀌고, 띠는 곧바로 움직입니다
  useEffect(() => {
    if (step === shown) return
    setFading(true)
    const t = setTimeout(() => {
      setShown(step)
      setFading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [step, shown])

  // 활성 포스터가 가운데 오도록 트랙을 당깁니다
  const offset =
    -(step * (POSTER.w + POSTER.gap)) - POSTER.active / 2 + (POSTER.w - POSTER.active) / 2

  const item = SHOWCASE[shown]

  return (
    <section className="lp-show" ref={ref}>
      <div className="lp-show-head">
        <span className={`lp-show-cat ${fading ? 'is-out' : ''}`}>{item.cat}</span>
      </div>

      <div className="lp-show-strip" aria-hidden="true">
        <div className="lp-show-track" style={{ transform: `translateX(${offset}px)` }}>
          {SHOWCASE.map((it, i) => (
            <div
              key={it.cat}
              className={`lp-poster lp-poster--${it.variant} ${i === step ? 'is-active' : ''}`}
              style={{
                ['--poster-bg' as string]: it.bg,
                ['--poster-ink' as string]: it.ink,
                ['--poster-burst' as string]: it.burst,
              }}
            >
              <div className="lp-poster-burst" />
              <div className="lp-poster-inner">
                <div className="lp-poster-kicker">
                  {it.club} · {it.uni}
                </div>
                <div className="lp-poster-big">{it.big}</div>
                <div className="lp-poster-foot">
                  <span>{it.date}</span>
                  <span>{it.venue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-show-info">
        <div className={`lp-show-fade ${fading ? 'is-out' : ''}`}>
          <div className="lp-show-title">{item.title}</div>
          <div className="lp-show-meta">
            {item.meta}
            <br />
            {item.going}명 예약
          </div>
        </div>
        <div className="lp-show-cta">
          <button
            type="button"
            className="lp-show-btn lp-show-btn--primary"
            onClick={() => navigate('/explore?mode=events')}
          >
            행사 보기
          </button>
          <button
            type="button"
            className="lp-show-btn lp-show-btn--ghost"
            onClick={() => navigate('/explore')}
          >
            전체 보기
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * 티켓 발권 — 앱의 TicketTransition 연출(절취 + 도장)을 랜딩으로 옮겼습니다.
 * 공연명·장소는 시드와 같은 가상 값입니다.
 * 0 발권 중 → 1 찢어짐 → 2 도장 → 3 유지
 */
const TICKET_TIMINGS = [1100, 950, 700, 2500]

const TicketTearDemo = () => {
  const { step, ref } = useLoopStep(TICKET_TIMINGS)
  const torn = step >= 1
  const stamped = step >= 2

  return (
    <div className="lp-ticket-wrap" ref={ref} aria-hidden="true">
      <div className="lp-ticket-col">
        <div className={`lp-ticket ${torn ? 'is-torn' : ''}`}>
          <div className="lp-ticket-piece lp-ticket-main">
            <div className="lp-ticket-body">
              <div className="lp-ticket-brand">BANDY · 밴디</div>
              <div className="lp-ticket-title">소리풀 정기공연 — Autumn Night</div>
              <div className="lp-ticket-meta">
                <div>
                  날짜<b>2026. 11. 1(일) 18:30</b>
                </div>
                <div>
                  장소<b>한빛대 소극장</b>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-ticket-piece lp-ticket-stub">
            <div className="lp-ticket-stubtext">
              <span>입장번호</span>
              <strong>42</strong>
            </div>
          </div>

          <div className="lp-ticket-perf" />

          <div className={`lp-ticket-stamp ${stamped ? 'is-on' : ''}`}>
            <em>사전예약</em>
            <em>입장번호 42번!</em>
          </div>
        </div>

        <p className={`lp-ticket-hint ${torn ? 'is-hide' : ''}`}>티켓을 발권하는 중…</p>
      </div>
    </div>
  )
}

/**
 * 당일 허브 — 아이폰 목업 하나에서 스크롤에 맞춰 화면이 바뀝니다.
 *
 * 섹션을 길게 잡고 폰을 sticky 로 고정한 뒤, 섹션 안에서의 스크롤 진행도를
 * 0~1 로 환산해 네 화면 중 하나를 고릅니다. 네 장을 나란히 늘어놓는 것보다
 * "예약자가 당일에 이 화면들을 차례로 쓴다"는 게 분명해집니다.
 */
/**
 * 교류 온도 — 앱에 아직 없는 화면이라 기존 모바일 토큰으로 새로 그렸습니다.
 * 교류 수락·상대 동아리 구성원의 예약·실제 방문이 쌓이면 올라갑니다.
 * active 일 때만 게이지가 차오릅니다.
 */
const TEMP_LOG = [
  { delta: '+3.5°', text: '블랙노트와 교류 수락', when: '2일 전' },
  { delta: '+1.5°', text: '찰나 구성원이 우리 행사 예약', when: '4일 전' },
  { delta: '+1.0°', text: '하모니카 정기공연에 방문', when: '1주 전' },
]

const TempScreen = ({ active }: { active: boolean }) => (
  <div className={`lp-temp ${active ? 'is-on' : ''}`}>
    <div className="lp-temp-brand">밴디</div>
    <div className="lp-temp-nav">
      <span>탐색</span>
      <span>내 밴디</span>
      <span className="on">동아리 콘솔</span>
    </div>

    <div className="lp-temp-club">
      <div className="lp-temp-emblem">🎸</div>
      <div>
        <div className="lp-temp-name">소리풀</div>
        <div className="lp-temp-sub">한빛대학교 · 밴드</div>
      </div>
    </div>

    <div className="lp-temp-gauge">
      <div className="lp-temp-label">교류 온도</div>
      <div className="lp-temp-value">68.5°</div>
      <div className="lp-temp-bar">
        <i style={{ width: active ? '68.5%' : '0%' }} />
      </div>
      <div className="lp-temp-hint">교류가 실제 참여로 이어질수록 올라갑니다</div>
    </div>

    <div className="lp-temp-listtitle">최근 변화</div>
    <div>
      {TEMP_LOG.map((row) => (
        <div className="lp-temp-row" key={row.text}>
          <span className="lp-temp-delta">{row.delta}</span>
          <span className="lp-temp-text">{row.text}</span>
          <span className="lp-temp-when">{row.when}</span>
        </div>
      ))}
    </div>
  </div>
)

/* 동아리 찾기 → 티켓 구매 → 공연 입장 → 교류 온도 */
const HUB_SCREENS: Array<{ label: string; src?: string; alt?: string; node?: true }> = [
  { label: '동아리 찾기', src: '/assets/landing/hub-explore.png', alt: '분야별 동아리 탐색 화면' },
  { label: '티켓 구매', src: '/assets/landing/hub-reserve.png', alt: '행사 예약 화면' },
  { label: '공연 입장', src: '/assets/landing/hub-setlist.png', alt: '밴드별 셋리스트 화면' },
  { label: '교류 온도', node: true },
]

const HubScrollPhone = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let frameId = 0
    const update = () => {
      frameId = 0
      const rect = el.getBoundingClientRect()
      // 섹션이 화면을 지나가는 동안 0 → 1
      const travel = rect.height - window.innerHeight
      const raw = travel > 0 ? -rect.top / travel : 0
      const p = Math.min(1, Math.max(0, raw))
      setProgress(p)
      // 마지막 화면이 끝까지 머물도록 살짝 당겨서 나눕니다
      setIndex(Math.min(HUB_SCREENS.length - 1, Math.floor(p * HUB_SCREENS.length * 0.999)))
    }

    const onScroll = () => {
      if (frameId) return
      frameId = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="lp-scrollphone" ref={ref}>
      <div className="lp-scrollphone-sticky">
        <div className="lp-scrollphone-copy">
          <h2 className="lp-h2" style={{ fontSize: 'clamp(1.7rem, 5vw, 3rem)' }}>
            찾는 것부터
            <br />
            쌓이는 것까지.
          </h2>
        </div>

        <div className="lp-device">
          <div className="lp-device-screen">
            {HUB_SCREENS.map((screen, i) =>
              screen.node ? (
                <TempScreen key={screen.label} active={i === index} />
              ) : (
                <img
                  key={screen.label}
                  src={screen.src}
                  alt={screen.alt}
                  loading="lazy"
                  className={i === index ? 'is-on' : ''}
                />
              )
            )}
          </div>
          <img className="lp-device-frame" src="/assets/landing/iphone-frame.png" alt="" aria-hidden="true" />
        </div>

        <div className="lp-scrollphone-side">
          <p className="lp-sub" style={{ margin: 0 }}>
            동아리를 찾는 순간부터 공연이 끝난 뒤 쌓이는 교류까지, 한 앱 안에서 이어집니다.
            마지막 화면을 뺀 나머지는 실제로 돌아가는 화면입니다.
          </p>

          <div className="lp-screens">
            {HUB_SCREENS.map((screen, i) => (
              <span key={screen.label} className={`lp-screen-tab ${i === index ? 'is-on' : ''}`}>
                {screen.label}
              </span>
            ))}
          </div>

          <div className="lp-scrollbar" aria-hidden="true">
            <div className="lp-scrollbar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 대각선으로 흐르는 행사 카드 — 행사의 폭을 한눈에 보여주는 자리입니다. */
const RIVER_CARDS = [
  { poster: '🎸', title: '소리풀 정기공연 — Autumn Night', meta: '한빛대 소극장 · 밴드', accent: '#ff4c4c' },
  { poster: '👟', title: '스텝온 정기공연 — FLOOR', meta: '한빛대 대강당 · 댄스', accent: '#7cc3ff' },
  { poster: '🎤', title: '하모니카 소극장 공연 — 목소리만', meta: '도원아트홀 · 아카펠라', accent: '#ffd166' },
  { poster: '🎭', title: '막과막사이 단막극전 — 암전 사이', meta: '청림대 블랙박스 · 연극', accent: '#c08cff' },
  { poster: '🎬', title: '프레임워크 상영회 — 24프레임', meta: '새길대 영상강의실 · 영화', accent: '#8fe0c0' },
  { poster: '🎨', title: '색다른 학기전 — 벽의 사정', meta: '백록대 전시실 · 전시', accent: '#ff9f68' },
  { poster: '📷', title: '찰나 사진전 — 남는 건', meta: '도원대 갤러리 · 사진', accent: '#9aa7ff' },
  { poster: '🖤', title: '블랙노트 단독공연 — 세 코드', meta: '새길문화공간 · 밴드', accent: '#d88676' },
  { poster: '🤝', title: '소리풀 × 블랙노트 — 교차점', meta: '한빛대 소극장 · 합동공연', accent: '#ff4c4c' },
  { poster: '✨', title: '스텝온 × 하모니카 — 목소리와 바닥', meta: '도원아트홀 · 합동공연', accent: '#7cc3ff' },
  { poster: '💻', title: '코드모아 해커톤 — 48시간', meta: '한빛대 창업보육센터 · IT·개발', accent: '#5ad1e6' },
  { poster: '🔀', title: '깃플로우 데모데이 — 만든 것들', meta: '새길대 공학관 · IT·개발', accent: '#a8b9ff' },
]

const RiverRow = ({ direction }: { direction: 'l' | 'r' }) => {
  // 끊김 없이 돌도록 같은 묶음을 두 번 깝니다.
  const cards = direction === 'l' ? RIVER_CARDS : [...RIVER_CARDS].reverse()
  return (
    <div className={`lp-river-row lp-river-row--${direction}`}>
      {[...cards, ...cards].map((card, i) => (
        <div
          key={`${card.title}-${i}`}
          className="lp-river-card"
          style={{ ['--card-accent' as string]: card.accent }}
        >
          <div className="lp-river-poster">{card.poster}</div>
          <div className="lp-river-title">{card.title}</div>
          <div className="lp-river-meta">{card.meta}</div>
        </div>
      ))}
    </div>
  )
}

const UNIVERSITIES = ['한빛대학교', '새길대학교', '도원대학교', '청림대학교', '백록대학교']

const Landing = () => {
  const navigate = useNavigate()
  useSmoothScroll()
  const goExplore = () => navigate('/explore')
  const goConsole = () => navigate('/club-console')

  return (
    <div className="lp">
      {/* ── 플로팅 내비 ─────────────────────────── */}
      <nav className="lp-nav">
        <span className="lp-nav-brand">{SERVICE_NAME}</span>
        <div className="lp-nav-links">
          <a onClick={goExplore}>동아리</a>
          <a onClick={() => navigate('/explore?mode=events')}>행사</a>
          <a onClick={goConsole}>운영진</a>
          <a onClick={() => navigate('/login')}>예매 확인</a>
        </div>
        <div className="lp-nav-cta">
          <button type="button" className="lp-nav-btn lp-nav-btn--quiet" onClick={goConsole}>
            로그인
          </button>
          <button type="button" className="lp-nav-btn lp-nav-btn--solid" onClick={goExplore}>
            둘러보기
          </button>
        </div>
      </nav>

      {/* ── 히어로 ─────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-inner lp-hero-grid">
          <div className="lp-hero-copy">
            <div className="lp-wordmark">
              {SERVICE_NAME_EN} · <em>{SERVICE_NAME}</em>
            </div>
            <h1>
              따로 모이던 사람들이
              <br />
              <span className="lp-accent">한자리에 모이는 곳</span>
            </h1>
            <p className="lp-hero-sub">동아리를 찾고, 서로의 행사에서 만나고.</p>
            <div className="lp-cta-row">
              <button type="button" className="lp-btn lp-btn--primary" onClick={goConsole}>
                교류 신청하기
              </button>
              <button type="button" className="lp-btn lp-btn--ghost" onClick={goExplore}>
                행사 둘러보기
              </button>
            </div>
            <p className="lp-microcopy">가입 없이 둘러볼 수 있습니다</p>
          </div>

          <ConnectStage />
        </div>
      </section>

      {/* ── 분야 쇼케이스 ─────────────────────── */}
      <CategoryShowcase />

      {/* ── 연결 하나로 (Partiful: One link. Everyone's in.) ── */}
      <section className="lp-section lp-section--light">
        <div className="lp-inner">
          <Reveal>
            <h2 className="lp-h2">연결 하나로, 객석이 바뀝니다.</h2>
            <p className="lp-sub">관객을 모으는 데 필요한 게 한 곳에 있습니다.</p>
          </Reveal>

          <div className="lp-formwrap">
            <Reveal delay={60}>
              <FilterDemo />
            </Reveal>
            <Reveal delay={120}>
              <div className="lp-steps" style={{ marginTop: 0 }}>
                <div className="lp-step">
                  <div className="lp-step-num">1</div>
                  <h3>동아리를 찾습니다</h3>
                  <p>분야와 대학으로 탐색합니다. 교류 수와 행사 수가 함께 보입니다.</p>
                </div>
                <div className="lp-step">
                  <div className="lp-step-num">2</div>
                  <h3>교류를 신청합니다</h3>
                  <p>수락되면 두 동아리가 연결되고 서로의 행사가 구성원에게 노출됩니다.</p>
                </div>
                <div className="lp-step">
                  <div className="lp-step-num">3</div>
                  <h3>바로 예약합니다</h3>
                  <p>이름·연락처·인원이면 끝. 정원과 잔여석은 서버가 관리합니다.</p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={240}>
            <div className="lp-cta-row" style={{ marginTop: '2.5rem' }}>
              <button type="button" className="lp-btn lp-btn--primary" onClick={goConsole}>
                무료로 시작하기
              </button>
            </div>
            <p className="lp-microcopy" style={{ color: 'rgba(0,0,0,0.45)' }}>
              동아리 등록까지 1분
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 카드 강 (Partiful: A million reasons to hang) ── */}
      <section className="lp-river">
        <div className="lp-river-copy">
          <Reveal>
            <h2 className="lp-h2">모일 이유는 많습니다.</h2>
            <p className="lp-sub">공연이든 전시든, 크든 작든.</p>
          </Reveal>
        </div>
        <div className="lp-river-clip" aria-hidden="true">
          <div className="lp-river-track">
            <RiverRow direction="l" />
            <RiverRow direction="r" />
          </div>
        </div>
      </section>

      {/* ── 대학별 (Partiful: The best events in your city) ── */}
      <section className="lp-section">
        <div className="lp-inner">
          <Reveal>
            <h2 className="lp-h2">우리 학교 근처의 행사.</h2>
            <p className="lp-sub">
              옆 학교에서 이번 주에 뭘 하는지, 우리 동아리와 교류한 곳은 어디인지 봅니다.
            </p>
            <div className="lp-unis">
              {UNIVERSITIES.map((u) => (
                <button
                  key={u}
                  type="button"
                  className="lp-uni"
                  onClick={() =>
                    navigate(`/explore?mode=events&university=${encodeURIComponent(u)}`)
                  }
                >
                  {u}
                </button>
              ))}
              <button
                type="button"
                className="lp-uni"
                onClick={() => navigate('/explore?mode=events')}
              >
                전체 보기
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 예약 폼 목업 (Partiful 의 RSVP 폼 자리) ── */}
      <section className="lp-section lp-section--light">
        <div className="lp-inner lp-formwrap">
          <Reveal>
            <div className="lp-formcard">
              <div className="lp-field">
                <div className="lp-field-q">이름</div>
                <div className="lp-field-a">박지우</div>
              </div>
              <div className="lp-field">
                <div className="lp-field-q">연락처</div>
                <div className="lp-field-a">010-1234-5678</div>
              </div>
              <div className="lp-field">
                <div className="lp-field-q">몇 명이 오나요?</div>
                <div className="lp-field-a">2명</div>
              </div>
              <div className="lp-field">
                <div className="lp-field-q">어느 동아리를 통해 알게 되었나요?</div>
                {/* 이 한 줄이 우리 핵심 지표가 됩니다 */}
                <div className="lp-field-a lp-field-a--hero">블랙노트 공연 보러 갔다가요</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h2 className="lp-h2">예약 한 번에, 필요한 게 다 남습니다.</h2>
            <p className="lp-sub">
              누가 몇 명 오는지, 그리고 <b>어느 동아리를 거쳐 왔는지</b>까지 예약 시점에
              기록됩니다. 공연이 끝나고 "홍보가 잘 됐나?"를 추측하지 않아도 됩니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 예약 직후: 티켓 발권 ─────────────── */}
      <section className="lp-section">
        <div className="lp-inner">
          <Reveal>
            <h2 className="lp-h2">예약하면, 티켓이 나옵니다.</h2>
            <p className="lp-sub">
              입금이 확인되면 입장번호가 찍힌 티켓이 발권됩니다. 종이 명단을 따로 들고 다니지
              않아도 됩니다.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <TicketTearDemo />
          </Reveal>
        </div>
      </section>

      {/* ── 여정: 찾기 → 구매 → 입장 → 교류 온도 ── */}
      <HubScrollPhone />

      {/* ── 현장 교환 ───────────────────────── */}
      <section className="lp-section">
        <div className="lp-inner lp-feature lp-feature--flip">
          <div className="lp-feature-copy">
            <Reveal>
              <h2 className="lp-h2">현장에서 끝나지 않게.</h2>
              <p className="lp-sub">
                행사장에서 NFC·QR·링크로 프로필을 교환합니다. 공개할 연락 수단은 본인이 고릅니다.
                교환한 사람은 목록에 남아 다음 행사 참여로 이어집니다.
              </p>
              <div className="lp-cta-row" style={{ marginTop: '1.75rem' }}>
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => navigate('/my')}>
                  내 프로필 만들기
                </button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <ExchangeDemo />
          </Reveal>
        </div>
      </section>

      {/* ── 교류, 그 이상 (Partiful: More than an invite) ── */}
      <section className="lp-section">
        <div className="lp-inner">
          <Reveal>
            <h2 className="lp-h2">교류, 그 이상.</h2>
            <p className="lp-sub">연결이 쌓이면 동아리 운영 자체가 수월해집니다.</p>
          </Reveal>

          <div className="lp-more">
            <Reveal delay={60}>
              <div className="lp-more-card">
                <h3>티켓을 팝니다.</h3>
                <p>
                  정원·잔여석·예약 취소까지 서버에서 관리합니다. 입금 확인과 입장 권한이 끊기지
                  않습니다.
                </p>
                <button type="button" className="lp-btn lp-btn--ghost lp-btn-sm" onClick={goExplore}>
                  자세히
                </button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="lp-more-card">
                <h3>관계를 쌓습니다.</h3>
                <p>
                  교류한 동아리와 교환한 사람이 프로필에 남습니다. 다음 공연을 기획할 때 부를 곳이
                  이미 있습니다.
                </p>
                <button type="button" className="lp-btn lp-btn--ghost lp-btn-sm" onClick={goConsole}>
                  자세히
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 기능 요약 ─────────────────────────── */}
      <section className="lp-section">
        <div className="lp-inner">
          <div className="lp-facts">
            <Reveal delay={40}>
              <div className="lp-fact">
                <span className="lp-fact-mark">—</span>
                <p>
                  <b>링크 하나로 예약.</b> 앱 설치도, 회원가입도 없습니다.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="lp-fact">
                <span className="lp-fact-mark">—</span>
                <p>
                  <b>정원·잔여석 자동 관리.</b> 중복 예약과 초과 예약을 서버가 막습니다.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="lp-fact">
                <span className="lp-fact-mark">—</span>
                <p>
                  <b>공개 범위는 본인이.</b> 연락처와 인스타는 동의한 항목만 상대에게 갑니다.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="lp-fact">
                <span className="lp-fact-mark">—</span>
                <p>
                  <b>운영진 코드로 관리.</b> 교류 수락과 방문 확인을 동아리가 직접 합니다.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 마무리 ───────────────────────────── */}
      <section className="lp-section lp-final">
        <div className="lp-inner">
          <Reveal>
            <h2 className="lp-h2">오늘, 누구와 만나볼까요?</h2>
            <p className="lp-sub" style={{ marginBottom: '2rem' }}>
              지금 열려 있는 행사부터 둘러보세요.
            </p>
            <div className="lp-cta-row">
              <button type="button" className="lp-btn lp-btn--primary" onClick={goExplore}>
                행사 둘러보기
              </button>
              <button type="button" className="lp-btn lp-btn--ghost" onClick={goConsole}>
                우리 동아리 등록
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 푸터 ─────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">{SERVICE_NAME}</div>
            <p className="lp-footer-tag">
              모임과 모임을 잇는
              <br />
              행사·네트워킹 플랫폼
            </p>
          </div>
          <div className="lp-footer-col">
            <h4>둘러보기</h4>
            <ul>
              <li>
                <a onClick={goExplore}>동아리</a>
              </li>
              <li>
                <a onClick={() => navigate('/explore?mode=events')}>행사</a>
              </li>
              <li>
                <a onClick={() => navigate('/my')}>내 {SERVICE_NAME}</a>
              </li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>운영진</h4>
            <ul>
              <li>
                <a onClick={goConsole}>동아리 콘솔</a>
              </li>
              <li>
                <a onClick={() => navigate('/login')}>예매 확인</a>
              </li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>서비스</h4>
            <ul>
              <li>
                <a onClick={() => navigate('/intro')}>소개</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="lp-footer-note">
          {SERVICE_NAME} ({SERVICE_NAME_EN}) · 화면에 쓰인 동아리·대학·공연장 이름은 모두
          예시이며, 실제 단체와 관련이 없습니다.
        </p>
      </footer>
    </div>
  )
}

export default Landing
