# Google Advanced Consent Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure sanitized UTM campaign visits on public marketing pages without optional cookies while keeping behavioral analytics, Meta Pixel, and all application-page measurement behind explicit consent.

**Architecture:** Keep the shared `assets/analytics.js` module as the only vendor integration point and split its state into Google-tag-loaded and fully-consented tracking. Marketing pages opt into the advanced policy with a body data attribute; `/apply/` opts into the basic policy and remains silent before consent. A pure sanitizer constructs one explicit page view from origin, path, allowlisted UTM values, and referrer origin, while the application request removes browser referrer entirely.

**Tech Stack:** Buildless HTML, browser JavaScript, CommonJS-compatible shared module, Node.js `node:test`, Vercel allowlist.

## Global Constraints

- Production tracking is allowed only on `www.hanbuddy.kr`.
- Marketing pages are `/`, `/about/`, `/events/*`, and `/privacy/`; `/apply/` uses the stricter basic policy.
- Allowed UTM keys are exactly `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_content`, and `utm_term`.
- Each UTM value is trimmed, limited to 100 characters, and dropped when it resembles an email address or phone number.
- UTM values are never written to cookies, `localStorage`, `sessionStorage`, the API, Google Sheets, or Discord.
- Meta Pixel and custom GA events remain disabled until explicit consent.
- `send_page_view` is always `false`; every page view is sent explicitly and at most once per page load.
- `ads_data_redaction` is `true`; `allow_google_signals` and `allow_ad_personalization_signals` are `false`; URL passthrough is not enabled.
- GPC or DNT suppresses the pre-consent cookieless page view, while a previously stored or newly explicit grant remains authoritative.
- The fixed 17-column Google Sheet order remains unchanged; the existing referrer column receives an empty string.
- No package manager, dependency, build step, or new server endpoint is introduced.
- Public copy remains English-first with synchronized Korean text where the page supports language switching.
- Every implementation change follows RED → GREEN → refactor and uses `<prefix>: <한국어 요약>` commits without AI trailers.

---

### Task 1: Advanced and Basic Analytics Page Policies

**Files:**
- Modify: `tests/analytics-schema.test.js`
- Modify: `tests/analytics-pages.test.js`
- Modify: `assets/analytics.js`
- Modify: `index.html`
- Modify: `about/index.html`
- Modify: `apply/index.html`
- Modify: `events/kbo-gocheok/index.html`
- Modify: `events/kbo-jamsil/index.html`
- Modify: `events/kleague/index.html`
- Modify: `events/hanriver/index.html`

**Interfaces:**
- Produces: `buildLimitedPageView({ href, referrer }) -> { page_location, page_referrer }`
- Produces: `hasGlobalPrivacySignal(windowLike) -> boolean`
- Produces: `data-analytics-consent-mode="advanced|basic"` page contract
- Preserves: `HanBuddyAnalytics.trackEvent`, `trackLanguageSwitch`, CTA and section event behavior after consent

- [ ] **Step 1: Add failing pure-function tests for URL minimization**

Add table-driven assertions to `tests/analytics-schema.test.js` that require:

```js
assert.deepEqual(
  analytics.buildLimitedPageView({
    href: 'https://www.hanbuddy.kr/events/kbo-gocheok/?utm_source=instagram&utm_campaign=summer%20night&event=kbo-gocheok#tickets',
    referrer: 'https://www.instagram.com/hanbuddy_kr/?secret=1',
  }),
  {
    page_location: 'https://www.hanbuddy.kr/events/kbo-gocheok/?utm_source=instagram&utm_campaign=summer+night',
    page_referrer: 'https://www.instagram.com',
  },
);
```

Add cases proving unknown parameters and fragments disappear, duplicate UTM keys disappear, email/phone-looking values disappear, values stop at 100 characters, malformed URLs fall back to an empty object rather than throwing, and non-HTTP referrers become `''`.

- [ ] **Step 2: Run the sanitizer tests and verify RED**

Run: `node --test tests/analytics-schema.test.js`

Expected: FAIL because `buildLimitedPageView` is not exported.

- [ ] **Step 3: Implement the minimal pure sanitizer**

In `assets/analytics.js`, add exact constants for the six keys and 100-character limit. Implement helpers that:

```js
const buildLimitedPageView = ({ href = '', referrer = '' } = {}) => {
  const current = new URL(href);
  const clean = new URL(current.origin + current.pathname);
  for (const key of LIMITED_UTM_KEYS) {
    const values = current.searchParams.getAll(key);
    if (values.length !== 1) continue;
    const value = values[0].trim().slice(0, MAX_UTM_VALUE_LENGTH);
    if (!value || resemblesPersonalData(value)) continue;
    clean.searchParams.set(key, value);
  }
  return {
    page_location: clean.href,
    page_referrer: referrerOrigin(referrer),
  };
};
```

Catch invalid current URLs and return `{}`. Email detection must require an `@` plus a dotted domain; phone detection must require a phone-shaped string with at least seven digits rather than rejecting every campaign containing digits.

- [ ] **Step 4: Run the sanitizer tests and verify GREEN**

Run: `node --test tests/analytics-schema.test.js`

Expected: PASS.

- [ ] **Step 5: Add failing browser-harness tests for page policies**

Extend `createBrowserHarness` with literal options for `consentMode`, `pageType`, `href`, `referrer`, `hostname`, `storedConsent`, `globalPrivacyControl`, and `doNotTrack`. Record appended scripts and cookie deletion assignments.

Add tests proving:

- an advanced marketing page with no stored choice queues the four denied defaults before configuration, sets `ads_data_redaction`, configures `send_page_view:false`, disables Google Signals and ad-personalization signals, appends the Google script, and queues exactly one explicit sanitized `page_view`;
- choosing reject does not send a second page view;
- CTA, section, language, and form events do not queue before consent;
- a basic application page appends no Google or Meta script and sends no page view before consent;
- accepting on either policy updates all four consent fields to granted, activates Meta, and enables later behavioral events without duplicating an advanced page's page view;
- stored grant on `/apply/` loads both vendors and sends one explicit page view;
- non-production hosts, GPC, and DNT suppress the cookieless page view;
- malformed marketing URLs do not stop initialization;
- revocation updates all four fields to denied, revokes Meta, disables GA, and expires accessible `_ga`, `_ga_*`, `_fbp`, and `_fbc` cookies.

- [ ] **Step 6: Add failing page-contract tests**

In `tests/analytics-pages.test.js`, require:

```js
assert.match(homeHtml, /data-analytics-consent-mode="advanced"/);
assert.match(aboutHtml, /data-analytics-consent-mode="advanced"/);
assert.match(applyHtml, /data-analytics-consent-mode="basic"/);
```

Require every discovered event detail page to use `advanced`.

- [ ] **Step 7: Run policy tests and verify RED**

Run: `node --test tests/analytics-schema.test.js tests/analytics-pages.test.js`

Expected: FAIL because the module still treats tag loading and consent as one state and pages lack the policy attribute.

- [ ] **Step 8: Implement page-policy state transitions**

Refactor `assets/analytics.js` to use separate state:

```js
let googleTagLoaded = false;
let fullAnalyticsEnabled = false;
let pageViewSent = false;
```

Add `currentConsentMode()` that returns `advanced` only when the body explicitly declares it and the pathname is not `/apply/`; otherwise return `basic`. Add `hasGlobalPrivacySignal` for `navigator.globalPrivacyControl === true` and standard `doNotTrack === '1'` values.

Create one Google loader that always queues privacy settings and `config` with `send_page_view:false`. For advanced denied visits, set the GA disable flag to `false`, keep consent denied, load the tag, and send `page_view` once with `buildLimitedPageView(...)` plus current page context. For granted visits, update consent first, load the tag if needed, and send one explicit page view only if none was sent. Keep Meta loading and every custom event behind `fullAnalyticsEnabled` plus stored consent.

On reject/revoke, set the GA disable flag to `true`, update all four consent types to denied, revoke Meta, set `fullAnalyticsEnabled = false`, and expire accessible analytics cookies for `/` with host-only and HanBuddy domain variants. Do not replay events after a later grant.

- [ ] **Step 9: Add policy attributes to every public page**

Add `data-analytics-consent-mode="advanced"` to the existing body tag in the home, About, and all event pages. Add `data-analytics-consent-mode="basic"` to `/apply/`.

- [ ] **Step 10: Run policy tests and existing analytics tests**

Run: `node --test tests/analytics-schema.test.js tests/analytics-pages.test.js tests/analytics.test.js`

Expected: PASS with no warnings.

- [ ] **Step 11: Commit the analytics policy slice**

```bash
git add assets/analytics.js index.html about/index.html apply/index.html events tests/analytics-schema.test.js tests/analytics-pages.test.js tests/analytics.test.js
git commit -m "feat: 고급 동의 모드 최소수집 적용"
```

---

### Task 2: Remove Automatic Referrer from Applications

**Files:**
- Modify: `tests/apply-page.test.js`
- Modify: `tests/api-apply.test.js`
- Modify: `apply/index.html`
- Modify: `api/apply.js`

**Interfaces:**
- Changes: application JSON no longer includes `referrer`
- Changes: `buildRow({ applicationId, timestampKst, value })` always writes `''` at array index 16
- Preserves: 17-column row order and the user-supplied categorical `source`

- [ ] **Step 1: Add failing browser-payload regression test**

In `tests/apply-page.test.js`, assert the payload-building block contains no `document.referrer`, `location.search`, `utm_`, or `referrer:` property, while the user-entered `source` and `sourceOther` remain. Assert the `application_submitted` analytics call can contain the categorical `source` but never `sourceOther`.

- [ ] **Step 2: Add failing server-row regression tests**

Update the existing row fixture to call `buildRow` without `referrer` and expect exactly 17 values with index 16 equal to `''`. Add a handler test that posts a valid payload containing a malicious `referrer` with UTM and confirms the captured Sheets append body ends with `''`.

- [ ] **Step 3: Run application tests and verify RED**

Run: `node --test tests/apply-page.test.js tests/api-apply.test.js`

Expected: FAIL because the page still sends `document.referrer` and the API still copies it.

- [ ] **Step 4: Remove referrer collection with the smallest change**

Delete `referrer: document.referrer || ''` from the application payload. Change `buildRow` to omit its `referrer` argument and end in a literal empty string. Delete handler extraction of `payload.referrer` and call `buildRow({ applicationId, timestampKst, value: checked.value })`.

- [ ] **Step 5: Run application tests and verify GREEN**

Run: `node --test tests/apply-page.test.js tests/api-apply.test.js`

Expected: PASS, including the fixed header-order test.

- [ ] **Step 6: Commit the privacy separation slice**

```bash
git add apply/index.html api/apply.js tests/apply-page.test.js tests/api-apply.test.js
git commit -m "fix: 신청 데이터의 자동 유입정보 저장 제거"
```

---

### Task 3: Publish Accurate Consent and Privacy Disclosures

**Files:**
- Create: `privacy/index.html`
- Modify: `tests/analytics.test.js`
- Modify: `tests/analytics-pages.test.js`
- Modify: `tests/deploy-allowlist.test.js`
- Modify: `index.html`
- Modify: `about/index.html`
- Modify: `apply/index.html`
- Modify: `events/kbo-gocheok/index.html`
- Modify: `events/kbo-jamsil/index.html`
- Modify: `events/kleague/index.html`
- Modify: `events/hanriver/index.html`
- Modify: `.vercelignore`

**Interfaces:**
- Produces: public `/privacy/` page with `data-analytics-page-type="privacy"` and advanced consent policy
- Produces: footer link `href="/privacy/"` on every public page
- Preserves: synchronized EN/KO consent objects on home, About, and Apply

- [ ] **Step 1: Add failing disclosure and deployment tests**

Require all public pages to link `/privacy/`, add `privacy/index.html` to the discovered public-page list and `MUST_DEPLOY`, and require the file to exist. Test observable disclosure concepts rather than exact sentences:

- marketing copy names limited cookie-free campaign measurement and the six-UTM purpose;
- optional consent copy names Google Analytics behavioral events and Meta Pixel;
- application copy states the form is not measured before consent and typed answers are not linked to UTM;
- the privacy page names Google, Meta, the application Sheet/Discord separation, the six-month application retention, `zeroone.soma@gmail.com`, and the Cookie settings control.

- [ ] **Step 2: Run disclosure tests and verify RED**

Run: `node --test tests/analytics.test.js tests/analytics-pages.test.js tests/deploy-allowlist.test.js`

Expected: FAIL because `/privacy/`, the links, and the new disclosures do not exist.

- [ ] **Step 3: Update the consent banner copy**

Use this meaning in synchronized EN/KO objects on home and About:

```text
EN body: We count a limited, cookie-free visit on public pages using the page path and UTM campaign tags. If you accept, Google Analytics can also measure clicks and Meta Pixel can help us understand ad reach. We never include form answers or link UTM tags to an application.
EN note: Optional analytics can be changed anytime in Cookie settings. See Privacy.
KO body: 공개 페이지에서는 쿠키 없이 페이지 경로와 UTM 캠페인 태그로 제한된 방문 수를 집계합니다. 허용하면 Google Analytics의 클릭 측정과 Meta Pixel의 광고 도달 분석도 사용합니다. 폼 입력값은 측정하거나 UTM과 신청서를 연결하지 않습니다.
KO note: 선택 분석은 쿠키 설정에서 언제든 바꿀 수 있습니다. 개인정보·분석 안내를 확인하세요.
```

On `/apply/`, use stricter body text stating that no Google or Meta measurement runs on the application page before consent and form answers are never analytics fields. Event pages are English-only and use the marketing English meaning.

- [ ] **Step 4: Add footer privacy links**

Add a visible `Privacy` / `개인정보·분석 안내` link beside Cookie settings in every footer. Extend each localized `footer` object with `privacyLink` and bind it through `data-i18n` on localized pages.

- [ ] **Step 5: Create the bilingual privacy page**

Create a self-contained, buildless page using the current warm-red tokens, shared analytics module, language toggle, footer, and consent dialog. Its content must cover:

1. limited cookieless measurement on public marketing pages;
2. origin + path, six named UTM parameters, referrer origin, 100-character cap, and email/phone-looking value removal;
3. no UTM persistence and no application linkage;
4. optional post-consent GA behavior events and Meta Pixel;
5. `/apply/` being silent before consent and its separate Sheet/Discord application processing with six-month-after-event retention;
6. GPC/DNT handling, settings reopening, provider links, and deletion/contact email;
7. a clear statement that campaign links must not put personal data in UTM values.

Set canonical metadata to `https://www.hanbuddy.kr/privacy/`, body policy to `advanced`, and page type to `privacy`.

- [ ] **Step 6: Extend the Vercel allowlist**

Add only:

```gitignore
!/privacy
/privacy/*
!/privacy/index.html
```

Do not unignore the whole project or docs directory.

- [ ] **Step 7: Run disclosure and deployment tests and verify GREEN**

Run: `node --test tests/analytics.test.js tests/analytics-pages.test.js tests/deploy-allowlist.test.js tests/inline-scripts.test.js`

Expected: PASS, including inline JavaScript parsing.

- [ ] **Step 8: Commit the public disclosure slice**

```bash
git add privacy/index.html .vercelignore index.html about/index.html apply/index.html events tests/analytics.test.js tests/analytics-pages.test.js tests/deploy-allowlist.test.js
git commit -m "docs: 분석 최소수집과 신청정보 분리 고지"
```

---

### Task 4: Full Regression and Browser Verification

**Files:**
- Modify only if verification finds a tested defect in files already listed above

**Interfaces:**
- Validates: all public pages, analytics state transitions, application submission, deploy allowlist

- [ ] **Step 1: Run the full automated suite**

Run: `node --test tests/*.test.js`

Expected: all tests pass with zero failures, cancellations, skips, or todos.

- [ ] **Step 2: Run source and deploy safety checks**

Run:

```bash
git diff --check
rg -n "document\.referrer|referrer:|utm_" apply/index.html api/apply.js
rg -n "forms\.gle" index.html about apply events privacy
```

Expected: no application referrer/UTM collection, no Google Form links, and no whitespace errors.

- [ ] **Step 3: Start the local application-capable preview**

Run: `node scripts/dev-server.js`

Open the reported local URL and verify at mobile and desktop widths:

- home/About/event/privacy content renders and Privacy links work;
- consent dialog opens, accepts, rejects, reopens, and restores focus;
- `/apply/?event=kbo-gocheok` prefills correctly and submits through the stub;
- language switching updates consent and privacy copy;
- local hostname makes no Google or Meta network requests.

- [ ] **Step 4: Inspect the branch diff and rerun targeted tests after any fix**

Run: `git diff --stat main...HEAD && git status --short`

Expected: only the approved analytics, application-separation, disclosure, tests, spec, and plan files differ.

- [ ] **Step 5: Prepare production verification notes**

Record that real Google/Meta verification must occur after deployment on `www.hanbuddy.kr`: denied marketing visit has one sanitized cookieless page view; denied `/apply/` has no vendor requests; accepted visits enable existing events; application Sheet and Discord contain no automatic referrer or UTM. Do not use production credentials locally.
