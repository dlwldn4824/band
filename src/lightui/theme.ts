import { useSyncExternalStore } from 'react'

/**
 * 화면 테마 — 시스템 / 라이트 / 다크.
 *
 * 색은 전부 CSS 변수(`styles/tokens.css`)라, 여기서는 `<html data-lui-theme>` 만 바꿉니다.
 * 레이아웃은 두 테마가 그대로 공유합니다.
 */

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'bandy.lightui.theme'
const listeners = new Set<() => void>()

const mql = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

let mode: ThemeMode = read()

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* 사생활 보호 모드 등에서 막히면 기본값으로 */
  }
  return 'system'
}

export function resolveTheme(m: ThemeMode = mode): ResolvedTheme {
  if (m !== 'system') return m
  return mql()?.matches ? 'dark' : 'light'
}

/** `<html>` 에 현재 테마를 적어 둡니다. CSS 는 이 속성만 봅니다. */
export function applyTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.luiTheme = resolveTheme()
}

export function getThemeMode() {
  return mode
}

export function setThemeMode(next: ThemeMode) {
  mode = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* 저장이 막혀도 이번 세션 동안은 동작합니다 */
  }
  applyTheme()
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  const m = mql()
  const onSystemChange = () => {
    if (mode === 'system') {
      applyTheme()
      fn()
    }
  }
  m?.addEventListener('change', onSystemChange)
  return () => {
    listeners.delete(fn)
    m?.removeEventListener('change', onSystemChange)
  }
}

/** 설정 화면에서 쓰는 훅 — 현재 모드와 실제로 적용된 테마를 함께 돌려줍니다. */
export function useTheme() {
  const current = useSyncExternalStore(
    subscribe,
    () => mode,
    () => 'system' as ThemeMode,
  )
  return { mode: current, resolved: resolveTheme(current), setMode: setThemeMode }
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: '시스템',
  light: '라이트',
  dark: '다크',
}
