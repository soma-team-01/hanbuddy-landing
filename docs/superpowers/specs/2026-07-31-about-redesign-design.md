# /about 전면 리디자인 설계 (2026-07-31)

2026-07-27 신설된 `/about`(PR #8·#9)을 내용·시각 양쪽에서 재구성한다. 기존 5섹션 텍스트 목록 구조를 **6섹션 사진 몰입형 내러티브**로 교체한다.

## 1. 배경

### 참고 자료

| 출처 | 핵심 |
| --- | --- |
| 매드타임스 "About 페이지 8가지 질문" | ①누구인가 ②우리 이야기 ③왜 하는가 ④누구를 위한가 ⑤무엇이 다른가 ⑥무엇을 이뤘나 ⑦어떻게 연결하나 ⑧앞으로 계획 |
| dr-hoho "About 페이지 구성" | 상단 슬로건+비주얼+CTA → 중단 핵심정보 스토리텔링 → 신뢰 요소 → 추가 콘텐츠. 짧은 문장, 광고톤 배제, 시각요소 우선 |
| 식스샵 디자인블록 About | About은 "팬을 만드는 공간". 시차 이미지+텍스트 / 아이콘+텍스트 / 로고 목록 블록 |

(webpreme.com 링크는 403으로 열리지 않아 반영하지 못했다.)

### 현행 `/about`의 갭

| 8문항 | 현행 |
| --- | --- |
| ①누구인가 | △ 히어로 한 줄 |
| ②우리 이야기 | ❌ 창업 계기 서사 없음 |
| ③왜 하는가 | ✅ `#why` |
| ④누구를 위한가 | ❌ 없음 |
| ⑤무엇이 다른가 | △ `#operate` 3항목이 밋밋한 목록 |
| ⑥무엇을 이뤘나 | ❌ 소마 배지뿐 |
| ⑦어떻게 연결 | ✅ `#join` |
| ⑧앞으로 | △ 문장 하나 |

시각적으로도 사진 4장 스트립을 빼면 전부 "제목+본문" 리듬이라 스크롤 보상이 없다.

## 2. 확정 결정 (유현님, 2026-07-31)

- **6섹션 압축.** 8문항을 모두 다루되 섹션은 6개로 흡수한다.
- **사진 몰입형.** 히어로는 풀블리드 사진 + 스크림, 본문 섹션은 사진↔텍스트 좌우 교차, 실적 섹션은 `ink` 배경 밴드.
- **누적 지표 비공개.** 운영이 2회뿐이라 참가 인원·회차 수·평점을 숫자로 내세우지 않는다. `4.7 / 5`는 메인 `#reviews`에만 둔다.
- **후기 원문 미게재.** 승인 인용 4건은 이미 메인 `#reviews`에 있으므로 About에서 중복하지 않는다.
- **한강은 미운영.** 한강 사진은 이준영님 개인 사진이며 HanBuddy 운영 회차가 아니다. 따라서 **"실제 모임의 순간"으로 표기 금지**. 메인 페이지 방식(장소·장면만 말하는 중립 캡션)을 따르고, 타임라인에서는 게시된 실제 일정(8/1·8/8·8/9)을 근거로 **"예정"**으로 노출한다.
- **과기부 로고 미사용.** 부처는 소마의 주최일 뿐 HanBuddy를 후원·승인한 것이 아니어서 오인 소지가 있고, 정부상징은 별도 사용 승인 대상이며, 청색 계열이라 웜레드 단일 브랜드 체계와 충돌한다. 소마 로고는 사용하고 주최·주관은 텍스트로 표기한다. 부처 로고가 필요해지면 소마 사무국에 참여팀 대외 홍보물 사용 가이드라인을 확인받은 뒤 재검토한다.
- **소마 표기 정정.** 현행 카피에 주관기관이 빠져 있다. "과학기술정보통신부 주최, 정보통신기획평가원(IITP) 주관"으로 보강한다.
- **`weekend` 표현 전면 폐기.** 야구는 평일 저녁(수 8/5·8/12)에도 운영하므로 포지셔닝은 주말 한정이 아니다. 메인 `index.html`에는 `weekend`가 한 번도 없고 `Seoul · Meetups every week` / `서울 · 매주 열리는 모임`으로 통일되어 있다. About의 `Korean weekend` / `한국 주말` 표기(H1·`<title>`·`og:title`·`meta description` EN/KO 총 6곳)를 전부 제거하고 **week 계열 표현**으로 맞춘다.
- **히어로는 메인 슬로건에 직접 연결.** 메인 히어로 슬로건은 EN·KO 양쪽 모두 영문 그대로 `Experience Korea like a local!`이다. About H1은 이 슬로건을 인용해 "그 문장을 실제로 일어나게 만드는 팀"으로 받는다 — 기존 `weekend` 연결고리를 대체하는 새 연결고리이자 8문항 ①(누구인가)의 답이 된다. `The team that makes ~ happen` 구문은 팀을 **실행 주체**로 놓으므로 "같이 노는 가이드"가 아닌 운영자 포지셔닝이 유지된다(유현님 선택, 2026-07-31). 후보였던 `We’re the locals in “like a local.”`은 팀이 로컬 버디로 읽혀 탈락했다.

### 유지되는 기존 확정 사항 (재론 금지)

- 포지셔닝은 **운영자**(설계·운영·개선 주체). "engineering team" 표현 금지.
- ZeroOne 팀명은 상단 노출 금지, 팀 섹션에서만.
- ② 섹션은 "번역/티켓은 문제 아님"류 카피 금지. `locked behind locals only` 프레임 유지.
- 팀원은 사진 없이 이름+담당+LinkedIn. 순서 김민형 → 김유현 → 이준영. 기술 용어 금지.
- 이준영님 LinkedIn 슬러그의 `undefined`는 LinkedIn이 실제 생성한 것으로 오타가 아니다.

## 3. 섹션 설계

### ① `#top` — Hero (풀블리드)

- 배경: `/assets/photos/kbo/kbo-0726-lights.webp` (야간 조명, 근접 얼굴 없음), `object-cover`, `ink/60` 스크림. 장식이므로 `alt=""`.
- 카피는 스크림 위 `on-primary-strong`. eyebrow는 `eyebrow-on-primary`.
- **누구를 위한 서비스인지(④)를 lead에서 처음으로 명시**한다.
- 하단에 pill CTA 2개: 신청 폼(primary) + `/#events`(보조).
- 현행 사진 4장 스트립과 `Real moments from our meetups` 캡션은 삭제한다 — 한강 사진을 운영 실적으로 주장하던 유일한 지점이다.

| 키 | EN | KO |
| --- | --- | --- |
| `hero.eyebrow` | About HanBuddy | HanBuddy 소개 |
| `hero.title` | The team that makes “like a local” happen. | “like a local”을 실제로 만들어 내는 팀. |
| `hero.lead` | For anyone living in or passing through Seoul who wants the Korea locals actually enjoy. We plan it, run it, and improve it every week — you just show up. | 서울에 살고 있든 잠시 머물든, 한국 사람들이 실제로 즐기는 한국을 만나고 싶은 모두를 위해. 기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요. |
| `hero.primaryCta` | Join a meetup | 모임 참여하기 |
| `hero.secondaryCta` | See upcoming events | 예정된 이벤트 보기 |

메타 카피도 함께 교체한다(`<title>`·`og:title`·`meta description`·`og:description`, EN/KO 양쪽 + `CONTENT_MAP.meta`).

| 키 | EN | KO |
| --- | --- | --- |
| `meta.title` / `meta.ogTitle` | About HanBuddy \| The team that makes “like a local” happen | HanBuddy 소개 \| “like a local”을 실제로 만들어 내는 팀 |
| `meta.description` | Meet the team that plans and runs HanBuddy — KBO baseball nights and Han River picnics in Seoul, every week, backed by AI·SW Maestro. | HanBuddy를 기획하고 운영하는 팀을 소개합니다 — 매주 서울에서 열리는 KBO 야구 직관과 한강 피크닉, AI·SW마에스트로와 함께. |
| `meta.ogDescription` | We plan it, run it, and improve it every week — you just show up. | 기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요. |

### ② `#origin` — 창업 계기 (사진 좌 / 텍스트 우)

- 사진: `/assets/photos/kbo/run1-opening.webp`, `rounded-2xl`, `photo-card` 규격.
- 데스크톱 2단, 모바일에서는 사진 위 텍스트 아래로 스택.
- 확정 프레임 `locked behind locals only`를 제목으로 유지하고, **본문 첫 문단에 창업 계기 서사를 신설**한다.

| 키 | EN | KO |
| --- | --- | --- |
| `origin.eyebrow` | Why we started | 시작한 이유 |
| `origin.title` | Some of Korea’s best moments are locked behind “locals only.” | 한국의 진짜 재미는 “로컬 전용”으로 잠겨 있습니다. |
| `origin.body1` | It started with a ticket we watched disappear. A Jamsil night game sells out in seconds on an app that wants a Korean phone number and a Korean card — our friends from abroad never even got to the screen. | 시작은 눈앞에서 사라진 티켓 한 장이었습니다. 잠실 야간 경기는 한국 번호와 한국 카드를 요구하는 앱에서 몇 초 만에 매진됩니다 — 외국인 친구들은 그 화면까지 가지도 못했죠. |
| `origin.body2` | It was never just tickets. The best picnic spots, the river-delivery trick, the chants everyone in the stands already knows — none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun. | 티켓만의 문제가 아니었습니다. 한강의 명당, 강변 배달 노하우, 관중석 모두가 이미 아는 응원가 — 어느 것도 영어로는 없습니다. HanBuddy가 그 문을 엽니다 — 막히는 부분은 저희가 처리하고, 즐기는 법은 함께 나눕니다. |

### ③ `#how` — 운영 방식 (지그재그 3블록)

- 블록마다 사진↔텍스트 좌우를 번갈아 배치한다. 모바일은 전부 사진 위 / 텍스트 아래.
- 운영자 포지셔닝을 유지하되 현행의 하드 목록을 사진 페어링으로 교체한다.

| # | 사진 | EN 제목 / 본문 | KO 제목 / 본문 |
| --- | --- | --- | --- |
| 1 | `kbo/kbo-0726-sunset.webp` | We plan each activity ourselves / Built around one real Korean moment — not a checklist of landmarks. | 모든 활동을 직접 기획합니다 / 랜드마크 체크리스트가 아니라, 한국의 진짜 순간 하나를 중심으로 설계합니다. |
| 2 | `kbo/run1-group.webp` | A real person confirms your details / No booking engine. We message you before the day with the meeting spot and everything you need. | 세부 사항은 사람이 직접 확인해 드립니다 / 예약 시스템이 아닙니다. 모임 전에 만나는 곳과 필요한 것들을 직접 메시지로 보내드려요. |
| 3 | `kbo/kbo-0726-cheers.webp` | We improve every week / Every guest fills in a short survey afterwards, and it changes how we run the next one. | 매주 더 나아집니다 / 모든 게스트가 모임 후 짧은 설문을 남기고, 그 답이 다음 운영을 바꿉니다. |

`how.title`: `Run by us, every week.` / `매주, 저희가 직접 운영합니다.`

### ④ `#timeline` — 지금까지 간 곳과 다음에 갈 곳 (`ink` 밴드)

- 배경 `bg-ink`, 텍스트 `on-primary-strong` 계열. 메인 `#reviews`와 같은 어두운 밴드 리듬을 About에서 한 번만 쓴다.
- 항목은 사진 + 상태 칩 + 날짜 + 제목. 상태 칩 2종: `Completed` / `완료`, `Coming up` / `예정`.
- **날짜는 전부 실제 값이다.** 완료 2건은 AGENTS.md 승인 사실, 예정 4건은 `index.html` `CONTENT_MAP.events.cards`에 게시된 일정을 그대로 인용한다. 날짜를 창작하지 않는다.

| 상태 | 날짜 (EN / KO) | 제목 (EN / KO) | 사진 |
| --- | --- | --- | --- |
| 완료 | 2026.06.25 | Jamsil KBO — our first baseball night / 잠실 KBO — 첫 번째 야구 나이트 | `kbo/run1-night.webp` |
| 완료 | 2026.07.26 | Jamsil KBO — chants and chimaek in the stands / 잠실 KBO — 관중석의 응원가와 치맥 | `kbo/kbo-0726-group.webp` |
| 예정 | Aug 1 · 8 · 9 / 8월 1 · 8 · 9일 | Han River Picnic / 한강 피크닉 | `hanriver/hanriver-fountain.webp` |
| 예정 | Aug 5 · 12 / 8월 5 · 12일 | KBO Baseball Night / KBO 야구 나이트 | `kbo/run1-hero.webp` (구현에서는 `kbo-stadium-hero.webp`가 히어로 배경으로 쓰여 대신 사용) |
| 예정 | Date coming soon / 날짜 공개 예정 | K League Football Day / K리그 축구 데이 | `kleague/kleague-worldcup-day.webp` (`kleague-night.webp`는 세로 사진이라 16/10 가로 프레임에 맞지 않아 대신 사용) |
| 예정 | Date coming soon / 날짜 공개 예정 | Jjimjilbang Sauna Hangout / 찜질방 사우나 | `jjimjilbang/jjimjilbang-bulgama.webp` |

섹션 헤더 카피 — `timeline.title`: `Where we’ve been, and where we’re going next.` / `지금까지 간 곳, 그리고 다음에 갈 곳.`, `timeline.eyebrow`: `Our runs` / `운영 기록`.

- 마무리 문단은 현행 `beyond.body`를 그대로 옮긴다: `Baseball and picnics are just the start — festivals, football, markets: anywhere Koreans have their fun, we’ll take you along.` / `야구와 피크닉은 시작일 뿐입니다 — 축제, 축구, 시장까지: 한국 사람들이 노는 곳이라면 어디든 함께 갈 거예요.`
- 예정 항목은 해당 `/events/*` 상세 페이지가 있으면 카드 전체를 링크로 만든다(한강·KBO). `soon` 상태 2건은 링크 없이 정보만 보여준다.

### ⑤ `#team` — 팀과 공신력

- 현행 3인 목록(이름·담당·LinkedIn)을 유지한다. 팀원 사진 없음.
- 소마 카드를 정식 카드로 격상하고 주관기관을 보강한다.

| 키 | EN | KO |
| --- | --- | --- |
| `team.title` | Meet the team | 팀을 소개합니다 |
| `team.lead` | We’re ZeroOne — three friends from Seoul running HanBuddy together. | 저희는 ZeroOne — HanBuddy를 함께 운영하는 서울의 세 친구입니다. |
| `team.backed` | HanBuddy is the official project of team ZeroOne in AI·SW Maestro (17th) — a national tech talent program hosted by Korea’s Ministry of Science and ICT and managed by IITP. | HanBuddy는 과학기술정보통신부 주최, 정보통신기획평가원(IITP) 주관 국가 기술 인재 프로그램 AI·SW마에스트로 17기 팀 ZeroOne의 공식 프로젝트입니다. |

멤버 카피는 현행 유지: 김민형(팀 리드 & 운영 총괄) / 김유현(경험과 콘텐츠 설계) / 이준영(예약과 매칭 담당).

### ⑥ `#join` — CTA 밴드

- 현행 `primary-strong` 밴드를 유지하되 카카오 오픈채팅 버튼을 추가해 메인 `#apply`의 채널 구성과 맞춘다.
- 버튼: 신청 폼(주) / Instagram DM / KakaoTalk 오픈채팅.

## 4. 디자인 시스템 준수

- 팔레트·타이포·라디우스·모션은 DESIGN.md 그대로. 새 토큰을 만들지 않는다.
- 스크림은 사진 위 가독성 확보 용도로만 쓴다(Section 2 예외 조항). 장식 그라디언트 금지.
- 모션은 `180ms~240ms` 표준 구간의 hover만 사용한다. **loud parallax·스티키 스크롤 시퀀스 금지**(DESIGN.md Section 6).
- `prefers-reduced-motion`에서 진입 모션을 끈다.
- 사진은 승인된 public WebP만 사용하고, 장식 배경에는 근접 얼굴이 드러난 셀피형 사진을 쓰지 않는다.

## 5. 구조·구현 제약

- `about/index.html` 자기 완결 독립 파일 구조를 유지한다(A안). 공통 JS를 추출하지 않는다.
- 자산 경로는 루트 절대경로(`/assets/...`)만 사용한다.
- EN/KO 이중언어는 기존 `CONTENT_MAP` + `data-i18n` / `data-i18n-alt` / `data-i18n-aria` 방식을 그대로 확장한다.
- nav·footer·consent 공유 카피를 바꿀 경우 `index.html`과 `about/index.html` **두 파일 모두** 수정한다.
- 애널리틱스는 동의 후 로드 게이트를 유지한다. `startSectionAnalytics`의 관찰 대상 id를 새 구조에 맞춰 `['origin', 'how', 'timeline', 'team', 'join']`으로 갱신한다.

## 6. 테스트

`tests/about.test.js`를 새 구조에 맞춰 갱신한다.

- `about page exists with core sections`의 id 목록을 `['top', 'origin', 'how', 'timeline', 'team', 'join']`으로 교체.
- 기존 검사(동의 게이트, 유지보수 전용 문구 비노출, 팀 링크 3종, 루트 절대경로, 공유 카피 11종 동기화)는 그대로 유지.
- 신규 검사 2건 추가:
  - About에 `Real moments from our meetups` / `실제 모임의 순간들` 문자열이 없을 것 — 한강 사진을 운영 실적으로 주장하지 않기 위한 회귀 방지.
  - About에 `4.7` 및 승인 인용 4건의 문자열이 없을 것 — 메인과의 중복 방지.

실행: `node --test tests/*.test.js` (디렉터리 인자는 이 환경에서 실패한다).

## 7. 범위 밖

- 메인 `index.html`과 `/events/*` 상세 페이지는 건드리지 않는다. 메인의 한강 사진은 중립 캡션(`Banpo rainbow 🌈`, `chimaek by the river 🍗`)과 "예정" 이벤트 카드로만 쓰이고 있어 정정 대상이 아니다.
- 소마·과기부 로고 사용 가이드라인 확인은 별도 트랙이다.
- 8월 한강 회차를 실제로 운영한 뒤에는 타임라인의 해당 항목을 `완료`로 옮기고 실제 사진을 교체할 수 있다.

## 8. 배포

브랜치 → PR → CodeRabbit 리뷰 반영 → squash 머지. main 직접 push는 훅으로 차단되어 있다. 커밋·PR 본문에 AI 공동작성자 트레일러를 넣지 않는다.
