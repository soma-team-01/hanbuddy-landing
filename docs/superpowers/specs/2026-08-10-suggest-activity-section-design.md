# 활동 제안 섹션 설계

2026-08-10 확정. 랜딩에 올라온 활동·날짜가 맞지 않는 방문자가 그냥 이탈하는 대신,
원하는 활동과 날짜를 남기고 갈 수 있는 인라인 제안 폼을 추가한다.

## 배경과 결정

- 지금 랜딩은 열려 있는 회차 신청만 받는다. 원하는 활동이 없으면 남길 수 있는 게 없다.
- 목적은 혼합형: 활동·날짜는 필수로 받아 수요를 보고, 연락처는 선택으로 받아
  비슷한 활동이 열리면 직접 연락할 리드도 확보한다.
- 위치는 목업 비교(A: 그리드 카드+별도 페이지, B: 인라인 섹션, C: 절충) 끝에
  B 계열로 확정. 섹션 순서는 이벤트 → 제안 → "Joining takes 2 minutes." 이고,
  이벤트 그리드에 제안 카드는 넣지 않는다.
- 같은 결정에 묶여, how 섹션(1·2·3 단계)이 모바일에서 세로로 길게 쌓이는 것을
  가로 3열 배치로 고친다.

## UI

- `index.html`의 이벤트 섹션과 how 섹션 사이에 `#suggest` 섹션(bg-panel)을 넣는다.
  데스크톱은 왼쪽 텍스트 + 오른쪽 폼 카드 2단, 모바일은 세로 스택.
- 카피는 기존 EN/KO copy 객체와 `data-i18n`/`data-i18n-placeholder`로 통합한다.
  em dash는 쓰지 않는다.
- 필드: 활동(필수, 200자), 날짜(필수, 자유 텍스트 200자), 연락처(선택, 100자),
  숨김 honeypot(`website`). 날짜를 자유 텍스트로 받는 이유: "any weekend evening"
  같은 답이 데이터로 더 유용하다.
- 제출 성공 시 폼 자리를 감사 메시지로 바꾸고 포커스를 옮긴다. 오류는 apply 폼과
  같은 방식(aria-invalid + 인라인 메시지).
- 내비게이션 링크는 추가하지 않는다.

## 백엔드

- `api/suggest.js`: `api/apply.js`와 같은 구조. 같은 스프레드시트
  (`APPLICATIONS_SHEET_ID`)의 새 탭(`SUGGESTIONS_SHEET_TAB`, 기본 `suggestions`)에
  append하고 Discord 웹훅으로 알린다. 시트 실패 시 Discord에 수동 복구 표시,
  둘 다 실패 시에만 500. 기존 신청 17열 계약은 건드리지 않는다.
- 저장 열(A:F): 접수시각(KST), 제안 ID(`HBS-YYYYMMDD-6자`), 활동, 날짜, 연락처, 언어.
- 검증은 `assets/suggest-validation.js` 하나를 클라이언트·서버가 공유한다
  (apply-validation과 같은 UMD 패턴). honeypot이 차 있으면 성공처럼 응답하고
  저장하지 않는다.

## 애널리틱스

- GA4 커스텀 이벤트: `suggestion_start`(첫 입력), `suggestion_submit`(접수 성공),
  `suggestion_error`(검증 실패, field 파라미터). 동의 게이트는 기존 것을 그대로 탄다.
  폼 내용은 이벤트에 싣지 않는다. Meta 이벤트는 없다.

## 테스트

- `suggest-validation` 단위 테스트, `api/suggest` 핸들러 테스트(아이디 형식, 행 순서,
  405, honeypot, 검증 실패, 저장 실패 조합)는 apply 쪽 테스트를 본뜬다.
- 섹션 구조 테스트: `#suggest` 존재, 폼 필드 3종 + honeypot, 검증 스크립트 로드,
  how 그리드의 모바일 3열 클래스. 카피 문자열은 테스트에 박지 않는다.
- 기존 inline-scripts 가드가 index.html 인라인 스크립트 문법을 계속 지킨다.

## 배포 세팅 (머지 후 1회)

- 스프레드시트에 `suggestions` 탭 추가, 1행 헤더 6열.
- Vercel 환경변수는 기존 것을 재사용하므로 추가할 것 없음(탭 이름을 바꿀 때만
  `SUGGESTIONS_SHEET_TAB` 지정).
