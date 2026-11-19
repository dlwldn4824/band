import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import Steps from '../components/Steps'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import { P } from '../paths'
import { showForm as f } from '../../mocks/bandyLight'
import './S10ShowNew.css'

/** S10 공연 만들기 — Figma 213:2 */
const S10ShowNew = () => {
  const navigate = useNavigate()
  const [venue, setVenue] = useState(f.venueOptions[0].id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [poster, setPoster] = useState<string | null>(null)

  return (
    <Phone>
      <TopBar title="공연 만들기" />
      <div className="lui-body">
        <div className="s10">
          {/* 이 화면의 단계는 정보 · 티켓 · 확인 입니다 */}
          <Steps current={1} labels={['정보', '티켓', '확인']} />

          {/* 포스터는 미리 보기만 브라우저에서 합니다 — 올리기는 서버가 붙은 뒤에 */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPoster(URL.createObjectURL(file))
            }}
          />
          <button
            type="button"
            className={`lui-upload${poster ? ' lui-upload--filled' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {poster ? (
              <img className="lui-upload__preview" src={poster} alt="고른 포스터" />
            ) : (
              <>
                <span className="lui-upload__title">{f.upload.title}</span>
                <span className="lui-upload__sub">{f.upload.sub}</span>
              </>
            )}
          </button>

          {f.fields.map((field) => (
            <div key={field.label} style={{ display: 'contents' }}>
              <div className="s10__gap-14" />
              <span className="s10__label">{field.label}</span>
              <input className="lui-input" defaultValue={field.value} />
            </div>
          ))}

          <div className="s10__gap-14" />
          <span className="s10__label">공연장</span>
          <div className="lui-radios">
            {f.venueOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`lui-radio${venue === opt.id ? ' lui-radio--on' : ''}`}
                onClick={() => setVenue(opt.id)}
                aria-pressed={venue === opt.id}
              >
                <span className="lui-radio__dot" />
                <span className="lui-radio__main">
                  <span className="lui-radio__title">{opt.title}</span>
                  <span className="lui-radio__sub">{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="s10__gap-14" />
          <span className="s10__label">함께 서는 팀</span>
          <div className="lui-card s10__lineup">
            {f.lineup.map((team) => (
              <ListRow
                key={team.name}
                avatar={team.initial}
                title={team.name}
                sub={team.sub}
                slot={
                  <span className={`lui-pill lui-pill--lg${team.pending ? '' : ' lui-pill--outline'}`}>
                    {team.state}
                  </span>
                }
              />
            ))}
            <ListRow
              avatar={f.invite.initial}
              title={f.invite.title}
              sub={f.invite.sub}
              chevron
              onClick={() => navigate(P.recruitNew)}
            />
          </div>

          <div className="s10__gap-26" />
          <p className="s10__notice">{f.notice}</p>
        </div>
      </div>

      <div className="lui-bottombar">
        <Button block onClick={() => navigate(P.show('glow'))}>
          다음 · 티켓 설정
        </Button>
      </div>
    </Phone>
  )
}

export default S10ShowNew
