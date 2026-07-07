export const MANAGE_SESSION_KEY = 'manage_access'

export function isManageSessionActive(): boolean {
  return sessionStorage.getItem(MANAGE_SESSION_KEY) === '1'
}

export function setManageSession(active: boolean): void {
  if (active) {
    sessionStorage.setItem(MANAGE_SESSION_KEY, '1')
  } else {
    sessionStorage.removeItem(MANAGE_SESSION_KEY)
  }
  window.dispatchEvent(new Event('manage-session-changed'))
}
