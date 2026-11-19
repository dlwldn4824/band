import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TabBar from '../components/TabBar'
import SectionHeader from '../components/SectionHeader'
import ListRow from '../components/ListRow'
import { P } from '../paths'
import { search as s } from '../../mocks/bandyLight'
import './S3Search.css'

/** S3 검색 — Figma 206:2 */
const S3Search = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState(s.query)
  const [recent, setRecent] = useState(s.recent)
  const [following, setFollowing] = useState<string[]>([])

  return (
    <Phone>
      <div className="lui-body">
        <div className="s3">
          <div className="s3__gap-14" />
          <div className="s3__bar">
            <input
              className="lui-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="검색어"
            />
            <button type="button" className="s3__cancel" onClick={() => navigate(P.map)}>
              취소
            </button>
          </div>

          <div className="s3__gap-26" />
          {recent.length > 0 && (
            <>
              <SectionHeader title="최근 검색" aside="모두 지우기" onAside={() => setRecent([])} />
              <div className="s3__recent">
                {recent.map((word) => (
                  <button
                    key={word}
                    type="button"
                    className="lui-pill lui-pill--lg lui-pill--outline"
                    onClick={() => setQuery(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
              <div className="s3__gap-26" />
            </>
          )}

          <SectionHeader title="동아리" aside="더보기" onAside={() => navigate(P.clubs)} />
          <div className="lui-card s3__clubs">
            {s.clubs.map((club) => (
              <ListRow
                key={club.id}
                avatar={club.initial}
                title={club.name}
                sub={club.sub}
                slot={
                  <button
                    type="button"
                    className={`lui-pill lui-pill--lg${
                      following.includes(club.id) ? ' lui-pill--ink' : ' lui-pill--outline'
                    }`}
                    aria-pressed={following.includes(club.id)}
                    onClick={(e) => {
                      // 행 전체가 동아리로 가는 버튼이라, 팔로우는 그 위에서 멈춰 세웁니다
                      e.stopPropagation()
                      setFollowing((prev) =>
                        prev.includes(club.id)
                          ? prev.filter((id) => id !== club.id)
                          : [...prev, club.id],
                      )
                    }}
                  >
                    {following.includes(club.id) ? '팔로잉' : '팔로우'}
                  </button>
                }
                slotInteractive
                onClick={() => navigate(P.club(club.id))}
              />
            ))}
          </div>

          <div className="s3__gap-26" />
          <SectionHeader title="많이 찾는 검색어" />
          <div className="lui-card s3__trend">
            {s.trending.map((row) => (
              <button
                key={row.rank}
                type="button"
                className="s3__trend-row"
                onClick={() => setQuery(row.word)}
              >
                <span className="s3__rank">{row.rank}</span>
                <span className="s3__word">{row.word}</span>
                <span className="s3__delta">{row.delta}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </Phone>
  )
}

export default S3Search
