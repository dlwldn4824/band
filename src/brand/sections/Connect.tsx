import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'motion/react'
import CableConnect from '../components/CableConnect'
import { links } from '../content'
import { useReducedMotion } from '../useReducedMotion'
import posterCustom from '../assets/poster-custom.jpg'
import posterNostalgic from '../assets/poster-nostalgic.jpg'

const EASE = [0.19, 1, 0.22, 1] as const

/**
 * 04 Connect — 케이블 두 가닥이 서로를 향해 움직이고, 맞물리는 순간 음파가 한 번 지나갑니다.
 * 보고만 있어도 한 번은 연결되고, 버튼으로 직접 다시 해 볼 수 있습니다.
 */
export default function Connect() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setOn(true)
      return
    }
    const t = setTimeout(() => setOn(true), 520)
    return () => clearTimeout(t)
  }, [inView, reduced])

  const replay = () => {
    if (reduced) return
    setOn(false)
    setTimeout(() => setOn(true), 420)
  }

  return (
    <section className="b-connect">
      <p className="b-kicker">같이 설 팀 찾기</p>
      <h2 className="b-connect__h">우리랑 같이 공연할래?</h2>
      <p className="b-connect__lede">
        다른 학교 밴드여도 괜찮아. 서로 음악이 맞으면, 일단 얘기해 보는 거지.
        같이할 밴드를 찾고, 연락하고, 다음 무대를 잡아보자.
      </p>

      <div className="b-connect__stage" ref={ref}>
        <div className="b-connect__state">
          {on ? (
            <>
              <b>연결되었어요</b> · 이제 두 밴드의 공연이 서로에게 먼저 보입니다
            </>
          ) : (
            <>교류 신청을 보냈습니다 · 상대의 응답을 기다리는 중</>
          )}
        </div>

        <div className="b-connect__pair">
          <div className="b-connect__band">
            <span className="b-connect__chip">멜</span>
            <b>멜로딕</b>
            <small>광운대</small>
          </div>

          <CableConnect state={on ? 'connected' : 'open'} height={92} />

          <div className="b-connect__band">
            <span className="b-connect__chip">렉</span>
            <b>렉사</b>
            <small>서울과기대</small>
          </div>
        </div>

        <AnimatePresence>
          {on && (
            <motion.div
              className="b-connect__result"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 0.42, ease: EASE }}
            >
              <img src={posterNostalgic} alt="멜로딕 정기공연 포스터" />
              <img src={posterCustom} alt="렉사와 멜로딕이 같이 연 공연 포스터" />
              <p>
                둘이 같이 선 무대
                <br />
                <b>CUSTOM</b> · 얼라이브홀
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="b-connect__acts">
        <Link className="b-pill b-pill--lg" to={links.clubs}>
          밴드 둘러보기
        </Link>
        <button className="b-connect__replay" onClick={replay}>
          직접 연결해 보기
        </button>
      </div>
    </section>
  )
}
