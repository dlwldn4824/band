/*
 * 백그라운드 푸시를 받는 서비스 워커.
 *
 * 앱을 보고 있지 않을 때 온 알림은 이 파일이 받아서 띄웁니다. 앱이 떠 있는
 * 동안 온 것은 여기로 오지 않고 push.ts 의 onForegroundPush 로 갑니다.
 *
 * 서비스 워커는 번들러를 거치지 않아서 import.meta.env 를 읽을 수 없습니다.
 * 그래서 설정값을 코드에 박지 않고, 등록할 때 주소 뒤에 붙여 보낸 것을
 * 꺼내 씁니다 (push.ts). 그래야 .env 를 바꿨을 때 이 파일이 혼자 옛 값을
 * 들고 있는 일이 없습니다.
 *
 * Firebase 웹 설정값은 원래 공개되는 값입니다 — 브라우저 번들에 그대로
 * 들어갑니다. 비밀은 여기 두지 마세요.
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
}

if (config.projectId && config.messagingSenderId) {
  firebase.initializeApp(config)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || '밴디'
    const body = (payload.notification && payload.notification.body) || ''
    // 같은 공연 알림이 여러 번 오면 쌓이지 않고 마지막 것만 남게 tag 를 씁니다
    const tag = (payload.data && payload.data.tag) || 'bandy'
    const link = (payload.data && payload.data.link) || '/ui'

    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/favicon-64.png',
      badge: '/favicon-32.png',
      data: { link },
    })
  })
}

// 알림을 누르면 이미 열려 있는 탭이 있으면 그 탭을 쓰고, 없으면 새로 엽니다.
// 누를 때마다 탭이 하나씩 늘어나면 금방 지저분해집니다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/ui'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      return self.clients.openWindow(link)
    }),
  )
})
