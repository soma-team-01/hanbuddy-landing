# HanBuddy Landing Design System

This is the source of truth for the HanBuddy MVP Figma-derived landing redesign. The active direction is product-led and app-system aligned. The previous Mastercard-inspired, orbital/orange poster direction is retired history and must not be used for new implementation decisions.

## 1. Atmosphere

HanBuddy should feel like a quiet local experience OS: human enough to trust before meeting a local buddy, structured enough to feel product-ready, and calm enough to avoid looking like a one-off promo poster. The signature is app-like local context: thin bordered surfaces, compact activity modules, role-aware chips, and public Run 1 proof supporting recruitment for international participants and Korean/local buddies.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page canvas | `canvas` | `#fbf9f4` | Default page background and first visual read |
| Soft canvas | `canvas-soft` | `#fbf9f7` | Alternate section background and nav surface |
| Text primary | `ink` | `#182820` | Headlines, body, primary CTA fill |
| Text strong / CTA hover | `sage` | `#2d3e35` | Hover states, active tabs, app chrome |
| Text secondary | `muted` | `#434844` | Paragraphs, captions, helper copy |
| Border strong | `line-strong` | `#c3c8c3` | App preview outlines, focused chips, structural dividers |
| Border soft | `line-soft` | `#e4e2dd` | Cards, gallery frames, quiet separators |
| Panel muted | `panel` | `#f0eee9` | Product/activity cards and grouped modules |
| Panel raised | `panel-raised` | `#f5f3ee` | Elevated app preview pieces and final CTA surface |
| Warm accent | `clay` | `#735a3e` | Restrained emphasis, small labels, Run 1 evidence tags |
| Success support | `mint` | `#cee9da` | Optional positive status chip, used only for confirmed/ready states |

### Rules

- Use `canvas` or `canvas-soft` as the page base; do not introduce pure white as the dominant surface.
- `ink` and `sage` carry interaction and authority. `clay` is a small supporting accent, not a decorative theme.
- Borders do most of the separation. Prefer `line-soft`; use `line-strong` only for app preview structure or clear active states.
- `mint` is optional and should appear only when a product status needs a positive semantic state.
- Do not add decorative colors, gradients, glows, or campaign accents unless they are first promoted into this table for a real component need.

## 3. Typography

### Font Stack

- Primary UI and body: `Manrope, "Noto Sans", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Korean fallback: `"Noto Sans KR", "Noto Sans", system-ui, sans-serif`
- Restrained display serif, optional only for a single editorial welcome/proof moment: `"Liberation Serif", Georgia, ui-serif, serif`

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

- Typography should feel like an MVP product surface, not an event poster. Keep headings confident but compact.
- Manrope carries the app-like geometry; Noto Sans and Noto Sans KR keep bilingual copy stable.
- The serif is optional and should not become the main brand voice unless the implementation explicitly needs one human editorial accent.
- Body text never goes below `14px`. Letter spacing stays `0`.
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
| `space-4` | `32px` | Group spacing, app preview lanes |
| `space-6` | `48px` | Compact section vertical rhythm |
| `space-8` | `64px` | Standard section vertical rhythm |
| `space-10` | `80px` | Hero and final CTA vertical rhythm |

### Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | Chips, small buttons, thumbnail corners |
| `radius-md` | `12px` | Cards, tabs, app preview modules, CTA buttons |
| `radius-shell` | `24px` to `32px` | Device/app shells only, when the UI preview needs a contained screen shape |

### Layout

- Max content width: `1200px` for main sections; `1040px` for dense explanatory copy.
- Use CSS grid for section structure and app-preview compositions. Avoid symmetrical three-card rows when a workflow or role split is clearer.
- First viewport should introduce the product and recruitment path, then show proof. Run 1 imagery supports the product story rather than dominating it.
- Every fixed-format UI element, card, tab row, and preview shell needs stable dimensions or responsive constraints so labels and bilingual copy do not resize the layout unexpectedly.

## 5. Components

### Navigation

- Structure: compact top bar with brand, section anchors, language control, and a clear recruitment CTA. Until the real Google Form URL exists, the CTA may point to an in-page "Google Form coming soon" state with KakaoTalk as temporary contact/fallback.
- Surface: `canvas-soft` with `line-soft`; avoid floating glass or heavy shadow.
- States: active/hover text shifts to `sage`; focus uses a visible `line-strong` outline.

### CTA

- Primary CTA: `ink` fill, `canvas-soft` text, `12px` radius, no glow.
- Secondary CTA or guide link: transparent or `panel` surface with `line-soft`.
- All external CTA anchors keep `target="_blank"` and `rel="noopener"`.

### Product and Activity Cards

- Use `panel` or `panel-raised`, `12px` radius, `line-soft` border, and app-like metadata rows.
- Cards should describe real MVP concepts: activity discovery, activity detail, application status, buddy preparation, and manual operations.
- Do not create decorative cards that only repeat marketing adjectives.

### Role Chips and Tabs

- Roles: Tourist, Buddy, Operations/Admin.
- Chips use `8px` or `12px` radius, tight 8px/12px padding, and clear selected states.
- They should explain permission and flow differences without pretending that the static landing implements those flows.

### App Preview Modules

- Use HTML/CSS UI previews, not Figma temporary images.
- Modules may show activity cards, application status, AI context notes, payment confirmation, or buddy checklists.
- Device shells may use `radius-shell`; inner modules return to `8px` or `12px`.

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
- Final CTA repeats the recruitment action for the next activity planned for July 18 or July 19, says the Google Form link is forthcoming when no real URL exists, keeps KakaoTalk as temporary contact/fallback, and avoids implying in-page data collection.

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
| Border soft | `1px solid #e4e2dd` | Default cards, section dividers, gallery frames |
| Border strong | `1px solid #c3c8c3` | Focus, active tabs, app shell structure |
| Shadow subtle | `0 1px 2px rgba(24, 40, 32, 0.05)` | Cards at rest, small modules |
| Shadow raised | `0 8px 24px rgba(24, 40, 32, 0.08)` | Device/app shell or final CTA surface only |

### Rules

- No loud glow, no decorative campaign composition, no heavy colored shadows.
- Do not stack cards inside cards unless the inner element is clearly an app preview module.
- Use tonal shifts between `canvas`, `canvas-soft`, `panel`, and `panel-raised` before adding shadows.
- Any new elevation level must be tied to a named component in Section 5 before it is used.
