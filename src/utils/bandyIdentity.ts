/**
 * 플랫폼 관객 식별 정보 (이름 + 연락처).
 *
 * 기존 단일 공연 로그인과 같은 기준(이름·연락처)을 쓰되,
 * 플랫폼에서는 여러 행사를 넘나들기 때문에 별도 키로 보관합니다.
 */

const IDENTITY_KEY = 'bandyIdentity'

export interface BandyIdentity {
  name: string
  phone: string
}

export function saveBandyIdentity(identity: BandyIdentity): void {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // 저장 실패 시 매번 입력받습니다.
  }
}

export function loadBandyIdentity(): BandyIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BandyIdentity
    if (!parsed?.name || !parsed?.phone) return null
    return parsed
  } catch {
    return null
  }
}

export function clearBandyIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY)
  } catch {
    // noop
  }
}
