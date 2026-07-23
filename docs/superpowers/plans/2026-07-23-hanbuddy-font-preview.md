# HanBuddy Font Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-conversation, selectable five-way HanBuddy font comparison without changing production landing files.

**Architecture:** A single HTML fragment in the thread-scoped visualization directory contains static candidate markup, scoped font-family rules, and a small local selection handler. A temporary Node test validates the fragment contract before browser rendering; the bundled visualization renderer and in-app browser validate runtime behavior and responsive layout.

**Tech Stack:** HTML fragment, CSS, browser JavaScript, Google Fonts CDN, Node.js test runner, bundled visualization renderer, in-app Browser.

## Global Constraints

- Create the fragment at `/Users/minbros/.codex/visualizations/2026/07/23/019f8ce4-5f16-7023-91ee-81b4975e22ae/hanbuddy-font-comparison.html`.
- Do not modify `index.html`, `DESIGN.md`, or any production asset.
- Show all five candidates simultaneously at wide widths and stack without clipping at 320px.
- Use identical copy and structure for every candidate.
- Use only font weights `400` and `500`.
- Use host theme variables and provided visualization utilities for color, surfaces, controls, and selected state.
- Load external resources only from `fonts.googleapis.com` and `fonts.gstatic.com`.
- Candidate CTA buttons update one selected-candidate line and do not navigate.

---

### Task 1: Lock the visualization contract

**Files:**
- Create: `/tmp/hanbuddy-font-comparison.test.mjs`
- Test: `/tmp/hanbuddy-font-comparison.test.mjs`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-23-hanbuddy-font-preview-design.md`
- Produces: structural validation for the fragment path, candidate keys, required copy, font imports, and local selection handler

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = '/Users/minbros/.codex/visualizations/2026/07/23/019f8ce4-5f16-7023-91ee-81b4975e22ae/hanbuddy-font-comparison.html';
const html = await readFile(path, 'utf8');

assert.doesNotMatch(html, /<!doctype|<html|<head|<body/i);
assert.match(html, /id="hanbuddy-font-comparison"/);
assert.equal((html.match(/data-font-card=/g) || []).length, 5);
assert.equal((html.match(/data-font-choice=/g) || []).length, 5);

for (const key of ['current', 'jakarta', 'dm', 'outfit', 'nunito']) {
  assert.match(html, new RegExp(`data-font-card="${key}"`));
  assert.match(html, new RegExp(`data-font-choice="${key}"`));
}

for (const family of [
  'Manrope',
  'Be Vietnam Pro',
  'Plus Jakarta Sans',
  'DM Sans',
  'Outfit',
  'Nunito Sans',
  'Noto Sans KR',
]) {
  assert.match(html, new RegExp(family));
}

assert.match(html, /Experience Korea like a local!/);
assert.match(html, /한국의 주말을 로컬 버디와 함께 경험하세요\./);
assert.match(html, /Join this weekend/);
assert.match(html, /aria-pressed="true"/);
assert.match(html, /selectedLabel\.textContent/);
assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|WebSocket/);
assert.ok(Buffer.byteLength(html) < 2 * 1024 * 1024);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node /tmp/hanbuddy-font-comparison.test.mjs
```

Expected: FAIL with `ENOENT` because `hanbuddy-font-comparison.html` does not exist.

---

### Task 2: Build the five-way font comparison

**Files:**
- Create: `/Users/minbros/.codex/visualizations/2026/07/23/019f8ce4-5f16-7023-91ee-81b4975e22ae/hanbuddy-font-comparison.html`
- Test: `/tmp/hanbuddy-font-comparison.test.mjs`

**Interfaces:**
- Consumes: the contract from Task 1 and host visualization utility classes
- Produces: root `#hanbuddy-font-comparison`, five `data-font-card` sections, five `data-font-choice` buttons, and selected summary `#hanbuddy-font-selected`

- [ ] **Step 1: Create the fragment**

```html
<div id="hanbuddy-font-comparison">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Manrope:wght@400;500&family=Noto+Sans+KR:wght@400;500&family=Nunito+Sans:opsz,wght@6..12,400;6..12,500&family=Outfit:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500&display=swap');

    #hanbuddy-font-comparison .hb-font-grid {
      align-items: stretch;
    }

    #hanbuddy-font-comparison .hb-font-card {
      min-width: 0;
    }

    #hanbuddy-font-comparison .hb-font-card h3,
    #hanbuddy-font-comparison .hb-font-card p {
      overflow-wrap: anywhere;
    }

    #hanbuddy-font-comparison .hb-display {
      font-weight: 500;
    }

    #hanbuddy-font-comparison .hb-body {
      font-weight: 400;
    }

    #hanbuddy-font-comparison [data-font-card="current"] .hb-display {
      font-family: "Manrope", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="current"] .hb-body {
      font-family: "Be Vietnam Pro", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="jakarta"] .hb-display {
      font-family: "Plus Jakarta Sans", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="jakarta"] .hb-body {
      font-family: "DM Sans", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="dm"] .hb-display,
    #hanbuddy-font-comparison [data-font-card="dm"] .hb-body {
      font-family: "DM Sans", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="outfit"] .hb-display {
      font-family: "Outfit", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="outfit"] .hb-body {
      font-family: "DM Sans", "Noto Sans KR", sans-serif;
    }

    #hanbuddy-font-comparison [data-font-card="nunito"] .hb-display,
    #hanbuddy-font-comparison [data-font-card="nunito"] .hb-body {
      font-family: "Nunito Sans", "Noto Sans KR", sans-serif;
    }
  </style>

  <div class="viz-row" aria-live="polite">
    <span class="viz-badge">Selected</span>
    <span id="hanbuddy-font-selected">Plus Jakarta Sans + DM Sans · Friendly polish</span>
  </div>

  <div class="viz-grid hb-font-grid">
    <section class="card hb-font-card" data-font-card="current">
      <div class="viz-row">
        <strong>Current control</strong>
        <span class="viz-badge">Structured</span>
      </div>
      <p class="text-small hb-body">Manrope + Be Vietnam Pro</p>
      <p class="text-small hb-display">SEOUL · EVERY SATURDAY &amp; SUNDAY</p>
      <h3 class="hb-display">Experience Korea like a local!</h3>
      <p class="hb-body">Cheer at a Korean baseball game or picnic by the Han River with a friendly local buddy.</p>
      <p class="hb-body" lang="ko">한국의 주말을 로컬 버디와 함께 경험하세요.</p>
      <button class="btn btn-primary hb-body" type="button" data-font-choice="current" aria-pressed="false">Join this weekend</button>
    </section>

    <section class="card hb-font-card" data-font-card="jakarta">
      <div class="viz-row">
        <strong>Plus Jakarta Sans + DM Sans</strong>
        <span class="viz-badge">Recommended</span>
      </div>
      <p class="text-small hb-body">Friendly polish</p>
      <p class="text-small hb-display">SEOUL · EVERY SATURDAY &amp; SUNDAY</p>
      <h3 class="hb-display">Experience Korea like a local!</h3>
      <p class="hb-body">Cheer at a Korean baseball game or picnic by the Han River with a friendly local buddy.</p>
      <p class="hb-body" lang="ko">한국의 주말을 로컬 버디와 함께 경험하세요.</p>
      <button class="btn btn-primary hb-body" type="button" data-font-choice="jakarta" aria-pressed="true">Join this weekend</button>
    </section>

    <section class="card hb-font-card" data-font-card="dm">
      <div class="viz-row">
        <strong>DM Sans</strong>
        <span class="viz-badge">Calm</span>
      </div>
      <p class="text-small hb-body">Calm and approachable</p>
      <p class="text-small hb-display">SEOUL · EVERY SATURDAY &amp; SUNDAY</p>
      <h3 class="hb-display">Experience Korea like a local!</h3>
      <p class="hb-body">Cheer at a Korean baseball game or picnic by the Han River with a friendly local buddy.</p>
      <p class="hb-body" lang="ko">한국의 주말을 로컬 버디와 함께 경험하세요.</p>
      <button class="btn btn-primary hb-body" type="button" data-font-choice="dm" aria-pressed="false">Join this weekend</button>
    </section>

    <section class="card hb-font-card" data-font-card="outfit">
      <div class="viz-row">
        <strong>Outfit + DM Sans</strong>
        <span class="viz-badge">Youthful</span>
      </div>
      <p class="text-small hb-body">Youthful energy</p>
      <p class="text-small hb-display">SEOUL · EVERY SATURDAY &amp; SUNDAY</p>
      <h3 class="hb-display">Experience Korea like a local!</h3>
      <p class="hb-body">Cheer at a Korean baseball game or picnic by the Han River with a friendly local buddy.</p>
      <p class="hb-body" lang="ko">한국의 주말을 로컬 버디와 함께 경험하세요.</p>
      <button class="btn btn-primary hb-body" type="button" data-font-choice="outfit" aria-pressed="false">Join this weekend</button>
    </section>

    <section class="card hb-font-card" data-font-card="nunito">
      <div class="viz-row">
        <strong>Nunito Sans</strong>
        <span class="viz-badge">Warm</span>
      </div>
      <p class="text-small hb-body">Warm buddy</p>
      <p class="text-small hb-display">SEOUL · EVERY SATURDAY &amp; SUNDAY</p>
      <h3 class="hb-display">Experience Korea like a local!</h3>
      <p class="hb-body">Cheer at a Korean baseball game or picnic by the Han River with a friendly local buddy.</p>
      <p class="hb-body" lang="ko">한국의 주말을 로컬 버디와 함께 경험하세요.</p>
      <button class="btn btn-primary hb-body" type="button" data-font-choice="nunito" aria-pressed="false">Join this weekend</button>
    </section>
  </div>

  <script>
    (() => {
      const root = document.getElementById('hanbuddy-font-comparison');
      const selectedLabel = root.querySelector('#hanbuddy-font-selected');
      const labels = {
        current: 'Manrope + Be Vietnam Pro · Structured',
        jakarta: 'Plus Jakarta Sans + DM Sans · Friendly polish',
        dm: 'DM Sans · Calm and approachable',
        outfit: 'Outfit + DM Sans · Youthful energy',
        nunito: 'Nunito Sans · Warm buddy',
      };

      root.querySelectorAll('[data-font-choice]').forEach((button) => {
        button.addEventListener('click', () => {
          root.querySelectorAll('[data-font-choice]').forEach((candidate) => {
            candidate.setAttribute('aria-pressed', String(candidate === button));
          });
          selectedLabel.textContent = labels[button.dataset.fontChoice];
        });
      });
    })();
  </script>
</div>
```

- [ ] **Step 2: Run the contract test**

Run:

```bash
node /tmp/hanbuddy-font-comparison.test.mjs
```

Expected: exit code `0` with no assertion output.

---

### Task 3: Render and validate the comparison

**Files:**
- Read: `/Users/minbros/.codex/visualizations/2026/07/23/019f8ce4-5f16-7023-91ee-81b4975e22ae/hanbuddy-font-comparison.html`
- Create temporary rendered document: `/tmp/hanbuddy-font-comparison-rendered.html`

**Interfaces:**
- Consumes: completed fragment from Task 2
- Produces: browser evidence for font loading, responsive layout, and selection behavior

- [ ] **Step 1: Render the fragment**

Run:

```bash
python3 /Users/minbros/.codex/plugins/cache/openai-bundled/visualize/1.0.14/scripts/render.py \
  /Users/minbros/.codex/visualizations/2026/07/23/019f8ce4-5f16-7023-91ee-81b4975e22ae/hanbuddy-font-comparison.html \
  /tmp/hanbuddy-font-comparison-rendered.html
```

Expected: exit code `0` and a rendered standalone HTML document in `/tmp`.

- [ ] **Step 2: Validate the rendered comparison in the in-app Browser**

Open the rendered document through a temporary local HTTP server. At approximately 736px and 320px, verify:

```text
five candidate cards visible
document.fonts.check(...) is true for all seven requested font families
document.documentElement.scrollWidth <= document.documentElement.clientWidth
no relevant console errors
```

Click the unique `DM Sans` candidate CTA after resolving its card, then verify:

```text
#hanbuddy-font-selected text = "DM Sans · Calm and approachable"
DM Sans CTA aria-pressed = "true"
all other candidate CTAs aria-pressed = "false"
```

- [ ] **Step 3: Verify the production worktree remains unchanged**

Run:

```bash
git status -sb
git diff -- index.html DESIGN.md
```

Expected: no production-file diff; only this implementation plan commit may differ from the prior worktree state.
