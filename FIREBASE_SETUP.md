# Firebase Firestore 연결 가이드

## 1. Firebase 설정 정보 가져오기

1. [Firebase 콘솔](https://console.firebase.google.com/project/band-info-58b2d/settings/general)에 접속
2. 프로젝트 설정 > 일반 탭으로 이동
3. "내 앱" 섹션에서 웹 앱 선택 (없으면 추가)
4. SDK 설정 및 구성에서 설정 정보 복사

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=band-info-58b2d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=band-info-58b2d
VITE_FIREBASE_STORAGE_BUCKET=band-info-58b2d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

## 3. Firestore 보안 규칙 설정

Firebase 콘솔에서 Firestore Database > 규칙 탭으로 이동하여 보안 규칙을 설정하세요.

예시:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // current/auth 경로 읽기/쓰기 허용
    match /current/auth {
      allow read, write: if true; // 개발용 - 프로덕션에서는 인증 필요
    }
    
    // guests 컬렉션
    match /guests/{document=**} {
      allow read, write: if true;
    }
    
    // performanceData 컬렉션
    match /performanceData/{document=**} {
      allow read: if true;
      allow write: if request.auth != null; // 인증된 사용자만 쓰기
    }
  }
}
```

## 4. 사용 예제

### 데이터 읽기
```typescript
import { getCurrentAuth, getFirestoreData } from './services/firestoreService'

// current/auth 경로에서 데이터 읽기
const authData = await getCurrentAuth()
console.log(authData)

// 다른 경로에서 데이터 읽기
const guests = await getFirestoreData('guests')
console.log(guests)
```

### 데이터 쓰기
```typescript
import { setCurrentAuth, setFirestoreData } from './services/firestoreService'

// current/auth 경로에 데이터 쓰기
await setCurrentAuth({
  isAuthenticated: true,
  userId: 'user123'
})

// 새 문서 생성
const docId = await setFirestoreData('guests', {
  name: '홍길동',
  phone: '010-1234-5678'
})
```

### 실시간 구독
```typescript
import { subscribeToFirestore } from './services/firestoreService'

// 실시간으로 데이터 변경 감지
const unsubscribe = subscribeToFirestore('guests', (data) => {
  console.log('업데이트된 데이터:', data)
})

// 구독 해제
unsubscribe()
```

## 5. DataContext에 통합하기

`src/contexts/DataContext.tsx`에서 Firestore를 사용하도록 수정할 수 있습니다:

```typescript
import { getFirestoreData, setFirestoreData } from '../services/firestoreService'

// Firestore에서 게스트 데이터 로드
useEffect(() => {
  const loadGuests = async () => {
    try {
      const firestoreGuests = await getFirestoreData('guests')
      if (firestoreGuests && firestoreGuests.length > 0) {
        setGuests(firestoreGuests)
      }
    } catch (error) {
      console.error('Firestore 로드 오류:', error)
    }
  }
  loadGuests()
}, [])
```

