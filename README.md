# 밴드 공연 관리 웹

인디/대학 밴드 공연의 **예매 → 입금 확인 → 입장번호·티켓 → 당일 경험(셋리스트·채팅·방명록·주류)** 을 한 웹앱으로 잇는 운영·관객 허브입니다.

그 위에 **BANDY 플랫폼 레이어**를 얹어, 한 공연이 아니라 **분야별 동아리·행사 탐색 → 동아리 간 교류 → 행사 예약 → 당일 허브 → 현장 프로필 교환**까지 이어집니다.
예약한 행사에 당일 허브가 연결돼 있으면 아래의 단일 공연 화면으로 그대로 넘어갑니다.

실제 공연 적용 사례: **Summer Night Live** (2026.08.15 · OO홀)

**플랫폼 레이어**

| | |
|---|---|
| 동아리·행사 탐색 | `/explore` |
| 동아리 프로필·교류 | `/clubs/:clubId` |
| 행사 상세·예약 | `/shows/:eventId` |
| 내 BANDY·프로필 카드 | `/my`, `/card/:shareCode` |
| 동아리 운영진 콘솔 | `/club-console` |

**단일 공연 허브**

| | |
|---|---|
| 사전/현장 예매 | `/login`, `/onsite` |
| 관객 대시보드 | `/dashboard` |
| 관리자 콘솔 | `/manage` |
| 공연·채팅·방명록 | `/performances`, `/chat`, `/guestbook` |

---

## 왜 만들었나

공연 운영은 보통 **구글폼 · 엑셀 · 카톡 · 계좌 대조**가 흩어집니다.

- 입금자명과 예매명이 어긋나면 톡으로 다시 확인
- 입금 확인과 입장 권한이 단절됨
- 현장 손님·재접속마다 개인 링크를 다시 찾아 보냄
- 티켓·셋리스트·채팅이 제각각이라 관객이 헤맴

이 프로젝트의 목표는 기능 나열이 아니라, **끊긴 흐름을 한 번에 잇는 것**입니다.

```mermaid
flowchart LR
  A[예매 입력] --> B[계좌 · 자가확인]
  B --> C[입금확인 · 입장번호]
  C --> D[티켓 / QR]
  D --> E[당일 허브]
```

---

## BANDY 플랫폼 레이어

위 허브가 **한 공연**을 끝까지 책임지는 동안, 그 앞단에는 늘 같은 공백이 있었습니다.

- 다른 학교·다른 분야 동아리의 행사는 인스타 스토리를 놓치면 그대로 모름
- 합동공연·교류는 아는 사람을 통해서만 성사되고, 연락 창구가 매번 다름
- 행사마다 구글폼을 새로 열어 예약을 받고, 실제로 왔는지는 세지 않음
- 현장에서 만난 사람과의 연결은 그 자리에서 끊김

그래서 단일 공연 허브 **위 단계**로 **탐색 → 교류 → 예약 → 당일 허브 → 현장 프로필 교환**을 한 줄기로 얹었습니다.
예약한 행사에 당일 허브(`hubPath`)가 연결돼 있으면 아래 「기능별 설명」의 단일 공연 화면으로 그대로 이어집니다.

```mermaid
flowchart LR
  EX["탐색 · /explore"] --> CP["동아리 프로필 · /clubs/:clubId"]
  EX --> ED["행사 상세 · /shows/:eventId"]
  CP --> ED
  CP -->|교류 신청| CC["동아리 콘솔 · /club-console"]
  CC -->|수락| CP
  ED -->|예약| MY["내 BANDY · /my"]
  MY -->|hubPath| HUB["당일 허브 · /dashboard"]
  MY --> CARD["프로필 카드 · /card/:shareCode"]
```

### 새 화면과 경로

| 경로 | 화면 | 하는 일 | 왜 필요했나 |
|------|------|---------|-------------|
| `/explore` | 분야별 탐색 | 분야(밴드 / 댄스 / 아카펠라 / 연극·뮤지컬 / 영화·영상 / 미술·디자인 / 사진 / 기타)·대학·검색어로 동아리와 행사를 함께 둘러보기 | 행사 소식이 각 동아리 SNS에 흩어져 있어, 한 화면에서 분야별로 발견할 입구가 필요했음 |
| `/clubs/:clubId` | 동아리 프로필·교류 신청 | 소개·태그·구성원 규모, 그 동아리의 행사, 이미 수락된 교류 동아리 + 운영진 코드로 교류 신청 | 교류 제안을 DM이 아니라 기록되는 요청으로 남겨, 수락률을 지표로 셀 수 있게 |
| `/shows/:eventId` | 행사 상세·예약 | 일시·장소·가격·남은 자리 확인 후 이름·연락처·인원으로 예약, 당일 허브 연결 시 바로가기 | 행사별 구글폼 대신 정원(`capacity`)을 지키는 예약 하나로 통일 |
| `/my` | 내 BANDY | 이름·연락처로 예약 내역 조회·취소, 현장 프로필 카드 만들기·공유, 교환한 프로필 모아보기 | 예약 확인과 현장 명함이 매번 다른 채널로 흩어졌음 |
| `/club-console` | 동아리 운영진 콘솔 | 운영진 코드로 들어와 교류 요청 응답(수락·거절·철회), 행사 등록·수정·삭제, 예약자 명단·방문 처리 | 동아리 운영진이 플랫폼 관리자를 거치지 않고 자기 행사·교류를 직접 운영 |
| `/card/:shareCode` | 현장 프로필 교환 | NFC 태그·QR·링크가 모두 이 경로로 들어와, 동의한 항목만 보여주고 교환 시 양쪽 목록에 함께 남김 | 현장에서 만난 사람과의 연결을 전화번호 수기 교환 없이 남기기 |

공유 코드(`shareCode`)는 혼동되는 글자(O·0·I·1 등)를 뺀 8자리라서, 인쇄된 QR·NFC 태그를 눈으로 받아 적어도 틀리지 않습니다.

### 진입 경로가 바뀐 곳

| | 이전 | 지금 |
|---|------|------|
| `/` | `/login` 으로 리다이렉트 | **`/explore` 로 리다이렉트** (첫 화면이 탐색) |

기존 경로는 그대로 동작합니다: `/login`(사전 예매·로그인), `/onsite`(현장 예매), `/t/:token`(개인 티켓 링크), `/dashboard`·`/manage` 등 단일 공연 허브 전체.

### 교류·예약 권한 모델

핸들러: [`server/lib/clubsApi.js`](./server/lib/clubsApi.js) · [`server/lib/clubEventsApi.js`](./server/lib/clubEventsApi.js) · [`server/lib/clubConnectionsApi.js`](./server/lib/clubConnectionsApi.js) · [`server/lib/profileCardsApi.js`](./server/lib/profileCardsApi.js)
라우트: `/api/clubs`, `/api/club-events`, `/api/club-connections`, `/api/profile-cards` ([`api/index.js`](./api/index.js))

| 구분 | 인증 | 액션 |
|------|------|------|
| **공개** | 없음 / 예약·카드 조회는 이름·연락처 신원 매칭 | `clubs`: `list`, `get`, `categories` · `club-events`: `list`, `get`, `reserve`, `my-reservations`, `cancel` · `profile-cards`: `upsert`, `my-card`, `get-by-code`, `exchange`, `my-exchanges` |
| **동아리 운영진** | 동아리별 **운영진 코드** | `clubs`: `verify-code`, `update-profile` · `club-connections`: `request`, `inbox`, `respond`, `withdraw` · `club-events`: `club-reservations`, `mark-attended`, `club-upsert-event`, `club-delete-event` |
| **플랫폼 관리자** | `Authorization: Bearer` (HMAC) — 운영진 코드 **우회 경로** | `clubs`: `upsert`, `delete`, `seed-demo`, `reset-manage-code` · `club-events`: `all-reservations`, `stats` · `club-connections`: `list-all` · `profile-cards`: `list`, `delete` |

운영진 코드는 **평문을 저장하지 않습니다.**

| 단계 | 구현 |
|------|------|
| 발급 | 혼동 글자를 뺀 6자리 (`generateManageCode`) — 발급 응답에서 **1회만** 노출 |
| 보관 | `HMAC-SHA256(ADMIN_TOKEN_SECRET, "clubId:CODE")` 해시만 `clubs/{clubId}.manageCodeHash` 에 ([`hashManageCode`](./server/lib/bandyCore.js)) |
| 검증 | 같은 입력을 다시 해시해 `timingSafeEqual` 비교 (`verifyManageCode`) |
| 분실 | 평문이 없어 복구 불가 → 플랫폼 관리자가 `reset-manage-code` 로 재발급 |
| 범위 | 코드는 **그 동아리 문서에만** 유효 (`clubId` 가 해시 입력에 들어감) |

예약·교류 신청·프로필 카드 쓰기는 기존 [`rateLimit`](./server/lib/rateLimit.js)(IP 해시)을 그대로 씁니다. 예약 문서는 `eventId__전화번호` 1건으로 묶여 재예약이 중복을 만들지 않고, 정원 초과는 트랜잭션에서 `reservedCount` 와 함께 막습니다.

### 파일럿 지표 (`/manage` → 「BANDY 플랫폼」)

사업계획서의 검증 항목을 **같은 정의로** 관리자 화면에 올렸습니다 ([`BandyPlatformSection`](./src/components/admin/BandyPlatformSection.tsx) ← `club-events` `stats`).

| 지표 | 정의 | 무엇을 검증하나 |
|------|------|-----------------|
| **교류 요청 수락률** | 수락 ÷ **응답된** 요청(수락+거절) — 대기 중(`pending`)은 분모에서 제외 | 교류 제안이 실제로 성립하는가 |
| **예약 대비 방문율** | `status === 'attended'` ÷ 취소 제외 예약 (방문 처리는 콘솔의 방문 확인) | 예약이 방문으로 이어지는가 |
| **교류로 유입된 관객 비율** | `viaConnection === true` ÷ 취소 제외 예약 | 기존 인맥 **밖**에서 관객이 유입되는가 |
| **예약 기준 거래액** | Σ(행사 `price` × 예약 `headcount`) — 취소 제외 | 수수료 매출 추정의 기초 |

`viaConnection` 은 행사 상세를 `?from=<clubId>` 로 들어와 예약했고, 그 동아리와 주최 동아리가 **수락된 교류 관계**(방향 무관)일 때만 `true` 로 기록됩니다.

보조 수치로 동아리 수·행사 수·교류 요청 수(수락/대기)·예약 건수·예약 연인원(`headcount` 합)·프로필 교환 건수를 같은 섹션에서 봅니다.

### 파일럿 시드 데이터

`/manage` → 「BANDY 플랫폼」 섹션에서 만듭니다.

| 버튼 | 하는 일 |
|------|---------|
| **파일럿 시드 생성** | 동아리 **8곳** · 행사 **10건** · 교류 **7건** 생성, 이미 있는 문서는 건드리지 않음 |
| **시드 덮어쓰기** | 같은 문서를 시드 값으로 교체 + 운영진 코드 **전부 재발급** |
| **코드 재발급** | 동아리 한 곳의 운영진 코드만 다시 발급 |

시드 응답에 담긴 **운영진 코드는 그 화면에서 1회만 표시**됩니다. 해시만 저장하므로 화면을 벗어나면 다시 볼 수 없고, 재발급만 가능합니다. 생성 직후 받아서 각 동아리 담당자에게 전달·보관하세요.

시드의 **대학·동아리·공연장 이름은 전부 가상 더미 값**입니다 ([`server/lib/bandySeedData.js`](./server/lib/bandySeedData.js)). 실제 단체·장소와는 무관하며, 파일럿 화면·지표 확인용입니다.

---

## 기능별 설명

아래는 플랫폼에서 예약한 행사의 **당일 허브** — 공연 하나를 끝까지 운영하는 화면입니다.

### 1. 사전 예매 · 로그인 (`/login`)

![공연 예매하기](./docs/screenshots/01-login.png)

| | |
|---|---|
| **하는 일** | 이름(입금자명)·연락처로 예매/재로그인 |
| **왜 필요했나** | 카톡 링크·엑셀 명단 대신, 관객이 같은 URL로 다시 들어와 티켓·당일 화면에 도달해야 함 |
| **수집 데이터** | `name`, `phone`, `bookings/{name_phone}` (`createdAt`, `approved`) |

---

### 2. 현장 예매 (`/onsite`)

![현장 예매](./docs/screenshots/02-onsite.png)

![계좌 정보](./docs/screenshots/03-onsite-account.png)

| | |
|---|---|
| **하는 일** | 현장 손님 이름·연락처 입력 → 계좌/금액 안내(클릭 복사) → 결제완료 → QR·개인 링크 |
| **왜 필요했나** | 당일 손님은 사전 명단에 없고, 계좌를 톡으로 반복 공유하면 실수가 잦음. 키오스크형 원화면으로 예매·입금 안내를 끝냄 |
| **수집 데이터** | `isWalkIn: true`, `paymentConfirmed` (현장은 결제완료 시 확인 처리), 입장번호·토큰 링크 |

---

### 3. 관객 · 운영진 대시보드 (`/dashboard`, `/admin/dashboard`)

![운영진 대시보드](./docs/screenshots/10-dashboard.png)

| | |
|---|---|
| **하는 일** | 티켓·타임라인·닉네임·주류 바로가기. 운영진은 **현재 통계**(총 게스트 / 실 관객)와 게스트 리스트 확인 |
| **왜 필요했나** | 입금 후에도 “내 티켓·셋리스트·채팅이 어디?”가 반복됨. 한 홈에서 당일 경험을 묶음 |
| **운영 KPI** | `총 게스트` = 삭제되지 않은 게스트 수<br>`실 관객` = `paymentConfirmed === true` 인 게스트 수 |

---

### 4. 관리자 페이지 (`/manage`)

![관리자 — 게스트·주류](./docs/screenshots/04-admin-manage.png)

![관리자 — 엑셀·공연진](./docs/screenshots/05-admin-upload.png)

![관리자 — 예매 정보](./docs/screenshots/06-admin-booking.png)

| 섹션 | 역할 | 왜 필요했나 |
|------|------|-------------|
| **게스트 리스트** | 입금확인 토글, 입장번호 순/입금확인 순 정렬, 사전·현장 뱃지, 수동 추가 | 입금 대조와 입장 권한을 한 화면에서 |
| **엑셀 업로드** | 이름·전화번호·입금확인 일괄 반영, Storage `게스트_목록.xlsx` 동기화 | 기존 사전 예매 명단을 버리지 않고 이관 |
| **Google Sheets** | 게스트+닉네임+예매일시 수동 업로드 | 현장 밖에서도 명단을 스프레드시트로 공유 |
| **주류 구매 내역** | 맥주/모히토 수량·금액·제공 여부 | 당일 바 매출·미제공 주문 추적 |
| **셋리스트·공연진** | 엑셀 업로드 / 자동 추출 / 수동 추가 | 셋리스트와 운영진 로그인 권한의 기준 |
| **예매 정보** | 계좌·현장가·환불·안내 전화 | 관객 화면의 입금 안내 단일 소스 |
| **응원·채팅 관리** | 곡별 응원 메시지 엑셀 export, 채팅 일괄 삭제 | 공연 후 아카이브·초기화 |

---

### 5. 공연 정보 · 방명록 · 채팅 · 기타

당일 경험 화면은 네비(홈 / 공연 정보 / 채팅)와 부가 기능으로 나뉩니다. 아래는 **현재 프로덕션 UI** 기준 캡처입니다.

![공연 정보 — 셋리스트](./docs/screenshots/08-performances.png)

![방명록 — 메시지 작성](./docs/screenshots/07-guestbook.png)

![채팅](./docs/screenshots/09-chat.png)

![홈 — 티켓·위치·타임라인(기타 진입)](./docs/screenshots/11-events.png)

| 화면 | 역할 | 왜 필요했나 |
|------|------|-------------|
| **공연 정보** | 밴드별 셋리스트·곡 상세 | 종이 셋리스트 대신 당일 기준 정보 |
| **방명록** | 메모지 색 선택 후 이름·메시지 남기기 / 모아보기 | 공연 후기·응원을 디지털로 남김 |
| **채팅** | 실시간 채팅 + 온라인 인원 | 대기열·공연 중 관객·운영 소통 |
| **홈·기타** | 티켓·입장번호·길찾기·타임라인·주류 등 | 당일 부대 경험을 같은 앱에 묶음 |

---

## 데이터는 어떻게 모이나

### 관객 권한 파이프라인

예매 채널이 달라도 같은 `guests_v2`로 모이고, **입금확인이 권한 스위치**가 됩니다.

```mermaid
flowchart LR
  A[사전예매 /login] --> G[guests_v2]
  B[현장예매 /onsite] --> G
  C[엑셀 업로드 /manage] --> G
  G --> P[입금확인 토글]
  P --> E[입장번호 · loginTokens]
  E --> D[Dashboard / QR]
  G --> GS[Google Sheets 수동 동기화]
```

### 당일 경험 · 콘텐츠 파이프라인

관객 허브와 공연 콘텐츠는 게스트 권한과 별도로 쌓입니다.

```mermaid
flowchart LR
  F[Events 주류] --> O[drinkOrders]
  H[Guestbook] --> M[messages]
  T[Chat] --> CH[chat + onlineUsers]
  S[셋리스트 엑셀] --> PD[performanceData]
  PD --> PERF[/performances]
  O --> EV[/events]
  M --> GB[/guestbook]
  CH --> CT[/chat]
```

### 운영자 하루 파이프라인

```mermaid
flowchart TD
  A[명단 준비<br/>엑셀 · Sheets · 수동 추가] --> B[입금 대조<br/>입금확인 토글]
  B --> C[입장번호 자동 부여]
  C --> D[당일 입구<br/>티켓 전달 · 체크인]
  D --> E[바 · 채팅 · 방명록 운영]
  E --> F[공연 후<br/>응원 export · KPI 점검]
```

| 저장소 | 주요 필드 |
|--------|-----------|
| **Firestore `guests_v2/all`** | `name`, `phone`, `isWalkIn`, `paymentConfirmed`, `paymentConfirmedAt`, `entryNumber`, `ticketReceived`, `checkedIn`, `isDeleted` |
| **`bookings/{name_phone}`** | 예매 신청 시각·승인 |
| **`bookingInfo/main`** | 계좌, 현장가, 환불, 연락처 |
| **`performanceData/main`** | ticket, setlist, performers, events |
| **`drinkOrders`** | 수량, `totalAmount`, 입금/제공 여부, `orderHistory` |
| **`messages` / `chat` / `songComments`** | 방명록·채팅·곡별 응원 |
| **localStorage** | `guests_v2`, `bookingInfo`, `performanceData` (오프라인 보조) |
| **Firebase Storage** | `guests/게스트_목록.xlsx` |
| **Google Sheets** | 운영용 미러 (닉네임·예매일시 포함) |

### 플랫폼 레이어 컬렉션 (서버 API 전용)

동아리·행사는 공개 데이터지만, **여섯 컬렉션 모두 [`firestore.rules`](./firestore.rules) 에서 클라이언트 `read`/`write` 를 차단**했습니다.
브라우저는 `/api/clubs`, `/api/club-events`, `/api/club-connections`, `/api/profile-cards` 로만 접근하고, 응답은 [`bandyCore.js`](./server/lib/bandyCore.js) 의 `serialize*` 가 비공개 필드를 걸러 내보냅니다.

| 컬렉션 | 핵심 필드 | 역할 |
|--------|-----------|------|
| **`clubs`** | `name`, `university`, `category`, `tagline`, `intro`, `tags`, `memberCount`, `foundedYear`, `emblem`, `accent`, `instagram`, `contactEmail`, `openToExchange`, `connectionCount`, `eventCount`, `isHostClub` | 동아리 프로필·탐색의 기준. 비공개 `manageCodeHash` 는 `serializeClub` 응답에서 제외 |
| **`clubEvents`** | `clubId`, `clubName`, `university`, `title`, `category`, `description`, `startsAt`, `doorsAt`, `venueName`, `venueAddress`, `price`, `capacity`, `reservedCount`, `poster`, `tags`, `hubPath`, `status`(`upcoming`/`closed`) | 행사 목록·상세. `seatsLeft` 는 `capacity - reservedCount` 로 응답에서만 계산, `hubPath` 가 단일 공연 허브로 잇는 고리 |
| **`clubConnections`** | 문서 ID `fromClubId__toClubId` · `fromClubId`/`fromClubName`, `toClubId`/`toClubName`, `status`(`pending`/`accepted`/`declined`), `message`, `requesterName`, `requesterContact`, `createdAt`, `respondedAt` | 동아리 간 교류 신청·응답 기록. 수락 건수는 `clubs.connectionCount` 로 재집계 |
| **`eventReservations`** | 문서 ID `eventId__전화번호` · `eventId`, `eventTitle`, `clubId`, `clubName`, `name`, `phone`, `headcount`, `viaConnection`, `sourceClubId`, `status`(`reserved`/`cancelled`/`attended`), `startsAt`, `attendedAt` | 행사 예약과 방문 처리. `phone` 은 `maskPhone` 으로 기본 마스킹(`010****0000`), 본인·운영진 조회에만 원본 |
| **`profileCards`** | `shareCode`, `ownerName`, `nickname`, `clubId`, `clubName`, `university`, `bio`, `interests`, `instagram`, `phone`, `shareInstagram`, `sharePhone`, `exchangeCount` | 현장 프로필 카드. `shareInstagram`/`sharePhone` 으로 **동의한 항목만** 상대에게 노출 |
| **`profileExchanges`** | 문서 ID `카드A__카드B`(정렬된 쌍) · `cardIds`, `initiatedBy`, `eventId`, `createdAt`, `updatedAt` | 교환 기록. 같은 쌍은 한 문서로 묶여 중복 교환이 수치를 부풀리지 않음 |

---

## 보안 — 실사용자를 위해 잠근 것

이름·전화번호·계좌·개인 링크가 오가는 **실서비스**라서, 초기 “클라이언트에서 Firestore 직접 읽고 쓰기” 구조에서 **서버 API + 규칙 차단** 구조로 옮겼습니다.  
목표는 브라우저 DevTools / Firebase 콘솔 규칙만으로 **게스트 명단·예매·토큰을 훑지 못하게** 하는 것입니다.

### 한눈에 보는 경계

```mermaid
flowchart TB
  subgraph Browser
    SPA[React SPA]
    FBsdk[Firebase 클라이언트 SDK]
  end

  subgraph FirestoreRules[firestore.rules]
    PubRO[공개 읽기만<br/>performanceData · bookingInfo · chat …]
    Deny[클라이언트 전면 차단<br/>guests_v2 · bookings · loginTokens<br/>drinkOrders · userProfiles · rateLimits …]
  end

  subgraph API["POST /api/* · Admin SDK"]
    PubAct[공개 액션<br/>login / register / token resolve …]
    AdmAct[관리자 액션<br/>list / toggle / clear …]
    HMAC[HMAC Bearer adminApiToken]
  end

  SPA --> FBsdk
  FBsdk --> PubRO
  FBsdk -.->|denied| Deny
  SPA -->|공개| PubAct
  SPA -->|Authorization: Bearer| AdmAct
  HMAC --> AdmAct
  PubAct --> Deny
  AdmAct --> Deny
```

### 1) Firestore: 민감 컬렉션은 클라이언트 접근 불가

활성 규칙: [`firestore.rules`](./firestore.rules)  
(예전 전부 개방 규칙은 [`firestore-rules.txt`](./firestore-rules.txt)에만 남아 있습니다.)

| 구분 | 컬렉션 | 클라이언트 |
|------|--------|------------|
| **차단** | `guests`, `guests_v2`, `bookings`, `loginTokens`, `userProfiles`, `drinkOrders`, `analytics_events`, `rateLimits`, `rpsTournament` | `read`/`write` 모두 `false` → **Admin SDK + `/api/*`만** |
| **차단 (BANDY 플랫폼)** | `clubs`, `clubEvents`, `clubConnections`, `eventReservations`, `profileCards`, `profileExchanges` | `read`/`write` 모두 `false` → **`/api/clubs`, `/api/club-events`, `/api/club-connections`, `/api/profile-cards` 만** |
| **읽기만** | `performanceData`, `bookingInfo`, `chat`, `onlineUsers`, `messages`, `songComments`, `roulette`, `entryDraw`, `current`, `entries` | 공개 읽기 / 쓰기는 서버 |

게스트 문서는 V2로 분리했습니다: `guests_v2/all` ([`src/config/firestorePaths.ts`](./src/config/firestorePaths.ts)).

### 2) `/api/guests` — 공개 액션 vs 관리자 액션

핸들러: [`server/lib/guestsApi.js`](./server/lib/guestsApi.js) · 클라이언트: [`src/services/guestsApi.ts`](./src/services/guestsApi.ts)

| | 액션 | 인증 |
|---|------|------|
| **공개** | `login`, `status`, `check`, `register`, `onsite-payment` | 이름·전화 신원 매칭 |
| **관리자** | `list`, `upload`, `toggle-payment`, `toggle-ticket`, `delete`, `update`, `clear`, `deduplicate`, `fix-phones` | `Authorization: Bearer` (HMAC) |

- 공개 응답은 [`toPublicGuest()`](./server/lib/guestNormalize.js)로 필드 축소
- 관리자 리스트는 브라우저가 Firestore를 직접 읽지 않고 **API만** 사용
- 삭제는 하드 딜리트 대신 `isDeleted` 소프트 삭제

### 3) 관리자 비밀번호 · HMAC 토큰 · 무차별 대입 제한

| 단계 | 구현 |
|------|------|
| 코드 검증 | [`server/lib/verifyAdminCode.js`](./server/lib/verifyAdminCode.js) — `ADMIN_LOGIN_CODE` / `ADMIN_ACTION_PASSWORD`, SHA-256 + `timingSafeEqual` |
| 토큰 발급 | [`server/lib/adminToken.js`](./server/lib/adminToken.js) — HMAC-SHA256 Bearer, TTL **14일** |
| 레이트리밋 | [`server/lib/rateLimit.js`](./server/lib/rateLimit.js) — IP 해시, `verify-admin-code` 기준 **실패 5회 / 15분 → 429** |
| `/manage` 게이트 | [`ManageProtectedRoute`](./src/components/ManageProtectedRoute.tsx) + [`manageSession`](./src/utils/manageSession.ts) — action 비밀번호 + `adminApiToken` |

운영진 로그인(`AdminLogin`)은 서버 코드 확인 + 공연진 명단 매칭을 거칩니다.

### 4) 개인 링크 — URL에 이름·전화 넣지 않음

레거시 `base64(이름|전화)` 링크는 **거부**합니다 (`legacy_token_invalid`).  
지금은 64자 hex 불투명 토큰만 허용합니다.

| | |
|---|---|
| 구현 | [`server/lib/loginTokensApi.js`](./server/lib/loginTokensApi.js) |
| 컬렉션 | `loginTokens` (클라이언트 차단) |
| TTL | 30일 · `revoked` / `expired` → 410 |
| 경로 | `/t/:token` |

```mermaid
flowchart LR
  A[입금확인] --> B[create opaque token]
  B --> C["/t/64hex…"]
  C --> D[resolve → name/phone]
  X[레거시 base64 링크] -->|거부| Y[legacy_token_invalid]
```

### 5) `paymentConfirmed` = 서버 쪽 권한 스위치

입금 확인 전후로 UI만 막는 게 아니라, **채팅 전송·프레즌스** 등은 서버에서 `requirePayment: true`로 검증합니다 ([`server/lib/chatApi.js`](./server/lib/chatApi.js) → `payment_required`).  
입장번호·티켓·당일 허브도 같은 플래그를 기준으로 열립니다.

### 6) API 라우터 · 기타 잠금

| 항목 | 내용 |
|------|------|
| 단일 엔드포인트 | [`api/index.js`](./api/index.js) — Hobby 플랜용 `/api/*` 라우터, **POST만**, 봇 스캔 경로 404 |
| 쓰기 경로 | 공연/예매 정보·게임·메일 등 민감 write는 admin Bearer ([`booking-info`](./server/lib/bookingInfoApi.js), [`performance-data`](./server/lib/performanceDataApi.js), [`games`](./server/lib/gamesApi.js), …) |
| 분석 경로 | [`sanitizePath`](./src/analytics/sanitizePath.ts) — `/t/*`, `/api/*` 등 민감 path 정리 |
| 환경 변수 | `FIREBASE_SERVICE_ACCOUNT`, `ADMIN_LOGIN_CODE`, `ADMIN_ACTION_PASSWORD`, `ADMIN_TOKEN_SECRET` (클라이언트 번들에 비밀 넣 않음) |

### 관련 파일 인덱스

| 파일 | 역할 |
|------|------|
| [`firestore.rules`](./firestore.rules) | 컬렉션별 클라이언트 허용/차단 |
| [`api/index.js`](./api/index.js) | Vercel API 라우터 |
| [`server/lib/guestsApi.js`](./server/lib/guestsApi.js) | 게스트 공개/관리자 ACL |
| [`server/lib/guestAuth.js`](./server/lib/guestAuth.js) | 게스트 신원 · 입금 여부 검증 |
| [`server/lib/adminToken.js`](./server/lib/adminToken.js) | HMAC Bearer |
| [`server/lib/verifyAdminCode.js`](./server/lib/verifyAdminCode.js) | 관리자 코드 검증 |
| [`server/lib/rateLimit.js`](./server/lib/rateLimit.js) | 관리자 코드 브루트포스 제한 |
| [`server/lib/loginTokensApi.js`](./server/lib/loginTokensApi.js) | 불투명 개인 링크 |
| [`src/utils/manageSession.ts`](./src/utils/manageSession.ts) | `/manage` 세션 게이트 |
| [`src/services/guestsApi.ts`](./src/services/guestsApi.ts) | 클라이언트 → API (토큰 첨부) |
| [`server/lib/bandyCore.js`](./server/lib/bandyCore.js) | 플랫폼 컬렉션 상수 · 운영진 코드 해시 · `serialize*` |
| [`server/lib/clubsApi.js`](./server/lib/clubsApi.js) | 동아리 프로필 · 운영진 코드 검증 · 시드 |
| [`server/lib/clubEventsApi.js`](./server/lib/clubEventsApi.js) | 행사 · 예약 · 방문 처리 · 파일럿 지표 |
| [`server/lib/clubConnectionsApi.js`](./server/lib/clubConnectionsApi.js) | 교류 신청 · 수신함 · 응답 |
| [`server/lib/profileCardsApi.js`](./server/lib/profileCardsApi.js) | 현장 프로필 카드 · 교환 |

---

## 관리자 데이터 분석 (실제 Firestore 기준)

분석 시점: 공연 메타·참여 데이터가 Firestore에 남아 있는 상태를 기준으로 정리했습니다.  
(`guests_v2`는 배포 규칙상 외부 직접 조회가 막혀 있거나 공연 후 초기화된 상태로, **게스트 수 KPI는 대시보드·관리자 화면의 집계 로직**을 기준으로 설명합니다.)

### 1) 공연 운영 메타 (확인됨)

| 항목 | 값 |
|------|-----|
| 공연명 | **Summer Night Live** |
| 일시 | 2026년 8월 15일 (토) |
| 장소 | OO홀 (서울시 OO구 OO로 00) |
| 좌석 | 자유석 |
| 셋리스트 | **24곡** |
| 공연진(운영진 포함 명단) | **38명** |
| 타임라인 | 관객 입장 16:30 → 밴드A 17:00 → 밴드B 18:00 → 밴드C 19:00 |
| 입금 계좌 | 국민은행 / 예금주 ●●● (계좌번호 마스킹) |
| 가격 안내 | 현장 예매 기준 안내(관리 화면·`bookingInfo`에 반영) |

셋리스트 일부: 첫 곡(아티스트 A), 두 번째 곡(아티스트 B), 세 번째 곡(아티스트 C), …, 앙코르(아티스트 F)

### 2) 관객 퍼널 KPI (실제 수집 데이터)

기준: 공연 **Summer Night Live** (2026-08-15) · Firestore `guests_v2` 게스트 **58명**  
(실명·연락처·실제 공연명/팀명은 비공개. 집계만 공개)

#### 퍼널 한눈에

```mermaid
flowchart TD
  R[등록 58] --> P[입금 확인 · 실 관객 49<br/>84.5%]
  R --> U[미입금 잔여 9<br/>15.5%]
  P --> E[입장번호 부여 49<br/>100%]
  P --> T[티켓 수령 44<br/>89.8%]
  P --> C[체크인 9<br/>18.4%]
```

| KPI | 정의 | 실제 수치 | 해석 |
|-----|------|-----------|------|
| 총 게스트 | `!isDeleted` | **58명** | 명단 규모 |
| 실 관객 | `paymentConfirmed === true` | **49명** | 입금·입장 권한이 열린 규모 |
| 입금 전환율 | 실 관객 ÷ 총 게스트 | **84.5%** | 미입금 9명(15.5%)이 잔여 리마인드 대상 |
| 사전 vs 현장 | `isWalkIn` | 사전 **58** / 현장 **0** | 이번 공연 데이터는 전원 사전 예매로 기록됨 (`isWalkIn` 미사용 또는 현장 미집계) |
| 입장번호 부여율 | `entryNumber` (실 관객 기준) | **100%** (49/49) | 입금 확인 후 번호 파이프라인은 완전 작동 |
| 티켓 수령률 | `ticketReceived` (실 관객 기준) | **89.8%** (44/49) | 입금 후에도 티켓 미수령 5명 → 입구 전달 누락 가능 |
| 체크인율 | `checkedIn` (실 관객 기준) | **18.4%** (9/49) | 티켓 수령(44)과 괴리 → 체크인 토글이 현장에서 거의 안 쓰임 |
| 예매→입금 지연 | `bookedAt` → `paymentConfirmedAt` | 중앙값 **~3분**, 평균 **~21시간**, P90 **~5일** | 과반은 즉시 확인, 꼬리(지연 입금)가 평균을 끌어올림 |

#### 입금 확인 타이밍 (실 관객 49명)

| 구간 | 인원 | 비중 |
|------|------|------|
| 즉시 (~1분) | 21 | 42.9% |
| 1시간 미만 | 14 | 28.6% |
| 1~24시간 | 9 | 18.4% |
| 3~7일 | 3 | 6.1% |
| 7일+ | 2 | 4.1% |

입금 확인 **일자(KST)** 분포: 공연 며칠 전부터 분산 입금 → **공연 당일 16명**으로 당일 확정이 가장 많았고, 시간대는 **21시·17시** 전후 피크.

#### 분석 결론

1. **입금 확인이 진짜 병목 스위치** — 등록 58 → 실 관객 49로 떨어지며, 미입금 9명은 공연 후에도 명단에 남아 있음(장기 미입금).
2. **입장번호는 자동화 성공** — 실 관객 전원에 번호가 붙음.
3. **티켓 수령 ≠ 체크인** — 수령 44 vs 체크인 9. 운영이 “티켓 전달”은 했지만 “체크인 토글”은 거의 안 눌러, 대시보드 실입장 집계가 과소 집계됐을 가능성.
4. **현장(`isWalkIn`) 신호 부재** — 이번 스냅샷만 보면 현장 예매 비중을 나눌 수 없음. 다음 공연에선 `/onsite` 경로 플래그·집계 UI를 반드시 검증할 것.
5. **지연 입금 꼬리** — 즉시 확인이 71%이지만 3일+ 지연이 5명. 미입금 리마인드는 **24시간 / 72시간** 두 번에 거는 게 맞음.

게스트 리스트 **「입금 확인 순」** 정렬은 위 미입금·지연 큐를 공연 직전 운영자가 위로 모아 처리하도록 설계된 기능입니다.

### 3) 참여·매출 보조 지표 (확인됨)

| 소스 | 관측 | 해석 |
|------|------|------|
| 방명록 `messages` | 메모지 메시지 다수 게시(공연명 배너와 함께 노출) | 공연 후기·응원 채널로 사용됨 |
| 채팅 `chat` | 운영진·게스트 메시지 기록 (발신자 실명은 비공개) | 당일 실시간 소통 채널로 동작 |
| 주류 `drinkOrders` | 관리자 **주류 구매 내역**으로 건별 수량·금액·제공 여부 확인 | 바 매출·미제공 주문 운영 |
| Google Sheets | 수동 업로드 버튼으로 명단 외부 공유 | 엑셀 중심 운영과의 브리지 |

### 4) 분석에서 드러난 운영 패턴

1. **입금 확인이 권한의 스위치** — 등록 58 → 실 관객 49(84.5%). 채팅·일부 이벤트도 `paymentConfirmed` 이후에만 열림.
2. **티켓 수령과 체크인 분리** — 수령 89.8% vs 체크인 18.4%. “전달”과 “입장 집계” 운영 습관이 달라 대시보드 실입장 수치가 낮게 나옴.
3. **현장 플래그 공백** — `isWalkIn`이 전원 false/미설정. 사전·현장 비중 분석이 이번 회차에선 불가능.
4. **공연 콘텐츠는 풍부, 집계 UI는 얇음** — 셋리스트 24곡·공연진 38명은 들어가 있지만, 위 KPI는 API로 뽑아 본 결과이며 관리자 화면에 차트로는 아직 없음.

---

## 앞으로 어떻게 개선할지

데이터가 이미 Firestore에 쌓이는 구조를 전제로, **새 수집보다 집계·자동화**를 우선합니다.

```mermaid
flowchart LR
  P1[Phase 1<br/>인사이트 패널] --> P2[Phase 2<br/>퍼널 · 타이밍]
  P2 --> P3[Phase 3<br/>운영 자동화]
  P3 --> P4[Phase 4<br/>범위 밖 · 보류]
```

### Phase 1 — 관리자 인사이트 패널 (`/manage` 상단)

- 사전/현장 비율, 입금 전환율, 미입금 N시간 이상 건수
- 티켓 미수령 · 입장번호 미부여 알림
- 주류: 맥주/모히토 합계, 매출 합, 미제공 건수

### Phase 2 — 퍼널·타이밍

- 예매 생성 → 입금 확인 중앙값/평균 지연
- 시간대별 현장 예매·주류 주문 피크 (입구·바 인력 배치)
- 곡별 응원(`songComments`) 히트맵 → 셋리스트 피드백

### Phase 3 — 운영 자동화

- Google Sheets **자동** 동기화(현재는 수동)
- 미입금 리마인드(문자/메일 — 선택)
- 공연 종료 후 익명화된 KPI 스냅샷 export (다음 공연 벤치마크)

### Phase 4 — 범위 밖의 것 (당분간 안 함)

- PG 자동결제 (계좌이체 안내 유지)
- 테넌트 과금·정산 (다중 동아리·행사 탐색은 플랫폼 레이어로 들어왔지만, 수수료 정산은 아직)
- 네이티브 앱·푸시
- 좌석 지정·실시간 좌석맵

---

## 기술 스택

- React 18 · TypeScript · Vite · React Router
- Firebase (Firestore · Storage)
- xlsx (엑셀 업로드/다운로드)
- Google Apps Script (Sheets 연동)

## 시작하기

```bash
npm install
npm run dev
```

브라우저: `http://localhost:5173`

환경 변수는 `.env.local`에 `VITE_FIREBASE_*`, `VITE_GOOGLE_SHEETS_WEB_APP_URL` 을 넣습니다. (`.env` / `.env.local` 은 gitignore)

### 빌드

```bash
npm run build
npm run preview
```

## 주요 경로

| 경로 | 설명 |
|------|------|
| `/` | **`/explore` 로 리다이렉트** (이전에는 `/login`) |
| `/explore` | 분야별 동아리·행사 탐색 |
| `/clubs/:clubId` | 동아리 프로필·교류 신청 |
| `/shows/:eventId` | 행사 상세·예약 (`?from=<clubId>` 로 교류 경유 표시) |
| `/my` | 내 BANDY — 예약 내역·현장 프로필 카드 |
| `/club-console` | 동아리 운영진 콘솔 (운영진 코드) |
| `/card/:shareCode` | 현장 프로필 교환 (NFC·QR·링크) |
| `/login` | 사전 예매·로그인 |
| `/onsite` | 현장 예매 |
| `/dashboard` | 관객 홈 |
| `/manage` | 관리자 콘솔 |
| `/admin/login` | 운영진 로그인 |
| `/performances` | 공연 정보 |
| `/chat` | 채팅 |
| `/guestbook` | 방명록 |
| `/events` | 주류·미니게임 등 |
| `/t/:token` | 개인 티켓 링크 |
| `/intro.html` | 사업소개 HTML (5장) |

## 엑셀 게스트 형식

필수 컬럼: `이름` / `name`, `전화번호` / `phone`  
선택: `입금확인` (확인완료, Y, 1 등)

## 라이선스

MIT
