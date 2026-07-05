# 스터디 신청 폼 · Google Apps Script 연동 명세

## 1. 구성

- 랜딩 페이지: `index.html`
- Apps Script 서버: `apps-script/Code.gs`
- Google Sheet 컬럼 예시: `GOOGLE_SHEET_COLUMNS.csv`
- 전송 방식: HTML `<form method="post">` → Apps Script 웹앱
- 응답 방식: 숨김 iframe으로 받아 현재 페이지를 유지

Apps Script 웹앱은 `doPost(e)`로 폼 파라미터를 받고, 지정한 Google Sheet의 `스터디신청` 시트에 한 행을 추가합니다.

## 2. 요청 필드

| 필드 | 필수 | 설명 |
|---|---:|---|
| `name` | Y | 신청자 성함 |
| `phone` | Y | 연락처 |
| `interest` | Y | 관심 분야 |
| `consent` | Y | 개인정보 수집·이용 동의. 값은 `동의` |
| `request_id` | Y | 브라우저에서 생성하는 요청 식별자 |
| `page_url` | N | 신청 페이지 주소 |
| `referrer` | N | 이전 유입 페이지 |
| `user_agent` | N | 브라우저 정보 |
| `utm_*` | N | 광고·캠페인 유입 정보 |
| `website` | N | 사람에게 보이지 않는 스팸 방지 필드 |

## 3. 저장 및 검증

- 필수값과 연락처 형식을 서버에서 다시 검증합니다.
- `01045668888`처럼 숫자만 입력한 휴대폰 번호는 `010-4566-8888` 형식으로 변환해 저장합니다.
- `LockService`로 동시 신청 시 행 쓰기 충돌을 방지합니다.
- `request_id`를 6시간 캐시해 동일 제출의 중복 저장을 줄입니다.
- `=`, `+`, `-`, `@`로 시작하는 사용자 입력은 수식이 아닌 텍스트로 저장합니다.
- 신규 신청의 상태 기본값은 `신규`입니다.

## 4. 설치 절차

1. Google Sheet를 새로 만들고 주소에서 스프레드시트 ID를 복사합니다.
   - 주소 형식: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
2. Apps Script 프로젝트를 만들고 `apps-script/Code.gs` 내용을 붙여 넣습니다.
3. Apps Script 편집기에서 아래 함수를 한 번 실행합니다.

   ```javascript
   setSpreadsheetId('여기에_스프레드시트_ID');
   setupSheet();
   ```

4. 권한 요청을 승인합니다.
5. `배포` → `새 배포` → 유형 `웹 앱`을 선택합니다.
6. 실행 사용자는 본인, 액세스 권한은 신청자가 로그인 없이 접근 가능한 범위로 설정합니다.
7. 배포된 `/exec` 웹앱 URL을 복사합니다. 테스트용 `/dev` URL은 사용하지 않습니다.
8. `index.html` 하단의 `APPS_SCRIPT_WEB_APP_URL` 값에 `/exec` URL을 입력합니다.
9. HTML을 GitHub Pages에 다시 배포한 뒤 테스트 신청을 1건 전송합니다.

공식 참고: [Apps Script 웹앱](https://developers.google.com/apps-script/guides/web), [Spreadsheet 서비스](https://developers.google.com/apps-script/reference/spreadsheet/)

## 5. 운영 전 확인

- 개인정보 처리방침에 수집 항목, 목적, 보유기간, 파기 방법, 문의처를 실제 운영 기준으로 기재합니다.
- Google Sheet 공유 권한은 담당자에게만 부여합니다.
- Apps Script 실행 기록에서 오류를 확인합니다.
- 웹앱 코드를 수정했다면 배포 관리에서 새 버전으로 다시 배포합니다.
- 스팸이 늘면 CAPTCHA 또는 별도 서버 검증을 추가합니다.
