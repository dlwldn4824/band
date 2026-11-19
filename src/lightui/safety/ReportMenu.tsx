import { useState } from 'react'
import Sheet from '../components/Sheet'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { REASONS, blockUser, submitReport, useBlocked, type ReportKind } from './report'
import './ReportMenu.css'

/**
 * 신고 · 차단 버튼.
 *
 * 이용자가 쓴 글 옆에는 어디든 이게 붙어 있어야 합니다. 글마다 다른 모양으로
 * 만들면 빠뜨리는 자리가 생겨서, 한 컴포넌트로 두고 가져다 씁니다.
 *
 * 차단을 신고와 같은 시트에 둔 이유는, 불쾌한 글을 본 사람이 원하는 건 보통
 * "신고" 가 아니라 "이 사람 안 보기" 이기 때문입니다. 두 걸음 걸리면 안 합니다.
 */

/** 받침에 따라 조사가 달라서 같이 적어 둡니다 — 「프로필을(를)」 처럼 보이지 않게 */
const KIND_LABEL: Record<ReportKind, string> = {
  message: '이 메시지를',
  guestbook: '이 방명록을',
  profile: '이 프로필을',
  club: '이 동아리를',
}

type Phase = 'menu' | 'reason' | 'done' | 'blocked'

const ReportMenu = ({
  targetId,
  targetName,
  kind,
  /** 글 옆에 붙을 때는 작게 */
  compact,
  /** 밖에서 열 때 — ⋯ 메뉴 안의 「신고하기」 처럼 버튼이 따로 있는 자리 */
  openedFromOutside,
  onOutsideClose,
}: {
  targetId: string
  targetName: string
  kind: ReportKind
  compact?: boolean
  openedFromOutside?: boolean
  onOutsideClose?: () => void
}) => {
  const { isBlocked } = useBlocked()
  const [ownOpen, setOwnOpen] = useState(false)
  const controlled = openedFromOutside !== undefined
  const open = controlled ? openedFromOutside : ownOpen
  const setOpen = (v: boolean) => (controlled ? !v && onOutsideClose?.() : setOwnOpen(v))
  const [phase, setPhase] = useState<Phase>('menu')
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState('')

  const already = isBlocked(targetId)

  const close = () => {
    setOpen(false)
    setPhase('menu')
    setReason('')
    setDetail('')
  }

  const send = () => {
    submitReport({ kind, targetId, targetName, reason, detail: detail.trim() || undefined })
    setPhase('done')
  }

  return (
    <>
      {!controlled && (
        <button
          type="button"
          className={`reportbtn${compact ? ' reportbtn--compact' : ''}`}
          aria-label={`${targetName} 신고하거나 차단하기`}
          onClick={() => setOpen(true)}
        >
          <Icon name="more" size={compact ? 16 : 18} />
        </button>
      )}

      <Sheet open={open} title={phase === 'reason' ? '무엇이 문제인가요?' : targetName} onClose={close}>
        {phase === 'menu' && (
          <div className="reportmenu">
            <button type="button" className="reportmenu__row" onClick={() => setPhase('reason')}>
              <span className="reportmenu__title">신고하기</span>
              <span className="reportmenu__sub">{KIND_LABEL[kind]} 운영자가 확인합니다</span>
            </button>
            {already ? (
              <div className="reportmenu__row reportmenu__row--flat">
                <span className="reportmenu__title">이미 차단한 사람이에요</span>
                <span className="reportmenu__sub">마이 &gt; 차단한 사람에서 풀 수 있어요</span>
              </div>
            ) : (
              <button
                type="button"
                className="reportmenu__row reportmenu__row--danger"
                onClick={() => {
                  blockUser(targetId, targetName)
                  setPhase('blocked')
                }}
              >
                <span className="reportmenu__title">차단하기</span>
                <span className="reportmenu__sub">
                  이 사람의 글과 프로필이 더는 보이지 않습니다
                </span>
              </button>
            )}
          </div>
        )}

        {phase === 'reason' && (
          <div className="reportmenu">
            <div className="reportmenu__reasons">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`reportmenu__reason${r === reason ? ' reportmenu__reason--on' : ''}`}
                  aria-pressed={r === reason}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="lui-input reportmenu__detail"
              placeholder="더 적을 것이 있으면 적어 주세요 (선택)"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
            />
            <Button block disabled={!reason} onClick={send}>
              신고 보내기
            </Button>
          </div>
        )}

        {phase === 'done' && (
          <div className="reportmenu">
            <p className="lui-menu__note">
              접수했습니다. 확인한 뒤 24시간 안에 조치합니다. 결과는 알림으로 알려 드려요.
            </p>
            <Button
              variant="ghost"
              block
              onClick={() => {
                blockUser(targetId, targetName)
                setPhase('blocked')
              }}
            >
              이 사람도 차단하기
            </Button>
            <div className="reportmenu__gap" />
            <Button block onClick={close}>
              확인
            </Button>
          </div>
        )}

        {phase === 'blocked' && (
          <div className="reportmenu">
            <p className="lui-menu__note">
              {targetName} 님을 차단했습니다. 이 사람의 글과 프로필이 보이지 않습니다. 마이 &gt;
              차단한 사람에서 언제든 풀 수 있어요.
            </p>
            <Button block onClick={close}>
              확인
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

export default ReportMenu
