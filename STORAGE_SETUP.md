# Firebase Storage 설정 가이드

## 1. Firebase Storage 활성화

1. [Firebase 콘솔](https://console.firebase.google.com/project/band-info-58b2d/storage) 접속
2. "Storage 시작하기" 클릭
3. 프로덕션 모드 또는 테스트 모드 선택
   - 테스트 모드: 30일간 모든 읽기/쓰기 허용 (개발용)
   - 프로덕션 모드: 보안 규칙 설정 필요

## 2. Storage 보안 규칙 설정

[Storage 규칙](https://console.firebase.google.com/project/band-info-58b2d/storage/rules)에서 아래 규칙을 복사해 붙여넣으세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // chat 폴더의 모든 파일 읽기/쓰기 허용
    match /chat/{allPaths=**} {
      allow read, write: if true;
    }
    
    // 다른 폴더도 필요하면 추가
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 3. 사용 방법

### 채팅에서 이미지/동영상 업로드

1. 채팅 페이지 접속
2. 입력창 옆의 📎 버튼 클릭
3. 이미지 또는 동영상 파일 선택
4. 메시지 입력 (선택사항)
5. 전송 버튼 클릭

### 지원하는 파일 형식

- **이미지**: 모든 이미지 형식 (jpg, png, gif, webp 등)
- **동영상**: 모든 동영상 형식 (mp4, mov, avi 등)
- **파일 크기 제한**: 50MB

### 기능

- 이미지는 채팅에서 바로 미리보기
- 동영상은 플레이어로 재생 가능
- 이미지 클릭 시 새 창에서 크게 보기
- 파일명 표시

## 4. 파일 저장 위치

- Firebase Storage의 `chat/` 폴더에 저장됩니다
- 파일명 형식: `{timestamp}_{원본파일명}`

## 5. 주의사항

- 파일 크기는 50MB를 초과할 수 없습니다
- 업로드 중에는 "업로드 중..." 표시가 나타납니다
- 네트워크 상태에 따라 업로드 시간이 달라질 수 있습니다


