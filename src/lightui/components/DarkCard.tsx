import { ReactNode } from 'react'
import glossSoft from '../assets/gloss-soft-dark.svg'
import glossSpec from '../assets/gloss-spec-dark.svg'
import glossBounce from '../assets/gloss-bounce.svg'

/** 유광 어두운 카드 — Figma L2 174:19 (내 동아리 카드) */
const DarkCard = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag {...(onClick ? { type: 'button' as const, onClick } : {})} className="lui-darkcard">
      <span className="lui-gloss lui-gloss--soft" aria-hidden>
        <img src={glossSoft} alt="" />
      </span>
      <span className="lui-gloss lui-gloss--spec" aria-hidden>
        <img src={glossSpec} alt="" />
      </span>
      <span className="lui-gloss lui-gloss--bounce" aria-hidden>
        <img src={glossBounce} alt="" />
      </span>
      {children}
    </Tag>
  )
}

export default DarkCard
