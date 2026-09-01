# HanBuddy Landing (공개 모집/홍보 랜딩)

ZeroOne 팀 HanBuddy의 공개 recruitment/promotion 정적 사이트. **주 타깃은 외국인 게스트(international guests) 모집**이며, 페이지 전체가 게스트 화법으로 구성된다. 한국인·로컬 buddy 모집은 최종 CTA 섹션의 한 줄 안내(KakaoTalk 오픈채팅 유도)로만 노출한다.

포지셔닝은 **날짜 기반 이벤트**다(주말 전용 아님 — 야구는 평일에도 진행). `#events` 섹션의 Meetup 스타일 카드가 현재 공개된 일정을 보여주고, 각 카드는 `/events/`의 예약형 상세페이지로 연결된다. 완료된 운영(2026-06-25·07-26 잠실 KBO, 한강 피크닉)의 승인 사진과 게스트 후기를 홍보용 proof로 사용한다.

- **프로덕션**: https://www.hanbuddy.kr — `main` 머지 시 Vercel GitHub 연동으로 **자동 배포** (수동 배포 불필요)
- **페이지**: `/` (메인) · `/about` (팀 소개) · `/apply/` (신청 폼) · `/events/kbo-gocheok/` · `/events/kbo-jamsil/` · `/events/kleague/` · `/events/hanriver/` (이벤트 상세)
- **신청**: 사이트 자체 폼 `/apply/` (`index.html`의 `CONFIG.apply`). 상세페이지는 `/apply/?event=<id>`로 회차를 프리필한다. 구글폼(`https://forms.gle/B1fWgX3MjtHUHGNt5`)은 이미 배포된 외부 링크 때문에 살려두지만 사이트에서는 더 이상 가리키지 않는다
- **문의**: 기본은 Instagram DM https://www.instagram.com/hanbuddy_kr/ , KakaoTalk 오픈채팅 https://open.kakao.com/o/sP3n4rFi 은 보조·한국인 버디 채널
- **구조**: 빌드 스텝·패키지 매니저·npm 의존성이 없는 정적 HTML + 공개용 WebP 파생 이미지에, 신청 접수용 Vercel Function(`api/apply.js`) 하나가 붙어 있다. 상세 구조와 규칙은 `AGENTS.md`, 디자인 시스템은 `DESIGN.md`(SSOT)
- 신청 정보는 `/apply/`에서 수집해 팀 소유 구글 시트에 쌓고 **행사 종료 후 6개월** 보관 뒤 파기한다. 수집 항목·목적·보유기간·삭제 요청 창구는 폼 안 고지문에 적혀 있고, 필수 동의 체크박스를 받는다. 개인정보를 레포에 커밋하거나 서버 로그에 남기는 것은 여전히 금지다.
- 참가자 사진은 회차별 동의 기반으로 사용하며, 원본 JPG/EXIF는 배포하지 않는다(공개는 EXIF 제거 WebP만).

## 로컬 미리보기

```bash
cd ~/projects/hanbuddy-landing

# 신청 폼을 제출까지 돌려볼 때 (시크릿 필요 없음)
node scripts/dev-server.js                          # http://127.0.0.1:8099/apply/
QA_SCENARIO=sheet-fail node scripts/dev-server.js   # 또는 both-fail — 저장 실패 분기 확인
# ⚠️ 저장은 스텁이다. 접수 완료 화면이 떠도 시트 연동이 동작한다는 뜻은 아니다.

# 정적 페이지만 볼 때 (가장 빠르지만 /api/가 돌지 않아 제출은 전부 실패한다)
python3 -m http.server 8080
# http://localhost:8080 접속
```

시트 기록·디스코드 알림·GA 수집 같은 실물 확인은 **PR Preview 배포**에서 한다. 프로덕션 서비스 계정 키를 노트북에 내려받지 않는다.

## 테스트

```bash
# 글롭을 명시할 것 — `node --test tests/` 디렉터리 인자는 일부 Node에서 실패
node --test tests/*.test.js
```

about·apply 카피 동기화(메인과 공유하는 문구), 카드 날짜와 `EVENT_SLOTS`의 일치, 신청 폼 검증, 서버 로그 개인정보 차단, `.vercelignore` 배포 누락, 애널리틱스 동의 게이팅, `DESIGN.md`↔구현 팔레트·타이포 동기화를 검사한다. CI는 없으므로 푸시 전에 로컬에서 돌린다.

신청 측정의 canonical funnel은 `application_form_open` → `application_start` → `generate_lead`다. 첫 이벤트는 신청 페이지로 가는 실제 CTA 클릭마다 한 번(같은 클릭의 `select_content`는 보내지 않음), 두 번째는 신청 폼의 첫 trusted 입력 또는 날짜 선택에 한 번, 마지막은 `/api/apply`가 HTTP 성공과 `{ ok: true }`를 함께 반환한 뒤 한 번만 전송한다. 선택 날짜·인원·유입 경로를 포함한 폼 값은 분석 payload에 넣지 않는다. 다른 클릭·자동 폼 이벤트가 추가되더라도 이 세 단계의 대체 지표가 아니라 보조 지표로 문서화해야 한다.

## 배포

수동 배포 절차는 없다. **브랜치 → PR → 리뷰 반영 → `main`에 squash 머지**하면 Vercel이 자동 배포한다(main 직접 push는 훅으로 차단됨).

무엇이 서빙되는지는 `.vercelignore` **allowlist**가 결정한다 — Vercel은 git 트리가 아니라 작업 디렉터리를 업로드하므로, 공개 파일(새 사진 폴더·확장자·페이지·서버 함수)을 추가할 때는 같은 변경에서 `.vercelignore`도 갱신해야 한다. `tests/deploy-allowlist.test.js`가 이를 강제한다. 서비스 계정 키와 웹훅 URL은 Vercel 환경변수로만 존재하고 레포에 들어가지 않는다. 원본 JPG·내부 문서·도구 폴더는 절대 allowlist에 넣지 않는다.

## 공개 카피 원칙 (요약 — 정본은 `AGENTS.md` CONVENTIONS)

- 이벤트 날짜·가격·포함 범위는 공개 확정된 사실만 쓴다. 장소·정원·시간·결제/환불 조건은 확정 전까지 임의로 쓰지 않는다.
- 게스트 인용은 `AGENTS.md`의 **승인 인용 목록**(현재 4건)만, 원문 그대로 사용한다.
- 사진은 승인된 WebP만. 배경/장식용 사진은 얼굴이 근접 식별되는 컷을 쓰지 않는다.
