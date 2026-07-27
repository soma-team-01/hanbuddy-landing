# About 페이지 설계 스펙 (2026-07-27)

## 목적과 포지셔닝

- `/about` 페이지를 신설한다. 랜딩 메인에는 About 섹션을 만들지 않고, 상단바·푸터 링크로 진입한다.
- 포지셔닝: 팀을 "같이 놀아주는 가이드"가 아니라 **"이 경험을 설계하고 직접 운영하는 팀(운영자)"**으로 보여준다.
- 주 독자: 신청을 고민하는 외국인 게스트. 신뢰 신호는 ① 문제 정의가 있는 팀 ② 직접 운영 방식 ③ 실명+링크 ④ 소마/과기정통부 공신력.
- 팀원 사진은 싣지 않는다. 이름 + 한 줄 담당 + 외부 프로필 링크만.
- 기술 용어(backend, AI 등)는 팀원 소개에 쓰지 않는다. 게스트 언어로만 담당을 설명한다.
- ZeroOne 팀명은 상단에 노출하지 않고 ⑤ 팀 섹션에서만 언급한다.

## URL / 파일 구조

- URL: `/about` — `about/index.html` 디렉터리 방식. `vercel.json`·cleanUrls 불사용(로컬 `python3 -m http.server`와 프로덕션 동작 일치).
- `about/index.html`은 **자기 완결 독립 파일**: 헤더/푸터/언어토글/쿠키동의/GA·Pixel 스크립트를 자체 포함(복제)한다. 공통 JS/CSS 추출은 하지 않는다(3번째 페이지가 실제로 생길 때 재검토).
- About 페이지 내 에셋 경로는 루트 절대경로(`/assets/...`)를 쓴다.
- `index.html` 변경은 최소화: nav 링크 추가, 헤더 워드마크 반응형 조정, 푸터 About 링크 추가만.
- `.vercelignore`에 `!/about` 허용 줄 추가 (화이트리스트 방식 유지).

## 내비게이션 (index.html + about/index.html 공통)

- 데스크톱(lg↑): `CONTENT_MAP.{en,ko}.nav.links`에 `{ href: '/about', label: 'About' }` 추가 → `Programs · How it works · Join · About`.
- 모바일/태블릿(lg 미만): 현재 nav 링크가 전부 숨겨지므로(`hidden lg:flex`) 별도 처리 —
  - 헤더 로고 옆에 모바일 전용 About 링크(`lg:hidden`) 추가.
  - 워드마크 "HanBuddy" 텍스트는 `text-lg`→`text-base`로 축소하고 `hidden min-[380px]:inline`으로 380px 미만에서만 숨긴다(로고 아이콘은 항상 표시). 390px에서 워드마크+About 공존, 360px에서 넘침 0을 브라우저 실측으로 확인함.
- 푸터: 브랜드 줄 근처에 About 링크 추가(전 기기 공통 안전망). index와 about 두 파일 모두.
- About 페이지의 nav 링크 중 인페이지 앵커(`#programs` 등)는 `/#programs` 형태로 메인으로 돌아가게 한다.

## 페이지 구성 (6블록)

### ① 히어로
- eyebrow: `About HanBuddy`
- H1: `The team behind your Korean weekend.`
- lead: `We plan it, run it, and improve it every week — you just show up.`

### ② 왜 만들었나
- H2: `Some of Korea's best moments are locked behind "locals only."`
  - (이 문구가 기본값. 보류 대안: `The fun parts of Korea don't come with an English manual.` — 사용자 지시 없으면 기본값으로 구현)
- 본문: `Baseball tickets sell out on Korean-only apps. The best picnic spots, the river-delivery trick, the chants everyone knows — none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun.`
- 논리: 실무 장벽(한국 전용 앱·예매)과 문화 장벽(노하우·응원가)을 함께 문제로 세운다. "번역/티켓은 문제가 아니다"류 카피 금지 — 예매 장벽 자체가 창업 계기다.

### ③ 어떻게 운영하나 — 헤어라인 3줄 (DESIGN.md의 hairline editorial list 재사용)
- H2: `Run by us, every weekend.`
- `We plan each activity ourselves — built around one real Korean moment.`
- `We confirm details with you directly — a real person, not a booking engine.`
- `We improve every week — guest feedback shapes the next run.`

### ④ 어디로 가나 (1문장)
- `Baseball and picnics are just the start — festivals, football, markets: anywhere Koreans have their fun, we'll take you along.`

### ⑤ 팀 + 공신력
- H2: `Meet the team`
- lead: `We're ZeroOne — three friends from Seoul running HanBuddy together.`
- 팀원 (순서 고정: 팀장 먼저, 이후 가나다):

| 이름 | 담당(게스트 언어) | 링크 |
|---|---|---|
| Minhyung Kim | Leads the team & operations | https://www.linkedin.com/in/minbros/ |
| Yoohyun Kim | Designs the experiences & content | https://www.linkedin.com/in/yoohyun-kim-6655ba409/ |
| Junyoung Lee | Keeps bookings & matching smooth | https://github.com/junilyy |

- 링크는 새 탭(`target="_blank" rel="noopener"`), 라벨은 `LinkedIn ↗` / `GitHub ↗`.
- 공신력 카드(푸터 한 줄이 아닌 섹션 내 정식 블록): 소마 로고(`/assets/brand/soma-logo.webp`) + `Backed by AI·SW Maestro — a national tech talent program run by Korea's Ministry of Science and ICT. HanBuddy is our official project.`

### ⑥ 하단 CTA
- 메인과 동일: `Join this weekend`(Google Form, `CONFIG.apply`) + `DM us on Instagram`(`CONFIG.instagram`).

## 카피 원칙

- 전체 영문 분량 ~150단어 수준 유지. 각 블록 리드는 1~2문장.
- KO 버전은 EN과 같은 톤·같은 정보로 전체 작성한다(기존 CONTENT_MAP 이중언어 규약). 예: H1 `당신의 한국 주말을 만드는 팀`.
- 금칙(기존 가드레일 동일): F001, 4/5, 30,000, under 30,000, pre-acquaintance, proof of scale, learning signal 등 내부 검증 세부를 노출하지 않는다. 가격·정원·시간 등 미확정 사실을 새로 쓰지 않는다.
- 팀원 소개에 기술 스택·직함(backend, AI Engineer 등) 금지.

## 분석/메타

- GA4·Meta Pixel: 메인과 동일한 컨센트 게이트 뒤에서 로드. About 페이지뷰 + 외부 링크 클릭 이벤트(`data-cta`: `linkedin_minhyung`, `linkedin_yoohyun`, `github_junyoung`, `apply`, `instagram`).
- `<title>`/OG: `About HanBuddy | The team behind your Korean weekend` + 기존 OG 이미지 재사용. `<link rel="canonical" href="https://…/about">`.
- 메인과 동일한 파비콘/폰트 프리로드 구성.

## 테스트 (`tests/about.test.js` 신규, node --test)

1. **파일 간 동기화**: index와 about의 nav 링크 세트·푸터 핵심 카피·컨센트 카피가 일치한다(드리프트 방지).
2. **컨센트 게이트**: about이 GA/Pixel 스크립트를 초기 HTML에서 즉시 로드하지 않는다(기존 analytics.test.js와 동일 패턴).
3. **금칙어 부재**: about에 가드레일 금칙 문자열이 없다.
4. **링크 무결성**: 세 팀원 외부 링크 URL이 스펙과 일치하고 `rel="noopener"`를 갖는다.

## 배포

- `.vercelignore`: `!/about` 추가.
- 기존 워크플로우 유지: 브랜치 → PR → CodeRabbit → squash 머지, `npx vercel --prod`.

## 하지 않는 것 (YAGNI)

- 햄버거 메뉴, 공통 JS/CSS 추출, 팀원 사진, 프레임워크 도입, 메인 페이지 About 섹션, vercel.json.
