import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase 설정
// Firebase 콘솔에서 프로젝트 설정 > 일반 > SDK 설정 및 구성에서 복사하세요
// .env 파일에 환경 변수를 설정하거나 여기에 직접 입력하세요
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "band-info-58b2d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "band-info-58b2d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "band-info-58b2d.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)

// Firestore 초기화
export const db = getFirestore(app)

// Auth 초기화
export const auth = getAuth(app)

export default app

