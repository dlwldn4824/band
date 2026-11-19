/**
 * 포트원(PortOne) 결제 — 테스트 모드 전용.
 *
 * 지금 입금은 계좌이체 + 운영진 수동 확인으로 돌아갑니다. 그 흐름은 그대로 두고,
 * 카드 결제는 "화면과 코드는 완성, 돈은 안 받음" 상태로만 붙여 둡니다. 나중에
 * 상점 심사가 끝나면 키만 라이브로 바꾸면 되도록 호출부는 그대로 둡니다.
 *
 * 돈이 실제로 오가지 않게 하는 장치가 둘 있습니다.
 *  1. 키를 코드에 넣지 않습니다. `.env` 의 테스트 채널 키만 읽습니다.
 *  2. 키가 없으면 SDK 를 아예 부르지 않고 흉내만 냅니다 — 그래야 키 없이도
 *     화면 흐름을 끝까지 확인할 수 있고, 실수로 라이브 채널에 붙을 일이 없습니다.
 *
 * SDK 는 npm 으로 넣지 않고 눌렀을 때만 CDN 에서 불러옵니다. 결제 화면까지
 * 가지 않는 사람(대부분)에게 번들을 키우지 않으려는 것입니다.
 */

const SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js'

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string | undefined
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string | undefined

/** 테스트 채널 키가 들어와 있는지. 없으면 흉내만 냅니다. */
export const PAY_CONFIGURED = Boolean(STORE_ID && CHANNEL_KEY)

export type PayResult =
  | { ok: true; paymentId: string; simulated: boolean }
  | { ok: false; cancelled: boolean; reason: string }

interface RequestPaymentArgs {
  storeId: string
  channelKey: string
  paymentId: string
  orderName: string
  totalAmount: number
  currency: string
  payMethod: string
  customer?: { fullName?: string; phoneNumber?: string }
  redirectUrl?: string
}

interface PortOneSdk {
  requestPayment(args: RequestPaymentArgs): Promise<{ code?: string; message?: string; paymentId?: string } | undefined>
}

declare global {
  interface Window {
    PortOne?: PortOneSdk
  }
}

let loading: Promise<PortOneSdk> | null = null

function loadSdk(): Promise<PortOneSdk> {
  if (window.PortOne) return Promise.resolve(window.PortOne)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SDK_URL
    el.async = true
    el.onload = () => {
      if (window.PortOne) resolve(window.PortOne)
      else reject(new Error('결제 모듈을 불러왔지만 초기화되지 않았습니다'))
    }
    el.onerror = () => {
      loading = null
      reject(new Error('결제 모듈을 불러오지 못했습니다'))
    }
    document.head.append(el)
  })
  return loading
}

/** 주문번호. 포트원은 상점 안에서 유일하기만 하면 됩니다. */
function newPaymentId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `bandy-test-${Date.now()}-${rand}`
}

export interface PayArgs {
  /** 결제창에 뜨는 주문명 */
  orderName: string
  /** 원 단위 */
  amount: number
  buyerName?: string
  buyerTel?: string
}

/**
 * 카드 결제창을 엽니다.
 *
 * 키가 있으면 포트원 테스트 채널로 진짜 결제창이 뜹니다 — 테스트 채널이라
 * 카드사에 승인 요청이 가지 않고 돈도 빠지지 않습니다.
 * 키가 없으면 결제창을 띄우지 않고 성공한 척합니다 (simulated: true).
 */
export async function payWithCard(args: PayArgs): Promise<PayResult> {
  const paymentId = newPaymentId()

  if (!PAY_CONFIGURED) {
    // 키가 없을 때. 화면 흐름만 확인하는 자리라 잠깐 기다렸다 성공으로 둡니다.
    await new Promise((r) => setTimeout(r, 900))
    return { ok: true, paymentId, simulated: true }
  }

  try {
    const sdk = await loadSdk()
    const res = await sdk.requestPayment({
      storeId: STORE_ID!,
      channelKey: CHANNEL_KEY!,
      paymentId,
      orderName: args.orderName,
      totalAmount: args.amount,
      currency: 'CURRENCY_KRW',
      payMethod: 'CARD',
      customer: { fullName: args.buyerName, phoneNumber: args.buyerTel },
      // 모바일은 결제창이 새 창으로 떴다가 이 주소로 돌아옵니다
      redirectUrl: `${window.location.origin}${window.location.pathname}?pay=done`,
    })

    // 포트원은 실패했을 때만 code 를 채워 줍니다
    if (res?.code != null) {
      const cancelled = /cancel|취소/i.test(res.message ?? '') || res.code === 'FAILURE_TYPE_PG'
      return { ok: false, cancelled, reason: res.message ?? '결제가 완료되지 않았습니다' }
    }

    return { ok: true, paymentId: res?.paymentId ?? paymentId, simulated: false }
  } catch (err) {
    return {
      ok: false,
      cancelled: false,
      reason: err instanceof Error ? err.message : '결제 중 문제가 생겼습니다',
    }
  }
}

/**
 * 결제가 끝나도 **티켓을 확정하지는 않습니다.**
 *
 * 브라우저가 돌려주는 성공값만 믿고 자리를 내주면, 요청을 흉내 내서 공짜
 * 티켓을 만들 수 있습니다. 실제로는 서버가 포트원에 다시 물어 금액까지
 * 맞춰 본 뒤 확정해야 합니다 (`GET /v2/payments/{paymentId}`).
 * 지금은 PG 심사 전이라 그 서버 단계가 없고, 그래서 테스트 모드로만 둡니다.
 */
export const NEEDS_SERVER_VERIFICATION = true
