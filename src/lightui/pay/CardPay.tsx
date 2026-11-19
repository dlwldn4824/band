import { useState } from 'react'
import Sheet from '../components/Sheet'
import Button from '../components/Button'
import { payWithCard, PAY_CONFIGURED } from './portone'
import './CardPay.css'

/**
 * 카드 결제 — 테스트 모드.
 *
 * 계좌이체 옆에 나란히 둡니다. 계좌이체가 지금 실제로 쓰는 길이고 이쪽은
 * 아직 준비 중이라, 기본 버튼을 뺏어 오지 않게 외곽선 버튼으로 둡니다.
 *
 * 「테스트」 라는 표시를 버튼과 시트 양쪽에 답니다. 결제창까지 뜨고 나면
 * 진짜 결제와 구분이 잘 안 가서, 돈이 빠진 줄 알고 문의가 옵니다.
 */

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

type Phase = 'idle' | 'paying' | 'done' | 'failed'

const CardPay = ({
  amount,
  orderName,
  onPaid,
}: {
  amount: number
  orderName: string
  /** 결제가 끝났을 때. 지금은 화면만 넘깁니다 — 티켓 확정은 서버가 할 일입니다. */
  onPaid: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  const start = async () => {
    setPhase('paying')
    setMessage('')
    const res = await payWithCard({ amount, orderName })
    if (res.ok) {
      setPhase('done')
      setMessage(
        res.simulated
          ? '테스트 키가 없어서 결제창은 띄우지 않았습니다. 화면 흐름만 확인한 것입니다.'
          : '포트원 테스트 채널로 승인됐습니다. 카드사에는 요청이 가지 않았고 돈도 빠지지 않았습니다.',
      )
      return
    }
    setPhase('failed')
    setMessage(res.cancelled ? '결제를 취소했습니다.' : res.reason)
  }

  const close = () => {
    setOpen(false)
    setPhase('idle')
    setMessage('')
  }

  return (
    <>
      <Button variant="ghost" block onClick={() => setOpen(true)}>
        카드로 결제 <span className="cardpay__tag">테스트</span>
      </Button>

      <Sheet open={open} title="카드로 결제" onClose={close}>
        <div className="cardpay">
          <p className="cardpay__warn">
            <b>테스트 모드입니다.</b> 돈이 빠지지 않습니다. 지금 자리를 확정하려면
            계좌이체로 보내 주세요.
          </p>

          <div className="cardpay__amount">
            <span className="cardpay__amount-k">결제 금액</span>
            <span className="cardpay__amount-v">{won(amount)}</span>
          </div>

          {phase === 'idle' && (
            <p className="lui-menu__note">
              {PAY_CONFIGURED
                ? '포트원 테스트 채널로 결제창이 뜹니다. 카드사로 승인 요청이 가지 않으므로 아무 테스트 카드번호나 넣어도 됩니다.'
                : '테스트 채널 키가 아직 없어서 결제창은 뜨지 않고 흐름만 보여 줍니다. 키가 들어오면 이 자리에서 바로 결제창이 열립니다.'}
            </p>
          )}

          {phase === 'paying' && <p className="lui-menu__note">결제창을 여는 중…</p>}

          {(phase === 'done' || phase === 'failed') && (
            <p className={`cardpay__result${phase === 'failed' ? ' cardpay__result--bad' : ''}`}>
              {message}
            </p>
          )}

          {phase === 'done' ? (
            <Button block onClick={onPaid}>
              티켓 보기
            </Button>
          ) : (
            <Button block disabled={phase === 'paying'} onClick={start}>
              {phase === 'failed' ? '다시 시도' : '결제창 열기'}
            </Button>
          )}

          <p className="cardpay__fine">
            실제로 열려면 포트원 상점 심사와, 결제가 끝난 뒤 서버가 금액을 다시
            맞춰 보는 단계가 필요합니다. 브라우저가 알려 준 성공만 믿으면 공짜
            티켓이 만들어집니다.
          </p>
        </div>
      </Sheet>
    </>
  )
}

export default CardPay
