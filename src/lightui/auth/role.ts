import { useSyncExternalStore } from 'react'

/**
 * 계정 권한 — 운영진 / 부원.
 *
 * 제안 보내기·모집 글 쓰기·공연 만들기·입금 관리·정산·입장 관리는 운영진만 합니다.
 * 부원 계정에서는 그런 버튼을 아예 그리지 않거나, 자리를 비울 수 없는 곳에는
 * 「운영진만 할 수 있어요」 안내(`lui-note`)를 대신 둡니다.
 *
 * MOCK: 지금은 기기에만 저장합니다. 실제로는 동아리 멤버 문서의 역할 필드를 읽게 됩니다.
 */

export type ClubRole = 'manager' | 'member'

const KEY = 'bandy.lightui.role'
const listeners = new Set<() => void>()

function read(): ClubRole {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'manager' || v === 'member') return v
  } catch {
    /* 사생활 보호 모드 등에서 막히면 기본값으로 */
  }
  return 'manager'
}

let role: ClubRole = read()

export function getRole() {
  return role
}

export function setRole(next: ClubRole) {
  role = next
  try {
    localStorage.setItem(KEY, next)
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

export function useRole() {
  const current = useSyncExternalStore(subscribe, getRole, getRole)
  return { role: current, isManager: current === 'manager', setRole }
}

/** 권한이 없을 때 버튼 자리에 대신 두는 문구 */
export const MANAGER_ONLY = '운영진만 할 수 있어요'
