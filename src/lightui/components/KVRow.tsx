import { ReactNode } from 'react'

const KVRow = ({
  k,
  v,
  total,
  accent,
}: {
  k: ReactNode
  v: ReactNode
  total?: boolean
  accent?: boolean
}) => (
  <div className={`lui-kv${total ? ' lui-kv--total' : ''}`}>
    <span className="lui-kv__k">{k}</span>
    <span className={`lui-kv__v${accent ? ' lui-kv__v--accent' : ''}`}>{v}</span>
  </div>
)

export default KVRow
