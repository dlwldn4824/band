const SETLIST_UPLOAD_AT_KEY = 'analytics_setlist_uploaded_at'

export function recordSetlistUploadAt(timestamp = Date.now()): void {
  try {
    localStorage.setItem(SETLIST_UPLOAD_AT_KEY, String(timestamp))
  } catch {
    // ignore
  }
}

export function getDaysSinceSetlistUpload(now = Date.now()): number | undefined {
  try {
    const raw = localStorage.getItem(SETLIST_UPLOAD_AT_KEY)
    if (!raw) return undefined
    const uploadedAt = Number(raw)
    if (!Number.isFinite(uploadedAt)) return undefined
    const diffMs = now - uploadedAt
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
  } catch {
    return undefined
  }
}
