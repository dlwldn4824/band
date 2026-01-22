/**
 * Firestore 경로 및 localStorage 키 상수
 * V2 마이그레이션: 기존 'guests/all' → 'guests_v2/all'로 완전 분리
 */

// Firestore 컬렉션 경로
export const FIRESTORE_PATHS = {
  // V2: 새 경로 (기존 데이터와 완전 분리)
  GUESTS_COLLECTION: 'guests_v2' as const,
  GUESTS_DOC_ID: 'all' as const,
  
  // 기존 경로 (참고용, 사용 금지)
  // GUESTS_COLLECTION_OLD: 'guests' as const,
  
  // 기타 경로
  PERFORMANCE_DATA: 'performanceData' as const,
  MESSAGES: 'messages' as const,
  CURRENT: 'current' as const,
} as const

// localStorage 키
export const LOCAL_STORAGE_KEYS = {
  // V2: 새 키 (기존 데이터와 완전 분리)
  GUESTS: 'guests_v2' as const,
  
  // 기존 키 (참고용, 사용 금지)
  // GUESTS_OLD: 'guests' as const,
  
  // 기타 키
  CLIENT_ID: 'clientId' as const,
  PERFORMANCE_DATA: 'performanceData' as const,
  GUESTBOOK_MESSAGES: 'guestbookMessages' as const,
  EVENTS_ENABLED: 'eventsEnabled' as const,
  BOOKING_INFO: 'bookingInfo' as const,
} as const

// 편의 함수: Firestore guests 경로
export const getGuestsPath = () => ({
  collection: FIRESTORE_PATHS.GUESTS_COLLECTION,
  docId: FIRESTORE_PATHS.GUESTS_DOC_ID,
  fullPath: `${FIRESTORE_PATHS.GUESTS_COLLECTION}/${FIRESTORE_PATHS.GUESTS_DOC_ID}`,
})

// 편의 함수: localStorage guests 키
export const getGuestsStorageKey = () => LOCAL_STORAGE_KEYS.GUESTS
