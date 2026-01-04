# Gmail SMTP 설정 가이드

## 1. Gmail 앱 비밀번호 생성

1. Google 계정 설정으로 이동: https://myaccount.google.com/
2. 보안 → 2단계 인증 활성화 (필수)
3. 보안 → 앱 비밀번호 생성
4. "메일" 및 "기타(맞춤 이름)" 선택
5. 생성된 16자리 앱 비밀번호 복사

## 2. 서버 환경 변수 설정

`server/` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
```

## 3. 클라이언트 환경 변수 설정 (선택사항)

프로젝트 루트의 `.env` 파일에 서버 URL을 추가하세요:

```env
VITE_SERVER_URL=http://localhost:3001
```

프로덕션 환경에서는 실제 서버 URL로 변경하세요.

## 4. 서버 패키지 설치

```bash
cd server
npm install
```

## 5. 서버 실행

```bash
npm run dev:server
```

또는 클라이언트와 함께 실행:

```bash
npm run dev:all
```

## 사용 방법

`/manage` 페이지에서 입금 확인 시 자동으로 이메일이 전송됩니다.

