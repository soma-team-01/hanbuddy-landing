# About 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about` 페이지(운영자 포지셔닝 팀 소개)를 신설하고 헤더·푸터에서 진입 가능하게 한다.

**Architecture:** 빌드 없는 정적 사이트에 `about/index.html`을 자기 완결 독립 파일로 추가한다(헤더/푸터/i18n/컨센트/분석 스크립트 자체 포함). `index.html`은 나브 링크·모바일 About 링크·푸터 링크만 최소 수정. 두 파일 간 공통 카피 드리프트는 `node --test` 테스트로 방지한다.

**Tech Stack:** 정적 HTML + Tailwind CDN(인라인 config) + vanilla JS(CONTENT_MAP i18n) + node:test

**스펙:** `docs/superpowers/specs/2026-07-27-about-page-design.md` (카피 원문·판단 근거는 스펙이 정본)

## Global Constraints

- 커밋 메시지에 Claude 이메일·Co-Authored-By·"Generated with Claude Code" 절대 금지 (유저 전역 금기).
- 커밋은 `feat/about-page` 브랜치에서만 한다. main 직커밋 금지 (훅이 차단함).
- 금칙어(공개 표면 노출 금지): `F001`, `4/5`, `30,000`, `under 30,000`, `Less than 30,000`, `pre-acquaintance`, `proof of scale`, `learning signal`.
- about 페이지 에셋 경로는 반드시 루트 절대경로 `/assets/...` (상대경로 `assets/...` 금지 — `/about/`에서 404 남).
- GA(`G-MW7MFVL50G`)·Meta Pixel(`4569887956575986`)은 초기 HTML에서 즉시 로드 금지 — 컨센트 게이트 뒤에서만.
- 팀원 소개에 기술 용어(backend, AI 등) 금지. 카피는 스펙의 잠금 문구를 그대로 사용.
- 팀원 순서 고정: Minhyung Kim → Yoohyun Kim → Junyoung Lee.
- 프로덕션 도메인: `https://landing.hanbuddy.kr` (canonical에 사용).
- 로컬 테스트 실행 명령: `node --test tests/` (프로젝트 루트에서).

---

## 파일 구조

| 파일 | 작업 | 책임 |
|---|---|---|
| `tests/about.test.js` | 생성 | index 나브/푸터 변경 + about 페이지 전체 검증 + 파일 간 카피 동기화 |
| `index.html` | 수정 | 나브 링크 배열에 About, 헤더 워드마크 반응형, 모바일 About 링크, 푸터 About 링크 |
| `about/index.html` | 생성 | About 페이지 전체 (자기 완결) |
| `.vercelignore` | 수정 | `/about` 배포 허용 |

---

### Task 1: index.html 진입점 (나브·헤더·푸터)

**Files:**
- Create: `tests/about.test.js`
- Modify: `index.html:289-306` (헤더), `index.html:573-577` (en nav.links), `index.html:676-680` (ko nav.links), `index.html:640-647` (en footer), `index.html:743-750` (ko footer), `index.html:457` (푸터 마크업)

**Interfaces:**
- Produces: `CONTENT_MAP.{en,ko}.nav.links`의 마지막 항목 `{ href: '/about', label: 'About' | '소개' }`, i18n 키 `nav.aboutLabel`, `footer.aboutLink` — Task 2의 about 페이지가 동일 키·동일 값을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/about.test.js` 생성:

```js
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('index nav links include About in both languages', () => {
  assert.match(indexHtml, /\{ href: '\/about', label: 'About' \}/);
  assert.match(indexHtml, /\{ href: '\/about', label: '소개' \}/);
});

test('index header exposes a mobile-only About link', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*class="[^"]*lg:hidden[^"]*"[^>]*data-i18n="nav\.aboutLabel"/,
  );
  assert.match(indexHtml, /aboutLabel: 'About'/);
  assert.match(indexHtml, /aboutLabel: '소개'/);
});

test('index header wordmark hides below 380px instead of overflowing', () => {
  assert.match(indexHtml, /<span class="hidden min-\[380px\]:inline">HanBuddy<\/span>/);
});

test('index footer links to the About page', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*data-i18n="footer\.aboutLink"/,
  );
  assert.match(indexHtml, /aboutLink: 'About HanBuddy'/);
  assert.match(indexHtml, /aboutLink: 'HanBuddy 소개'/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/about.test.js`
Expected: FAIL — 4개 테스트 모두 실패 (index.html에 해당 마크업/키 없음)

- [ ] **Step 3: index.html 헤더 수정**

`index.html` 289~292행의 홈 링크를 다음으로 교체 (변경점: `text-lg` → `text-base lg:text-lg`, 워드마크 텍스트를 span으로 감싸고 380px 미만 숨김):

```html
      <a href="#top" class="focusable flex shrink-0 items-center gap-2.5 rounded-full font-display text-base font-extrabold tracking-tight text-ink lg:text-lg" aria-label="HanBuddy home" data-i18n-aria="nav.homeAria">
        <img src="assets/brand/logo-borderless.webp" width="36" height="36" alt="" class="h-9 w-9" />
        <span class="hidden min-[380px]:inline">HanBuddy</span>
      </a>
```

바로 다음 줄(기존 294행 `data-nav-links` div 앞)에 모바일 전용 About 링크 추가:

```html
      <a href="/about" class="focusable rounded-full text-sm font-semibold text-muted transition hover:text-primary-strong lg:hidden" data-i18n="nav.aboutLabel">About</a>
```

- [ ] **Step 4: index.html 푸터에 About 링크 추가**

457행 `<div class="flex flex-wrap items-center gap-4">` 바로 다음 줄(소셜 아이콘 그룹 div 앞)에 추가:

```html
          <a href="/about" class="focusable rounded text-sm font-semibold text-muted transition hover:text-primary-strong" data-i18n="footer.aboutLink">About HanBuddy</a>
```

- [ ] **Step 5: CONTENT_MAP 갱신 (en/ko 모두)**

en `nav.links` (573~577행)에 항목 추가 + `aboutLabel` 키:

```js
          links: [
            { href: '#programs', label: 'Programs' },
            { href: '#how', label: 'How it works' },
            { href: '#apply', label: 'Join' },
            { href: '/about', label: 'About' },
          ],
          aboutLabel: 'About',
```

en `footer` 객체(640행~)에 키 추가:

```js
          aboutLink: 'About HanBuddy',
```

ko `nav.links` (676~680행)에 항목 추가 + `aboutLabel` 키:

```js
          links: [
            { href: '#programs', label: '프로그램' },
            { href: '#how', label: '참여 방법' },
            { href: '#apply', label: '신청' },
            { href: '/about', label: '소개' },
          ],
          aboutLabel: '소개',
```

ko `footer` 객체(743행~)에 키 추가:

```js
          aboutLink: 'HanBuddy 소개',
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `node --test tests/about.test.js`
Expected: PASS (4/4)

Run: `node --test tests/`
Expected: 기존 테스트 포함 전부 PASS (회귀 없음)

- [ ] **Step 7: 커밋**

```bash
git add tests/about.test.js index.html
git commit -m "feat(landing): 헤더·푸터에 About 진입점 추가 (모바일 포함)"
```

---

### Task 2: about/index.html 생성

**Files:**
- Create: `about/index.html`
- Modify: `tests/about.test.js` (about 검증 테스트 추가)

**Interfaces:**
- Consumes: Task 1이 정의한 nav/footer i18n 키·값 (동일 문자열을 이 파일에도 복제).
- Produces: `/about` 경로의 완결 페이지. 팀원 링크 `data-cta` 키: `linkedin_minhyung`, `linkedin_yoohyun`, `github_junyoung`.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/about.test.js` 상단 `indexHtml` 선언 아래에 추가:

```js
const aboutPath = join(__dirname, '..', 'about', 'index.html');
const aboutHtml = existsSync(aboutPath) ? readFileSync(aboutPath, 'utf8') : '';

test('about page exists with core sections', () => {
  assert.ok(aboutHtml.length > 0, 'about/index.html must exist');
  for (const id of ['top', 'why', 'operate', 'beyond', 'team', 'join']) {
    assert.match(aboutHtml, new RegExp(`<section id="${id}"`), `missing section #${id}`);
  }
});

test('about page keeps analytics behind consent (same gate as index)', () => {
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i);
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/i);
  assert.match(aboutHtml, /data-consent-banner/);
  assert.match(aboutHtml, /data-consent-action="accept"/);
  assert.match(aboutHtml, /data-consent-action="reject"/);
  assert.match(aboutHtml, /hanbuddy\.analyticsConsent/);
});

test('about page never exposes maintainer-only validation details', () => {
  assert.doesNotMatch(
    aboutHtml,
    /F001|4\/5|30,000|under 30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal/,
  );
});

test('about team links match the spec exactly and open safely', () => {
  const links = [
    ['linkedin_minhyung', 'https://www.linkedin.com/in/minbros/'],
    ['linkedin_yoohyun', 'https://www.linkedin.com/in/yoohyun-kim-6655ba409/'],
    ['github_junyoung', 'https://github.com/junilyy'],
  ];
  for (const [cta, url] of links) {
    const pattern = new RegExp(
      `<a href="${url.replace(/[/.]/g, '\\$&')}"[^>]*target="_blank"[^>]*rel="noopener"[^>]*data-cta="${cta}"`,
    );
    assert.match(aboutHtml, pattern, `broken or missing link for ${cta}`);
  }
});

test('about page uses root-absolute asset paths only', () => {
  assert.doesNotMatch(aboutHtml, /(?:src|href)="assets\//, 'relative asset path breaks under /about/');
  assert.match(aboutHtml, /src="\/assets\/brand\/logo-borderless\.webp"/);
  assert.match(aboutHtml, /src="\/assets\/brand\/soma-logo\.webp"/);
});

test('shared copy stays in sync between index and about', () => {
  const sharedSnippets = [
    "{ href: '/about', label: 'About' }",
    "{ href: '/about', label: '소개' }",
    "aboutLink: 'About HanBuddy'",
    "aboutLink: 'HanBuddy 소개'",
    'Help us improve HanBuddy',
    'HanBuddy 개선에 동의해 주세요',
    'Continue without optional cookies',
    '분석 및 광고 허용',
    'HanBuddy by ZeroOne',
    "googleMeasurementId: 'G-MW7MFVL50G'",
    "metaPixelId: '4569887956575986'",
  ];
  for (const snippet of sharedSnippets) {
    assert.ok(indexHtml.includes(snippet), `index.html missing: ${snippet}`);
    assert.ok(aboutHtml.includes(snippet), `about/index.html missing: ${snippet}`);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/about.test.js`
Expected: FAIL — about 관련 6개 테스트 실패 (`about/index.html` 없음), Task 1 테스트 4개는 PASS 유지

- [ ] **Step 3: about/index.html 작성**

아래 전문을 `about/index.html`로 생성한다. head의 tailwind config·컨센트 기본값 스크립트·폰트 링크는 index.html 17~66행과 동일 내용이고, CSS는 index.html 68~281행에서 폴라로이드/포토카드 블록(147~270행)을 제외한 서브셋이다.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>About HanBuddy | The team behind your Korean weekend</title>
  <meta name="description" content="Meet the team that plans and runs HanBuddy — Korean baseball nights and Han River picnics for international guests, backed by AI·SW Maestro." />

  <meta property="og:title" content="About HanBuddy | The team behind your Korean weekend" />
  <meta property="og:description" content="We plan it, run it, and improve it every week — you just show up." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/assets/photos/kbo/run1-group.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://landing.hanbuddy.kr/about" />
  <link rel="icon" type="image/webp" href="/assets/brand/logo-icon.webp" />
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png" />

  <!-- Analytics consent defaults. Google Analytics and Meta Pixel load only after opt-in. -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            canvas: '#fffaf7',
            'canvas-soft': '#ffffff',
            primary: '#d13f32',
            'primary-hover': '#b9342b',
            'primary-strong': '#8f2f28',
            'primary-soft': '#fff0ec',
            ink: '#261b18',
            muted: '#675b56',
            'line-strong': '#d6c5bf',
            'line-soft': '#eee2dd',
            panel: '#f8f3f0',
            'panel-raised': '#fcf8f6',
            'on-primary': '#ffffff',
            'on-primary-strong': '#ffffff',
            success: '#3f6b46',
            'success-soft': '#dcead9',
          },
          fontFamily: {
            sans: ['DM Sans', 'Noto Sans KR', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            display: ['Plus Jakarta Sans', 'Noto Sans KR', 'system-ui', 'sans-serif'],
          },
          boxShadow: {
            subtle: '0 1px 2px rgba(38, 27, 24, 0.05)',
            raised: '0 8px 24px rgba(38, 27, 24, 0.08)',
          },
        },
      },
    };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />

  <style>
    :root {
      color-scheme: light;
      --color-canvas: #fffaf7;
      --color-canvas-soft: #ffffff;
      --color-primary: #d13f32;
      --color-primary-hover: #b9342b;
      --color-primary-strong: #8f2f28;
      --color-primary-soft: #fff0ec;
      --color-ink: #261b18;
      --color-muted: #675b56;
      --color-line-strong: #d6c5bf;
      --color-line-soft: #eee2dd;
      --color-panel: #f8f3f0;
      --color-panel-raised: #fcf8f6;
      --color-on-primary: #ffffff;
      --color-on-primary-strong: #ffffff;
    }

    html {
      scroll-behavior: smooth;
    }

    section[id] {
      scroll-margin-top: 5rem;
    }

    body {
      text-rendering: optimizeLegibility;
    }

    :lang(ko) body,
    :lang(ko) h1,
    :lang(ko) h2,
    :lang(ko) h3,
    :lang(ko) p {
      word-break: keep-all;
    }

    .skip-link {
      position: absolute;
      left: 1rem;
      top: -4rem;
      z-index: 80;
      border-radius: 0.75rem;
      background: var(--color-primary);
      color: var(--color-on-primary);
      padding: 0.75rem 1rem;
      font-weight: 800;
      transition: top 180ms ease;
    }

    .skip-link:focus {
      top: 1rem;
      outline: 3px solid var(--color-primary-strong);
      outline-offset: 4px;
    }

    .focusable:focus-visible {
      outline: 3px solid var(--color-primary-strong);
      outline-offset: 4px;
    }

    .focusable-on-primary-strong:focus-visible {
      outline-color: var(--color-on-primary-strong);
    }

    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-primary-strong);
    }

    .eyebrow-on-primary {
      color: rgba(255, 255, 255, 0.84);
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
        animation-duration: 1ms !important;
      }
    }
  </style>
</head>

<body class="bg-canvas font-sans text-ink antialiased">
  <a class="skip-link" href="#main" data-i18n="skipLink">Skip to content</a>

  <header class="sticky top-0 z-50 border-b border-line-soft bg-canvas-soft/95 backdrop-blur">
    <nav class="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-5 py-3" aria-label="Main navigation" data-i18n-aria="nav.aria">
      <a href="/" class="focusable flex shrink-0 items-center gap-2.5 rounded-full font-display text-base font-extrabold tracking-tight text-ink lg:text-lg" aria-label="HanBuddy home" data-i18n-aria="nav.homeAria">
        <img src="/assets/brand/logo-borderless.webp" width="36" height="36" alt="" class="h-9 w-9" />
        <span class="hidden min-[380px]:inline">HanBuddy</span>
      </a>
      <a href="/about" aria-current="page" class="focusable rounded-full text-sm font-semibold text-ink transition hover:text-primary-strong lg:hidden" data-i18n="nav.aboutLabel">About</a>

      <div class="hidden items-center gap-5 text-sm font-semibold text-muted lg:flex" data-nav-links></div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="flex rounded-full border border-line-soft bg-panel-raised p-1" role="group" aria-label="Select language" data-i18n-aria="languageToggle.aria">
          <button type="button" class="focusable rounded-full px-3 py-1.5 text-xs font-extrabold transition" data-lang="en" aria-pressed="true">EN</button>
          <button type="button" class="focusable rounded-full px-3 py-1.5 text-xs font-extrabold transition" data-lang="ko" aria-pressed="false">KO</button>
        </div>
        <a href="https://forms.gle/B1fWgX3MjtHUHGNt5" target="_blank" rel="noopener" data-cta="apply"
           class="focusable rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-hover active:translate-y-px sm:px-5">
          <span class="sm:hidden" data-i18n="nav.primaryCtaShort">Join</span>
          <span class="hidden sm:inline" data-i18n="nav.primaryCta">Join this weekend</span>
        </a>
      </div>
    </nav>
  </header>

  <main id="main">
    <!-- ① Hero -->
    <section id="top">
      <div class="mx-auto max-w-3xl px-5 pb-14 pt-14 text-center sm:pt-20">
        <p class="eyebrow" data-i18n="hero.eyebrow">About HanBuddy</p>
        <h1 class="mx-auto mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl" data-i18n="hero.title">
          The team behind your Korean weekend.
        </h1>
        <p class="mx-auto mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8" data-i18n="hero.lead">
          We plan it, run it, and improve it every week — you just show up.
        </p>
      </div>
    </section>

    <!-- ② Why we built this -->
    <section id="why" class="border-t border-line-soft bg-canvas-soft">
      <div class="mx-auto max-w-3xl px-5 py-16 lg:py-20">
        <h2 class="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl" data-i18n="why.title">
          Some of Korea's best moments are locked behind "locals only."
        </h2>
        <p class="mt-6 text-base leading-8 text-muted sm:text-lg" data-i18n="why.body">
          Baseball tickets sell out on Korean-only apps. The best picnic spots, the river-delivery trick, the chants everyone knows — none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun.
        </p>
      </div>
    </section>

    <!-- ③ How we run it -->
    <section id="operate">
      <div class="mx-auto max-w-3xl px-5 py-16 lg:py-20">
        <h2 class="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl" data-i18n="operate.title">
          Run by us, every weekend.
        </h2>
        <ul class="mt-8 divide-y divide-line-soft border-y border-line-soft">
          <li class="py-5">
            <p class="font-display text-lg font-bold text-ink" data-i18n="operate.items.0.title">We plan each activity ourselves</p>
            <p class="mt-1 text-base leading-7 text-muted" data-i18n="operate.items.0.body">Built around one real Korean moment.</p>
          </li>
          <li class="py-5">
            <p class="font-display text-lg font-bold text-ink" data-i18n="operate.items.1.title">We confirm details with you directly</p>
            <p class="mt-1 text-base leading-7 text-muted" data-i18n="operate.items.1.body">A real person, not a booking engine.</p>
          </li>
          <li class="py-5">
            <p class="font-display text-lg font-bold text-ink" data-i18n="operate.items.2.title">We improve every week</p>
            <p class="mt-1 text-base leading-7 text-muted" data-i18n="operate.items.2.body">Guest feedback shapes the next run.</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- ④ Where we're going -->
    <section id="beyond" class="border-t border-line-soft bg-canvas-soft">
      <div class="mx-auto max-w-3xl px-5 py-14 lg:py-16">
        <p class="text-lg font-semibold leading-8 text-ink sm:text-xl" data-i18n="beyond.body">
          Baseball and picnics are just the start — festivals, football, markets: anywhere Koreans have their fun, we'll take you along.
        </p>
      </div>
    </section>

    <!-- ⑤ Team + credibility -->
    <section id="team">
      <div class="mx-auto max-w-3xl px-5 py-16 lg:py-20">
        <h2 class="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl" data-i18n="team.title">
          Meet the team
        </h2>
        <p class="mt-4 text-base leading-7 text-muted" data-i18n="team.lead">
          We're ZeroOne — three friends from Seoul running HanBuddy together.
        </p>

        <ul class="mt-8 divide-y divide-line-soft border-y border-line-soft">
          <li class="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-display text-lg font-bold text-ink" data-i18n="team.members.0.name">Minhyung Kim</p>
              <p class="mt-0.5 text-sm leading-6 text-muted" data-i18n="team.members.0.role">Leads the team &amp; operations</p>
            </div>
            <a href="https://www.linkedin.com/in/minbros/" target="_blank" rel="noopener" data-cta="linkedin_minhyung"
               class="focusable shrink-0 rounded-full text-sm font-bold text-primary-strong transition hover:opacity-80">
              LinkedIn <span aria-hidden="true">&#8599;</span>
            </a>
          </li>
          <li class="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-display text-lg font-bold text-ink" data-i18n="team.members.1.name">Yoohyun Kim</p>
              <p class="mt-0.5 text-sm leading-6 text-muted" data-i18n="team.members.1.role">Designs the experiences &amp; content</p>
            </div>
            <a href="https://www.linkedin.com/in/yoohyun-kim-6655ba409/" target="_blank" rel="noopener" data-cta="linkedin_yoohyun"
               class="focusable shrink-0 rounded-full text-sm font-bold text-primary-strong transition hover:opacity-80">
              LinkedIn <span aria-hidden="true">&#8599;</span>
            </a>
          </li>
          <li class="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-display text-lg font-bold text-ink" data-i18n="team.members.2.name">Junyoung Lee</p>
              <p class="mt-0.5 text-sm leading-6 text-muted" data-i18n="team.members.2.role">Keeps bookings &amp; matching smooth</p>
            </div>
            <a href="https://github.com/junilyy" target="_blank" rel="noopener" data-cta="github_junyoung"
               class="focusable shrink-0 rounded-full text-sm font-bold text-primary-strong transition hover:opacity-80">
              GitHub <span aria-hidden="true">&#8599;</span>
            </a>
          </li>
        </ul>

        <div class="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-panel px-7 py-6 sm:flex-row sm:items-center">
          <img src="/assets/brand/soma-logo.webp" width="262" height="120" loading="lazy" class="h-10 w-auto shrink-0" alt="AI·SW Maestro logo" data-i18n-alt="meta.somaAlt" />
          <p class="text-sm leading-6 text-muted" data-i18n="team.backed">
            Backed by AI·SW Maestro — a national tech talent program run by Korea's Ministry of Science and ICT. HanBuddy is our official project.
          </p>
        </div>
      </div>
    </section>

    <!-- ⑥ CTA -->
    <section id="join" class="bg-primary-strong text-on-primary-strong">
      <div class="mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 py-16 text-center lg:py-20">
        <h2 class="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" data-i18n="join.title">
          See you this weekend?
        </h2>
        <div class="flex flex-col gap-3 sm:flex-row">
          <a href="https://forms.gle/B1fWgX3MjtHUHGNt5" target="_blank" rel="noopener" data-cta="apply"
             class="focusable focusable-on-primary-strong rounded-full bg-on-primary-strong px-7 py-3.5 text-center text-base font-bold text-primary-strong transition hover:bg-primary-soft active:translate-y-px" data-i18n="join.formButton">
            Join this weekend
          </a>
          <a href="https://www.instagram.com/hanbuddy_kr/" target="_blank" rel="noopener" data-cta="instagram"
             class="focusable focusable-on-primary-strong rounded-full border border-on-primary-strong/40 px-7 py-3.5 text-center text-base font-bold text-on-primary-strong transition hover:bg-primary-hover hover:text-on-primary active:translate-y-px" data-i18n="join.instagramButton">
            DM us on Instagram
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t border-line-soft bg-canvas">
    <div class="mx-auto max-w-6xl px-5 py-10">
      <div class="flex flex-col gap-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-center gap-2 font-display font-bold tracking-tight text-ink">
          <img src="/assets/brand/logo-borderless.webp" width="24" height="24" alt="" class="h-6 w-6" />
          <span data-i18n="footer.brand">HanBuddy by ZeroOne</span>
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="/about" class="focusable rounded text-sm font-semibold text-muted transition hover:text-primary-strong" data-i18n="footer.aboutLink">About HanBuddy</a>
          <div class="flex items-center gap-2" role="group" aria-label="Contact channels"
               data-footer-social-icons data-i18n-aria="footer.contactChannelsAria">
            <a href="https://www.instagram.com/hanbuddy_kr/" target="_blank" rel="noopener" data-cta="instagram"
               data-footer-social-icon aria-label="Send HanBuddy a direct message on Instagram"
               data-i18n-aria="footer.instagramAria" title="Instagram DM"
               class="focusable inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-soft bg-panel-raised text-ink transition hover:border-primary/35 hover:text-primary-strong">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="5"></rect>
                <circle cx="12" cy="12" r="4"></circle>
                <circle cx="17.5" cy="6.5" r="1" class="fill-current stroke-none"></circle>
              </svg>
            </a>
            <a href="https://open.kakao.com/o/sP3n4rFi" target="_blank" rel="noopener" data-cta="contact"
               data-footer-social-icon aria-label="Ask HanBuddy in KakaoTalk open chat"
               data-i18n-aria="footer.kakaoAria" title="KakaoTalk open chat"
               class="focusable inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-soft bg-panel-raised text-ink transition hover:border-primary/35 hover:text-primary-strong">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="h-5 w-5">
                <path fill="currentColor" d="M12 3.5c-5.52 0-10 3.36-10 7.5 0 2.68 1.88 5.03 4.7 6.36L5.5 21l4.24-2.35c.73.12 1.49.18 2.26.18 5.52 0 10-3.36 10-7.5S17.52 3.5 12 3.5Z"></path>
                <circle cx="8.5" cy="11.2" r="0.9" fill="white"></circle>
                <circle cx="12" cy="11.2" r="0.9" fill="white"></circle>
                <circle cx="15.5" cy="11.2" r="0.9" fill="white"></circle>
              </svg>
            </a>
            <a href="https://www.meetup.com/discover-korea-with-local-buddies/" target="_blank" rel="noopener" data-cta="meetup"
               data-footer-social-icon aria-label="Visit HanBuddy's Meetup group"
               data-i18n-aria="footer.meetupAria" title="Meetup group"
               class="focusable inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-soft bg-panel-raised text-ink transition hover:border-primary/35 hover:text-primary-strong">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="mt-8 flex flex-col gap-4 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between"
           data-footer-utility>
        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <img src="/assets/brand/soma-logo.webp" width="262" height="120" loading="lazy" class="h-8 w-auto shrink-0" alt="AI·SW Maestro logo" data-i18n-alt="meta.somaAlt" />
          <p class="text-xs leading-5 text-muted" data-i18n="footer.credibility">
            HanBuddy is run by team ZeroOne of AI&middot;SW Maestro, a national talent program hosted by Korea&rsquo;s Ministry of Science and ICT.
          </p>
        </div>
        <button type="button" data-consent-settings aria-controls="analytics-consent"
                class="focusable shrink-0 self-start rounded-lg text-xs font-semibold text-ink underline decoration-primary/40 underline-offset-4 hover:text-primary-strong hover:decoration-primary sm:self-auto"
                data-i18n="consent.settings">
          Cookie settings
        </button>
      </div>
    </div>
  </footer>

  <section id="analytics-consent" data-consent-banner role="dialog" aria-labelledby="analytics-consent-title"
           aria-describedby="analytics-consent-description" aria-hidden="true"
           class="fixed inset-x-4 bottom-4 z-[70] hidden rounded-2xl border border-line-soft bg-canvas-soft p-5 shadow-raised sm:left-auto sm:max-w-xl sm:p-6">
    <div class="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <p id="analytics-consent-title" class="font-display text-lg font-extrabold tracking-tight text-ink" data-i18n="consent.title">
          Help us improve HanBuddy
        </p>
        <p id="analytics-consent-description" class="mt-2 text-sm leading-6 text-muted" data-i18n="consent.body">
          With your permission, Google Analytics and Meta Pixel measure visits, application-form opens, and contact clicks. This page never sends your form answers to these tools.
        </p>
      </div>
      <div class="flex flex-col-reverse gap-2 sm:min-w-52">
        <button type="button" data-consent-action="reject"
                class="focusable rounded-full border border-line-strong px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-primary-soft"
                data-i18n="consent.reject">
          Continue without optional cookies
        </button>
        <button type="button" data-consent-action="accept"
                class="focusable rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primary-hover"
                data-i18n="consent.accept">
          Allow analytics &amp; ads
        </button>
      </div>
    </div>
  </section>

  <script>
    const CONFIG = {
      apply: 'https://forms.gle/B1fWgX3MjtHUHGNt5',
      contact: 'https://open.kakao.com/o/sP3n4rFi',
      instagram: 'https://www.instagram.com/hanbuddy_kr/',
      meetup: 'https://www.meetup.com/discover-korea-with-local-buddies/',
      analytics: {
        googleMeasurementId: 'G-MW7MFVL50G',
        metaPixelId: '4569887956575986',
      },
    };

    const CONTENT_MAP = Object.freeze({
      en: {
        skipLink: 'Skip to content',
        languageToggle: { aria: 'Select language' },
        meta: {
          htmlLang: 'en',
          title: 'About HanBuddy | The team behind your Korean weekend',
          description: 'Meet the team that plans and runs HanBuddy — Korean baseball nights and Han River picnics for international guests, backed by AI·SW Maestro.',
          ogTitle: 'About HanBuddy | The team behind your Korean weekend',
          ogDescription: 'We plan it, run it, and improve it every week — you just show up.',
          somaAlt: 'AI·SW Maestro logo',
        },
        nav: {
          aria: 'Main navigation',
          homeAria: 'HanBuddy home',
          links: [
            { href: '/#programs', label: 'Programs' },
            { href: '/#how', label: 'How it works' },
            { href: '/#apply', label: 'Join' },
            { href: '/about', label: 'About' },
          ],
          primaryCta: 'Join this weekend',
          primaryCtaShort: 'Join',
          aboutLabel: 'About',
        },
        hero: {
          eyebrow: 'About HanBuddy',
          title: 'The team behind your Korean weekend.',
          lead: 'We plan it, run it, and improve it every week — you just show up.',
        },
        why: {
          title: 'Some of Korea’s best moments are locked behind “locals only.”',
          body: 'Baseball tickets sell out on Korean-only apps. The best picnic spots, the river-delivery trick, the chants everyone knows — none of it comes in English. HanBuddy unlocks that: we handle what blocks you, and share what makes it fun.',
        },
        operate: {
          title: 'Run by us, every weekend.',
          items: [
            { title: 'We plan each activity ourselves', body: 'Built around one real Korean moment.' },
            { title: 'We confirm details with you directly', body: 'A real person, not a booking engine.' },
            { title: 'We improve every week', body: 'Guest feedback shapes the next run.' },
          ],
        },
        beyond: {
          body: 'Baseball and picnics are just the start — festivals, football, markets: anywhere Koreans have their fun, we’ll take you along.',
        },
        team: {
          title: 'Meet the team',
          lead: 'We’re ZeroOne — three friends from Seoul running HanBuddy together.',
          members: [
            { name: 'Minhyung Kim', role: 'Leads the team & operations' },
            { name: 'Yoohyun Kim', role: 'Designs the experiences & content' },
            { name: 'Junyoung Lee', role: 'Keeps bookings & matching smooth' },
          ],
          backed: 'Backed by AI·SW Maestro — a national tech talent program run by Korea’s Ministry of Science and ICT. HanBuddy is our official project.',
        },
        join: {
          title: 'See you this weekend?',
          formButton: 'Join this weekend',
          instagramButton: 'DM us on Instagram',
        },
        footer: {
          brand: 'HanBuddy by ZeroOne',
          aboutLink: 'About HanBuddy',
          contactChannelsAria: 'Community and contact channels',
          instagramAria: 'Send HanBuddy a direct message on Instagram',
          kakaoAria: 'Ask HanBuddy in KakaoTalk open chat',
          meetupAria: 'Visit HanBuddy’s Meetup group',
          credibility: 'HanBuddy is run by team ZeroOne of AI·SW Maestro, a national talent program hosted by Korea’s Ministry of Science and ICT.',
        },
        consent: {
          title: 'Help us improve HanBuddy',
          body: 'With your permission, Google Analytics and Meta Pixel measure visits, application-form opens, and contact clicks. This page never sends your form answers to these tools.',
          reject: 'Continue without optional cookies',
          accept: 'Allow analytics & ads',
          settings: 'Cookie settings',
        },
      },
      ko: {
        skipLink: '본문으로 이동',
        languageToggle: { aria: '언어 선택' },
        meta: {
          htmlLang: 'ko',
          title: 'HanBuddy 소개 | 당신의 한국 주말을 만드는 팀',
          description: 'HanBuddy를 기획하고 운영하는 팀을 소개합니다 — AI·SW마에스트로와 함께하는, 외국인 게스트를 위한 한국 로컬 주말.',
          ogTitle: 'HanBuddy 소개 | 당신의 한국 주말을 만드는 팀',
          ogDescription: '기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요.',
          somaAlt: 'AI·SW마에스트로 로고',
        },
        nav: {
          aria: '주요 내비게이션',
          homeAria: 'HanBuddy 홈',
          links: [
            { href: '/#programs', label: '프로그램' },
            { href: '/#how', label: '참여 방법' },
            { href: '/#apply', label: '신청' },
            { href: '/about', label: '소개' },
          ],
          primaryCta: '이번 주말 함께하기',
          primaryCtaShort: '신청',
          aboutLabel: '소개',
        },
        hero: {
          eyebrow: 'HanBuddy 소개',
          title: '당신의 한국 주말을 만드는 팀.',
          lead: '기획도, 운영도, 개선도 매주 저희가 직접 합니다 — 당신은 오기만 하면 돼요.',
        },
        why: {
          title: '한국의 진짜 재미는 “로컬 전용”으로 잠겨 있습니다.',
          body: '야구 티켓은 한국 전용 앱에서 매진되고, 한강의 명당과 강변 배달 노하우, 모두가 아는 응원가는 영어로 어디에도 없습니다. HanBuddy가 그 문을 엽니다 — 막히는 부분은 저희가 처리하고, 즐기는 법은 함께 나눕니다.',
        },
        operate: {
          title: '매주, 저희가 직접 운영합니다.',
          items: [
            { title: '모든 활동을 직접 기획합니다', body: '한국의 진짜 순간 하나를 중심으로 설계합니다.' },
            { title: '세부 사항을 직접 확인해 드립니다', body: '예약 시스템이 아니라, 사람이 직접요.' },
            { title: '매주 더 나아집니다', body: '게스트 피드백이 다음 주말 운영을 바꿉니다.' },
          ],
        },
        beyond: {
          body: '야구와 피크닉은 시작일 뿐입니다 — 축제, 축구, 시장까지: 한국 사람들이 노는 곳이라면 어디든 함께 갈 거예요.',
        },
        team: {
          title: '팀을 소개합니다',
          lead: '저희는 ZeroOne — HanBuddy를 함께 운영하는 서울의 세 친구입니다.',
          members: [
            { name: '김민형', role: '팀 리드 & 운영 총괄' },
            { name: '김유현', role: '경험과 콘텐츠 설계' },
            { name: '이준영', role: '예약과 매칭 담당' },
          ],
          backed: 'HanBuddy는 과학기술정보통신부 주최 국가 기술 인재 프로그램 AI·SW마에스트로의 공식 프로젝트입니다.',
        },
        join: {
          title: '이번 주말에 만날까요?',
          formButton: '이번 주말 함께하기',
          instagramButton: 'Instagram DM으로 문의하기',
        },
        footer: {
          brand: 'HanBuddy by ZeroOne',
          aboutLink: 'HanBuddy 소개',
          contactChannelsAria: '커뮤니티 및 문의 채널',
          instagramAria: 'HanBuddy Instagram DM으로 문의하기',
          kakaoAria: 'HanBuddy KakaoTalk 오픈채팅으로 문의하기',
          meetupAria: 'HanBuddy Meetup 그룹 보기',
          credibility: 'HanBuddy는 과학기술정보통신부 주최 AI·SW마에스트로 17기 팀 ZeroOne이 운영합니다.',
        },
        consent: {
          title: 'HanBuddy 개선에 동의해 주세요',
          body: '동의하면 Google Analytics와 Meta Pixel로 방문, 신청 폼 열기, 문의 클릭을 측정합니다. 이 페이지는 작성한 신청서 내용을 해당 도구로 전송하지 않습니다.',
          reject: '선택 쿠키 없이 계속하기',
          accept: '분석 및 광고 허용',
          settings: '쿠키 설정',
        },
      },
    });

    const STORAGE_KEY = 'hanbuddy.language';
    const ANALYTICS_CONSENT_KEY = 'hanbuddy.analyticsConsent';
    const SUPPORTED_LANGUAGES = ['en', 'ko'];
    const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
    let analyticsLoaded = false;
    let sectionObserverStarted = false;

    const getByPath = (source, path) => path.split('.').reduce((value, key) => value?.[key], source);
    const clear = (node) => {
      while (node.firstChild) node.removeChild(node.firstChild);
    };

    const safeStoredLanguage = () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return SUPPORTED_LANGUAGES.includes(stored) ? stored : 'en';
      } catch {
        return 'en';
      }
    };

    const persistLanguage = (lang) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Language switching still works when storage is unavailable.
      }
    };

    const syncCtas = () => {
      document.querySelectorAll('[data-cta]').forEach((el) => {
        const key = el.getAttribute('data-cta');
        const url = CONFIG[key];
        if (!url) return;
        el.setAttribute('href', url);
        if (url.startsWith('#')) {
          el.removeAttribute('target');
          el.removeAttribute('rel');
          return;
        }
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      });
    };

    const syncStaticText = (copy) => {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const text = getByPath(copy, el.getAttribute('data-i18n'));
        if (typeof text === 'string') el.textContent = text;
      });
      document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const text = getByPath(copy, el.getAttribute('data-i18n-aria'));
        if (typeof text === 'string') el.setAttribute('aria-label', text);
      });
      document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
        const text = getByPath(copy, el.getAttribute('data-i18n-alt'));
        if (typeof text === 'string') el.setAttribute('alt', text);
      });
    };

    const syncMeta = (copy) => {
      document.documentElement.lang = copy.meta.htmlLang;
      document.title = copy.meta.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', copy.meta.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', copy.meta.ogTitle);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', copy.meta.ogDescription);
    };

    const renderNav = (copy) => {
      const container = document.querySelector('[data-nav-links]');
      if (!container) return;
      clear(container);
      copy.nav.links.forEach((link) => {
        const anchor = document.createElement('a');
        const isCurrent = link.href === '/about';
        anchor.className = isCurrent
          ? 'focusable rounded-lg text-ink transition hover:text-primary-strong'
          : 'focusable rounded-lg transition hover:text-primary-strong';
        if (isCurrent) anchor.setAttribute('aria-current', 'page');
        anchor.href = link.href;
        anchor.textContent = link.label;
        container.appendChild(anchor);
      });
    };

    const setLanguageButtonState = (lang) => {
      document.querySelectorAll('[data-lang]').forEach((button) => {
        const selected = button.getAttribute('data-lang') === lang;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('bg-primary', selected);
        button.classList.toggle('text-on-primary', selected);
        button.classList.toggle('text-muted', !selected);
      });
    };

    const applyLanguage = (lang) => {
      const copy = CONTENT_MAP[lang] ?? CONTENT_MAP.en;
      syncStaticText(copy);
      syncMeta(copy);
      renderNav(copy);
      setLanguageButtonState(lang);
      persistLanguage(lang);
    };

    const safeStoredAnalyticsConsent = () => {
      try {
        const consent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
        return consent === 'granted' || consent === 'denied' ? consent : null;
      } catch {
        return null;
      }
    };

    const persistAnalyticsConsent = (consent) => {
      try {
        window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
      } catch {
        // Tracking stays disabled when storage is unavailable.
      }
    };

    const isTrackableHost = () => !LOCAL_HOSTNAMES.has(window.location.hostname);

    const updateGoogleConsent = (consent) => {
      if (typeof window.gtag !== 'function') return;
      window.gtag('consent', 'update', {
        ad_storage: consent,
        ad_user_data: consent,
        ad_personalization: consent,
        analytics_storage: consent,
      });
    };

    const loadGoogleAnalytics = () => {
      updateGoogleConsent('granted');
      if (document.getElementById('google-analytics-script')) return;

      window.gtag('js', new Date());
      window.gtag('config', CONFIG.analytics.googleMeasurementId);

      const script = document.createElement('script');
      script.id = 'google-analytics-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.analytics.googleMeasurementId)}`;
      document.head.appendChild(script);
    };

    const loadMetaPixel = () => {
      if (typeof window.fbq === 'function') {
        window.fbq('consent', 'grant');
        window.fbq('track', 'PageView');
        return;
      }

      !function(f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', CONFIG.analytics.metaPixelId);
      window.fbq('track', 'PageView');
    };

    const track = (name, params = {}) => {
      if (!analyticsLoaded || safeStoredAnalyticsConsent() !== 'granted' || !isTrackableHost()) return;
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    };

    const trackMetaCustom = (name, params = {}) => {
      if (!analyticsLoaded || safeStoredAnalyticsConsent() !== 'granted' || !isTrackableHost()) return;
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params);
    };

    const ctaPlacement = (el) => {
      if (el.closest('header')) return 'nav';
      if (el.closest('footer')) return 'footer';
      return el.closest('section[id]')?.id ?? 'page';
    };

    const startSectionAnalytics = () => {
      if (sectionObserverStarted || !('IntersectionObserver' in window)) return;
      sectionObserverStarted = true;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          track('section_view', {
            section_id: entry.target.id,
            language: document.documentElement.lang,
            page: 'about',
          });
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.2 });
      ['why', 'operate', 'team', 'join'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      });
    };

    const loadAnalytics = () => {
      if (analyticsLoaded || !isTrackableHost()) return;
      analyticsLoaded = true;
      loadGoogleAnalytics();
      loadMetaPixel();
      startSectionAnalytics();
    };

    const revokeAnalytics = () => {
      updateGoogleConsent('denied');
      if (typeof window.fbq === 'function') window.fbq('consent', 'revoke');
      analyticsLoaded = false;
    };

    const hideConsentBanner = () => {
      const banner = document.querySelector('[data-consent-banner]');
      if (!banner) return;
      banner.classList.add('hidden');
      banner.setAttribute('aria-hidden', 'true');
    };

    const showConsentBanner = (moveFocus = false) => {
      const banner = document.querySelector('[data-consent-banner]');
      if (!banner) return;
      banner.classList.remove('hidden');
      banner.setAttribute('aria-hidden', 'false');
      if (moveFocus) banner.querySelector('[data-consent-action="accept"]')?.focus();
    };

    const setAnalyticsConsent = (consent) => {
      persistAnalyticsConsent(consent);
      if (consent === 'granted') loadAnalytics();
      else revokeAnalytics();
      hideConsentBanner();
    };

    const initAnalyticsConsent = () => {
      document.querySelectorAll('[data-consent-action]').forEach((button) => {
        button.addEventListener('click', () => {
          setAnalyticsConsent(button.getAttribute('data-consent-action') === 'accept' ? 'granted' : 'denied');
        });
      });
      document.querySelectorAll('[data-consent-settings]').forEach((button) => {
        button.addEventListener('click', () => showConsentBanner(true));
      });

      const consent = safeStoredAnalyticsConsent();
      if (consent === 'granted') loadAnalytics();
      else if (consent === null) showConsentBanner();
    };

    const initAnalytics = () => {
      document.querySelectorAll('[data-cta]').forEach((el) => {
        el.addEventListener('click', () => {
          const cta = el.getAttribute('data-cta');
          const params = {
            placement: ctaPlacement(el),
            language: document.documentElement.lang,
            page: 'about',
          };
          track(`${cta}_click`, params);

          const href = el.getAttribute('href');
          if (cta === 'apply' && href === CONFIG.apply) {
            trackMetaCustom('ApplicationFormOpen', { ...params, destination: 'google_form' });
          } else if (cta === 'instagram' && href === CONFIG.instagram) {
            trackMetaCustom('ContactClick', { ...params, destination: 'instagram' });
          } else if (cta === 'contact' && href === CONFIG.contact) {
            trackMetaCustom('ContactClick', { ...params, destination: 'kakaotalk' });
          }
        });
      });
    };

    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.addEventListener('click', () => {
        const lang = button.getAttribute('data-lang');
        if (!SUPPORTED_LANGUAGES.includes(lang)) return;
        const previous = document.documentElement.lang;
        applyLanguage(lang);
        if (previous !== lang) track('language_switch', { language: lang, previous_language: previous });
      });
    });

    syncCtas();
    applyLanguage(safeStoredLanguage());
    initAnalytics();
    initAnalyticsConsent();
  </script>
</body>
</html>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/about.test.js`
Expected: PASS (10/10)

Run: `node --test tests/`
Expected: 전부 PASS

- [ ] **Step 5: 브라우저 스모크 확인**

```bash
python3 -m http.server 8080
```

브라우저에서 확인 (각 항목 눈으로 검증):
- `http://localhost:8080/about/` → 페이지 렌더, 6개 블록 표시
- KO 토글 → 한국어 카피 전환, 새로고침 후 언어 유지(localStorage 공유)
- 나브 `Programs` 클릭 → `/#programs`로 메인 이동
- 390px(반응형 모드) → 헤더에 로고+HanBuddy+About 공존, 360px → 워드마크 숨고 About 유지, 가로 넘침 없음
- 팀원 3명 링크 → 새 탭으로 LinkedIn/GitHub 열림
- 쿠키 배너 표시, 거부 후 Cookie settings로 재오픈 가능

- [ ] **Step 6: 커밋**

```bash
git add about/index.html tests/about.test.js
git commit -m "feat(landing): /about 페이지 신설 — 운영자 포지셔닝 팀 소개"
```

---

### Task 3: 배포 가드레일 (.vercelignore)

**Files:**
- Modify: `.vercelignore`

**Interfaces:**
- Consumes: Task 2의 `about/index.html`.
- Produces: Vercel 배포 아티팩트에 `about/index.html` 포함 (다른 파일은 여전히 차단).

- [ ] **Step 1: .vercelignore에 about 허용 추가**

`.vercelignore` 끝에 추가 (allowlist 패턴 유지 — 폴더를 열고 그 안에서 index.html만 허용):

```
!/about
/about/*
!/about/index.html
```

- [ ] **Step 2: 배포 아티팩트 시뮬레이션 검증**

git의 ignore 엔진으로 .vercelignore 결과를 시뮬레이션 (이 레포의 기존 검증 패턴):

```bash
cd "$(mktemp -d)" && git init -q sim && cd sim
cp -R ~/projects/hanbuddy-landing/. .
rm -rf .git && git init -q
cp .vercelignore .gitignore
git add -A -n | sed 's/^add //'
```

Expected 출력에 반드시 포함: `'about/index.html'`, `'index.html'`, `assets/brand/*.webp|png`, `assets/photos/**/*.webp`
Expected 출력에 절대 없어야 함: `AGENTS.md`, `DESIGN.md`, `docs/`, `tests/`, `assets/raw/`, `.omo/`, `*.jpg`

- [ ] **Step 3: 커밋**

```bash
cd ~/projects/hanbuddy-landing
git add .vercelignore
git commit -m "chore(landing): .vercelignore에 /about 배포 허용 추가"
```

---

### Task 4: 최종 검증 및 마무리

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

Run: `node --test tests/`
Expected: 전부 PASS (기존 12개 + 신규 10개)

- [ ] **Step 2: 데스크톱/모바일 스크린샷 검증**

로컬 프리뷰(`python3 -m http.server 8080`)에서 `/about/`과 `/` 각각:
- 1280×800 데스크톱: about 페이지 전체, index 나브에 About 표시
- 390×844 모바일: about 페이지 전체, index/about 헤더 넘침 없음
- KO 토글 상태로 한 세트 더

- [ ] **Step 3: 금칙어 최종 grep**

```bash
grep -nE "F001|4/5|30,000|under 30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal" about/index.html index.html; echo "exit=$?"
```

Expected: `exit=1` (매치 없음)

- [ ] **Step 4: 브랜치 마무리**

superpowers:finishing-a-development-branch 스킬 사용. 이 레포의 확정 워크플로우: **브랜치 push → PR 생성 → CodeRabbit 리뷰 반영 → squash 머지** (main 머지 시 Vercel 자동배포로 landing.hanbuddy.kr 반영됨). 머지 전 GitHub head 동기화 지연에 유의.

---

## Self-Review 결과

- **스펙 커버리지**: URL/파일구조(T2·T3), 나브 3면 진입(T1), 6블록·잠금 카피(T2), EN/KO(T2), 분석 이벤트(T2 스크립트), 테스트 4종(T1·T2), 배포(T3) — 전부 매핑됨. 스펙의 "canonical" 반영(T2 head). 누락 없음.
- **플레이스홀더**: 없음 — about/index.html 전문, 테스트 전문, KO 카피 전문 포함.
- **타입/이름 일관성**: `data-cta` 키(linkedin_minhyung/linkedin_yoohyun/github_junyoung)가 T2 마크업·테스트에서 동일. i18n 키(nav.aboutLabel, footer.aboutLink)가 T1 index·T2 about에서 동일. 섹션 id(top/why/operate/beyond/team/join)가 마크업·테스트·observer에서 동일.
