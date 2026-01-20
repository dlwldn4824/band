# Google Sheets 연동 설정 가이드

## 1. Google Sheets 준비

1. **새 Google Sheets 생성**
   - [Google Sheets](https://sheets.google.com) 접속
   - 새 스프레드시트 생성 (예: "밴드 게스트 리스트")
   - 첫 번째 행에 헤더 추가:
     ```
     번호 | 이름 | 전화번호 | 닉네임 | 예매유형 | 예매일시 | 입금확인 | 입금확인시간 | 입장번호 | 체크인 | 체크인시간
     ```

## 2. Google Apps Script 설정

1. **Apps Script 열기**
   - Google Sheets에서 `확장 프로그램` → `Apps Script` 클릭

2. **스크립트 코드 붙여넣기**
   - 아래 코드를 복사하여 붙여넣기:
   ```javascript
  // ⚠️ 중요: doGet과 doPost는 반드시 전역 스코프에 있어야 합니다!
  // (다른 함수 안에 중첩되면 안 됨)
  
  // GET 요청 처리 (브라우저에서 URL 테스트용 - 필수!)
  function doGet(e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        method: "GET", 
        message: "Google Sheets 연동 웹 앱이 정상 작동 중입니다",
        query: e && e.parameter 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // CORS 헤더를 포함한 응답 생성 함수
  function createCorsResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // OPTIONS 요청 처리 (CORS preflight)
  function doOptions() {
    return createCorsResponse({ success: true });
  }
  
  // 게스트 데이터를 받아서 시트에 추가/업데이트하는 함수
  function doPost(e) {
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      // form-urlencoded 방식으로 받은 데이터 파싱
      var action = e?.parameter?.action || '';
      var payloadStr = e?.parameter?.payload || '{}';
      
      Logger.log('doPost 호출 - action: ' + action);
      Logger.log('payload 길이: ' + payloadStr.length);
      
      var data;
      try {
        data = JSON.parse(payloadStr);
      } catch (parseError) {
        Logger.log('JSON 파싱 오류: ' + parseError.toString());
        return createCorsResponse({
          success: false,
          error: 'JSON 파싱 오류: ' + parseError.toString()
        });
      }
      
      // action은 URL 파라미터에서 가져오거나 data에서 가져오기
      var finalAction = action || data.action;
      
      // 데이터 유효성 검사
      if (!finalAction) {
        return createCorsResponse({
          success: false,
          error: 'action이 필요합니다'
        });
      }
       
       if (finalAction === 'syncAll') {
         // 전체 게스트 리스트 동기화
         return syncAllGuests(sheet, data.guests);
       } else if (finalAction === 'addGuest') {
         // 게스트 추가
         return addGuest(sheet, data.guest);
       } else if (finalAction === 'updateGuest') {
         // 게스트 업데이트
         return updateGuest(sheet, data.guest, data.index);
       } else if (finalAction === 'deleteGuest') {
         // 게스트 삭제
         return deleteGuest(sheet, data.index);
       }
       
      return createCorsResponse({
        success: false,
        error: '알 수 없는 action'
      });
    } catch (error) {
      Logger.log('오류 발생: ' + error.toString());
      Logger.log('스택: ' + error.stack);
      return createCorsResponse({
        success: false,
        error: error.toString()
      });
    }
  }
   
  // 전체 게스트 리스트 동기화
  function syncAllGuests(sheet, guests) {
    try {
      Logger.log('syncAllGuests 시작: ' + guests.length + '명');
      
      // 헤더가 없으면 추가
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          '번호', '이름', '전화번호', '닉네임', '예매유형', '예매일시', 
          '입금확인', '입금확인시간', '입장번호', '체크인', '체크인시간'
        ]);
      }
      
      // 기존 데이터 모두 삭제 (헤더 제외)
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        Logger.log('기존 데이터 삭제: ' + (lastRow - 1) + '행');
        sheet.deleteRows(2, lastRow - 1);
      }
      
      // 새 데이터 추가 (배치 처리로 성능 개선)
      var batchSize = 100; // 한 번에 100개씩 처리
      var allData = [];
      
      guests.forEach(function(guest, index) {
         var guestName = guest.name || guest['이름'] || guest.Name || '';
         var guestPhone = guest.phone || guest['전화번호'] || guest.Phone || '';
         var nickname = guest.nickname || '';
         var isWalkIn = guest.isWalkIn ? '현장 예매' : '사전 예매';
         var bookingDate = guest.bookingDate || '';
         var paymentConfirmed = guest.paymentConfirmed ? '확인완료' : '대기중';
         var paymentConfirmedAt = guest.paymentConfirmedAt 
           ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
           : '';
         var entryNumber = guest.entryNumber || '';
         var checkedIn = guest.checkedIn ? '완료' : '미완료';
         var checkedInAt = guest.checkedInAt 
           ? new Date(guest.checkedInAt).toLocaleString('ko-KR')
           : '';
         
         sheet.appendRow([
           index + 1,
           guestName,
           guestPhone,
           nickname,
           isWalkIn,
           bookingDate,
           paymentConfirmed,
           paymentConfirmedAt,
           entryNumber,
           checkedIn,
           checkedInAt
         ]);
       });
       
      return createCorsResponse({
        success: true,
        message: guests.length + '명의 게스트가 동기화되었습니다'
      });
    } catch (error) {
      Logger.log('syncAllGuests 오류: ' + error.toString());
      return createCorsResponse({
        success: false,
        error: error.toString()
      });
    }
  }
   
   // 게스트 추가
   function addGuest(sheet, guest) {
     try {
       var guestName = guest.name || guest['이름'] || guest.Name || '';
       var guestPhone = guest.phone || guest['전화번호'] || guest.Phone || '';
       var nickname = guest.nickname || '';
       var isWalkIn = guest.isWalkIn ? '현장 예매' : '사전 예매';
       var bookingDate = guest.bookingDate || '';
       var paymentConfirmed = guest.paymentConfirmed ? '확인완료' : '대기중';
       var paymentConfirmedAt = guest.paymentConfirmedAt 
         ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
         : '';
       var entryNumber = guest.entryNumber || '';
       var checkedIn = guest.checkedIn ? '완료' : '미완료';
       var checkedInAt = guest.checkedInAt 
         ? new Date(guest.checkedInAt).toLocaleString('ko-KR')
         : '';
       
       sheet.appendRow([
         sheet.getLastRow(), // 번호
         guestName,
         guestPhone,
         nickname,
         isWalkIn,
         bookingDate,
         paymentConfirmed,
         paymentConfirmedAt,
         entryNumber,
         checkedIn,
         checkedInAt
       ]);
       
       return ContentService.createTextOutput(JSON.stringify({
         success: true,
         message: '게스트가 추가되었습니다'
       })).setMimeType(ContentService.MimeType.JSON);
     } catch (error) {
       return ContentService.createTextOutput(JSON.stringify({
         success: false,
         error: error.toString()
       })).setMimeType(ContentService.MimeType.JSON);
     }
   }
   
   // 게스트 업데이트
   function updateGuest(sheet, guest, index) {
     try {
       var row = index + 2; // 헤더 + 인덱스
       var guestName = guest.name || guest['이름'] || guest.Name || '';
       var guestPhone = guest.phone || guest['전화번호'] || guest.Phone || '';
       var nickname = guest.nickname || '';
       var isWalkIn = guest.isWalkIn ? '현장 예매' : '사전 예매';
       var bookingDate = guest.bookingDate || '';
       var paymentConfirmed = guest.paymentConfirmed ? '확인완료' : '대기중';
       var paymentConfirmedAt = guest.paymentConfirmedAt 
         ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
         : '';
       var entryNumber = guest.entryNumber || '';
       var checkedIn = guest.checkedIn ? '완료' : '미완료';
       var checkedInAt = guest.checkedInAt 
         ? new Date(guest.checkedInAt).toLocaleString('ko-KR')
         : '';
       
       sheet.getRange(row, 1, 1, 11).setValues([[
         index + 1,
         guestName,
         guestPhone,
         nickname,
         isWalkIn,
         bookingDate,
         paymentConfirmed,
         paymentConfirmedAt,
         entryNumber,
         checkedIn,
         checkedInAt
       ]]);
       
       return ContentService.createTextOutput(JSON.stringify({
         success: true,
         message: '게스트가 업데이트되었습니다'
       })).setMimeType(ContentService.MimeType.JSON);
     } catch (error) {
       return ContentService.createTextOutput(JSON.stringify({
         success: false,
         error: error.toString()
       })).setMimeType(ContentService.MimeType.JSON);
     }
   }
   
   // 게스트 삭제
   function deleteGuest(sheet, index) {
     try {
       var row = index + 2; // 헤더 + 인덱스
       sheet.deleteRow(row);
       
       // 번호 재정렬
       var lastRow = sheet.getLastRow();
       for (var i = 2; i <= lastRow; i++) {
         sheet.getRange(i, 1).setValue(i - 1);
       }
       
       return ContentService.createTextOutput(JSON.stringify({
         success: true,
         message: '게스트가 삭제되었습니다'
       })).setMimeType(ContentService.MimeType.JSON);
     } catch (error) {
       return ContentService.createTextOutput(JSON.stringify({
         success: false,
         error: error.toString()
       })).setMimeType(ContentService.MimeType.JSON);
     }
   }
   
   // 테스트 함수 (선택사항)
   function test() {
     var testGuest = {
       name: '테스트',
       phone: '01012345678',
       nickname: '테스트닉네임',
       isWalkIn: false,
       paymentConfirmed: true
     };
     addGuest(SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(), testGuest);
   }
   ```

3. **스크립트 저장**
   - `Ctrl + S` 또는 `Cmd + S`로 저장
   - 프로젝트 이름 지정 (예: "게스트 리스트 동기화")

## 3. 웹 앱으로 배포

⚠️ **중요**: 코드를 수정한 후에는 반드시 **새 배포**를 해야 변경사항이 적용됩니다!

1. **배포 설정**
   - Apps Script 편집기에서 `배포` → `새 배포` 클릭
   - `유형 선택` → `웹 앱` 선택

2. **설정**
   - 설명: "게스트 리스트 동기화"
   - 다음 사용자로 실행: `나`
   - 액세스 권한: `모든 사용자` 선택 (중요!)
   - `배포` 버튼 클릭
   
   ⚠️ **중요**: 
   - "액세스 권한"을 반드시 `모든 사용자`로 설정해야 합니다. 
   - 그렇지 않으면 CORS 오류가 발생할 수 있습니다.
   - 배포 후 나타나는 웹 앱 URL을 복사하세요 (예: `https://script.google.com/macros/s/AKfycby.../exec`)
   
3. **권한 승인**
   - 권한 확인 화면에서 `권한 확인` 클릭
   - Google 계정 선택
   - `고급` → `안전하지 않은 페이지로 이동` (개발 중이므로)
   - `허용` 클릭
   
   ⚠️ **주의**: 처음 배포할 때 권한 승인을 해야 합니다.

3. **권한 승인**
   - 권한 확인 화면에서 `권한 확인` 클릭
   - Google 계정 선택
   - `고급` → `안전하지 않은 페이지로 이동` (개발 중이므로)
   - `허용` 클릭

4. **웹 앱 URL 복사**
   - 배포 완료 후 나타나는 `웹 앱 URL` 복사
   - 예: `https://script.google.com/macros/s/AKfycby.../exec`
   - 이 URL을 웹 애플리케이션에 설정합니다

## 4. 웹 애플리케이션에 설정

1. **환경 변수 설정**
   - 프로젝트 루트 디렉토리에 `.env` 파일 생성 (없는 경우)
   - `.env` 파일에 다음 형식으로 추가:
   ```env
   VITE_GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
   
   ⚠️ **주의사항**:
   - `VITE_` 접두사가 반드시 필요합니다 (Vite에서 클라이언트 측 환경 변수는 `VITE_`로 시작해야 함)
   - 등호(`=`) 앞뒤에 공백이 없어야 합니다
   - URL은 따옴표 없이 그대로 입력합니다
   - `YOUR_SCRIPT_ID` 부분을 실제 Google Apps Script에서 받은 스크립트 ID로 교체하세요
   
   **예시**:
   ```env
   VITE_GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/AKfycby1234567890abcdefghijklmnopqrstuvwxyz/exec
   ```
   
2. **환경 변수 적용**
   - `.env` 파일을 저장한 후 개발 서버를 재시작하세요
   - `npm run dev` 또는 `npm run build`를 다시 실행하면 환경 변수가 적용됩니다

2. **또는 Admin 페이지에서 직접 설정**
   - Admin 페이지의 "Google Sheets 연동" 섹션에서 URL 입력

## 5. 사용 방법

- 게스트가 추가/수정/삭제되면 자동으로 Google Sheets에 동기화됩니다
- Admin 페이지에서 "Google Sheets에 동기화" 버튼을 클릭하여 수동 동기화도 가능합니다

## 주의사항

- 웹 앱 URL은 공개되어도 안전합니다 (읽기/쓰기 권한은 Apps Script 설정에서 제어)
- 스크립트를 수정한 후에는 `새 버전`으로 다시 배포해야 합니다
- Google Sheets의 일일 API 호출 제한이 있습니다 (약 20,000회/일)


