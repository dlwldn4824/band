import { useEffect } from 'react'
import Nav from './sections/Nav'
import Hero from './sections/Hero'
import PhoneTour from './sections/PhoneTour'
import LogoIntro from './sections/LogoIntro'
import { BandPhoto, Clubs, Outro, Statement, Tiles } from './sections/Closing'
import { useReducedMotion } from './useReducedMotion'
import './brand.css'

/**
 * BANDY 브랜드 랜딩 — 처음 오는 사람에게 보여 주는 페이지입니다.
 *
 * 구성은 POSH(posh.vip)를 거의 그대로 따릅니다.
 *   01 내비
 *   02 히어로 — 오른쪽 큰 제목 + 실제 포스터 띠 + 왼쪽 아래 한 단락
 *   03 폰 목업 투어 — 폰 하나를 고정해 두고 앱 화면 5장이 넘어감, 문장은 좌우 번갈아
 *   04 풀블리드 공연 사진
 *   05 문장 하나 + 버튼
 *   06 함께 공연해 온 동아리 목록
 *   07 큰 타일 두 장
 *   08 마지막 한 줄 + 푸터
 *
 * 폰 안의 화면은 Figma `앱 · 라이트 UI` 의 실제 앱 화면을 내려받아 쓴 목업입니다.
 * 앱 홈(/explore)과 라우트가 분리되어 있습니다.
 */
export default function BrandLanding() {
  const reduced = useReducedMotion()

  /* 앱 전역 배경이 검정이라, 랜딩이 떠 있는 동안만 종이색으로 바꿉니다 */
  useEffect(() => {
    const body = document.body
    const root = document.getElementById('root')
    const prevBody = body.style.backgroundColor
    const prevRoot = root?.style.backgroundColor
    body.style.backgroundColor = '#F6F5F2'
    if (root) root.style.backgroundColor = '#F6F5F2'
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
      <PhoneTour />
      <BandPhoto />
      <Statement />
      <Clubs />
      <Tiles />
      <Outro />
    </main>
  )
}
