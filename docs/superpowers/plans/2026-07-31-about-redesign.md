# /about 전면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about`을 5섹션 텍스트 목록에서 6섹션 사진 몰입형 내러티브로 재구성하고, `weekend` 표기와 한강 사진의 허위 실적 표기를 제거한다.

**Architecture:** `about/index.html` 단일 자기 완결 파일의 `<main>` 마크업과 인라인 `CONTENT_MAP`을 교체한다. 새 프레임워크·빌드 도구·의존성을 도입하지 않는다. 타임라인 6개 항목만 `CONTENT_MAP` 데이터에서 JS로 렌더링하고(메인 `data-event-cards` 패턴을 따름), 나머지 섹션은 정적 마크업 + `data-i18n`으로 둔다.

**Tech Stack:** 정적 HTML + Tailwind CDN(인라인 config) + 바닐라 JS. 테스트는 `node --test`.

## Global Constraints

스펙: `docs/superpowers/specs/2026-07-31-about-redesign-design.md`

- **`weekend` / `주말` 표현 사용 금지.** week 계열로 통일한다. 야구는 평일 저녁(수 8/5·8/12)에도 운영한다.
- **히어로 H1은 확정 카피 그대로**: EN `The team that makes “like a local” happen.` / KO `“like a local”을 실제로 만들어 내는 팀.`
- **한강·K리그·찜질방 사진은 완료 운영 실적으로 표기 금지.** 타임라인에서 `Coming up` / `예정` 상태로만 노출하고, alt 텍스트도 HanBuddy 운영을 주장하지 않는 중립 문장으로 쓴다. 한강 사진은 이준영님 개인 사진이다.
- **완료 운영은 2건뿐**: 2026-06-25 잠실 KBO, 2026-07-26 잠실 KBO.
- **누적 지표·후기 원문 게재 금지.** `4.7`, 승인 인용 4건은 메인 `#reviews` 전용이다.
- **포지셔닝은 운영자.** `engineering team` 표현 금지. ZeroOne 팀명은 `#team` 섹션에서만.
- **팀원은 사진 없이** 이름 + 담당 + LinkedIn. 순서 김민형 → 김유현 → 이준영. 이준영님 URL 슬러그의 `undefined`는 LinkedIn이 실제 생성한 값이며 오타가 아니다.
- **과기부 로고 미사용.** 소마 로고만 사용하고 주최·주관은 텍스트로 표기한다.
- **디자인 시스템**: `DESIGN.md` 팔레트·타이포·라디우스 준수, 새 토큰 생성 금지. 모션은 `180ms~240ms` hover만. **loud parallax·스티키 스크롤 시퀀스 금지.** 스크림은 사진 가독성 용도로만.
- **자산 경로는 루트 절대경로(`/assets/...`)만.** 상대경로는 `/about/` 하위에서 깨진다.
- **nav·footer·consent 공유 카피를 바꾸면 `index.html`과 `about/index.html` 두 파일 모두** 수정한다. 이번 작업 범위에서는 공유 카피를 바꾸지 않는다.
- **애널리틱스는 동의 후 로드 게이트 유지.** `gtag`/`fbevents` 스크립트를 `<head>`에 직접 넣지 않는다.
- **범위 밖**: `index.html`, `/events/*`는 수정하지 않는다.
- 테스트 실행은 `node --test tests/*.test.js` — **디렉터리 인자는 이 환경에서 실패한다.**
- 커밋·PR 본문에 AI 공동작성자 트레일러를 넣지 않는다.

## File Structure

| 파일 | 책임 | 변경 |
| --- | --- | --- |
| `about/index.html` | About 페이지 전체(마크업 + `CONTENT_MAP` + 동작 스크립트) | 수정 — `<main>` 전면 교체, `CONTENT_MAP` 양 언어 교체, 메타 태그 교체, 타임라인 렌더러 신설, 섹션 옵저버 id 갱신 |
| `tests/about.test.js` | About 회귀 방지 | 수정 — 섹션 id 목록 교체, 회귀 방지 검사 4건 신설 |

`about/index.html`은 908줄이지만 상단 300줄이 Tailwind config·CSS이고 하단 480줄이 공유 스크립트라, 실제 교체 대상은 `<main>`(약 150줄)과 `CONTENT_MAP`(약 165줄)이다. 파일 분할은 하지 않는다 — 3번째 페이지가 생기면 재검토한다는 기존 결정을 유지한다.

---

### Task 1: 테스트를 새 구조에 맞춰 갱신 (RED)

**Files:**
- Modify: `tests/about.test.js:11-16` (섹션 id 목록), `tests/about.test.js:28-34` (유지보수 전용 문구 검사 뒤에 신규 검사 추가)

**Interfaces:**
- Consumes: 없음
- Produces: 이후 모든 Task가 통과시켜야 할 검사 — 섹션 id `['top', 'origin', 'how', 'timeline', 'team', 'join']`, `weekend`/`주말` 부재, `Real moments from our meetups`/`실제 모임의 순간들` 부재, `4.7` 및 승인 인용 부재, 히어로 이미지 비지연 로딩

- [ ] **Step 1: 섹션 id 목록을 교체한다**

`tests/about.test.js`의 `about page exists with core sections` 테스트에서 id 배열을 바꾼다.

```javascript
test('about page exists with core sections', () => {
  assert.ok(aboutHtml.length > 0, 'about/index.html must exist');
  for (const id of ['top', 'origin', 'how', 'timeline', 'team', 'join']) {
    assert.match(aboutHtml, new RegExp(`<section id="${id}"`), `missing section #${id}`);
  }
});
```

- [ ] **Step 2: 회귀 방지 검사 4건을 추가한다**

`about page never exposes maintainer-only validation details` 테스트 바로 뒤에 아래 4개를 삽입한다.

```javascript
test('about page never says weekend (baseball runs on weeknights too)', () => {
  assert.doesNotMatch(aboutHtml, /weekend/i, 'weekend framing is retired — use week');
  assert.doesNotMatch(aboutHtml, /주말/, '주말 표현은 폐기됨 — 매주/week 계열로');
});

test('about page never claims un-operated activities as completed meetups', () => {
  assert.doesNotMatch(aboutHtml, /Real moments from our meetups/);
  assert.doesNotMatch(aboutHtml, /실제 모임의 순간들/);
});

test('about page does not duplicate the rating or guest quotes from index', () => {
  // 맨 숫자 `4.7`은 쓰지 않는다 — 푸터 카카오 SVG path 데이터(`5.03 4.7 6.36L5.5`)에 우연히 포함돼
  // 영원히 실패하는 검사가 된다. 실제 평점 표기 형태(`4.7 / 5`)만 막는다.
  assert.doesNotMatch(aboutHtml, /4\.7\s*\/\s*5/, 'aggregate rating belongs to index #reviews only');
  for (const quote of [
    'this is the program you want to join',
    'Great experience to enjoy a baseball game with a local',
    'It was fun to watch the game and cheer together',
    'will definitely be going to another game with HanBuddy',
  ]) {
    assert.ok(!aboutHtml.includes(quote), `guest quote duplicated on about: ${quote}`);
  }
});

test('about hero image is not lazy-loaded (it is the LCP element)', () => {
  const heroImg = aboutHtml.match(/<img[^>]*kbo-0726-lights\.webp[^>]*>/);
  assert.ok(heroImg, 'hero backdrop image missing');
  assert.doesNotMatch(heroImg[0], /loading="lazy"/, 'hero image must not be lazy');
  assert.match(heroImg[0], /fetchpriority="high"/);
});
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `node --test tests/*.test.js`

Expected: FAIL. `about page exists with core sections`가 `missing section #origin`으로 실패하고, `about hero image is not lazy-loaded`가 `hero backdrop image missing`으로 실패한다. `weekend` 검사도 현재 H1·`<title>`에 `Korean weekend`가 있어 실패한다. 나머지 2건(허위 실적 표기 / 후기 중복)은 `Real moments from our meetups`가 현재 존재하므로 1건 실패, `4.7` 검사는 통과한다.

- [ ] **Step 4: 커밋**

```bash
git add tests/about.test.js
git commit -m "test: About 리디자인 회귀 방지 검사 추가 (RED)"
```

---

### Task 2: 히어로 풀블리드 교체 + 메타 카피에서 weekend 제거

**Files:**
- Modify: `about/index.html:6-14` (메타 태그), `about/index.html:190-225` (`#top` 섹션 전체), `about/index.html:446-475` (en `meta`·`hero`), `about/index.html:526-557` (ko `meta`·`hero`)

**Interfaces:**
- Consumes: Task 1의 검사
- Produces: `CONTENT_MAP.<lang>.hero` = `{ eyebrow, title, lead, primaryCta, secondaryCta }`, `CONTENT_MAP.<lang>.meta.heroAlt` 없음(배경은 장식이라 `alt=""`)

- [ ] **Step 1: 정적 메타 태그의 weekend 표기를 교체한다**

`about/index.html` 상단 `<head>`의 4줄을 바꾼다.

```html
  <title>About HanBuddy | The team that makes “like a local” happen</title>
  <meta name="description" content="Meet the team that plans and runs HanBuddy — KBO baseball nights and Han River picnics in Seoul, every week, backed by AI·SW Maestro." />

  <meta property="og:title" content="About HanBuddy | The team that makes “like a local” happen" />
  <meta property="og:description" content="We plan it, run it, and improve it every week — you just show up." />
```

- [ ] **Step 2: `#top` 섹션을 풀블리드 히어로로 교체한다**

기존 `<section id="top">` 전체(사진 4장 스트립과 `hero.photosNote` 포함)를 아래로 통째 교체한다.

```html
    <!-- ① Hero — full-bleed photo backdrop -->
    <section id="top" class="relative isolate overflow-hidden">
      <img src="/assets/photos/kbo/kbo-0726-lights.webp" width="1600" height="1200" fetchpriority="high" alt=""
           class="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_40%]" />
      <div class="absolute inset-0 -z-10 bg-ink/60" aria-hidden="true"></div>

      <div class="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
        <p class="eyebrow eyebrow-on-primary" data-i18n="hero.eyebrow">About HanBuddy</p>
        <h1 class="mx-auto mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-on-primary-strong sm:text-5xl" data-i18n="hero.title">
          The team that makes &ldquo;like a local&rdquo; happen.
        </h1>
        <p class="mx-auto mt-6 max-w-xl text-base leading-7 text-on-primary-strong/85 sm:text-lg sm:leading-8" data-i18n="hero.lead">
          For anyone living in or passing through Seoul who wants the Korea locals actually enjoy. We plan it, run it, and improve it every week &mdash; you just show up.
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="https://forms.gle/B1fWgX3MjtHUHGNt5" target="_blank" rel="noopener" data-cta="apply"
             class="focusable focusable-on-primary-strong rounded-full bg-on-primary-strong px-7 py-3.5 text-center text-base font-bold text-primary-strong transition hover:bg-primary-soft active:translate-y-px" data-i18n="hero.primaryCta">
            Join a meetup
          </a>
          <a href="/#events"
             class="focusable focusable-on-primary-strong rounded-full border border-on-primary-strong/40 px-7 py-3.5 text-center text-base font-bold text-on-primary-strong transition hover:bg-primary-hover active:translate-y-px" data-i18n="hero.secondaryCta">
            See upcoming events
          </a>
        </div>
      </div>
    </section>
```

`/#events` 링크에는 `data-cta`를 붙이지 않는다 — `syncCtas()`가 `CONFIG` 키를 찾지 못하면 아무 일도 하지 않지만, 내부 링크에 외부 CTA 트래킹 키를 부여하지 않는 편이 의미상 맞다.

- [ ] **Step 3: en `CONTENT_MAP`의 meta·hero를 교체한다**

`CONTENT_MAP.en.meta`에서 `momentGroupAlt`·`momentPicnicAlt`·`momentFountainAlt`·`momentCrewAlt` 4개를 삭제하고 title 계열을 바꾼다.

```javascript
        meta: {
          htmlLang: 'en',
          title: 'About HanBuddy | The team that makes “like a local” happen',
          description: 'Meet the team that plans and runs HanBuddy — KBO baseball nights and Han River picnics in Seoul, every week, backed by AI·SW Maestro.',
          ogTitle: 'About HanBuddy | The team that makes “like a local” happen',
          ogDescription: 'We plan it, run it, and improve it every week — you just show up.',
          somaAlt: 'AI·SW Maestro logo',
        },
```

`CONTENT_MAP.en.hero` 전체를 교체한다.

```javascript
        hero: {
          eyebrow: 'About HanBuddy',
          title: 'The team that makes “like a local” happen.',
          lead: 'For anyone living in or passing through Seoul who wants the Korea locals actually enjoy. We plan it, run it, and improve it every week — you just show up.',
          primaryCta: 'Join a meetup',
          secondaryCta: 'See upcoming events',
        },
```

- [ ] **Step 4: ko `CONTENT_MAP`의 meta·hero를 교체한다**

```javascript
        meta: {
          htmlLang: 'ko',
          title: 'HanBuddy 소개 | “like a local”을 실제로 만들어 내는 팀',
          description: 'HanBuddy를 기획하고 운영하는 팀을 소개합니다 — 매주 서울에서 열리는 KBO 야구 직관과 한강 피크닉, AI·SW마에스트로와 함께.',
          ogTitle: 'HanBuddy 소개 | “like a local”을 실제로 만들어 내는 팀',
          ogDescription: '기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요.',
          somaAlt: 'AI·SW마에스트로 로고',
        },
        hero: {
          eyebrow: 'HanBuddy 소개',
          title: '“like a local”을 실제로 만들어 내는 팀.',
          lead: '서울에 살고 있든 잠시 머물든, 한국 사람들이 실제로 즐기는 한국을 만나고 싶은 모두를 위해. 기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요.',
          primaryCta: '모임 참여하기',
          secondaryCta: '예정된 이벤트 보기',
        },
```

- [ ] **Step 5: 테스트를 돌린다**

Run: `node --test tests/*.test.js`

Expected: `weekend` 검사, 허위 실적 표기 검사, 히어로 이미지 검사 3건이 PASS로 바뀐다. `about page exists with core sections`는 아직 `missing section #origin`으로 FAIL(Task 3에서 해소).

- [ ] **Step 6: 커밋**

```bash
git add about/index.html
git commit -m "feat(about): 히어로를 풀블리드 사진으로 교체하고 weekend 표기 제거"
```

---

### Task 3: `#origin`·`#how` 섹션 교체

**Files:**
- Modify: `about/index.html` — 기존 `<section id="why">`와 `<section id="operate">`를 새 `#origin`·`#how`로 교체, `CONTENT_MAP` 양 언어의 `why`·`operate`·`beyond` 키 교체

**Interfaces:**
- Consumes: Task 2의 `CONTENT_MAP` 구조
- Produces: `CONTENT_MAP.<lang>.origin` = `{ eyebrow, title, body1, body2 }`, `CONTENT_MAP.<lang>.how` = `{ title, items: [{ title, body }] }` (3개), `CONTENT_MAP.<lang>.meta` 에 alt 4종 추가 — `originAlt`, `howPlanAlt`, `howConfirmAlt`, `howImproveAlt`

- [ ] **Step 1: `#why`를 `#origin`으로 교체한다**

기존 `<section id="why">` 전체를 아래로 교체한다.

```html
    <!-- ② Origin — why we started -->
    <section id="origin" class="border-t border-line-soft bg-canvas-soft">
      <div class="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
        <figure class="overflow-hidden rounded-2xl bg-panel">
          <img src="/assets/photos/kbo/run1-opening.webp" width="1600" height="1200" loading="lazy"
               class="block aspect-[4/3] w-full object-cover"
               alt="Guests and local buddies arriving at Jamsil Baseball Stadium for HanBuddy's first baseball night"
               data-i18n-alt="meta.originAlt" />
        </figure>
        <div>
          <p class="eyebrow" data-i18n="origin.eyebrow">Why we started</p>
          <h2 class="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl" data-i18n="origin.title">
            Some of Korea&rsquo;s best moments are locked behind &ldquo;locals only.&rdquo;
          </h2>
          <p class="mt-6 text-base leading-8 text-muted sm:text-lg" data-i18n="origin.body1">
            It started with a ticket we watched disappear. A Jamsil night game sells out in seconds on an app that wants a Korean phone number and a Korean card &mdash; our friends from abroad never even got to the screen.
          </p>
          <p class="mt-4 text-base leading-8 text-muted sm:text-lg" data-i18n="origin.body2">
            It was never just tickets. The best picnic spots, the river-delivery trick, the chants everyone in the stands already knows &mdash; none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun.
          </p>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: `#operate`를 지그재그 `#how`로 교체한다**

기존 `<section id="operate">` 전체(마무리 `beyond.body` 문단 포함)를 아래로 교체한다. `beyond` 문단은 Task 4의 `#timeline` 마무리로 옮겨간다.

```html
    <!-- ③ How we run it — zigzag photo/text blocks -->
    <section id="how">
      <div class="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <h2 class="mx-auto max-w-2xl text-center font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl" data-i18n="how.title">
          Run by us, every week.
        </h2>

        <div class="mt-12 space-y-12 lg:mt-16 lg:space-y-20">
          <div class="grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
            <figure class="overflow-hidden rounded-2xl bg-panel">
              <img src="/assets/photos/kbo/kbo-0726-sunset.webp" width="1600" height="1200" loading="lazy"
                   class="block aspect-[3/2] w-full object-cover"
                   alt="Sunset over Jamsil Baseball Stadium before a HanBuddy night game" data-i18n-alt="meta.howPlanAlt" />
            </figure>
            <div>
              <p class="font-display text-xl font-bold text-ink sm:text-2xl" data-i18n="how.items.0.title">We plan each activity ourselves</p>
              <p class="mt-3 text-base leading-8 text-muted" data-i18n="how.items.0.body">Built around one real Korean moment &mdash; not a checklist of landmarks.</p>
            </div>
          </div>

          <div class="grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
            <figure class="overflow-hidden rounded-2xl bg-panel lg:order-last">
              <img src="/assets/photos/kbo/run1-group.webp" width="1600" height="1200" loading="lazy"
                   class="block aspect-[3/2] w-full object-cover"
                   alt="HanBuddy guests and local buddies together in the stands at Jamsil" data-i18n-alt="meta.howConfirmAlt" />
            </figure>
            <div>
              <p class="font-display text-xl font-bold text-ink sm:text-2xl" data-i18n="how.items.1.title">A real person confirms your details</p>
              <p class="mt-3 text-base leading-8 text-muted" data-i18n="how.items.1.body">No booking engine. We message you before the day with the meeting spot and everything you need.</p>
            </div>
          </div>

          <div class="grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
            <figure class="overflow-hidden rounded-2xl bg-panel">
              <img src="/assets/photos/kbo/kbo-0726-cheers.webp" width="1600" height="1200" loading="lazy"
                   class="block aspect-[3/2] w-full object-cover"
                   alt="Guests cheering along with the crowd at a Jamsil night game" data-i18n-alt="meta.howImproveAlt" />
            </figure>
            <div>
              <p class="font-display text-xl font-bold text-ink sm:text-2xl" data-i18n="how.items.2.title">We improve every week</p>
              <p class="mt-3 text-base leading-8 text-muted" data-i18n="how.items.2.body">Every guest fills in a short survey afterwards, and it changes how we run the next one.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
```

- [ ] **Step 3: en `CONTENT_MAP`에 origin·how와 alt를 넣는다**

`why`·`operate`·`beyond` 키를 삭제하고 아래를 넣는다. `meta`에는 alt 4종을 추가한다.

```javascript
        origin: {
          eyebrow: 'Why we started',
          title: 'Some of Korea’s best moments are locked behind “locals only.”',
          body1: 'It started with a ticket we watched disappear. A Jamsil night game sells out in seconds on an app that wants a Korean phone number and a Korean card — our friends from abroad never even got to the screen.',
          body2: 'It was never just tickets. The best picnic spots, the river-delivery trick, the chants everyone in the stands already knows — none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun.',
        },
        how: {
          title: 'Run by us, every week.',
          items: [
            { title: 'We plan each activity ourselves', body: 'Built around one real Korean moment — not a checklist of landmarks.' },
            { title: 'A real person confirms your details', body: 'No booking engine. We message you before the day with the meeting spot and everything you need.' },
            { title: 'We improve every week', body: 'Every guest fills in a short survey afterwards, and it changes how we run the next one.' },
          ],
        },
```

`CONTENT_MAP.en.meta`에 추가할 alt 4종:

```javascript
          originAlt: 'Guests and local buddies arriving at Jamsil Baseball Stadium for HanBuddy’s first baseball night',
          howPlanAlt: 'Sunset over Jamsil Baseball Stadium before a HanBuddy night game',
          howConfirmAlt: 'HanBuddy guests and local buddies together in the stands at Jamsil',
          howImproveAlt: 'Guests cheering along with the crowd at a Jamsil night game',
```

- [ ] **Step 4: ko `CONTENT_MAP`에 origin·how와 alt를 넣는다**

```javascript
        origin: {
          eyebrow: '시작한 이유',
          title: '한국의 진짜 재미는 “로컬 전용”으로 잠겨 있습니다.',
          body1: '시작은 눈앞에서 사라진 티켓 한 장이었습니다. 잠실 야간 경기는 한국 번호와 한국 카드를 요구하는 앱에서 몇 초 만에 매진됩니다 — 외국인 친구들은 그 화면까지 가지도 못했죠.',
          body2: '티켓만의 문제가 아니었습니다. 한강의 명당, 강변 배달 노하우, 관중석 모두가 이미 아는 응원가 — 어느 것도 영어로는 없습니다. HanBuddy가 그 문을 엽니다 — 막히는 부분은 저희가 처리하고, 즐기는 법은 함께 나눕니다.',
        },
        how: {
          title: '매주, 저희가 직접 운영합니다.',
          items: [
            { title: '모든 활동을 직접 기획합니다', body: '랜드마크 체크리스트가 아니라, 한국의 진짜 순간 하나를 중심으로 설계합니다.' },
            { title: '세부 사항은 사람이 직접 확인해 드립니다', body: '예약 시스템이 아닙니다. 모임 전에 만나는 곳과 필요한 것들을 직접 메시지로 보내드려요.' },
            { title: '매주 더 나아집니다', body: '모든 게스트가 모임 후 짧은 설문을 남기고, 그 답이 다음 운영을 바꿉니다.' },
          ],
        },
```

`CONTENT_MAP.ko.meta`에 추가할 alt 4종:

```javascript
          originAlt: 'HanBuddy 첫 야구 나이트를 위해 잠실야구장에 도착한 게스트와 로컬 버디들',
          howPlanAlt: 'HanBuddy 야간 경기 전, 잠실야구장에 지는 노을',
          howConfirmAlt: '잠실 관중석에 함께 모인 HanBuddy 게스트와 로컬 버디들',
          howImproveAlt: '잠실 야간 경기에서 관중과 함께 응원하는 게스트들',
```

- [ ] **Step 5: 테스트를 돌린다**

Run: `node --test tests/*.test.js`

Expected: `about page exists with core sections`가 `missing section #timeline`으로 FAIL(Task 4에서 해소). 나머지는 PASS.

- [ ] **Step 6: 커밋**

```bash
git add about/index.html
git commit -m "feat(about): 창업 계기 섹션 신설, 운영 방식을 사진 지그재그로 교체"
```

---

### Task 4: `#timeline` ink 밴드 신설

**Files:**
- Modify: `about/index.html` — `#how` 뒤에 `<section id="timeline">` 추가, `CONTENT_MAP` 양 언어에 `timeline` 키 추가, 스크립트에 `renderTimeline()` 추가 후 `applyLanguage()`에서 호출

**Interfaces:**
- Consumes: Task 3의 `CONTENT_MAP` 구조, 기존 `clear(node)` 헬퍼
- Produces: `CONTENT_MAP.<lang>.timeline` = `{ eyebrow, title, statusDone, statusUpcoming, items: [{ status, date, title, image, alt, href? }], closing }`. `renderTimeline(copy)` 함수 — `[data-timeline-items]` 컨테이너를 채운다.

- [ ] **Step 1: `#how` 뒤에 timeline 섹션 마크업을 추가한다**

```html
    <!-- ④ Where we've been, where we're going -->
    <section id="timeline" class="bg-ink text-on-primary-strong">
      <div class="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <div class="mx-auto max-w-2xl text-center">
          <p class="eyebrow eyebrow-on-primary" data-i18n="timeline.eyebrow">Our runs</p>
          <h2 class="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" data-i18n="timeline.title">
            Where we&rsquo;ve been, and where we&rsquo;re going next.
          </h2>
        </div>

        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-timeline-items></div>

        <p class="mx-auto mt-12 max-w-2xl text-center text-base leading-8 text-on-primary-strong/85 sm:text-lg" data-i18n="timeline.closing">
          Baseball and picnics are just the start &mdash; festivals, football, markets: anywhere Koreans have their fun, we&rsquo;ll take you along.
        </p>
      </div>
    </section>
```

- [ ] **Step 2: en `CONTENT_MAP`에 timeline 데이터를 넣는다**

날짜는 전부 실제 값이다. 예정 4건은 `index.html`의 `CONTENT_MAP.events.cards`에 게시된 일정을 그대로 옮긴 것이다. **날짜를 창작하지 않는다.**

```javascript
        timeline: {
          eyebrow: 'Our runs',
          title: 'Where we’ve been, and where we’re going next.',
          statusDone: 'Completed',
          statusUpcoming: 'Coming up',
          items: [
            {
              status: 'done',
              date: '2026.06.25',
              title: 'Jamsil KBO — our first baseball night',
              image: '/assets/photos/kbo/run1-night.webp',
              alt: 'Floodlights over Jamsil Baseball Stadium during HanBuddy’s first baseball night',
            },
            {
              status: 'done',
              date: '2026.07.26',
              title: 'Jamsil KBO — chants and chimaek in the stands',
              image: '/assets/photos/kbo/kbo-0726-group.webp',
              alt: 'HanBuddy guests and local buddies taking a group photo in the stands at Jamsil',
            },
            {
              status: 'upcoming',
              date: 'Aug 1 · 8 · 9',
              title: 'Han River Picnic',
              image: '/assets/photos/hanriver/hanriver-fountain.webp',
              alt: 'Banpo Bridge rainbow fountain lighting up the Han River at sunset',
              href: '/events/hanriver/',
            },
            {
              status: 'upcoming',
              date: 'Aug 5 · 12',
              title: 'KBO Baseball Night',
              image: '/assets/photos/kbo/kbo-stadium-hero.webp',
              alt: 'Jamsil Baseball Stadium filling up before a KBO night game',
              href: '/events/kbo/',
            },
            {
              status: 'upcoming',
              date: 'Date coming soon',
              title: 'K League Football Day',
              image: '/assets/photos/kleague/kleague-night.webp',
              alt: 'A K League match under floodlights at Seoul World Cup Stadium',
            },
            {
              status: 'upcoming',
              date: 'Date coming soon',
              title: 'Jjimjilbang Sauna Hangout',
              image: '/assets/photos/jjimjilbang/jjimjilbang-bulgama.webp',
              alt: 'A traditional fire-kiln sauna room at a Korean jjimjilbang',
            },
          ],
          closing: 'Baseball and picnics are just the start — festivals, football, markets: anywhere Koreans have their fun, we’ll take you along.',
        },
```

예정 3건(한강·K리그·찜질방)의 alt는 장소·장면만 말한다. HanBuddy 운영을 주장하는 문장을 넣지 않는다.

- [ ] **Step 3: ko `CONTENT_MAP`에 timeline 데이터를 넣는다**

```javascript
        timeline: {
          eyebrow: '운영 기록',
          title: '지금까지 간 곳, 그리고 다음에 갈 곳.',
          statusDone: '완료',
          statusUpcoming: '예정',
          items: [
            {
              status: 'done',
              date: '2026.06.25',
              title: '잠실 KBO — 첫 번째 야구 나이트',
              image: '/assets/photos/kbo/run1-night.webp',
              alt: 'HanBuddy 첫 야구 나이트, 조명이 켜진 잠실야구장',
            },
            {
              status: 'done',
              date: '2026.07.26',
              title: '잠실 KBO — 관중석의 응원가와 치맥',
              image: '/assets/photos/kbo/kbo-0726-group.webp',
              alt: '잠실 관중석에서 단체 사진을 찍는 HanBuddy 게스트와 로컬 버디들',
            },
            {
              status: 'upcoming',
              date: '8월 1 · 8 · 9일',
              title: '한강 피크닉',
              image: '/assets/photos/hanriver/hanriver-fountain.webp',
              alt: '노을 지는 한강, 반포대교 무지개분수',
              href: '/events/hanriver/',
            },
            {
              status: 'upcoming',
              date: '8월 5 · 12일',
              title: 'KBO 야구 나이트',
              image: '/assets/photos/kbo/kbo-stadium-hero.webp',
              alt: 'KBO 야간 경기를 앞두고 관중이 들어차는 잠실야구장',
              href: '/events/kbo/',
            },
            {
              status: 'upcoming',
              date: '날짜 공개 예정',
              title: 'K리그 축구 데이',
              image: '/assets/photos/kleague/kleague-night.webp',
              alt: '조명 아래 열리는 서울월드컵경기장 K리그 경기',
            },
            {
              status: 'upcoming',
              date: '날짜 공개 예정',
              title: '찜질방 사우나',
              image: '/assets/photos/jjimjilbang/jjimjilbang-bulgama.webp',
              alt: '한국 찜질방의 전통 불가마',
            },
          ],
          closing: '야구와 피크닉은 시작일 뿐입니다 — 축제, 축구, 시장까지: 한국 사람들이 노는 곳이라면 어디든 함께 갈 거예요.',
        },
```

- [ ] **Step 4: `renderTimeline()`을 스크립트에 추가한다**

기존 `renderNav` 함수 바로 뒤에 넣는다.

```javascript
    const renderTimeline = (copy) => {
      const container = document.querySelector('[data-timeline-items]');
      if (!container) return;
      clear(container);

      copy.timeline.items.forEach((item) => {
        const isDone = item.status === 'done';
        const card = document.createElement(item.href ? 'a' : 'div');
        card.className = item.href
          ? 'focusable focusable-on-primary-strong group block rounded-2xl'
          : 'block rounded-2xl';
        if (item.href) card.href = item.href;

        const frame = document.createElement('div');
        frame.className = 'relative overflow-hidden rounded-2xl bg-panel';

        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.alt;
        img.width = 1600;
        img.height = 1000;
        img.loading = 'lazy';
        img.className = 'block aspect-[16/10] w-full object-cover transition duration-200 group-hover:scale-[1.03]';
        frame.appendChild(img);

        const chip = document.createElement('span');
        chip.className = isDone
          ? 'absolute left-3 top-3 rounded-full bg-canvas-soft px-3 py-1 text-xs font-extrabold text-primary-strong'
          : 'absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-on-primary';
        chip.textContent = isDone ? copy.timeline.statusDone : copy.timeline.statusUpcoming;
        frame.appendChild(chip);

        card.appendChild(frame);

        const date = document.createElement('p');
        date.className = 'mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-on-primary-strong/70';
        date.textContent = item.date;
        card.appendChild(date);

        const title = document.createElement('p');
        title.className = 'mt-2 font-display text-lg font-bold leading-snug text-on-primary-strong';
        title.textContent = item.title;
        card.appendChild(title);

        container.appendChild(card);
      });
    };
```

`group-hover:scale-[1.03]`는 DESIGN.md의 photo-card 규칙(≤1.03 확대, 프레임은 고정)과 모션 표준 구간(200ms)을 따른다. 링크가 없는 카드에는 `group` 클래스가 없으므로 확대가 일어나지 않는다.

- [ ] **Step 5: `applyLanguage()`에서 `renderTimeline`을 호출한다**

```javascript
    const applyLanguage = (lang) => {
      const copy = CONTENT_MAP[lang] ?? CONTENT_MAP.en;
      syncStaticText(copy);
      syncMeta(copy);
      renderNav(copy);
      renderTimeline(copy);
      setLanguageButtonState(lang);
      persistLanguage(lang);
    };
```

- [ ] **Step 6: 테스트를 돌린다**

Run: `node --test tests/*.test.js`

Expected: 전체 PASS. `about page exists with core sections`가 6개 id를 모두 찾는다.

- [ ] **Step 7: 커밋**

```bash
git add about/index.html
git commit -m "feat(about): 완료·예정 운영 타임라인 섹션 신설"
```

---

### Task 5: `#team` 소마 카드 보강 + `#join` 채널 추가 + 섹션 옵저버 갱신

**Files:**
- Modify: `about/index.html` — `#team` 소마 카드 문단, `#join` 버튼 행, `startSectionAnalytics()` id 배열, `CONTENT_MAP` 양 언어의 `team.backed`·`join`

**Interfaces:**
- Consumes: Task 4까지의 `CONTENT_MAP` 구조
- Produces: `CONTENT_MAP.<lang>.join` = `{ title, formButton, instagramButton, kakaoButton }`

- [ ] **Step 1: 소마 카드 카피를 IITP 포함으로 교체한다**

`#team` 섹션의 소마 카드 `<p>` 내용을 바꾼다(마크업 구조는 그대로).

```html
          <p class="text-sm leading-6 text-muted" data-i18n="team.backed">
            HanBuddy is the official project of team ZeroOne in AI&middot;SW Maestro (17th) &mdash; a national tech talent program hosted by Korea&rsquo;s Ministry of Science and ICT and managed by IITP.
          </p>
```

과기부 로고는 추가하지 않는다. `soma-logo.webp` 하나만 유지한다.

- [ ] **Step 2: `#join`에 KakaoTalk 버튼을 추가한다**

`#join` 섹션의 버튼 행을 아래로 교체한다.

```html
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <a href="https://forms.gle/B1fWgX3MjtHUHGNt5" target="_blank" rel="noopener" data-cta="apply"
             class="focusable focusable-on-primary-strong rounded-full bg-on-primary-strong px-7 py-3.5 text-center text-base font-bold text-primary-strong transition hover:bg-primary-soft active:translate-y-px" data-i18n="join.formButton">
            Join a meetup
          </a>
          <a href="https://www.instagram.com/hanbuddy_kr/" target="_blank" rel="noopener" data-cta="instagram"
             class="focusable focusable-on-primary-strong rounded-full border border-on-primary-strong/40 px-7 py-3.5 text-center text-base font-bold text-on-primary-strong transition hover:bg-primary-hover hover:text-on-primary active:translate-y-px" data-i18n="join.instagramButton">
            DM us on Instagram
          </a>
          <a href="https://open.kakao.com/o/sP3n4rFi" target="_blank" rel="noopener" data-cta="contact"
             class="focusable focusable-on-primary-strong rounded-full border border-on-primary-strong/40 px-7 py-3.5 text-center text-base font-bold text-on-primary-strong transition hover:bg-primary-hover hover:text-on-primary active:translate-y-px" data-i18n="join.kakaoButton">
            KakaoTalk open chat
          </a>
        </div>
```

- [ ] **Step 3: 양 언어 `CONTENT_MAP`의 team.backed·join을 교체한다**

en:

```javascript
          backed: 'HanBuddy is the official project of team ZeroOne in AI·SW Maestro (17th) — a national tech talent program hosted by Korea’s Ministry of Science and ICT and managed by IITP.',
```

```javascript
        join: {
          title: 'See you at the next meetup?',
          formButton: 'Join a meetup',
          instagramButton: 'DM us on Instagram',
          kakaoButton: 'KakaoTalk open chat',
        },
```

ko:

```javascript
          backed: 'HanBuddy는 과학기술정보통신부 주최, 정보통신기획평가원(IITP) 주관 국가 기술 인재 프로그램 AI·SW마에스트로 17기 팀 ZeroOne의 공식 프로젝트입니다.',
```

```javascript
        join: {
          title: '다음 모임에서 만날까요?',
          formButton: '모임 참여하기',
          instagramButton: 'Instagram DM으로 문의하기',
          kakaoButton: 'KakaoTalk 오픈채팅',
        },
```

- [ ] **Step 4: 섹션 옵저버의 id 배열을 갱신한다**

`startSectionAnalytics()` 안의 배열을 바꾼다.

```javascript
      ['origin', 'how', 'timeline', 'team', 'join'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      });
```

- [ ] **Step 5: 테스트를 돌린다**

Run: `node --test tests/*.test.js`

Expected: 전체 PASS. 특히 `about page keeps analytics behind consent`와 `about team links match the spec exactly and open safely`가 계속 통과해야 한다.

- [ ] **Step 6: 커밋**

```bash
git add about/index.html
git commit -m "feat(about): 소마 카드에 IITP 주관 표기 추가, CTA에 카카오 채널 추가"
```

---

### Task 6: 브라우저 QA 후 PR

**Files:**
- 없음(검증만). 결함 발견 시 `about/index.html` 수정.

**Interfaces:**
- Consumes: Task 5까지의 완성된 페이지
- Produces: 머지 가능한 PR

- [ ] **Step 1: 로컬 프리뷰를 띄운다**

`.claude/launch.json`에 등록된 설정으로 `preview_start`를 호출한 뒤 `/about`으로 이동한다. 등록된 설정이 없으면 정적 서버 하나를 띄운다.

- [ ] **Step 2: 데스크톱(1280×800)에서 확인한다**

- 히어로 사진이 실제로 뜨는지 — 과거 `loading="lazy"` 때문에 히어로 이미지가 브라우저에서만 안 뜬 회귀가 있었다. 정적 검사로는 잡히지 않으니 눈으로 본다.
- `#how` 3블록의 좌우 교차가 1·3번은 사진 왼쪽, 2번은 사진 오른쪽으로 나오는지
- `#timeline` 6장 카드가 3열로 깔리고, 완료 2건은 흰 칩 / 예정 4건은 빨간 칩인지
- 한강·K리그·찜질방 카드 어디에도 완료를 뜻하는 표기가 없는지

- [ ] **Step 3: 모바일(375×812)에서 확인한다**

- 히어로 H1이 넘치지 않는지
- 지그재그 블록이 전부 사진 위 / 텍스트 아래로 스택되는지
- 타임라인이 1열로 떨어지는지
- `#join` 버튼 3개가 세로로 쌓이는지

- [ ] **Step 4: EN/KO 토글을 양방향으로 확인한다**

- 토글 시 타임라인 6장이 다시 그려지는지(`renderTimeline`이 `applyLanguage`에서 호출되므로)
- KO에서 `<title>`이 `HanBuddy 소개 | “like a local”을 실제로 만들어 내는 팀`으로 바뀌는지
- 어느 언어에서도 `weekend`/`주말`이 보이지 않는지

- [ ] **Step 5: 키보드 접근성을 확인한다**

- Tab으로 히어로 CTA 2개 → 타임라인 링크 카드 2개(한강·KBO) → 팀 LinkedIn 3개 → CTA 3개 순으로 포커스 링이 보이는지
- 어두운 `#timeline` 밴드 위에서 포커스 링이 보이는지(`focusable-on-primary-strong`가 흰 아웃라인을 준다)
- 링크 없는 타임라인 카드 4개가 Tab 순서에 끼지 않는지

- [ ] **Step 6: 콘솔 에러가 없는지 본다**

`read_console_messages`로 확인한다. Expected: 에러 0건.

- [ ] **Step 7: 최종 테스트 실행**

Run: `node --test tests/*.test.js`

Expected: 전체 PASS.

- [ ] **Step 8: 푸시하고 PR을 연다**

```bash
git push -u origin feat/about-redesign
```

PR 제목: `feat(about): /about 전면 리디자인 — 6섹션 사진 몰입형 재구성`

PR 본문에 담을 것: 참고 자료 기반 8문항 커버리지, 6섹션 구조, `weekend` 표기 폐기 사유, 한강 사진 표기 정정 사유(미운영·개인 사진), 과기부 로고 미사용 사유, 테스트 4건 신설. AI 공동작성자 트레일러는 넣지 않는다.

- [ ] **Step 9: CodeRabbit 리뷰를 반영하고 squash 머지한다**

접근성·마크업 지적은 유효하니 반영한다. 아래 2종은 과거 반복된 무효 지적이므로 사유를 달고 스킵한다.

- 이준영님 LinkedIn 슬러그의 `undefined`를 오타로 보는 지적 — LinkedIn이 실제 생성한 값이다.
- 이미 승인·삭제 결정된 카피의 복원 요구.

---

## Self-Review

**스펙 커버리지**

| 스펙 항목 | 구현 Task |
| --- | --- |
| ① Hero 풀블리드 + 대상 명시 + CTA | Task 2 |
| 사진 스트립·`Real moments` 캡션 제거 | Task 2 Step 2 |
| 메타 카피 weekend 제거 | Task 2 Step 1·3·4 |
| ② `#origin` 창업 계기 서사 | Task 3 Step 1·3·4 |
| ③ `#how` 지그재그 3블록 | Task 3 Step 2·3·4 |
| ④ `#timeline` ink 밴드, 실제 날짜만 | Task 4 |
| `beyond` 마무리 문단 이동 | Task 4 Step 1(`timeline.closing`) |
| ⑤ `#team` 소마 카드 + IITP | Task 5 Step 1·3 |
| ⑥ `#join` 카카오 추가 | Task 5 Step 2·3 |
| 섹션 옵저버 id 갱신 | Task 5 Step 4 |
| 테스트 갱신 + 신규 4건 | Task 1 |
| 브라우저 QA | Task 6 |

누락 없음.

**타입·키 일관성**

- `CONTENT_MAP.<lang>.hero` = `{ eyebrow, title, lead, primaryCta, secondaryCta }` — Task 2에서 정의, 이후 변경 없음.
- `CONTENT_MAP.<lang>.how.items[n]` = `{ title, body }` — Task 3에서 정의, 마크업의 `data-i18n="how.items.0.title"` 경로와 일치.
- `CONTENT_MAP.<lang>.timeline.items[n]` = `{ status, date, title, image, alt, href? }` — Task 4에서 정의, `renderTimeline()`이 소비하는 필드와 일치.
- 삭제되는 키: `why`, `operate`, `beyond`, `hero.photosNote`, `meta.momentGroupAlt`/`momentPicnicAlt`/`momentFountainAlt`/`momentCrewAlt`. 이 키들을 참조하는 `data-i18n` 속성도 같은 Task에서 함께 제거되므로 잔여 참조가 남지 않는다.
- `join.kakaoButton`은 Task 5에서 신설되며 `data-cta="contact"`를 쓴다 — `CONFIG.contact`가 이미 카카오 오픈채팅 URL이라 `syncCtas()`가 그대로 처리한다.

**플레이스홀더 스캔**

TBD·TODO·"적절히 처리" 류 없음. 모든 코드 스텝에 실제 코드가 들어 있다.
