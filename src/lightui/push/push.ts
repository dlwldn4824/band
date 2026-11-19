import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import app from '../../config/firebase'

/**
 * 웹 푸시 (Firebase Cloud Messaging).
 *
 * 카카오 알림톡 대신 쓰는 자리입니다. 알림톡은 사업자 등록과 채널 심사,
 * 템플릿 승인이 먼저라 지금은 못 붙입니다. 푸시는 돈이 들지 않고 오늘
 * 붙일 수 있어서, 입금 확인 · 공연 하루 전 · 당일 공지를 여기로 보냅니다.
 *
 * 알림을 받을 수 없는 자리가 많습니다 — iOS 사파리는 홈 화면에 추가해야 하고,
 * 시크릿 창과 일부 인앱 브라우저는 아예 안 됩니다. 그래서 "안 되면 조용히
 * 꺼진다" 를 기본으로 두고, 되는지 먼저 물어보는 함수를 따로 뒀습니다.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

/** 기기에 저장해 두는 자리 — 같은 토큰을 매번 다시 받지 않으려고 */
const TOKEN_KEY = 'bandy.push.token'

export type PushState =
  | 'unsupported' // 이 브라우저에서는 안 됩니다
  | 'unconfigured' // VAPID 키가 아직 없습니다
  | 'denied' // 사용자가 거부했습니다 (브라우저 설정에서만 되돌릴 수 있습니다)
  | 'off' // 아직 안 켰습니다
  | 'on' // 켜져 있습니다

let messaging: Messaging | null = null

async function getMessagingOnce(): Promise<Messaging | null> {
  if (messaging) return messaging
  if (!(await isSupported().catch(() => false))) return null
  messaging = getMessaging(app)
  return messaging
}

/** 지금 어떤 상태인지. 권한을 묻지 않습니다 — 화면을 그리기 전에 부르는 용도입니다. */
export async function readPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  if (!(await isSupported().catch(() => false))) return 'unsupported'
  if (!VAPID_KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted' && localStorage.getItem(TOKEN_KEY)) return 'on'
  return 'off'
}

/**
 * 알림을 켭니다. 여기서 처음으로 권한을 묻습니다.
 *
 * 권한 창은 사용자가 버튼을 누른 직후에만 띄웁니다. 화면에 들어오자마자 묻는
 * 앱은 대부분 거부당하고, 한 번 거부되면 브라우저 설정에 들어가야 되돌릴 수
 * 있습니다.
 */
export async function enablePush(): Promise<{ ok: boolean; state: PushState; token?: string }> {
  const state = await readPushState()
  if (state === 'unsupported' || state === 'unconfigured' || state === 'denied') {
    return { ok: false, state }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, state: permission === 'denied' ? 'denied' : 'off' }
  }

  const m = await getMessagingOnce()
  if (!m) return { ok: false, state: 'unsupported' }

  try {
    // 서비스 워커는 번들러를 거치지 않아 import.meta.env 를 못 읽습니다.
    // 설정을 파일에 박아 두면 .env 를 바꿨을 때 혼자 옛 값을 들고 있게 되므로,
    // 지금 앱이 쓰는 값을 주소에 실어 보냅니다 (전부 공개되는 값입니다).
    const sw = new URL('/firebase-messaging-sw.js', window.location.origin)
    for (const [k, v] of Object.entries(app.options)) {
      if (typeof v === 'string') sw.searchParams.set(k, v)
    }
    const registration = await navigator.serviceWorker.register(sw.toString())
    const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return { ok: false, state: 'off' }

    localStorage.setItem(TOKEN_KEY, token)
    // TODO: 서버에 토큰을 올려야 실제로 보낼 수 있습니다.
    // 사용자 문서에 기기별로 쌓고, 기기를 바꾸면 옛 토큰을 지워야 합니다.
    return { ok: true, state: 'on', token }
  } catch {
    return { ok: false, state: 'off' }
  }
}

/** 이 기기에서만 끕니다. 브라우저 권한 자체는 사용자만 되돌릴 수 있습니다. */
export function disablePush() {
  localStorage.removeItem(TOKEN_KEY)
  // TODO: 서버에서도 이 토큰을 지워야 합니다. 안 지우면 끈 기기로 계속 갑니다.
}

export function getPushToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * 앱을 보고 있는 동안 온 알림.
 *
 * 이때는 브라우저가 알림을 띄워 주지 않습니다 (서비스 워커는 백그라운드만
 * 맡습니다). 화면 안에서 직접 보여 줘야 합니다.
 */
export async function onForegroundPush(
  handler: (msg: { title: string; body: string }) => void,
): Promise<() => void> {
  const m = await getMessagingOnce()
  if (!m) return () => {}
  return onMessage(m, (payload) => {
    handler({
      title: payload.notification?.title ?? '밴디',
      body: payload.notification?.body ?? '',
    })
  })
}
