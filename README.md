# HanBuddy Landing (공개 모집/홍보 랜딩)

ZeroOne 팀 HanBuddy의 공개 recruitment/promotion 정적 사이트. **주 타깃은 외국인 게스트(international guests) 모집**이며, 페이지 전체가 게스트 화법으로 구성된다. 한국인·로컬 buddy 모집은 최종 CTA 섹션의 한 줄 안내(KakaoTalk 오픈채팅 유도)로만 노출한다.

포지셔닝은 **날짜 기반 이벤트**다(주말 전용 아님 — 야구는 평일에도 진행). `#events` 섹션의 Meetup 스타일 카드가 현재 공개된 일정을 보여주고, 각 카드는 `/events/`의 예약형 상세페이지로 연결된다. 완료된 운영(2026-06-25·07-26 잠실 KBO, 한강 피크닉)의 승인 사진과 게스트 후기를 홍보용 proof로 사용한다.

- **프로덕션**: https://landing.hanbuddy.kr — `main` 머지 시 Vercel GitHub 연동으로 **자동 배포** (수동 배포 불필요)
- **페이지**: `/` (메인) · `/about` (팀 소개) · `/events/kbo/` · `/events/hanriver/` (이벤트 상세)
- **신청**: Google Form `https://forms.gle/B1fWgX3MjtHUHGNt5` (`index.html`의 `CONFIG.apply`). 링크가 바뀌면 hardcoded anchor·`CONFIG`·문구를 함께 교체
- **문의**: 기본은 Instagram DM https://www.instagram.com/hanbuddy_kr/ , KakaoTalk 오픈채팅 https://open.kakao.com/o/sP3n4rFi 은 보조·한국인 버디 채널
- **구조**: 빌드 없는 정적 HTML + 공개용 WebP 파생 이미지. 상세 구조와 규칙은 `AGENTS.md`, 디자인 시스템은 `DESIGN.md`(SSOT)
- 개인정보는 이 페이지/레포에 저장하지 않는다. 신청과 문의는 외부 채널에서 처리한다.
- 참가자 사진은 회차별 동의 기반으로 사용하며, 원본 JPG/EXIF는 배포하지 않는다(공개는 EXIF 제거 WebP만).

## 로컬 미리보기

```bash
cd ~/projects/hanbuddy-landing
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 테스트

```bash
# 글롭을 명시할 것 — `node --test tests/` 디렉터리 인자는 일부 Node에서 실패
node --test tests/about.test.js tests/analytics.test.js tests/color-palette.test.js tests/typography.test.js
```

about 카피 동기화(메인↔about 공유 문구), 애널리틱스 동의 게이팅, `DESIGN.md`↔구현 팔레트·타이포 동기화를 검사한다. CI는 없으므로 푸시 전에 로컬에서 돌린다.

## 배포

수동 배포 절차는 없다. **브랜치 → PR → 리뷰 반영 → `main`에 squash 머지**하면 Vercel이 자동 배포한다(main 직접 push는 훅으로 차단됨).

무엇이 서빙되는지는 `.vercelignore` **allowlist**가 결정한다 — Vercel은 git 트리가 아니라 작업 디렉터리를 업로드하므로, 공개 파일(새 사진 폴더·확장자·페이지)을 추가할 때는 같은 변경에서 `.vercelignore`도 갱신해야 한다. 원본 JPG·내부 문서·도구 폴더는 절대 allowlist에 넣지 않는다.

## 공개 카피 원칙 (요약 — 정본은 `AGENTS.md` CONVENTIONS)

- 이벤트 날짜·가격·포함 범위는 공개 확정된 사실만 쓴다. 장소·정원·시간·결제/환불 조건은 확정 전까지 임의로 쓰지 않는다.
- 게스트 인용은 `AGENTS.md`의 **승인 인용 목록**(현재 4건)만, 원문 그대로 사용한다.
- 사진은 승인된 WebP만. 배경/장식용 사진은 얼굴이 근접 식별되는 컷을 쓰지 않는다.
- 검증 진행 로그 정본은 `soma-memory` 운영 로그에 남긴다.
