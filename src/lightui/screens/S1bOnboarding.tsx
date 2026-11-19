import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { getSession, saveSession } from '../auth/kakao'
import { onboardingOptions } from '../../mocks/auth'
import './S1bOnboarding.css'

/**
 * 온보딩 1스텝 — 최초 로그인 뒤 학교·학과·닉네임을 받습니다.
 *
 * Figma 에 이 프레임은 없습니다. 기존 입력·칩 스타일만 써서 한 화면으로 만들었고,
 * 디자인이 나오면 그대로 맞추면 됩니다.
 */
const S1bOnboarding = () => {
  const navigate = useNavigate()
  const session = getSession()
  const [nickname, setNickname] = useState(session?.nickname ?? '')
  const [school, setSchool] = useState(session?.school ?? '')
  const [department, setDepartment] = useState(session?.department ?? '')

  const ready = nickname.trim() && school && department

  const submit = () => {
    if (!ready || !session) return navigate(P.home)
    saveSession({ ...session, nickname: nickname.trim(), school, department, initial: nickname.trim()[0] })
    navigate(P.home)
  }

  return (
    <Phone>
      {/* Figma 는 뒤로가기를 그리지 않았지만, URL 로 바로 들어오면 빠져나갈 길이 없습니다 */}
      <TopBar title="처음이시네요" back={P.start} right={<span className="lui-topbar__side" />} />
      <div className="lui-body">
        <div className="ob">
          <div className="ob__gap-14" />
          <h1 className="ob__title">어디서 오셨어요?</h1>
          <div className="ob__gap-14" />
          <p className="ob__lead">동아리를 찾고 공연을 추천할 때만 씁니다.</p>

          <div className="ob__gap-26" />
          <span className="ob__label">닉네임</span>
          <input
            className="lui-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="공연장에서 불릴 이름"
            maxLength={12}
          />

          <div className="ob__gap-26" />
          <span className="ob__label">학교</span>
          <div className="ob__chips">
            {onboardingOptions.schools.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === school}
                className={`ob-chip${s === school ? ' ob-chip--on' : ''}`}
                onClick={() => setSchool(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ob__gap-26" />
          <span className="ob__label">학과</span>
          <div className="ob__chips">
            {onboardingOptions.departments.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={d === department}
                className={`ob-chip${d === department ? ' ob-chip--on' : ''}`}
                onClick={() => setDepartment(d)}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="ob__gap-26" />
          <p className="ob__notice">나중에 마이에서 바꿀 수 있어요.</p>
        </div>
      </div>

      <div className="lui-bottombar lui-bottombar--stack">
        <Button block disabled={!ready} onClick={submit}>
          시작하기
        </Button>
        {/* 다 채우지 않아도 막히지 않게 — 마이에서 나중에 바꿀 수 있습니다 */}
        <button type="button" className="ob__later" onClick={() => navigate(P.home)}>
          나중에 할게요
        </button>
      </div>
    </Phone>
  )
}

export default S1bOnboarding
