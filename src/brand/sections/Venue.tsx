import { motion } from 'motion/react'
import { VENUE_CONTACT } from '../content'
import { useReducedMotion } from '../useReducedMotion'

const EASE = [0.19, 1, 0.22, 1] as const

/**
 * 공연장 한 곳의 한 달 — 대관표 그대로입니다.
 * 빈 날을 칠해서 강조하지 않습니다. 공연이 잡힌 날만 적고 나머지는 비워 두면,
 * 달력이 비어 있다는 사실 자체가 이 섹션이 하려는 말이 됩니다.
 */
const DOW = ['월', '화', '수', '목', '금', '토', '일']
const DAYS = 30
const FIRST_COL = 4 // 1일이 금요일인 달

/* 주말에만 공연이 잡힌 달 — 예시 */
const BOOKED: Record<number, string> = {
  9: '멜로딕',
  16: '렉사',
  23: '하모닉',
  30: '아카펠라',
}

const BOOKED_COUNT = Object.keys(BOOKED).length
const EMPTY_COUNT = DAYS - BOOKED_COUNT

/* 마지막 줄이 중간에 끊기지 않도록 뒤쪽도 빈칸으로 채웁니다 */
const TAIL = (7 - ((FIRST_COL + DAYS) % 7)) % 7

/**
 * 공연장을 위한 자리.
 * 밴드·관객 이야기만 있으면 세 주체 중 하나가 통째로 빠집니다 —
 * 지금 BM 의 출발점이 공연장이라 더 그렇습니다.
 */
export default function Venue() {
  const reduced = useReducedMotion()

  return (
    <section className="b-venue" id="venue">
      <div className="b-venue__text">
        <p className="b-kicker b-kicker--dark">공연장이라면</p>
        <h2>
          공연이 없는 날,
          <br />
          공연장은 수익이 0원입니다.
        </h2>
        <p className="b-venue__body">
          대관료를 미리 받자니 밴드가 못 오고, 비워 두자니 그날은 그대로 손해입니다.
          BANDY는 그 빈 날에 설 밴드를 붙이고 관객까지 모아 옵니다. 공연장은 대관료 대신
          티켓 매출의 협의된 비율을 가져갑니다. 비는 날만 열어 두면 됩니다.
        </p>
        <div className="b-venue__acts">
          {/* 공연장 전용 가입 흐름은 아직 없습니다. 연락처가 들어오기 전까지는
              동아리 코드 게이트로 보내지 않고 문의 자리로 내려 줍니다. */}
          <a className="b-pill b-pill--lg b-pill--onblack" href={VENUE_CONTACT ? `mailto:${VENUE_CONTACT}` : '#contact'}>
            빈 날 등록하기
          </a>
          <span className="b-venue__note">
            공연장은 등록 전에 먼저 이야기부터 나눕니다. 비는 날짜와 정산 비율을 맞춰 보고 시작해요.
          </span>
        </div>
      </div>

      <motion.figure
        className="b-cal"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <figcaption className="b-cal__cap">
          <span>공연장 한 곳의 한 달</span>
          <em>예시</em>
        </figcaption>

        <div className="b-cal__dow" aria-hidden="true">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="b-cal__grid" aria-hidden="true">
          {Array.from({ length: FIRST_COL }, (_, i) => (
            <div className="b-cal__cell b-cal__cell--pad" key={`pad-${i}`} />
          ))}
          {Array.from({ length: DAYS }, (_, i) => {
            const d = i + 1
            const who = BOOKED[d]
            return (
              <div className="b-cal__cell" data-booked={who ? '1' : '0'} key={d}>
                <span className="b-cal__d">{d}</span>
                {who && <b className="b-cal__who">{who}</b>}
              </div>
            )
          })}
          {Array.from({ length: TAIL }, (_, i) => (
            <div className="b-cal__cell b-cal__cell--pad" key={`tail-${i}`} />
          ))}
        </div>

        <p className="b-cal__sum">
          공연이 잡힌 날 {BOOKED_COUNT}일. 나머지 <em>{EMPTY_COUNT}일</em>은 비어 있습니다.
        </p>
      </motion.figure>
    </section>
  )
}
