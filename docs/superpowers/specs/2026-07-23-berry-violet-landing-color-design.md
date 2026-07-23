# HanBuddy Landing Berry Violet Color Design

**Date:** 2026-07-23  
**Status:** Approved for implementation

## Context

The landing page currently uses a warm cream canvas and a dark forest primary
palette inherited from an earlier MVP direction. The current HanBuddy logo uses
a blue-to-coral gradient, so the page and logo no longer read as one brand.

The approved direction makes the page background feel conventionally white and
uses a single red-leaning violet as the page primary. This keeps the interface
visually focused while preserving the existing gradient logo as the full brand
mark.

## Goals

- Make the page canvas read as clean, near-white, and photography-friendly.
- Replace the forest/earth interaction hierarchy with Berry Violet.
- Make one primary color clearly own calls to action, links, active states, and
  branded emphasis.
- Keep the existing logo asset and its gradient intact.
- Preserve the current layout, copy, photography, URLs, analytics, and
  buildless static architecture.

## Non-goals

- Redesigning the logo or generating a new logo asset.
- Adding a second UI accent color or distributing blue and coral across
  separate component roles.
- Adding a CSS gradient as a competing page-wide primary treatment.
- Changing page structure, typography, content, program facts, or CTA behavior.

## Approved Color System

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Page canvas | `canvas` | `#fcfcfd` | Body and default section background |
| Clean surface | `canvas-soft` | `#ffffff` | Sticky header and high-clarity surfaces |
| Primary | `primary` | `#b13f8f` | Primary CTA, active state, branded link, eyebrow |
| Primary hover | `primary-hover` | `#943476` | Hover and pressed emphasis |
| Primary strong | `primary-strong` | `#79285f` | Large final CTA band and high-contrast primary text |
| Primary soft | `primary-soft` | `#fceff7` | Testimonial, selected state, and quiet branded surface |
| Text primary | `ink` | `#201a20` | Headlines and body text requiring maximum contrast |
| Text secondary | `muted` | `#625a61` | Supporting copy and metadata |
| Border strong | `line-strong` | `#cfc6cc` | Focus-adjacent and selected boundaries |
| Border soft | `line-soft` | `#e9e3e7` | Dividers and quiet outlines |
| Panel | `panel` | `#f7f5f7` | Neutral cards and grouped content |
| Panel raised | `panel-raised` | `#fbf8fa` | Language toggle and subtle raised surfaces |
| On-primary | `on-primary` | `#ffffff` | Text and icons on solid primary surfaces |

Existing semantic success colors may remain for genuine completed states. They
must not be reused as general decoration.

## Application Rules

### Primary ownership

Berry Violet is the only interactive brand color:

- Navigation and hero primary CTA fills use `primary`.
- CTA hover states use `primary-hover`.
- Section eyebrows, branded links, testimonial attribution, active language
  state, selected states, and focus rings use `primary` or `primary-strong`.
- Soft emphasis panels use `primary-soft` with `primary-strong` text.

Headings and long-form body text remain neutral. Primary-colored text is reserved
for short labels and interactive elements so the page remains readable and does
not become uniformly purple.

### Large emphasis

The final application section uses `primary-strong` as its background with
`on-primary` text. Its main button reverses to a white surface with
`primary-strong` text. This is the single large color field on the page.

### Gradient

The existing logo gradient remains visible in the header, favicon, and footer.
No new CSS gradient is added to buttons, text, panels, or section backgrounds in
this implementation. The logo therefore carries the multi-color identity while
the interface uses Berry Violet as a disciplined solid primary.

The existing photo-card legibility scrim is functional rather than decorative
and may remain.

## Component Mapping

| Current role | New role |
| --- | --- |
| `ink` CTA fill | `primary` |
| `sage` CTA hover | `primary-hover` |
| `earth` eyebrow/accent | `primary` |
| Cream canvas | Near-white `canvas` |
| Sand panels | Neutral `panel` or branded `primary-soft` according to meaning |
| Dark final CTA band | `primary-strong` |
| Dark-band muted label | White with reduced opacity |

The implementation should rename the Tailwind and CSS custom-property tokens
where practical instead of retaining forest-oriented token names for unrelated
violet values.

## Accessibility

- Normal text keeps at least WCAG AA contrast against its background.
- White text is used only on sufficiently dark `primary` or `primary-strong`
  surfaces.
- `primary-strong` is used when Berry Violet text needs extra contrast on
  `primary-soft`.
- Keyboard focus remains visible with a primary-colored outline plus sufficient
  offset from the component surface.
- Color is not the only indicator for language selection, active state, or
  links; existing labels, underlines, pressed states, and borders remain.

## Implementation Scope

- Update the inline Tailwind color configuration in `index.html`.
- Update matching CSS custom properties and any hard-coded color values.
- Remap component classes to the approved roles without changing layout or copy.
- Update `DESIGN.md` so its palette and rules match the implemented source of
  truth.
- Do not modify logo or photography assets.

## Verification

- Confirm no retired forest or earth hex values remain in public landing styles.
- Confirm hard-coded anchors, CTA behavior, language switching, and analytics
  behavior are unchanged.
- Run the existing automated test suite.
- Preview the page at desktop and mobile widths.
- Check primary buttons, focus rings, links, soft panels, and the final CTA band
  for contrast and consistent state behavior.
- Verify only deploy-allowed public files are affected.
