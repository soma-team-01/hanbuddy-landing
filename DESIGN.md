# HanBuddy Landing Design System

This is the source of truth for the HanBuddy landing. The active direction is photography-led, centered, and quiet, with pill CTAs and a warm HanBuddy-red brand system. Previous alternate palettes, the app-preview mockup, and the Mastercard-inspired orbital/orange poster direction are retired history and must not be used for new implementation decisions.

## 1. Atmosphere

HanBuddy should feel like the marketing surface of the same product the MVP app is: warm, photographic, and quiet. Real photography from completed runs is the primary material — text modules support the photos, not the other way around. Chrome stays minimal (few borders, few boxes); recruitment proof (completed runs, approved guest quotes) carries the persuasion. The page speaks to one primary reader — the international guest deciding whether to apply — and every section is written in guest-benefit voice; buddy recruitment is a single quiet note in the final CTA.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page canvas | `canvas` | `#fffaf7` | Default warm near-white page background |
| Clean surface | `canvas-soft` | `#ffffff` | Sticky header and high-clarity surfaces |
| Primary | `primary` | `#d13f32` | Friendly warm-red CTA and selected-state fill |
| Primary hover | `primary-hover` | `#b9342b` | CTA hover and pressed fill |
| Primary strong | `primary-strong` | `#8f2f28` | Accessible branded text, focus, and final CTA band |
| Primary soft | `primary-soft` | `#fff0ec` | Testimonial, selection, and quiet branded surface |
| Text primary | `ink` | `#261b18` | Headlines and long-form body text |
| Text secondary | `muted` | `#675b56` | Supporting copy and metadata |
| Border strong | `line-strong` | `#d6c5bf` | Focus-adjacent and selected boundaries |
| Border soft | `line-soft` | `#eee2dd` | Hairline dividers and quiet outlines |
| Panel | `panel` | `#f8f3f0` | Neutral cards and grouped content |
| Panel raised | `panel-raised` | `#fcf8f6` | Language toggle and subtle raised surfaces |
| On-primary | `on-primary` | `#ffffff` | Text and icons on the warm-red fill |
| On-primary strong | `on-primary-strong` | `#ffffff` | Text and icons on `primary-strong` surfaces |

Semantic success colors remain reserved for genuinely completed states:
`success` is `#3f6b46` and `success-soft` is `#dcead9`.

### Rules

- HanBuddy red is the only interactive brand color. CTA fills and active surfaces use `primary`; branded text and focus rings use the accessible same-hue `primary-strong`.
- Headings and long-form text remain neutral `ink`; supporting copy uses `muted`.
- `primary-soft` is a quiet branded surface, not a second accent.
- The final application section is the single large dark field: an `ink` band carrying the photo backdrop, with `on-primary-strong` (white) text. Red stays on the CTA button, chips, and emphasized text rather than filling the band.
- The existing logo gradient remains the only multi-color brand treatment. Do not add CSS gradients to buttons, text, panels, or section backgrounds.
- The photo-card scrim remains allowed when needed because it is a functional image-legibility treatment rather than a decorative brand gradient.
- Semantic success colors appear only for genuinely completed states.
- Hairline dividers do most of the separation; boxed cards are the exception, not the default.
- Do not add decorative colors, glows, or campaign accents unless they are first promoted into this table for a real component need.

## 3. Typography

### Font Stack

- Body and UI (`font-sans`): `"DM Sans", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Display and headings (`font-display`): `"Plus Jakarta Sans", "Noto Sans KR", system-ui, sans-serif`
- No serif. Plus Jakarta Sans gives the display layer friendly polish while DM Sans keeps body and UI copy calm and approachable.

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
- Plus Jakarta Sans (with `tracking-tight`) carries display geometry; DM Sans and Noto Sans KR keep bilingual body copy stable.
- Eyebrows and small labels are the one tracked element: uppercase, `0.16em`–`0.18em` letter spacing, `primary-strong` on light surfaces or reduced-opacity `on-primary-strong` on strong primary surfaces. Everything else stays at `0` tracking; display headings may go negative (`-0.025em`).
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
| `space-10` | `80px` | Hero vertical rhythm, final CTA on mobile |
| `space-16` | `128px` | Final CTA on desktop — the band carries the photo backdrop and needs room for it to read as a photo |

### Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | Chips, small buttons, thumbnail corners |
| `radius-md` | `16px` | Photo cards, panel cards (`rounded-2xl`) |
| `radius-pill` | `9999px` | All buttons, status chips, language toggle |

### Layout

- Max content width: `max-w-6xl` (1152px) for main sections; the hero copy block and the how-steps grid narrow to `max-w-4xl`, the review carousel to `max-w-5xl` — all centered.
- The hero is centered copy (eyebrow, display headline, lead, pill CTA row, rating chip, featured quote card) framed by the polaroid scatter — on desktop four tilted snaps pinned to the corners behind the copy, on mobile an offset two-column collage below it. Real photography IS the first visual read.
- Vary the device per section: Meetup-style event cards (`#events`), numbered step cards (`#how`), quote cards (`#reviews`), a dark `ink` band over a photo backdrop (`#apply`).
- Section background rhythm (set 2026-08-03): hero `canvas` -> `#events` `panel` -> `#how` `canvas` -> `#reviews` `panel` -> `#apply` `ink`. The two card sections share the same `panel` band on purpose; giving them different light tones made the upper page read as a stack of unrelated stripes. Two light tones alternating is the whole rhythm — do not introduce a third.
- With the tonal shift carrying the section break, `#events` needs no `border-t`; the border only existed while it sat on a near-identical tone.
- Every fixed-format UI element and card needs stable dimensions or responsive constraints so bilingual copy does not resize the layout unexpectedly.

## 5. Components

### Navigation

- Structure: compact top bar with the HanBuddy logo mark and wordmark, section anchors (About is a real `/about` link), language control, and a clear recruitment CTA (any `data-cta="apply"` anchor is rewritten to the live Google Form via `CONFIG`).
- Surface: `canvas-soft` with `line-soft`; avoid floating glass or heavy shadow.
- States: active/hover text shifts to `primary-strong`; focus uses a visible `primary-strong` outline.

### CTA

- All buttons are pills (`rounded-full`), matching the MVP app.
- Primary CTA: warm-red `primary` fill, white `on-primary` text, `primary-hover` hover, and no glow.
- Secondary CTA: plain `primary-strong` text with a trailing arrow (`→`); on the final primary band, use an `on-primary-strong` fill or thin `on-primary-strong` border.
- All external CTA anchors keep `target="_blank"` and `rel="noopener"`.

### Photography Components (signature)

- **Hero polaroids** (`.hero-polaroid`, `.hp1–4`): white-bordered tilted snaps with a tape strip and handwritten caption (Caveat / Nanum Pen Script). Desktop pins them to the hero's four corners (hover straightens and lifts); mobile stacks them as an offset two-column collage below the copy. Captions state real moments (activity, place, date) only.
- **Photo cards** (`.photo-card`): stable `rounded-2xl` frames with `object-cover` and a ≤1.03 hover zoom — used by event cards and detail-page collages. The frame itself never moves.
- Only approved public WebP photos may appear anywhere; captions and alt text state completed-operation facts.
- A scrim is allowed only as functional legibility treatment (photo backdrop, overlaid copy) — never as decoration.

### Event Cards and Steps

- Event cards (`#events`): Meetup-style compact cards on the `panel` band (same band as `#reviews`), in a 2-col mobile / 4-col desktop grid — 16/10 photo with a single bold price (or "Coming soon") badge chip on the image, uppercase date line in `primary-strong`, emoji + title, one-line tagline. The price appears once, on the badge only. Open events are whole-card links to `/events/*` detail pages; coming-soon events are buttons that fire a toast. Dates are real, published operating dates — never placeholder dates.
- How-it-works steps (`#how`): three centered `panel` cards, each opened by a filled `primary` number badge — Apply / We confirm / Have fun.
- Event detail pages (`/events/*`): title block, photo collage, then content beside a sticky booking card (desktop) or above a fixed bottom CTA bar (mobile). Only approved facts (dates, price, inclusions) appear on the booking surfaces.
- Event detail photo lightbox: collage thumbnails open a full-screen viewer with prev/next arrows, arrow-key and Escape support. It is a modal dialog, so it must always move focus to the close button on open, keep Tab cycling inside the dialog while open, and return focus to the thumbnail that opened it — a keyboard user tabbing out to the page behind the overlay is a defect, not a style choice.

### Completed-run Evidence

- Public proof mentions only completed-operation facts, approved photos, and the approved guest quotes (the verbatim list lives in `AGENTS.md` CONVENTIONS — currently 5 quotes; nothing else may be quoted).
- Completed runs usable as proof: only the two completed Jamsil KBO runs, 2026-06-25 and 2026-07-26. Han River, K League, and jjimjilbang photos may be used only for upcoming/coming-up items or with neutral place-describing captions — never as completed-operation proof.
- Maintainer-only guardrail: do not expose F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, learning signal, PMF caveats, payment sensitivity, or improvement criticism in public marketing copy.
- Public WebP photos are proof assets; do not use raw JPGs, private chats, names, phone numbers, or unapproved direct quotes.

### Guest Reviews (`#reviews`)

`#reviews` is the social-proof hub: a quiet `panel` band that lets the quotes carry the section. The photo backdrop it used to sit on moved to the final CTA (2026-08-03) so the page has one photo-backed band, not two competing ones.

**Content layer**

- Centered header on the light band: eyebrow in `primary-strong`, `ink` title, `muted` lead, and one `primary-soft` pill chip carrying the aggregate star rating (same chip treatment as the hero).
- Below it, a horizontal carousel of approved survey quotes (5 cards as of 2026-08-03), ordered oldest to newest. The carousel opens on the **second** card, not the first: the hero already features card 1 (the June pilot quote) verbatim, so leading with it again would repeat the same sentence twice on one page. Card 1 is one left-arrow away. If the hero quote ever changes, revisit this offset (`DEFAULT_REVIEW_CARD_INDEX`) along with it. Cards are white (`rounded-2xl`, `canvas-soft` surface, raised shadow, no border) so they lift off the `panel` band: display-font quote, `primary-soft` program tag chip, muted meta line.
- The card track is scroll-snap (`snap-x snap-mandatory`), 3 cards visible on desktop, 2 on tablet, 1 on mobile (the next card peeks at 85% width so the row reads as scrollable). The scrollbar is hidden via `.review-track`; the track itself stays focusable and scrollable by keyboard and trackpad. Cards match heights from `sm` up and size to their own content on mobile, where only one is visible.
- Two circular arrows on a white `canvas-soft` surface with `primary-strong` glyphs and a raised shadow, so they read as controls against the `panel` band. From `sm` up they sit in the gutters on either side of the track (`sm:px-14` reserves the room, so they never cover a card); on phones there is no gutter, so they drop to a centered row below the track. They move exactly one card, are `disabled` (40% opacity) at each end, and carry translated `aria-label`s; the glyphs are `aria-hidden`. No autoplay, no dots — quote reading is guest-paced.
- Keep the quote to a single sentence per card. Cards sit in one row, so a long multi-sentence quote drags the whole row's height; excerpt longer survey answers instead (excerpt rules in AGENTS.md "Approved public quotes").
- No per-card star rows — the aggregate chip carries the stars so a single lower-scored review is never singled out.
- The hero keeps only a compact star chip (`hero.ratingNote`) linking here, plus the single featured quote card.
- No photos in this section. The band stays flat so `#events` (photo cards) above and `#apply` (photo backdrop) below are the only places images compete for attention.

### About Page and Final CTA

- Team/credibility content lives on `/about` (operator positioning: the team plans, runs, and improves every meetup — never "engineering team" framing), with the AI·SW Maestro card inside the team section. The page is a full-bleed photo hero, an origin section, a zigzag how-we-run-it section, and a dark timeline band of completed and upcoming runs. The main page links to it from the nav and footer only.
- Final CTA (`#apply`) is the single large `ink` band over the photo backdrop: live Google Form as the primary action, Instagram DM as the default guest inquiry channel, KakaoTalk open chat as the secondary and local-buddy channel, and the one-line buddy-recruitment note.
- The section carries no privacy paragraph (removed 2026-08-03). The consent banner is the single place that explains analytics and form data ("This page never sends your form answers to these tools"), and it is shown before anything loads, so repeating it under the CTA only added small low-contrast text to the closing screen. Keep new data/cookie wording in the banner, not here.

**Final CTA backdrop layer** (moved here from `#reviews`, 2026-08-03)

- Five wide-shot (landscape) photos balanced across activities — 2 Han River (sunset lawn, Banpo fountain at night), 2 baseball (daytime crowds, night lights), 1 K League — behind a uniform `primary-strong`/80 scrim.
- The scrim is `ink`/70, moved over unchanged from `#reviews`. A brand-red scrim was tried and rejected (유현님, 2026-08-03): tinting the photos red reads as a colored film laid over the section rather than as photography. Keep the neutral scrim so the photos look like photos, and let red carry the CTA button instead.
- Portrait sources are not used here: at the band's wide ratio a 3:4 photo loses most of its frame to `object-cover`. Pick landscape crops instead of nudging `object-position`.
- Photos are decorative (`alt=""`, wrapper `aria-hidden` + `data-photo-backdrop`) and must not show identifiable faces up close — selfie-style group shots are excluded; distant group shots are fine (유현님 rule, 2026-07-29).
- Autoplay-only: crossfade every 6s (opacity, 1s ease), no arrows, dots, or captions; disabled under `prefers-reduced-motion`. The only arrows on the page belong to the review carousel and never drive this backdrop.
- The scrim is functional image-legibility treatment covered by the Section 2 exception, not a decorative gradient.

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
| Border soft | `1px solid #eee2dd` | Hairline dividers, quiet separators |
| Border strong | `1px solid #d6c5bf` | Selected boundaries and supporting outlines |
| Focus outline | `3px solid #8f2f28` | Visible keyboard focus on light surfaces |
| Shadow subtle | `0 1px 2px rgba(38, 27, 24, 0.05)` | Rarely; only when a floating surface truly needs it |
| Photo scrim | `linear-gradient(transparent 45%, rgba(38,27,24,0.72))` | Photo-card caption legibility only |

### Rules

- No loud glow, no decorative campaign composition, no heavy colored shadows.
- Do not stack cards inside cards.
- Use tonal shifts between `canvas`, `canvas-soft`, `panel`, and `panel-raised` before adding borders, and borders before shadows.
- Any new elevation level must be tied to a named component in Section 5 before it is used.
