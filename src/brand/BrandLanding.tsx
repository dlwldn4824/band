import { useEffect } from 'react'
import Nav from './sections/Nav'
import Hero from './sections/Hero'
import PhoneTour from './sections/PhoneTour'
import Venue from './sections/Venue'
import Problem from './sections/Problem'
import LogoIntro from './sections/LogoIntro'
import { Chapter, MapConnect, Record, Steps, Tickets, Week } from './sections/Lower'
import { Outro } from './sections/Closing'
import { useReducedMotion } from './useReducedMotion'
import './brand.css'

/**
 * BANDY 브랜드 랜딩 — 처음 오는 사람에게 보여 주는 페이지입니다.
 *
 * 위쪽(01~05)은 POSH(posh.vip) 구조 그대로입니다.
 *   01 로고 인트로 · 내비
 *   02 히어로 — 오른쪽 큰 제목 + 실제 포스터 띠 + 왼쪽 아래 한 단락
 *   03 지금 — 공연 한 번 잡기가 왜 이렇게 어려운지
 *   04 폰 목업 투어 — 폰 하나를 고정해 두고 앱 화면 5장이 넘어감
 *
 * 아래쪽(05~12)은 `Bandy Landing v3` 시안의 구성을 따릅니다.
 *   05 풀블리드 공연 사진 + 문장 하나
 *   06 보러 가는 쪽이라면 — 왼쪽 펼침 목록 + 오른쪽에 붙어 따라오는 화면
 *   07 다른 학교 밴드와도 — 왼쪽 동아리 목록 + 오른쪽 연결도
 *   08 같이한 기록 — 탭으로 걸러 보는 카드
 *   09 BANDY 로 치른 공연 — 실제 포스터 가로 배열
 *   10 공연장이라면 — 비는 날 등록
 *   11 입장권 두 장 — 실제 발행했던 티켓 디자인 그대로
 *   12 마지막 한 줄 + 푸터
 *
 * 폰 안의 화면과 티켓·포스터는 전부 우리가 실제로 쓴 목업입니다.
 * 앱 화면(/ui)과 라우트가 분리되어 있습니다. 예전 앱은 /old 아래입니다.
 */
export default function BrandLanding() {
  const reduced = useReducedMotion()

  /* 앱 전역 배경이 검정이라, 랜딩이 떠 있는 동안만 종이색으로 바꿉니다 */
  useEffect(() => {
    const body = document.body
    const root = document.getElementById('root')
    const prevBody = body.style.backgroundColor
    const prevRoot = root?.style.backgroundColor
    body.style.backgroundColor = '#ffffff'
    if (root) root.style.backgroundColor = '#ffffff'
    return () => {
      body.style.backgroundColor = prevBody
      if (root) root.style.backgroundColor = prevRoot ?? ''
    }
  }, [])

  return (
    <main className="bandy">
      <LogoIntro reduced={reduced} />
      <Nav />
      <Hero />
      <Problem />
      <PhoneTour />

      <Chapter />
      <Steps />
      <MapConnect />
      <Record />
      <Week />
      <Venue />
      <Tickets />
      <Outro />
    </main>
  )
}
