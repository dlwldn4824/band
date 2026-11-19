import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from '../components/Sheet'
import Button from '../components/Button'
import { P } from '../paths'
import { signOut } from './kakao'
import './DeleteAccount.css'

/**
 * 계정 삭제.
 *
 * 가입을 받는 앱은 **앱 안에서** 삭제를 시작할 수 있어야 합니다 (Apple
 * 5.1.1(v), Google 도 같은 요구에 웹 주소를 하나 더 요구합니다). 고객센터로
 * 메일을 보내라는 안내만으로는 떨어집니다.
 *
 * 무엇이 지워지고 무엇이 남는지를 누르기 전에 적습니다. 특히 "지난 공연
 * 기록은 남는다" 는 건 알고 눌러야 합니다 — 삭제했는데 이름이 남아 있으면
 * 그게 더 큰 문제가 됩니다.
 */

const GONE = [
  '프로필 — 이름, 학교, 학과, 사진',
  '예매 내역과 티켓',
  '보낸 메시지와 방명록 글',
  '동아리 교류 기록에서의 내 이름',
  '알림 설정과 찜한 공연',
]

const STAYS = [
  '이미 끝난 공연의 정산 내역 — 전자상거래법상 5년간 보관해야 합니다',
  '동아리끼리 함께 선 기록 — 사람이 아니라 동아리 사이의 기록입니다',
]

const DeleteAccount = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setConfirming(false)
    onClose()
  }

  const remove = async () => {
    setBusy(true)
    // TODO: 서버에 삭제 요청을 보내야 합니다. 지금은 이 기기에서만 지웁니다.
    await new Promise((r) => setTimeout(r, 600))
    signOut()
    setBusy(false)
    close()
    navigate(P.start())
  }

  return (
    <Sheet open={open} title={confirming ? '정말 삭제할까요?' : '계정 삭제'} onClose={close}>
      {confirming ? (
        <div className="delacct">
          <p className="delacct__warn">
            삭제하면 되돌릴 수 없습니다. 같은 카카오 계정으로 다시 가입해도 예전 기록은
            돌아오지 않습니다.
          </p>
          <Button block disabled={busy} onClick={remove}>
            {busy ? '삭제하는 중…' : '삭제합니다'}
          </Button>
          <button type="button" className="delacct__back" onClick={() => setConfirming(false)}>
            그만두기
          </button>
        </div>
      ) : (
        <div className="delacct">
          <p className="delacct__head">지워지는 것</p>
          <ul className="delacct__list">
            {GONE.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <p className="delacct__head">남는 것</p>
          <ul className="delacct__list delacct__list--stay">
            {STAYS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <p className="delacct__note">
            예매한 공연이 아직 남아 있으면 먼저 환불을 받으세요. 계정을 지우면 티켓을 열 수
            없습니다.
          </p>

          <Button block onClick={() => setConfirming(true)}>
            계속
          </Button>
        </div>
      )}
    </Sheet>
  )
}

export default DeleteAccount
