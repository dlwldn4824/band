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
        console.log('문서를 찾을 수 없습니다.')
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
  } catch (error) {
    console.error('Firestore 읽기 오류:', error)
    throw error
  }
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
    if (docId) {
      // 특정 문서 업데이트/생성
      const docRef = doc(db, path, docId)
      await setDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      }, { merge: true })
    } else {
      // 새 문서 생성 (자동 ID)
      const collectionRef = collection(db, path)
      const docRef = doc(collectionRef)
      await setDoc(docRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    }
  } catch (error) {
    console.error('Firestore 쓰기 오류:', error)
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
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() })
        } else {
          callback(null)
        }
      })
    } else {
      // 컬렉션 구독
      const collectionRef = collection(db, path)
      return onSnapshot(collectionRef, (querySnapshot) => {
        const data: any[] = []
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() })
        })
        callback(data)
      })
    }
  } catch (error) {
    console.error('Firestore 구독 오류:', error)
    throw error
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

