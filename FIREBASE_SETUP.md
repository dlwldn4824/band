# Firebase Firestore 연결 가이드

## 1. Firebase 설정 정보 가져오기

1. [Firebase 콘솔](https://console.firebase.google.com/project/band-info-58b2d/settings/general)에 접속
2. 프로젝트 설정 > 일반 탭으로 이동
3. "내 앱" 섹션에서 웹 앱 선택 (없으면 추가)
4. SDK 설정 및 구성에서 설정 정보 복사

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요. 템플릿은 `.env.example`을 복사해 사용합니다:

```bash
cp .env.example .env
```

`.env` 예시 (Firebase 콘솔 > 프로젝트 설정 > 일반 > 웹 앱 SDK에서 복사):

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

선택 변수:

```env
VITE_GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
VITE_GOOGLE_DRIVE_LINK=https://drive.google.com/drive/folders/...
```

### Vercel 배포 시 환경 변수

[Vercel](https://vercel.com) → 프로젝트 → **Settings** → **Environment Variables**에 아래를 등록합니다.  
**Production**, **Preview**, **Development** 모두 동일하게 넣는 것을 권장합니다.

| 변수 이름 | 필수 | 설명 |
|-----------|------|------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `{projectId}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase 프로젝트 ID (예: Band-Info 콘솔의 projectId) |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | `{projectId}.appspot.com` 또는 `*.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | 메시징 Sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | 웹 앱 App ID |
| `VITE_GOOGLE_SHEETS_WEB_APP_URL` | ⬜ | Google Sheets Apps Script URL |
| `VITE_GOOGLE_DRIVE_LINK` | ⬜ | 채팅 사진첩 Google Drive 링크 |

값을 바꾼 뒤 **Deployments**에서 **Redeploy**해야 반영됩니다.

> 로컬 `firebase.ts`에 `band-info-58b2d` 기본값이 있으나, Vercel에서는 위 `VITE_*` 값이 우선 적용됩니다. 본인 Firebase(Band-Info)로 옮길 때는 반드시 Vercel 변수를 새 프로젝트 값으로 맞추세요.

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

