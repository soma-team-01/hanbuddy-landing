# HanBuddy Font Preview Design

**Date:** 2026-07-23  
**Status:** Approved comparison format; awaiting written-spec review

## Goal

Create an in-conversation comparison that helps choose a warmer, more distinctive HanBuddy typography system without changing the production landing page. The comparison must make differences visible in the real content types HanBuddy uses: an English display headline, English supporting copy, a Korean sentence, a small label, and a primary CTA.

## Chosen Format

Show five candidates together in one responsive comparison grid. Every candidate uses identical copy, sizing, spacing, and the current `#ff4a79` brand color so that typography is the only meaningful variable.

The grid is preferred over a tab switcher because simultaneous viewing makes differences in width, rhythm, friendliness, and visual density easier to judge.

## Candidate Systems

1. **Current control — Structured**
   - Display: Manrope
   - Body: Be Vietnam Pro
   - Korean fallback: Noto Sans KR
   - Purpose: Preserve a direct reference to the current landing.

2. **Plus Jakarta Sans + DM Sans — Friendly polish**
   - Display: Plus Jakarta Sans
   - Body: DM Sans
   - Korean fallback: Noto Sans KR
   - Initial recommendation: strongest balance of friendliness, clarity, and product polish.

3. **DM Sans — Calm and approachable**
   - Display and body: DM Sans
   - Korean fallback: Noto Sans KR
   - Purpose: Test a quieter, less geometric voice.

4. **Outfit + DM Sans — Youthful energy**
   - Display: Outfit
   - Body: DM Sans
   - Korean fallback: Noto Sans KR
   - Purpose: Test a brighter, more social-experience tone.

5. **Nunito Sans — Warm buddy**
   - Display and body: Nunito Sans
   - Korean fallback: Noto Sans KR
   - Purpose: Test the warmest and most casual direction without becoming childish.

## Preview Content

Each candidate shows:

- Eyebrow: `SEOUL · EVERY SATURDAY & SUNDAY`
- Headline: `Experience Korea like a local!`
- Body: a shortened sentence about enjoying Korean baseball or a Han River picnic with a local buddy
- Korean sample: `한국의 주말을 로컬 버디와 함께 경험하세요.`
- CTA: `Join this weekend`
- Font-family labels and a concise mood label

## Visual Rules

- Keep the comparison independent from production files.
- Use the current near-white canvas, dark text, and HanBuddy pink only.
- Do not add photography, gradients, decorative illustrations, or alternate layouts; these would make the font comparison less controlled.
- Keep all candidates visible at once on wide screens and stack them cleanly down to 320px.
- Use matching text sizes, line heights, and weights across candidates.
- Mark the current system as the control and Plus Jakarta Sans + DM Sans as the initial recommendation, while leaving every option equally inspectable.

## Interaction

The first render contains the complete comparison. A candidate may be selected to add a visible selected state and update one concise selected-candidate line; selection does not hide the other candidates.

## Validation

- Confirm all five Latin fonts and Noto Sans KR load successfully.
- Confirm the preview renders at approximately 736px and 320px without clipping or horizontal overflow.
- Confirm the selected candidate is keyboard accessible and the selected label updates.
- Confirm all candidates retain readable contrast with the current HanBuddy pink.
- Confirm no production landing files are changed.

## Out of Scope

- Applying a font to `index.html` or `DESIGN.md`
- Selecting the final production typography system
- Comparing serif, handwritten, or display-only novelty fonts
- Changing color, spacing, copy, layout, or imagery
