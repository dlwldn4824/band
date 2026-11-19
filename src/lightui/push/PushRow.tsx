import { useEffect, useState } from 'react'
import ListRow from '../components/ListRow'
import Toggle from '../components/Toggle'
import { readPushState, enablePush, disablePush, type PushState } from './push'
import './PushRow.css'

/**
 * 이 기기에서 알림 받기.
 *
 * 아래의 종류별 토글(공연 D-1, 입금 확인 …)은 "무엇을 보낼지" 이고, 이 줄은
 * "이 기기가 받을 수 있는지" 입니다. 둘을 같은 카드에 섞어 두면, 알림이 안 와서
 * 들어온 사람이 종류별 토글만 보고 켜져 있다고 착각합니다.
 *
 * 권한 창은 토글을 누른 직후에만 띄웁니다 — 들어오자마자 묻는 앱은 대부분
 * 거부당하고, 한 번 거부되면 브라우저 설정에 들어가야 되돌릴 수 있습니다.
 */

const SAY: Record<PushState, { sub: string; can: boolean }> = {
  on: { sub: '입금 확인과 공연 당일 공지를 이 기기로 보냅니다', can: true },
  off: { sub: '켜면 입금 확인과 공연 당일 공지를 받습니다', can: true },
  denied: {
    sub: '이 브라우저에서 알림을 막아 뒀습니다. 주소창 옆 자물쇠에서 풀 수 있어요',
    can: false,
  },
  unsupported: {
    sub: '이 브라우저에서는 알림을 받을 수 없어요. 아이폰은 홈 화면에 추가하면 됩니다',
    can: false,
  },
  unconfigured: { sub: '준비 중이에요', can: false },
}

const PushRow = () => {
  const [state, setState] = useState<PushState>('off')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    readPushState().then((s) => {
      if (alive) setState(s)
    })
    return () => {
      alive = false
    }
  }, [])

  const flip = async (next: boolean) => {
    if (busy) return
    if (!next) {
      disablePush()
      setState('off')
      return
    }
    setBusy(true)
    const res = await enablePush()
    setState(res.state)
    setBusy(false)
  }

  const say = SAY[state]

  return (
    <div className="lui-card pushrow">
      <ListRow
        title="이 기기에서 알림 받기"
        sub={say.sub}
        slot={
          <Toggle
            on={state === 'on'}
            label="이 기기에서 알림 받기"
            onChange={flip}
            disabled={!say.can || busy}
          />
        }
      />
    </div>
  )
}

export default PushRow
