import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import { P } from '../paths'
import { getSession, saveSession } from '../auth/kakao'
import { onboardingOptions } from '../../mocks/auth'
import { forgetSide, readSide } from '../auth/side'
import './S1bOnboarding.css'

/**
 * 온보딩 1스텝 — 최초 로그인 뒤 학교·학과·닉네임을 받습니다.
 *
 * Figma 에 이 프레임은 없습니다. 기존 입력·칩 스타일만 써서 한 화면으로 만들었고,
 * 디자인이 나오면 그대로 맞추면 됩니다.
 */
/** 띄어쓰기·대소문자는 무시하고 견줍니다 — 「서울 과기대」 로 쳐도 찾히게 */
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/**
 * 검색해서 고르거나, 목록에 없으면 그대로 적는 칸.
 *
 * 학교와 학과를 칩 네댓 개로만 주면 그 밖의 사람은 넣을 자리가 없습니다.
 * 적은 대로 저장되니 목록은 거들 뿐입니다.
 */
const ComboField = ({
  label,
  value,
  onChange,
  options,
  top,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  top: string[]
  placeholder: string
}) => {
  const [open, setOpen] = useState(false)
  const q = norm(value)
  const matches = q
    ? options.filter((o) => norm(o).includes(q)).slice(0, 6)
    : []
  // 적은 것과 똑같은 항목 하나만 남으면 더 보여 줄 게 없습니다
  const showList = open && matches.length > 0 && !(matches.length === 1 && norm(matches[0]) === q)

  return (
    <>
      <span className="ob__label">{label}</span>
      <input
        className="lui-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // 목록을 누르는 사이에 닫히지 않게 한 박자 늦춥니다
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {showList && (
        <div className="lui-card ob__found">
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              className="ob-found__row"
              onClick={() => {
                onChange(o)
                setOpen(false)
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {!value && (
        <div className="ob__chips">
          {top.map((o) => (
            <button key={o} type="button" className="ob-chip" onClick={() => onChange(o)}>
              {o}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

const S1bOnboarding = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const session = getSession()
  // S0 에서 고른 쪽 — 동아리면 동아리 칸을 하나 더 받습니다
  const side = readSide(params.get('as'))
  const isClub = side === 'club'
  const [nickname, setNickname] = useState(session?.nickname ?? '')
  const [school, setSchool] = useState(session?.school ?? '')
  const [department, setDepartment] = useState(session?.department ?? '')
  const [club, setClub] = useState('')

  const ready =
    nickname.trim() && school.trim() && department.trim() && (!isClub || club.trim())

  const submit = () => {
    if (!ready || !session) return navigate(P.home)
    saveSession({ ...session, nickname: nickname.trim(), school, department, initial: nickname.trim()[0] })
    forgetSide()
    // 동아리로 들어온 사람은 바로 할 일이 있는 곳으로 — 관객은 둘러보기부터
    navigate(isClub ? P.console : P.home)
  }

  return (
    <Phone>
      {/* Figma 는 뒤로가기를 그리지 않았지만, URL 로 바로 들어오면 빠져나갈 길이 없습니다 */}
      <TopBar title="처음이시네요" back={P.join} right={<span className="lui-topbar__side" />} />
      <div className="lui-body">
        <div className="ob">
          <div className="ob__gap-14" />
          <h1 className="ob__title">{isClub ? '어느 동아리세요?' : '어디서 오셨어요?'}</h1>
          <div className="ob__gap-14" />
          <p className="ob__lead">
            {isClub
              ? '공연을 올리려면 동아리가 있어야 합니다. 학교는 가까운 공연을 찾을 때 씁니다.'
              : '동아리를 찾고 공연을 추천할 때만 씁니다.'}
          </p>

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
          <ComboField
            label="학교"
            value={school}
            onChange={setSchool}
            options={onboardingOptions.schools}
            top={onboardingOptions.topSchools}
            placeholder="학교 이름을 적어 주세요"
          />

          <div className="ob__gap-26" />
          <ComboField
            label="학과"
            value={department}
            onChange={setDepartment}
            options={onboardingOptions.departments}
            top={onboardingOptions.topDepartments}
            placeholder="학과 이름을 적어 주세요"
          />

          {/* 동아리로 들어온 사람만 — 동아리가 있어야 공연을 올릴 수 있습니다 */}
          {isClub && (
            <>
              <div className="ob__gap-26" />
              <span className="ob__label">동아리</span>
              <input
                className="lui-input"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="동아리 이름 또는 참여 코드"
                maxLength={30}
              />
              <p className="ob__hint">
                이미 있는 동아리면 운영진이 알려 준 참여 코드를 넣어 주세요. 새 이름을 적으면
                새로 만들고, 적은 사람이 첫 운영진이 됩니다.
              </p>
            </>
          )}

          <div className="ob__gap-26" />
          <p className="ob__notice">목록에 없으면 그대로 적어 주세요. 나중에 마이에서 바꿀 수 있어요.</p>
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
