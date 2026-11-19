import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { VENUE_CONTACT, clubs, links, photos } from '../content'
import { useReducedMotion } from '../useReducedMotion'
import lockup from '../assets/logo-lockup.png'

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

/** 풀블리드 공연 사진 한 장 — 글자 없이 사진만 */
export function BandPhoto() {
  return <div className="b-band" style={{ backgroundImage: `url("${photos.stage}")` }} role="img" aria-label="공연 중인 무대" />
}

/** 문장 하나 + 버튼 — POSH 의 'Driving culture & community' 자리 */
export function Statement() {
  return (
    <section className="b-say" id="start">
      <Rise>
        <h2>
          공연을 만드는 건 결국
          <br />
          사람이 모이는 일입니다.
        </h2>
        <p>
          공연장은 비는 날에 수익이 없고, 밴드는 대관료 150만 원이 부담이라 무대에 못 섭니다.
          BANDY는 그 빈 날에 밴드를 붙이고, 같이 설 팀과 보러 올 사람까지 모읍니다. 밴드는 팀당 5만 원만 냅니다.
        </p>
      </Rise>
      <Rise delay={0.08}>
        <Link className="b-pill b-pill--lg" to={links.console}>
          동아리로 시작하기
        </Link>
        <p className="b-say__note">동아리 운영진 코드로 들어갑니다.</p>
      </Rise>
    </section>
  )
}

/** 함께 공연해 온 동아리 — POSH 의 주최자 목록 자리 */
export function Clubs() {
  const [on, setOn] = useState(0)

  return (
    <section className="b-clubs">
      <div className="b-clubs__bg" style={{ backgroundImage: `url("${photos.wall}")` }} />
      <div className="b-clubs__list">
        {clubs.map((c, i) => (
          <button
            key={c.name}
            className="b-clubs__row"
            data-on={i === on ? '1' : '0'}
            onMouseEnter={() => setOn(i)}
            onFocus={() => setOn(i)}
            onClick={() => setOn(i)}
          >
            {c.name}
            <small>{c.uni}</small>
          </button>
        ))}
        <p className="b-clubs__meta">
          지금은 노원 5개 대학부터 시작합니다 — 광운대 · 서울과기대 · 삼육대 · 서울여대 · 인덕대.
          <br />
          다음은 서울 동북권이고, 밴드 동아리가 있는 학교라면 어디든 열려 있습니다.
        </p>
      </div>
    </section>
  )
}

/** 큰 타일 두 장 — POSH 의 Create / Find your world */
export function Tiles() {
  return (
    <section className="b-tiles">
      <Link className="b-tile" to={links.console} style={{ backgroundImage: `url("${photos.entry}")` }}>
        <small>무대에 서는 쪽</small>
        <b>우리 공연 올리기</b>
      </Link>
      <Link className="b-tile" to={links.shows} style={{ backgroundImage: `url("${photos.stage}")` }}>
        <small>보러 가는 쪽</small>
        <b>가까운 공연 찾기</b>
      </Link>
    </section>
  )
}

/** 마지막 한 줄 + 푸터 */
export function Outro() {
  return (
    <>
      <section className="b-outro">
        <h2>다음 공연은 여기서.</h2>
        <Rise delay={0.08}>
          <div className="b-outro__acts">
            <Link className="b-pill b-pill--lg b-pill--onblack" to={links.shows}>
              공연 찾기
            </Link>
            <Link className="b-pill b-pill--lg b-pill--ghost" to={links.console}>
              밴드 등록하기
            </Link>
          </div>
        </Rise>
      </section>

      <footer className="b-foot">
        <div>
          <h4>BANDY</h4>
          <Link to={links.shows}>공연 둘러보기</Link>
          <br />
          <Link to={links.clubs}>동아리 둘러보기</Link>
          <br />
          <Link to={links.my}>내 티켓</Link>
        </div>
        <div>
          <h4>동아리</h4>
          <Link to={links.console}>동아리로 시작하기</Link>
          <br />
          <Link to={links.newShow}>공연 올리기</Link>
          <br />
          <Link to={links.console}>입장 관리 · 정산</Link>
        </div>
        <div>
          <h4>시작하는 곳</h4>
          광운대 · 서울과기대
          <br />
          삼육대 · 서울여대 · 인덕대
        </div>
        <div id="contact">
          <h4>공연장 · 제휴 문의</h4>
          {VENUE_CONTACT ? (
            <a href={`mailto:${VENUE_CONTACT}`}>{VENUE_CONTACT}</a>
          ) : (
            <span>연락처 준비 중입니다</span>
          )}
        </div>
        <div className="b-foot__mark">
          <img src={lockup} alt="BANDY" />
        </div>
      </footer>
    </>
  )
}
