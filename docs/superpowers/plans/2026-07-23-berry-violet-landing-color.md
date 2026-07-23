# Berry Violet Landing Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's cream/forest visual system with a near-white canvas and Berry Violet primary while preserving the existing content, behavior, logo, photography, and static architecture.

**Architecture:** Keep the buildless single-file implementation. Define the approved semantic color roles once in the inline Tailwind configuration and mirror them in CSS custom properties used by hand-written utilities; map every interactive and emphasized component to those roles. Add a Node contract test so the public HTML and `DESIGN.md` cannot silently drift back to the retired palette.

**Tech Stack:** Static HTML, Tailwind CDN inline configuration, vanilla CSS and JavaScript, Node.js built-in test runner.

## Global Constraints

- Page canvas is `#fcfcfd`; clean surface is `#ffffff`.
- Primary is `#b13f8f`; hover is `#943476`; strong is `#79285f`; soft is `#fceff7`.
- Primary text is `#201a20`; secondary text is `#625a61`.
- Strong border is `#cfc6cc`; soft border is `#e9e3e7`.
- Neutral panel is `#f7f5f7`; raised panel is `#fbf8fa`; on-primary is `#ffffff`.
- Berry Violet is the only interactive brand color.
- Keep the existing logo gradient; add no CSS gradient to buttons, text, panels, or section backgrounds.
- Preserve all copy, URLs, photography, language behavior, analytics behavior, and the buildless static architecture.
- Do not modify any logo or photography asset.
- Public deployment remains limited to `index.html` and allowlisted WebP assets.

## File Structure

- Modify `index.html`: authoritative runtime color tokens, component classes, focus treatments, and dynamic class names.
- Create `tests/color-palette.test.js`: executable contract for the approved runtime palette and component-role mapping.
- Modify `DESIGN.md`: human-readable design-system source of truth matching the implemented palette.

---

### Task 1: Apply the Berry Violet Runtime Palette

**Files:**
- Create: `tests/color-palette.test.js`
- Modify: `index.html:33-55`
- Modify: `index.html:65-131`
- Modify: `index.html:156-357`
- Modify: `index.html:658-725`

**Interfaces:**
- Consumes: Approved values from `docs/superpowers/specs/2026-07-23-berry-violet-landing-color-design.md`.
- Produces: Tailwind tokens `primary`, `primary-hover`, `primary-strong`, `primary-soft`, and `on-primary`; matching CSS custom properties `--color-*`; component classes using those semantic roles.

- [ ] **Step 1: Write the failing runtime palette contract**

Create `tests/color-palette.test.js` with:

```js
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

const approvedTokens = [
  ['canvas', '#fcfcfd'],
  ['canvas-soft', '#ffffff'],
  ['primary', '#b13f8f'],
  ['primary-hover', '#943476'],
  ['primary-strong', '#79285f'],
  ['primary-soft', '#fceff7'],
  ['ink', '#201a20'],
  ['muted', '#625a61'],
  ['line-strong', '#cfc6cc'],
  ['line-soft', '#e9e3e7'],
  ['panel', '#f7f5f7'],
  ['panel-raised', '#fbf8fa'],
  ['on-primary', '#ffffff'],
];

const retiredHexValues = [
  '#fbf9f4',
  '#fbf9f7',
  '#182820',
  '#2d3e35',
  '#96a99d',
  '#434844',
  '#c3c8c3',
  '#e4e2dd',
  '#f0eee9',
  '#f5f3ee',
  '#8a6c33',
];

test('defines the approved Berry Violet tokens in Tailwind and CSS', () => {
  for (const [token, value] of approvedTokens) {
    const tailwindToken = new RegExp(
      `['"]?${token}['"]?\\s*:\\s*['"]${value}['"]`,
      'i',
    );
    const cssVariable = new RegExp(
      `--color-${token}:\\s*${value}`,
      'i',
    );

    assert.match(html, tailwindToken, `missing Tailwind token ${token}`);
    assert.match(html, cssVariable, `missing CSS variable ${token}`);
  }
});

test('removes the retired cream, forest, sage, and earth palette', () => {
  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      html,
      new RegExp(value, 'i'),
      `retired color ${value} must not remain in index.html`,
    );
  }

  assert.doesNotMatch(html, /\b(?:sage|sage-mist|earth)\b/i);
});

test('maps interactive and emphasized components to semantic primary roles', () => {
  assert.match(html, /bg-primary[^"]*hover:bg-primary-hover/);
  assert.match(
    html,
    /<section id="apply" class="bg-primary-strong text-on-primary">/,
  );
  assert.match(html, /bg-primary-soft/);
  assert.match(html, /text-primary(?:-strong)?/);
  assert.match(html, /classList\.toggle\('bg-primary', selected\)/);
  assert.match(html, /classList\.toggle\('text-on-primary', selected\)/);
  assert.match(html, /color:\s*var\(--color-primary\)/);
});

test('keeps the logo as the only decorative gradient source', () => {
  assert.match(html, /assets\/logo\.webp/);
  assert.doesNotMatch(html, /linear-gradient\s*\(/i);
});
```

- [ ] **Step 2: Run the contract and verify that the current palette fails**

Run:

```bash
node --test tests/color-palette.test.js
```

Expected: FAIL in all runtime-palette assertions because `index.html` still
contains the retired cream/forest tokens and does not define `primary`.

- [ ] **Step 3: Replace the inline Tailwind palette and shadow colors**

Replace the `colors` and `boxShadow` entries in `index.html` with:

```js
colors: {
  canvas: '#fcfcfd',
  'canvas-soft': '#ffffff',
  primary: '#b13f8f',
  'primary-hover': '#943476',
  'primary-strong': '#79285f',
  'primary-soft': '#fceff7',
  ink: '#201a20',
  muted: '#625a61',
  'line-strong': '#cfc6cc',
  'line-soft': '#e9e3e7',
  panel: '#f7f5f7',
  'panel-raised': '#fbf8fa',
  'on-primary': '#ffffff',
  success: '#3f6b46',
  'success-soft': '#dcead9',
},
boxShadow: {
  subtle: '0 1px 2px rgba(32, 26, 32, 0.05)',
  raised: '0 8px 24px rgba(32, 26, 32, 0.08)',
},
```

- [ ] **Step 4: Mirror all approved roles in CSS custom properties**

Replace the current `:root` block with:

```css
:root {
  color-scheme: light;
  --color-canvas: #fcfcfd;
  --color-canvas-soft: #ffffff;
  --color-primary: #b13f8f;
  --color-primary-hover: #943476;
  --color-primary-strong: #79285f;
  --color-primary-soft: #fceff7;
  --color-ink: #201a20;
  --color-muted: #625a61;
  --color-line-strong: #cfc6cc;
  --color-line-soft: #e9e3e7;
  --color-panel: #f7f5f7;
  --color-panel-raised: #fbf8fa;
  --color-on-primary: #ffffff;
}
```

Update the hand-written utilities to:

```css
.skip-link {
  /* Keep the existing positioning, spacing, radius, weight, and transition. */
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.skip-link:focus {
  top: 1rem;
  outline: 3px solid var(--color-primary-strong);
  outline-offset: 4px;
}

.focusable:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 4px;
}

.focusable-on-primary:focus-visible {
  outline-color: var(--color-on-primary);
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.eyebrow-on-primary {
  color: rgba(255, 255, 255, 0.84);
}

.photo-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--color-panel);
}
```

- [ ] **Step 5: Remap static component classes to semantic roles**

Apply these exact class-role changes in `index.html`:

| Component | Required classes |
| --- | --- |
| Navigation CTA | `bg-primary text-on-primary hover:bg-primary-hover` |
| Hero primary CTA | `bg-primary text-on-primary hover:bg-primary-hover` |
| Hero secondary CTA | `text-primary hover:text-primary-hover` |
| Testimonial figure | `bg-primary-soft` |
| Testimonial attribution | `text-primary-strong` |
| Final application section | `bg-primary-strong text-on-primary` |
| Final application eyebrow | `eyebrow eyebrow-on-primary` with no inline color style |
| Final body and buddy note | `text-on-primary/85` |
| Final privacy note | `text-on-primary/70` |
| Final form button | `focusable focusable-on-primary bg-on-primary text-primary-strong hover:bg-primary-soft` |
| Final contact button | `focusable focusable-on-primary border-on-primary/40 text-on-primary hover:bg-primary-hover` |
| Footer link hover and decoration | `hover:text-primary` and `decoration-primary/25` |
| Consent reject hover | `hover:bg-primary-soft` |
| Consent accept | `bg-primary text-on-primary hover:bg-primary-hover` |

Retain the existing layout, spacing, responsive, accessibility, and behavior
classes around these replacements.

- [ ] **Step 6: Remap dynamic component and language-state classes**

Change the dynamic strings to the following:

```js
anchor.className = 'focusable rounded-lg transition hover:text-primary';

textNode('p', 'mt-1 text-sm font-semibold text-primary', item.schedule);

const badge = textNode(
  'p',
  'mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-on-primary',
  item.step,
);
```

Change the selected-language state to:

```js
button.classList.toggle('bg-primary', selected);
button.classList.toggle('text-on-primary', selected);
button.classList.toggle('text-muted', !selected);
```

- [ ] **Step 7: Run the focused and regression tests**

Run:

```bash
node --test tests/color-palette.test.js
node --test tests/*.test.js
git diff --check
```

Expected:

- `tests/color-palette.test.js`: 4 tests pass.
- Full suite: 8 tests pass, 0 fail.
- `git diff --check`: no output.

- [ ] **Step 8: Commit the runtime palette**

```bash
git add index.html tests/color-palette.test.js
git commit -m "feat: apply Berry Violet landing palette"
```

---

### Task 2: Align the Design System and Visually Verify the Page

**Files:**
- Modify: `tests/color-palette.test.js`
- Modify: `DESIGN.md:1-35`
- Verify: `index.html`
- Evidence only, do not commit: `.omo/evidence/berry-violet-desktop.png`
- Evidence only, do not commit: `.omo/evidence/berry-violet-mobile.png`

**Interfaces:**
- Consumes: Runtime semantic tokens produced by Task 1.
- Produces: A documented palette contract in `DESIGN.md` and desktop/mobile visual evidence showing the approved page state.

- [ ] **Step 1: Extend the contract test to cover `DESIGN.md`**

Add this declaration below the existing `html` declaration in
`tests/color-palette.test.js`:

```js
const design = readFileSync(join(__dirname, '..', 'DESIGN.md'), 'utf8');
```

Add this test:

```js
test('keeps DESIGN.md synchronized with the approved runtime palette', () => {
  for (const [token, value] of approvedTokens) {
    assert.match(
      design,
      new RegExp(`\\| \`${token}\` \\| \`${value}\` \\|`, 'i'),
      `DESIGN.md is missing ${token} ${value}`,
    );
  }

  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      design,
      new RegExp(value, 'i'),
      `DESIGN.md still documents retired color ${value}`,
    );
  }

  assert.match(
    design,
    /Berry Violet is the only interactive brand color/i,
  );
  assert.match(
    design,
    /existing logo gradient remains the only multi-color brand treatment/i,
  );
});
```

- [ ] **Step 2: Run the documentation contract and verify that it fails**

Run:

```bash
node --test tests/color-palette.test.js
```

Expected: 4 runtime tests pass and the new `DESIGN.md` synchronization test
fails because the document still describes cream, forest, sage, and earth.

- [ ] **Step 3: Replace the palette table in `DESIGN.md`**

Use this table:

```markdown
| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page canvas | `canvas` | `#fcfcfd` | Default near-white page background |
| Clean surface | `canvas-soft` | `#ffffff` | Sticky header and high-clarity surfaces |
| Primary | `primary` | `#b13f8f` | CTA, active state, branded link, eyebrow |
| Primary hover | `primary-hover` | `#943476` | Hover and pressed emphasis |
| Primary strong | `primary-strong` | `#79285f` | Final CTA band and high-contrast primary text |
| Primary soft | `primary-soft` | `#fceff7` | Testimonial, selection, and quiet branded surface |
| Text primary | `ink` | `#201a20` | Headlines and long-form body text |
| Text secondary | `muted` | `#625a61` | Supporting copy and metadata |
| Border strong | `line-strong` | `#cfc6cc` | Focus-adjacent and selected boundaries |
| Border soft | `line-soft` | `#e9e3e7` | Hairline dividers and quiet outlines |
| Panel | `panel` | `#f7f5f7` | Neutral cards and grouped content |
| Panel raised | `panel-raised` | `#fbf8fa` | Language toggle and subtle raised surfaces |
| On-primary | `on-primary` | `#ffffff` | Text and icons on solid primary surfaces |
```

Preserve the semantic success tokens directly below the table:

```markdown
Semantic success colors remain reserved for genuinely completed states:
`success` is `#3f6b46` and `success-soft` is `#dcead9`.
```

- [ ] **Step 4: Replace the color rules in `DESIGN.md`**

Use these rules:

```markdown
- Berry Violet is the only interactive brand color. CTA fills, branded links,
  active states, focus rings, and short section labels use `primary`.
- Headings and long-form text remain neutral `ink`; supporting copy uses
  `muted`.
- `primary-soft` is a quiet branded surface, not a second accent.
- The final application section is the single large color field and uses
  `primary-strong` with `on-primary` text.
- The existing logo gradient remains the only multi-color brand treatment.
  Do not add CSS gradients to buttons, text, panels, or section backgrounds.
- The photo-card scrim remains allowed because it is a functional image
  legibility treatment rather than a decorative brand gradient.
- Semantic success colors appear only for genuinely completed states.
```

Update later component references in `DESIGN.md`:

- Replace `earth` eyebrow references with `primary`.
- Replace `ink` CTA fill references with `primary`.
- Replace `sage` hover references with `primary-hover`.
- Replace dark-band `sage-mist` references with reduced-opacity `on-primary`.
- Replace cream/sand palette descriptions with near-white and neutral-panel
  descriptions.
- Remove the obsolete “text-only HanBuddy brand (no logo mark)” navigation rule
  and document the existing logo mark plus wordmark.

- [ ] **Step 5: Run the full automated verification**

Run:

```bash
node --test tests/*.test.js
git diff --check
rg -n "#fbf9f4|#fbf9f7|#182820|#2d3e35|#96a99d|#434844|#c3c8c3|#e4e2dd|#f0eee9|#f5f3ee|#8a6c33|\\bsage\\b|\\bearth\\b" index.html DESIGN.md
```

Expected:

- Full suite: 9 tests pass, 0 fail.
- `git diff --check`: no output.
- `rg`: no matches.

- [ ] **Step 6: Preview and capture desktop and mobile evidence**

Start the existing local preview:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` and capture:

- Desktop at `1440 × 900` to `.omo/evidence/berry-violet-desktop.png`.
- Mobile at `390 × 844` to `.omo/evidence/berry-violet-mobile.png`.

Verify on both widths:

- The canvas reads as near-white rather than cream.
- Navigation, hero CTA, consent accept button, language selection, and dynamic
  step badges use Berry Violet.
- The testimonial uses the soft Berry Violet surface.
- The final CTA is the only large Berry Violet field.
- The existing logo gradient remains unchanged.
- No blue, coral, forest, sage, or earth UI accent competes with Berry Violet.
- Focus rings remain clearly visible on both white and `primary-strong`
  surfaces.
- English and Korean modes do not introduce overflow.

- [ ] **Step 7: Confirm only intended public files changed**

Run:

```bash
git status --short
git diff --stat
git diff -- index.html DESIGN.md tests/color-palette.test.js
```

Expected: only `index.html`, `DESIGN.md`, and `tests/color-palette.test.js` are
uncommitted. `.omo/evidence/` remains ignored and no asset file is modified.

- [ ] **Step 8: Commit the synchronized design system**

```bash
git add DESIGN.md tests/color-palette.test.js
git commit -m "docs: align landing design system with Berry Violet"
```
