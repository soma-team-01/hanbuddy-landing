# HanBuddy Landing Design System

This is the source of truth for the HanBuddy landing. The active direction mirrors the live MVP frontend (hanbuddy-frontend.vercel.app): photography-led, centered hero, pill CTAs, and the MVP's own token set. The previous app-preview/mockup direction and the Mastercard-inspired orbital/orange poster direction are retired history and must not be used for new implementation decisions.

## 1. Atmosphere

HanBuddy should feel like the marketing surface of the same product the MVP app is: warm, photographic, and quiet. Real Run 1 photography is the primary material — text modules support the photos, not the other way around. Chrome stays minimal (few borders, few boxes); recruitment proof (completed Run 1, approved testimonial) carries the persuasion for international participants and Korean/local buddies.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page canvas | `canvas` | `#fbf9f4` | Default page background and first visual read (MVP `cream`) |
| Soft canvas | `canvas-soft` | `#fbf9f7` | Nav surface, text on dark bands |
| Text primary | `ink` | `#182820` | Headlines, body, primary CTA fill (MVP `forest`) |
| Text strong / CTA hover | `sage` | `#2d3e35` | Hover states, dark-band chrome (MVP `forest-soft`) |
| Muted sage | `sage-mist` | `#96a99d` | Eyebrows and labels on dark bands only (MVP `sage`) |
| Text secondary | `muted` | `#434844` | Paragraphs, captions, helper copy (MVP `ink-soft`) |
| Border strong | `line-strong` | `#c3c8c3` | List head rules, pill link borders, active states |
| Border soft | `line-soft` | `#e4e2dd` | Hairline dividers, quiet separators |
| Panel muted | `panel` | `#f0eee9` | Role/team cards and grouped modules (MVP `sand`) |
| Panel raised | `panel-raised` | `#f5f3ee` | Status chips, language toggle (MVP `chip`) |
| Warm accent | `earth` | `#8a6c33` | Eyebrows, uppercase labels, evidence tags (MVP `earth`) |
| Success | `success` | `#3f6b46` | Text inside completed-status chips (MVP `success`) |
| Success surface | `success-soft` | `#dcead9` | Completed-status chip fill (MVP `success-soft`) |

### Rules

- Token values are copied from the MVP frontend's CSS variables. If the MVP palette changes, update this table from the app, never invent new values locally.
- Use `canvas` or `canvas-soft` as the page base; do not introduce pure white as the dominant surface.
- `ink` and `sage` carry interaction and authority. `earth` is a small supporting accent for uppercase labels, not a decorative theme.
- `success`/`success-soft` appear only for genuinely completed states (e.g. "Run 1 completed"). `sage-mist` appears only on the dark `ink` bands.
- Hairline dividers do most of the separation; boxed cards are the exception, not the default.
- Do not add decorative colors, gradients, glows, or campaign accents unless they are first promoted into this table for a real component need. The only permitted gradient is the photo-card scrim (transparent to `ink` at 72%).

## 3. Typography

### Font Stack

- Body and UI (`font-sans`): `"Be Vietnam Pro", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Display and headings (`font-display`): `Manrope, "Noto Sans KR", system-ui, sans-serif`
- No serif. The pairing matches the MVP frontend (Manrope display over Be Vietnam Pro body).

### Scale

| Level | Size | Weight | Line height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `48px` to `72px` | 700 | 1.05 | 0 | Hero headline |
| H1 | `40px` to `56px` | 700 | 1.10 | 0 | Major section title |
| H2 | `28px` to `36px` | 650 | 1.18 | 0 | Product workflow and role headings |
| H3 | `20px` to `24px` | 650 | 1.25 | 0 | Card titles, app module titles |
| Body large | `18px` | 400 to 500 | 1.65 | 0 | Hero lead and section lead |
| Body | `16px` | 400 to 500 | 1.65 | 0 | Default readable copy |
| Body small | `14px` | 400 to 600 | 1.55 | 0 | Captions, metadata, helper text |
| Label | `12px` | 650 to 700 | 1.35 | 0 | Chips, tabs, nav labels, compact statuses |

### Rules

- Typography should feel like the same product as the MVP app. Keep headings confident but compact.
- Manrope (with `tracking-tight`) carries display geometry; Be Vietnam Pro and Noto Sans KR keep bilingual body copy stable.
- Eyebrows and small labels are the one tracked element: uppercase, `0.16em`–`0.18em` letter spacing, `earth` (or `sage-mist` on dark bands). Everything else stays at `0` tracking; display headings may go negative (`-0.025em`).
- Body text never goes below `14px`.
- Keep paragraph measures comfortable, usually 58 to 70 characters.

## 4. Spacing

### Rhythm

Use an 8px-first rhythm because the MVP Figma surfaces use compact app spacing. Smaller 4px steps are allowed only for icon/text optical alignment and tight internal offsets.

| Token | Value | Usage |
| --- | --- | --- |
| `space-0-5` | `4px` | Optical adjustment, icon gap, fine border offset |
| `space-1` | `8px` | Base gap, chip padding, compact stacks |
| `space-1-5` | `12px` | Card inner gaps, tab padding, small module padding |
| `space-2` | `16px` | Default component padding, grid gaps on mobile |
| `space-3` | `24px` | Card padding, section intro spacing |
| `space-4` | `32px` | Group spacing between related modules |
| `space-6` | `48px` | Compact section vertical rhythm |
| `space-8` | `64px` | Standard section vertical rhythm |
| `space-10` | `80px` | Hero and final CTA vertical rhythm |

### Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | Chips, small buttons, thumbnail corners |
| `radius-md` | `16px` | Photo cards, panel cards (`rounded-2xl`) |
| `radius-pill` | `9999px` | All buttons, status chips, language toggle |

### Layout

- Max content width: `1280px` (`max-w-7xl`) for main sections; the hero copy block narrows to `max-w-4xl`, centered.
- The hero is centered: eyebrow, display headline, lead, pill CTA row, status chips, then a three-across Run 1 photo-card row. Run 1 photography IS the first visual read.
- Avoid repeating the same boxed three-card grid across sections. Vary the device per section: editorial hairline lists (problem, policy), ruled step columns (workflow), two large cards plus a full-width note (roles), quiet dark-band cards (AI).
- Every fixed-format UI element and card needs stable dimensions or responsive constraints so bilingual copy does not resize the layout unexpectedly.

## 5. Components

### Navigation

- Structure: compact top bar with a text-only "HanBuddy" brand (no logo mark), section anchors, language control, and a clear recruitment CTA linking to the live Google Form.
- Surface: `canvas-soft` with `line-soft`; avoid floating glass or heavy shadow.
- States: active/hover text shifts to `sage`; focus uses a visible `line-strong` outline.

### CTA

- All buttons are pills (`rounded-full`), matching the MVP app.
- Primary CTA: `ink` fill, `canvas-soft` text, no glow.
- Secondary CTA: plain text link with a trailing arrow (`→`), `ink` text shifting to `sage` on hover; on dark bands, `canvas-soft` fill or thin `line-strong` border.
- All external CTA anchors keep `target="_blank"` and `rel="noopener"`.

### Photo Cards (signature)

- The signature element: real Run 1 photos in `rounded-2xl` frames with a bottom scrim (transparent → `ink` at 72%) and overlaid copy — a small uppercase tracked label over a bold Manrope title, both in `canvas-soft`.
- Hero uses a three-across row (`aspect-[4/5]` on desktop, `16/10` on mobile); evidence uses a single editorial figure with the caption below the image, not on it.
- Only approved public WebP photos may appear. Captions state completed-operation facts.
- Hover: image scales to at most 1.02 inside the fixed frame; the frame itself does not move.

### Editorial Lists and Step Columns

- Problem/policy content renders as hairline-divided rows or columns: uppercase `earth` label, bold title, muted body. No boxes, no shadows.
- Workflow steps are columns opened by a `2px` `ink` top rule with an uppercase step tag (Before/During/After) — the rule communicates sequence without fake numbering.
- Role cards: Guest and Buddy get large `panel` cards; Operations is a full-width bordered note row, visually subordinate.

### Run 1 Evidence

- Public Run 1 proof should mention only completed-operation facts, approved photos, and the approved testimonial quote.
- Use the completed 2026-06-25 Jamsil KBO operation as factual proof that HanBuddy has hosted a real local baseball-culture experience with local Koreans.
- Use this exact English quote when showing the participant testimonial publicly: "If you are looking to experience Korean baseball culture with local Koreans, then this is the program you want to join!"
- Use this fixed Korean translation when the same testimonial appears in Korean: "한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면, HanBuddy가 바로 당신이 참여하고 싶은 프로그램입니다!"
- Maintainer-only guardrail: do not expose F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, learning signal, PMF caveats, payment sensitivity, or improvement criticism in public marketing copy.
- Public WebP photos are proof assets; do not use raw JPGs, private chats, names, phone numbers, or unapproved direct quotes.

### Gallery

- Gallery is supporting context, not the main product explanation.
- Use thin borders, stable aspect ratios, and plain captions that say what the image proves: real participants, a completed Korean baseball-culture activity, and a local buddy atmosphere.

### Team and Final CTA

- Team section should establish ZeroOne credibility and current MVP direction without turning into a founder poster.
- Final CTA repeats the recruitment action for the next activity planned for July 18 or July 19, links to the live Google Form as the primary action, keeps KakaoTalk open chat for questions/updates, and avoids implying in-page data collection.

## 6. Motion

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | `120ms` to `160ms` | `ease-out` | Button press, chip hover, focus reveal |
| Standard | `180ms` to `240ms` | `ease-in-out` | Tab switch, card hover, nav state |
| Emphasis | `320ms` to `420ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | First-load product preview entry only |

### Rules

- Motion is low and purposeful. It should clarify state, not entertain.
- Animate only `transform`, `opacity`, `filter`, border color, and shadow strength.
- Respect `prefers-reduced-motion`; disable non-essential entry motion and keep state changes instant but visible.
- Hover can lift by at most 1 to 2px. No loud parallax, no orbit drawing, no glow pulses.
- Every interactive element needs hover, active, focus-visible, and disabled/loading treatment where the state exists.

## 7. Depth

### Strategy

Use thin borders plus low shadows. Depth should read like a trustworthy product interface, not a campaign composition.

| Level | Value | Usage |
| --- | --- | --- |
| Border soft | `1px solid #e4e2dd` | Hairline dividers, quiet separators |
| Border strong | `1px solid #c3c8c3` | Focus outlines, list head rules, pill link borders |
| Shadow subtle | `0 1px 2px rgba(24, 40, 32, 0.05)` | Rarely; only when a floating surface truly needs it |
| Photo scrim | `linear-gradient(transparent 45%, rgba(24,40,32,0.72))` | Photo-card caption legibility only |

### Rules

- No loud glow, no decorative campaign composition, no heavy colored shadows.
- Do not stack cards inside cards.
- Use tonal shifts between `canvas`, `canvas-soft`, `panel`, and `panel-raised` before adding borders, and borders before shadows.
- Any new elevation level must be tied to a named component in Section 5 before it is used.
