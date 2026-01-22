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
import { FIRESTORE_PATHS } from '../config/firestorePaths'

// Firestore 경로 타입 (V2 마이그레이션: guests → guests_v2)
type FirestorePath = 'current' | 'guests_v2' | 'guests' | 'performanceData' | 'messages'

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
    // 권한 오류인 경우 null 반환 (500 에러 방지)
    if (error?.code === 'permission-denied' || error?.code === 7) {
      return null
    }
    
    // 네트워크 오류인 경우 null 반환
    if (error?.code === 'unavailable' || error?.code === 14) {
      return null
    }
    
    // 기타 오류는 null 반환하여 앱이 계속 작동하도록 함
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
      // guests_v2 컬렉션의 경우 완전 교체 (merge: false)로 저장하여 isDeleted 플래그가 확실히 반영되도록 함
      const mergeOption = (path === FIRESTORE_PATHS.GUESTS_COLLECTION || path === 'guests') ? false : true
      
      // ✅ guests_v2 컬렉션의 경우 _cleared 필드 보존 및 추적 정보 추가
      let finalData: any = { ...cleanedData, updatedAt: Timestamp.now() }
      
      if (path === FIRESTORE_PATHS.GUESTS_COLLECTION || path === 'guests') {
        // ✅ 클라이언트 ID 생성 (누가 썼는지 추적용)
        const getClientId = (): string => {
          if (typeof window !== 'undefined') {
            let clientId = localStorage.getItem('clientId')
            if (!clientId) {
              clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              localStorage.setItem('clientId', clientId)
            }
            return clientId
          }
          return 'server'
        }
        
        // ✅ 추적 정보 추가 (없는 경우만)
        if (!finalData.updatedBy) {
          finalData.updatedBy = getClientId()
        }
        if (!finalData.lastAction) {
          finalData.lastAction = 'DIRECT_WRITE' // setFirestoreData 직접 호출
        }
        if (!finalData.writeSource) {
          finalData.writeSource = 'setFirestoreData'
        }
        
        // ✅ _cleared 필드 처리: 초기화 마커가 있으면 null로 덮어쓰지 않음
        const hasClearedInPayload = '_cleared' in cleanedData
        const clearedValue = cleanedData._cleared
        
        if (hasClearedInPayload) {
          // _cleared가 명시적으로 설정된 경우
          // null로 명시적으로 설정된 경우, 현재 Firestore에 초기화 마커가 있는지 확인
          if (clearedValue === null) {
            try {
              const currentDoc = await getDoc(docRef)
              if (currentDoc.exists()) {
                const currentData = currentDoc.data()
                const currentCleared = currentData?._cleared
                
                // 현재 Firestore에 초기화 마커(숫자)가 있으면 null로 덮어쓰지 않음
                if (currentCleared !== undefined && currentCleared !== null && typeof currentCleared === 'number') {
                  finalData._cleared = currentCleared // 보존
                } else {
                  // 초기화 마커가 없으면 null로 설정 허용 (초기화 해제)
                  finalData._cleared = null
                }
              }
            } catch (preserveError) {
              finalData._cleared = null
            }
          } else if (typeof clearedValue === 'number') {
            // 숫자(타임스탬프)로 설정된 경우 → 초기화 작업 → 허용
            finalData._cleared = clearedValue
          } else {
            // 기타 값은 그대로 사용
            finalData._cleared = clearedValue
          }
        } else {
          // _cleared 필드가 없으면 현재 Firestore의 _cleared 값을 읽어서 보존
          try {
            const currentDoc = await getDoc(docRef)
            if (currentDoc.exists()) {
              const currentData = currentDoc.data()
              if (currentData && currentData._cleared !== undefined) {
                finalData._cleared = currentData._cleared
              }
            }
          } catch (preserveError) {
            // 보존 실패 시 계속 진행
          }
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
    // Quota exceeded 오류 명시적 처리
    if (error?.code === 'resource-exhausted' || error?.message?.includes('quota') || error?.message?.includes('Quota')) {
      throw new Error('QUOTA_EXCEEDED: Firestore 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.')
    }
    
    // 권한 오류인 경우 false 반환
    if (error?.code === 'permission-denied' || error?.code === 7) {
      return false
    }
    
    // 네트워크 오류인 경우 false 반환
    if (error?.code === 'unavailable' || error?.code === 14) {
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

