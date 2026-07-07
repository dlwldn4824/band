import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let cachedDb = null

/**
 * FIREBASE_SERVICE_ACCOUNT 환경 변수(서비스 계정 키 JSON 문자열 또는 base64)를
 * 사용해 firebase-admin을 초기화하고 Firestore 인스턴스를 반환합니다.
 */
export function getAdminDb() {
  if (cachedDb) return cachedDb

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) {
      const error = new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
      error.code = 'not_configured'
      throw error
    }

    let jsonText = raw.trim()
    if (!jsonText.startsWith('{')) {
      // base64로 저장된 경우 지원
      jsonText = Buffer.from(jsonText, 'base64').toString('utf8')
    }

    const serviceAccount = JSON.parse(jsonText)
    if (typeof serviceAccount.private_key === 'string' && serviceAccount.private_key.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
    }

    initializeApp({ credential: cert(serviceAccount) })
  }

  cachedDb = getFirestore()
  return cachedDb
}
