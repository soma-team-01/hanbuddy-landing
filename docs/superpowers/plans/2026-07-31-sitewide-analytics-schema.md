# Sitewide Analytics Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated GA4 and Meta Pixel tracking to both event-detail pages and standardize tracked interactions across every public page.

**Architecture:** A shared browser module at `/assets/analytics.js` owns consent, vendor loading, and canonical event builders. HTML pages provide page context and semantic tracking attributes; existing content scripts call the shared language-switch API instead of defining their own vendor integrations.

**Tech Stack:** Buildless HTML, browser JavaScript, GA4 `gtag.js`, Meta Pixel `fbq`, Node.js built-in test runner.

## Global Constraints

- Keep the site buildless; add no package manager or build tooling.
- Keep all analytics and advertising scripts behind explicit opt-in.
- Preserve GA4 ID `G-MW7MFVL50G` and Meta Pixel ID `4569887956575986`.
- Never send form answers, phone numbers, email addresses, or other personal information.
- Preserve Meta custom event names `ApplicationFormOpen` and `ContactClick`.
- Do not introduce GTM in this change.
- Do not commit automatically; the user asked for implementation, not repository-history mutation.

---

### Task 1: Shared Analytics Contract

**Files:**
- Create: `assets/analytics.js`
- Create: `tests/analytics-schema.test.js`
- Modify: `.vercelignore`

**Interfaces:**
- Produces: `HanBuddyAnalytics.trackLanguageSwitch(nextLanguage, previousLanguage)`
- Produces for Node tests: `buildPageContext`, `buildCtaEvent`,
  `buildSelectContentEvent`, and `isTrackableHostname`

- [ ] **Step 1: Write the failing module and schema tests**

Create tests that require the future module only when it exists, fail clearly
when it is absent, and assert literal payloads for apply, contact, Meetup,
LinkedIn, and event-card interactions.

- [ ] **Step 2: Run the schema test and verify RED**

Run: `node --test tests/analytics-schema.test.js`

Expected: FAIL because `assets/analytics.js` does not exist.

- [ ] **Step 3: Implement the shared module**

Implement:

- default denied Google consent
- lazy GA4 and Meta loading after stored or newly granted consent
- shared banner/settings bindings
- delegated `[data-cta]` and `[data-analytics-content-id]` click tracking
- `[data-analytics-section]` visibility tracking
- canonical payload builders and Node exports

- [ ] **Step 4: Allowlist and verify the shared module**

Add `!/assets/analytics.js` to `.vercelignore`.

Run: `node --test tests/analytics-schema.test.js`

Expected: PASS.

### Task 2: Migrate Home and About

**Files:**
- Modify: `index.html`
- Modify: `about/index.html`
- Modify: `tests/analytics.test.js`
- Modify: `tests/about.test.js`
- Create: `tests/analytics-pages.test.js`

**Interfaces:**
- Consumes: `/assets/analytics.js`
- Produces: body page metadata, section metadata, content-card metadata, and
  `trackLanguageSwitch` calls

- [ ] **Step 1: Write failing page-integration tests**

Assert that home and About load `/assets/analytics.js`, declare their
`data-analytics-page-type`, expose the shared consent controls, and no longer
embed vendor loader implementations.

- [ ] **Step 2: Run page tests and verify RED**

Run: `node --test tests/analytics.test.js tests/about.test.js tests/analytics-pages.test.js`

Expected: FAIL because the pages still contain their duplicated analytics
implementations and lack the canonical metadata.

- [ ] **Step 3: Migrate home and About**

Remove duplicated IDs, loaders, consent controllers, and click trackers. Add
the shared script, page/section/content metadata, and replace legacy
`track('language_switch', ...)` calls with
`HanBuddyAnalytics.trackLanguageSwitch(...)`.

- [ ] **Step 4: Run page tests and verify GREEN**

Run: `node --test tests/analytics.test.js tests/about.test.js tests/analytics-pages.test.js`

Expected: PASS.

### Task 3: Track Event-Detail Pages

**Files:**
- Modify: `events/kbo/index.html`
- Modify: `events/hanriver/index.html`
- Modify: `tests/analytics-pages.test.js`

**Interfaces:**
- Consumes: `/assets/analytics.js`
- Produces: `event_detail` page views and canonical CTA context

- [ ] **Step 1: Add failing detail-page expectations**

For both detail pages, assert the shared script, consent UI, cookie-settings
control, page/experience metadata, and explicit desktop/mobile application
placements.

- [ ] **Step 2: Run the detail-page test and verify RED**

Run: `node --test tests/analytics-pages.test.js`

Expected: FAIL because the detail pages are not instrumented.

- [ ] **Step 3: Instrument both detail pages**

Add the shared script, `data-cta` attributes, page metadata, consent banner,
footer settings control, and placement metadata without altering visible event
facts.

- [ ] **Step 4: Run the detail-page test and verify GREEN**

Run: `node --test tests/analytics-pages.test.js`

Expected: PASS.

### Task 4: Full Regression and Production-Surface Verification

**Files:**
- Verify: all modified files

**Interfaces:**
- Consumes: completed Tasks 1-3
- Produces: verified deployable analytics behavior

- [ ] **Step 1: Run the full Node suite**

Run: `node --test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Check deploy allowlist and public guardrails**

Run: `git diff --check`

Run: `git diff -- .vercelignore index.html about/index.html events/kbo/index.html events/hanriver/index.html assets/analytics.js tests`

Expected: no whitespace errors; only approved analytics, consent, tests, and
deployment allowlist changes.

- [ ] **Step 3: Preview representative pages**

Run: `python3 -m http.server 8080`

Inspect `/`, `/about/`, `/events/kbo/`, and `/events/hanriver/` at desktop and
mobile widths. Confirm consent controls render without layout regressions and
CTA links remain correct.
