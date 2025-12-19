# Firebase 연결 체크리스트

## ✅ 완료된 것
- [x] Firebase SDK 설치
- [x] Firebase 설정 파일 생성
- [x] DataContext에 Firestore 연동 코드 추가
- [x] .env 파일 생성

## 🔲 해야 할 것

### 1. Firebase 콘솔에서 Firestore 데이터베이스 생성
1. [Firestore 콘솔](https://console.firebase.google.com/project/band-info-58b2d/firestore) 접속
2. "데이터베이스 만들기" 클릭 (없다면)
3. 프로덕션 모드 또는 테스트 모드 선택
   - 테스트 모드: 30일간 모든 읽기/쓰기 허용 (개발용)
   - 프로덕션 모드: 보안 규칙 설정 필요

### 2. 보안 규칙 설정 (테스트 모드가 아닌 경우)
[Firestore 규칙](https://console.firebase.google.com/project/band-info-58b2d/firestore/rules)에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 모든 경로 읽기/쓰기 허용 (개발용)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. 연결 테스트
개발 서버 실행:
```bash
npm run dev
```

브라우저 콘솔(F12)에서 오류 확인:
- 연결 성공: 오류 없음
- 연결 실패: Firebase 관련 오류 메시지 확인

### 4. 데이터 확인
Firebase 콘솔에서 데이터가 저장되는지 확인:
- [Firestore 데이터](https://console.firebase.google.com/project/band-info-58b2d/firestore/databases/-default-/data)

