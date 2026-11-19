import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import ListRow from '../components/ListRow'
import Button from '../components/Button'
import { useBlocked } from '../safety/report'
import './S22Blocked.css'

/**
 * S22 차단한 사람.
 *
 * 차단은 되돌릴 수 있어야 합니다. 차단만 되고 푸는 자리가 없으면, 잘못
 * 눌렀을 때 할 수 있는 게 없습니다. 스토어 심사에서도 차단 기능은
 * "목록과 해제" 까지를 봅니다.
 */
const S22Blocked = () => {
  const { blocked, unblockUser } = useBlocked()

  return (
    <Phone>
      <TopBar title="차단한 사람" />
      <div className="lui-body">
        <div className="s22">
          {blocked.length === 0 ? (
            <p className="s22__empty">
              차단한 사람이 없습니다.
              <br />
              불쾌한 글을 보면 글 옆 ⋯ 에서 신고하거나 차단할 수 있어요.
            </p>
          ) : (
            <>
              <p className="s22__lead">
                차단한 사람의 글과 프로필은 보이지 않습니다. 상대에게는 차단했다는 사실이
                알려지지 않아요.
              </p>
              <div className="lui-card s22__list">
                {blocked.map((b) => (
                  <ListRow
                    key={b.id}
                    avatar={b.name.slice(0, 1)}
                    title={b.name}
                    sub={new Date(b.at).toLocaleDateString('ko-KR')}
                    slot={
                      <Button variant="ghost" onClick={() => unblockUser(b.id)}>
                        차단 해제
                      </Button>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Phone>
  )
}

export default S22Blocked
