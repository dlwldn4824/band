import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { P } from '../paths'
import { joinSides } from '../../mocks/auth'
import { rememberSide } from '../auth/side'
import './S0Join.css'

/**
 * S0 가입 시작 — 어느 쪽으로 들어올지 먼저 고릅니다.
 *
 * 랜딩의 「동아리로 시작하기」·「공연 보러 가기」가 여기로 들어옵니다. 두 쪽은
 * 처음에 받을 것도, 로그인 뒤 갈 곳도 다릅니다 — 동아리는 동아리부터 잡아야
 * 공연을 올릴 수 있고, 관객은 학교만 있으면 바로 둘러볼 수 있습니다.
 *
 * 고른 쪽은 `?as=` 로 들고 다닙니다 (S1 로그인 → S1b 온보딩).
 */
const S0Join = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      <div className="lui-body">
        <div className="s0">
          <div className="s0__top" />
          <Logo kind="wordmark" className="s0__wordmark" alt="BANDY" />

          <div className="s0__gap-18" />
          <h1 className="s0__title">
            어느 쪽으로
            <br />
            시작할까요?
          </h1>
          <div className="s0__gap-10" />
          <p className="s0__lead">나중에 마이에서 바꿀 수 있어요.</p>

          <div className="s0__gap-26" />
          <div className="s0__cards">
            {joinSides.map((side) => (
              <button
                key={side.key}
                type="button"
                className="lui-card s0-card"
                onClick={() => {
                  // 카카오에 다녀오는 동안 주소가 사라져서 한 번 적어 둡니다
                  rememberSide(side.key)
                  navigate(P.start(side.key))
                }}
              >
                <span className="s0-card__head">
                  <span className="s0-card__label">{side.label}</span>
                  <Icon name="chevron-right" size={18} className="s0-card__chev" />
                </span>
                <span className="s0-card__title">{side.title}</span>
                <span className="s0-card__sub">{side.sub}</span>
                <span className="s0-card__does">
                  {side.does.map((d) => (
                    <span key={d} className="s0-card__do">
                      {d}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>

          <div className="s0__gap-18" />
          {/* 고르기 전에도 공연은 둘러볼 수 있어야 합니다 */}
          <button type="button" className="s0__browse" onClick={() => navigate(P.home)}>
            그냥 둘러볼게요
          </button>

          <div className="s0__gap-26" />
        </div>
      </div>
    </Phone>
  )
}

export default S0Join
