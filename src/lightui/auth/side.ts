import type { JoinSide } from '../../mocks/auth'

/**
 * 가입할 때 고른 쪽 — 동아리인지 관객인지.
 *
 * 주소의 `?as=` 로 들고 다니지만, 카카오에 다녀오는 동안에는 그 주소가 사라집니다.
 * (카카오는 `/ui/auth/kakao?code=…` 로만 돌려보냅니다.) 그래서 고른 순간 한 번
 * 적어 두고, 돌아와서 읽습니다.
 *
 * 온보딩을 마치면 지웁니다 — 다음에 들어올 때까지 남아 있을 이유가 없습니다.
 */

const KEY = 'bandy.lightui.joinSide'

export function rememberSide(side: JoinSide) {
  try {
    localStorage.setItem(KEY, side)
  } catch {
    /* 저장이 막혀도 이번 화면에서는 ?as= 로 넘어갑니다 */
  }
}

export function recallSide(): JoinSide | undefined {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'club' || v === 'audience') return v
  } catch {
    /* 사생활 보호 모드 등 */
  }
  return undefined
}

export function forgetSide() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 지우지 못해도 다음 가입 때 덮어씁니다 */
  }
}

/** 주소의 `?as=` 가 먼저, 없으면 적어 둔 것 */
export function readSide(param: string | null): JoinSide | undefined {
  if (param === 'club' || param === 'audience') return param
  return recallSide()
}
