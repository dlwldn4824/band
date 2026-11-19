import { useNavigate, useParams } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import { P } from '../paths'
import { DOCS, DOC_ORDER, BIZ, BIZ_READY, type LegalDoc } from '../legal/content'
import './S20Legal.css'

/**
 * S20 약관 · 개인정보 처리방침 · 환불 규정.
 *
 * 세 문서가 한 화면을 같이 씁니다 — 내용만 다르고 읽는 방식은 같아서,
 * 화면을 셋으로 나누면 똑같은 코드가 셋이 됩니다.
 *
 * 스토어 심사에서 이 셋은 "있으면 좋은 것" 이 아니라 없으면 떨어지는
 * 항목입니다. 설정 안쪽에 숨기지 않고 로그인 화면과 마이 양쪽에서
 * 바로 닿게 두었습니다.
 */

const isDoc = (v: string): v is LegalDoc['key'] => v in DOCS

const S20Legal = () => {
  const navigate = useNavigate()
  const { doc = 'terms' } = useParams()
  const key: LegalDoc['key'] = isDoc(doc) ? doc : 'terms'
  const d = DOCS[key]

  return (
    <Phone>
      <TopBar title={d.title} />
      <div className="lui-body">
        <div className="s20">
          {/* 셋 사이를 오가게 — 약관을 읽다 환불 규정을 찾는 일이 흔합니다 */}
          <div className="s20__tabs" role="tablist">
            {DOC_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === key}
                className={`s20__tab${k === key ? ' s20__tab--on' : ''}`}
                onClick={() => navigate(P.legal(k), { replace: true })}
              >
                {DOCS[k].title}
              </button>
            ))}
          </div>

          <p className="s20__updated">{d.updated} 기준</p>

          {d.blocks.map((block) => (
            <section key={block.head ?? block.body[0]} className="s20__block">
              {block.head && <h2 className="s20__head">{block.head}</h2>}
              {block.body.map((para) => (
                <p key={para} className="s20__para">
                  {para}
                </p>
              ))}
            </section>
          ))}

          {/* 전자상거래법상 표시 의무 — 사업자등록 전이라 아직 비어 있습니다 */}
          <section className="s20__block s20__biz">
            <h2 className="s20__head">사업자 정보</h2>
            {BIZ_READY ? (
              <p className="s20__para">
                상호 {BIZ.name} · 대표 {BIZ.owner}
                <br />
                사업자등록번호 {BIZ.bizNo} · 통신판매업신고 {BIZ.mailOrderNo}
                <br />
                {BIZ.address}
                <br />
                {BIZ.email} · {BIZ.phone}
              </p>
            ) : (
              <p className="s20__para">
                사업자등록 준비 중입니다. 등록이 끝나면 상호 · 대표자 · 사업자등록번호 ·
                통신판매업 신고번호 · 주소 · 연락처를 여기에 표시합니다. 그때까지 티켓값은
                공연을 여는 동아리 계좌로 직접 입금되고, 밴디가 대신 받지 않습니다.
              </p>
            )}
          </section>

          <div className="s20__gap" />
        </div>
      </div>
    </Phone>
  )
}

export default S20Legal
