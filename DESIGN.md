# HanBuddy Landing Design System

## 1. Atmosphere & Identity

HanBuddy feels like a trusted local host bringing foreign guests into a real Korean baseball night. The signature is stadium warmth: warm clay surfaces, ink-heavy contrast, amber calls to action, field green support marks, score red urgency, and actual Jamsil stadium imagery. The page should feel human, practical, and event-specific rather than like a generic AI product.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Text/primary | `ink-950` | `#101316` | Body text, dark hero base, high-contrast buttons |
| Text/strong | `ink-900` | `#171b20` | Hero gradient depth and dark surfaces |
| Text/secondary | `ink-800` | `#242a31` | Paragraph text and subdued body copy |
| Text/muted | `ink-700` | `#343c46` | Secondary labels when more restraint is needed |
| Surface/base | `clay-50` | `#fbf7ef` | Main warm clay page background |
| Surface/soft | `clay-100` | `#f3eadb` | Soft panels and included-section containers |
| Surface/warm-line | `clay-200` | `#e3d0ae` | Warm dividers, subtle fills, and secondary surfaces |
| Accent/cta | `amber-300` | `#f6c96d` | Primary CTA fill, focus ring, hero highlights |
| Accent/cta-hover | `amber-400` | `#edac2f` | CTA hover state and warm hero glow |
| Accent/cta-pressed | `amber-500` | `#c77a17` | CTA pressed state and warm border emphasis |
| Support/field | `field-500` | `#2f855a` | Included-list dots, stadium field references |
| Support/field-strong | `field-700` | `#1e5f43` | Section labels and darker field stripe states |
| Accent/score | `score-500` | `#bf3f32` | Run labels, scarcity accents, event urgency |
| Hero/warm-shadow | `stadium-brown` | `#2b2016` | Existing hero gradient tail, not a general surface |
| Surface/plain | `white` | `#ffffff` | Cards and high-readability content blocks |

### Rules

- Clay is the dominant public-page background; avoid cold or synthetic campaign colors.
- Ink is the main contrast system. Use amber only for CTAs, focus, and a few key highlights.
- Field green supports baseball context and included-benefit markers; score red is reserved for urgency and pilot labels.
- Raw hex values in UI code must map to the tokens above or be added here first.
- Real stadium photography carries the atmosphere. Gradients may support legibility, but they cannot replace the actual stadium asset.

## 3. Typography

### Font Stack

- Primary: `Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
- Mono: none in the current page.
- Serif: none in the current page.

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | `text-4xl` to `lg:text-7xl` | 900 | `0.98` | tight | Hero headline |
| Section H2 | `text-4xl` to `sm:text-5xl` | 900 | tight | tight | Major section titles |
| Card H3 | `text-lg` to `text-xl` | 900 | normal | normal | Card and step titles |
| Lead | `text-lg` to `sm:text-2xl` | 500 | relaxed | normal | Hero and section lead copy |
| Body | `text-base` | 400 to 600 | relaxed | normal | Default explanations |
| Small | `text-sm` | 400 to 700 | relaxed | normal | Details, helper text, footer |
| Overline | `text-xs` or `text-sm` | 800 to 900 | normal | `0.14em` to `0.18em` | Section labels and metadata |

### Rules

- Outfit is part of the brand feel. Do not swap it unless the whole page is revalidated.
- Use heavy weights for event clarity, but keep paragraphs at readable weights and relaxed line heights.
- Body text must stay at 14px or larger.
- Uppercase overlines are allowed for rhythm, but keep tracking at zero for ordinary readable text.

## 4. Spacing & Layout

### Spacing

All spacing follows Tailwind's 4px-based scale.

| Token | Value | Current usage |
|-------|-------|---------------|
| `space-1` | 4px | Tight icon, dot, and focus offsets |
| `space-2` | 8px | Compact inline rhythm |
| `space-3` | 12px | Small gaps and pill padding |
| `space-4` | 16px | Mobile card padding and CTA vertical rhythm |
| `space-5` | 20px | Page side padding |
| `space-6` | 24px | Default card padding |
| `space-8` | 32px | Hero and section grid gaps |
| `space-10` | 40px | Larger section gaps |
| `space-14` | 56px | Final CTA vertical rhythm |
| `space-16` | 64px | Standard section vertical padding |
| `space-20` | 80px | Large desktop section padding |

### Responsive Breakpoints

| Viewport | Role | Layout rule |
|----------|------|-------------|
| `390px` | Mobile QA target | Single-column layout, CTAs stack, no horizontal scroll |
| `768px` | Tablet QA target | Navigation can reveal desktop links, grids may become 2 to 3 columns |
| `1440px` | Desktop QA target | Content stays constrained with `max-w-6xl`, hero may use two columns |

### Rules

- The page uses constrained content width, not edge-to-edge card stacks.
- Sections should feel rounded but not over-carded. Use cards for repeated facts and steps, not every page band.
- Keep hero height responsive with `dvh` where full-viewport behavior is needed.
- Do not add framework layout systems. The current static HTML plus Tailwind CDN structure is the source of truth.

## 5. Components

### CTA Button

- **Structure**: anchor with `data-cta`, rounded-full shape, amber fill, ink text, bold label.
- **Variants**: primary amber, secondary outline on dark hero, text link in footer.
- **Spacing**: horizontal padding from `space-4` to `space-8`, vertical padding from `space-2` to `space-4`.
- **States**: hover uses `amber-400`; active uses a small scale transform; focus uses the shared focus ring.
- **Accessibility**: must remain keyboard reachable and keep `target="_blank"` plus `rel="noopener"` when JavaScript enhances Kakao links.

### Information Card

- **Structure**: rounded card with border or ring, short overline, strong title, concise support copy.
- **Variants**: white cards on clay, translucent cards on dark hero, ink cards in the how-to section.
- **Spacing**: default padding is `space-6`; compact hero stat cards may use `space-4`.
- **States**: repeated informational cards may use `.card-lift` hover only when the card is not visually noisy.
- **Accessibility**: cards are content containers unless they are actual links or controls.

### Stadium Image Frame

- **Structure**: rounded image container with real Jamsil stadium imagery and a dark legibility overlay.
- **Variants**: hero card frame and social preview image.
- **Spacing**: keep internal caption padding at `space-4` or `space-5`.
- **Accessibility**: image alt text must identify the real stadium context without exposing private details.
- **Rules**: no QR codes, seat details, prominent private faces, or irrelevant product branding in primary public imagery.

### Language Toggle

- **Structure**: keyboard-reachable segmented control or paired buttons labeled for English and Korean.
- **Variants**: compact header control, optional repeated footer control only if discoverability requires it.
- **States**: current language must be visually selected and exposed with `aria-pressed` or equivalent state.
- **Behavior**: default language is English. Switching to Korean updates visible copy and `document.documentElement.lang`.
- **Persistence**: only store the language preference in `localStorage`; do not collect names, contacts, or analytics data for the toggle.
- **Content rule**: every visible navigation, hero, section, CTA, payment, safety, team trust, footer, and image-alt string controlled by the language toggle needs an English and Korean value.

### Team Social Link

- **Structure**: external anchor inside each team card, labeled by the social platform name.
- **Variants**: compact rounded outline link using field green text on white cards.
- **Spacing**: sits below the member note with `space-5` top rhythm and compact horizontal padding.
- **States**: hover may add a clay fill and darker field border; active uses a small scale transform.
- **Accessibility**: must use `target="_blank"` and `rel="noopener"` for external social links.
- **Content rule**: use only user-approved public profile links, and keep the link label concise so foreign participants can recognize the destination quickly.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 150ms to 180ms | ease | CTA hover, card lift, focus entry |
| Standard | 180ms to 220ms | ease | Toggle state and small surface changes |

### Rules

- Animate only transform, opacity, border color, and shadow strength.
- Respect `prefers-reduced-motion` by shortening or disabling non-essential transitions.
- Every interactive element needs a visible focus state. The shared focus ring is `3px` amber with a `4px` offset.
- Hover states must not be the only cue for a control's purpose.

## 7. Depth & Surface

### Strategy

Use mixed depth with restraint: tonal clay surfaces, thin borders, occasional rings, and one strong lift shadow for key cards. The page should not become a stack of nested panels.

| Level | Token or value | Usage |
|-------|----------------|-------|
| Flat | `clay-50`, `white`, `ink-950` | Main page bands |
| Subtle | `border-ink-950/10`, `ring-ink-950/10` | Cards, dividers, contained lists |
| Elevated | `shadow-lift` or `0 24px 80px -48px rgba(16, 19, 22, 0.65)` | Hero card and final trust-critical surfaces |
| Hover lift | `translateY(-3px)` plus `0 22px 64px -42px rgba(16, 19, 22, 0.72)` | Optional repeated info-card affordance |

### Rules

- No card inside another card unless the inner card is a genuine media or stat frame.
- Rounded corners can be generous, but repeated content should not all compete as isolated feature cards.
- The dark hero can use grain and glow for depth; content sections should stay quieter and more readable.
