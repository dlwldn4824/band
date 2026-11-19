import { useSyncExternalStore } from 'react'

/**
 * 찜한 공연.
 *
 * 홈의 포스터와 공연 상세의 하트가 같은 것을 가리킵니다. 예전에는 홈 하트가
 * 그냥 그림이었고(눌러도 카드가 열렸습니다), 상세의 하트는 화면을 나가면
 * 잊어버렸습니다.
 *
 * MOCK: 지금은 기기에만 저장합니다. 실제로는 사용자 문서에 붙습니다.
 */

const KEY = 'bandy.lightui.likes'
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

let likes = read()
/** useSyncExternalStore 는 같은 참조를 돌려줘야 다시 그리지 않습니다 */
let snapshot = likes

export function getLikes() {
  return snapshot
}

export function toggleLike(showId: string) {
  likes = likes.includes(showId) ? likes.filter((id) => id !== showId) : [...likes, showId]
  snapshot = likes
  try {
    localStorage.setItem(KEY, JSON.stringify(likes))
  } catch {
    /* 저장이 막혀도 이번 세션 동안은 동작합니다 */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useLikes() {
  const current = useSyncExternalStore(subscribe, getLikes, getLikes)
  return {
    likes: current,
    count: current.length,
    isLiked: (showId: string) => current.includes(showId),
    toggleLike,
  }
}
