import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Firestore 경로 타입
type FirestorePath = 'current' | 'guests' | 'performanceData' | 'messages'

/**
 * Firestore에서 데이터 읽기
 */
export const getFirestoreData = async (path: FirestorePath, docId?: string) => {
  try {
    if (docId) {
      // 특정 문서 읽기
      const docRef = doc(db, path, docId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      } else {
        console.log(`[Firestore] 문서를 찾을 수 없습니다: ${path}/${docId}`)
        return null
      }
    } else {
      // 컬렉션의 모든 문서 읽기
      const collectionRef = collection(db, path)
      const querySnapshot = await getDocs(collectionRef)
      
      const data: any[] = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() })
      })
      
      return data
    }
  } catch (error: any) {
    console.error(`[Firestore 읽기 오류] ${path}${docId ? `/${docId}` : ''}:`, error)
    
    // 권한 오류인 경우 null 반환 (500 에러 방지)
    if (error?.code === 'permission-denied' || error?.code === 7) {
      console.warn('[Firestore] 권한이 없습니다. localStorage에서 로드합니다.')
      return null
    }
    
    // 네트워크 오류인 경우 null 반환
    if (error?.code === 'unavailable' || error?.code === 14) {
      console.warn('[Firestore] 네트워크 오류. localStorage에서 로드합니다.')
      return null
    }
    
    // 기타 오류는 null 반환하여 앱이 계속 작동하도록 함
    console.warn('[Firestore] 오류 발생, null 반환:', error?.message || error)
    return null
  }
}

/**
 * undefined 값을 제거하는 헬퍼 함수
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item))
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key])
      }
    }
    return cleaned
  }
  
  return obj
}

/**
 * Firestore에 데이터 쓰기
 */
export const setFirestoreData = async (
  path: FirestorePath, 
  data: any, 
  docId?: string
) => {
  try {
    // undefined 값 제거
    const cleanedData = removeUndefined(data)
    
    if (docId) {
      // 특정 문서 업데이트/생성
      const docRef = doc(db, path, docId)
      // guests 컬렉션의 경우 완전 교체 (merge: false)로 저장하여 isDeleted 플래그가 확실히 반영되도록 함
      const mergeOption = path === 'guests' ? false : true
      
      // ✅ guests 컬렉션의 경우 _cleared 필드 보존
      let finalData = { ...cleanedData, updatedAt: Timestamp.now() }
      if (path === 'guests' && !('_cleared' in cleanedData)) {
        // _cleared 필드가 없으면 현재 Firestore의 _cleared 값을 읽어서 보존
        try {
          const currentDoc = await getDoc(docRef)
          if (currentDoc.exists()) {
            const currentData = currentDoc.data()
            if (currentData && currentData._cleared !== undefined) {
              finalData._cleared = currentData._cleared
              console.log('🔵 [setFirestoreData] ✅ _cleared 필드 보존:', currentData._cleared)
            }
          }
        } catch (preserveError) {
          console.warn('🔵 [setFirestoreData] _cleared 보존 중 오류 (계속 진행):', preserveError)
        }
      }
      
      await setDoc(docRef, finalData, { merge: mergeOption })
      return true
    } else {
      // 새 문서 생성 (자동 ID)
      const collectionRef = collection(db, path)
      const docRef = doc(collectionRef)
      await setDoc(docRef, {
        ...cleanedData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    }
  } catch (error: any) {
    console.error(`[Firestore 쓰기 오류] ${path}${docId ? `/${docId}` : ''}:`, error)
    
    // Quota exceeded 오류 명시적 처리
    if (error?.code === 'resource-exhausted' || error?.message?.includes('quota') || error?.message?.includes('Quota')) {
      console.error('[Firestore] ❌ Quota exceeded - Firestore 할당량 초과')
      throw new Error('QUOTA_EXCEEDED: Firestore 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.')
    }
    
    // 권한 오류인 경우 false 반환
    if (error?.code === 'permission-denied' || error?.code === 7) {
      console.warn('[Firestore] 쓰기 권한이 없습니다.')
      return false
    }
    
    // 네트워크 오류인 경우 false 반환
    if (error?.code === 'unavailable' || error?.code === 14) {
      console.warn('[Firestore] 네트워크 오류로 쓰기 실패.')
      return false
    }
    
    // 기타 오류는 throw (호출자가 catch할 수 있도록)
    throw error
  }
}

/**
 * Firestore 문서 업데이트
 */
export const updateFirestoreData = async (
  path: FirestorePath,
  docId: string,
  data: any
) => {
  try {
    const docRef = doc(db, path, docId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Firestore 업데이트 오류:', error)
    throw error
  }
}

/**
 * Firestore 문서 삭제
 */
export const deleteFirestoreData = async (
  path: FirestorePath,
  docId: string
) => {
  try {
    const docRef = doc(db, path, docId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Firestore 삭제 오류:', error)
    throw error
  }
}

/**
 * 실시간 리스너 설정
 */
export const subscribeToFirestore = (
  path: FirestorePath,
  callback: (data: any[] | any | null) => void,
  docId?: string
) => {
  try {
    if (docId) {
      // 특정 문서 구독
      const docRef = doc(db, path, docId)
      return onSnapshot(
        docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() })
          } else {
            callback(null)
          }
        },
        (error) => {
          console.error(`[Firestore 구독 오류] ${path}/${docId}:`, error)
          // ✅ 에러 시 callback을 호출하지 않음 - 기존 state 유지 (UI 깜빡임/리셋 방지)
          // callback(null) 금지: 에러는 UI를 "리셋"시키면 안 됨
        }
      )
    } else {
      // 컬렉션 구독
      const collectionRef = collection(db, path)
      return onSnapshot(
        collectionRef, 
        (querySnapshot) => {
          const data: any[] = []
          querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() })
          })
          callback(data)
        },
        (error) => {
          console.error(`[Firestore 구독 오류] ${path}:`, error)
          // ✅ 에러 시 callback을 호출하지 않음 - 기존 state 유지 (UI 깜빡임/리셋 방지)
          // callback([]) 금지: 에러는 UI를 "리셋"시키면 안 됨
        }
      )
    }
  } catch (error) {
    console.error('Firestore 구독 설정 오류:', error)
    // ✅ 초기 설정 오류 시에도 callback을 호출하지 않음 - 기존 state 유지
    // 구독 해제 함수 반환 (빈 함수)
    return () => {}
  }
}

/**
 * current/auth 경로에서 데이터 읽기 (예제)
 */
export const getCurrentAuth = async () => {
  return await getFirestoreData('current' as FirestorePath, 'auth')
}

/**
 * current/auth 경로에 데이터 쓰기 (예제)
 */
export const setCurrentAuth = async (authData: any) => {
  return await setFirestoreData('current' as FirestorePath, authData, 'auth')
}

