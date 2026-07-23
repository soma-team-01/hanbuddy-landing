# PROJECT KNOWLEDGE BASE

**Updated:** 2026-07-06 KST

## OVERVIEW

HanBuddy by ZeroOne static landing page. The page is a public recruitment/promotion landing whose primary audience is international guests; the whole narrative speaks to the guest, and Korean/local buddy recruitment appears only as a one-line note in the final CTA section (pointing to the KakaoTalk open chat). Public proof should use approved Run 1 photos, completed-operation facts, and the approved testimonial quote. Run 2 applications are open for July 18/19 and 25/26 through the live Google Form (`https://forms.gle/B1fWgX3MjtHUHGNt5`) with two programs matching the form options exactly: "KBO Baseball Game in Seoul with Local Buddy" and "Han River Tour with Local Buddy". KakaoTalk open chat remains available for questions and updates. Run 1 was operated at Jamsil Baseball Stadium on 2026-06-25 for Samsung Lions vs LG Twins. No app framework, package manager, build step, server code, or local data collection exists in this repo.

## STRUCTURE

```text
/home/kimyo/projects/hanbuddy-landing/
|-- index.html                    # entire landing page: content, Tailwind config, CSS, CTA script
|-- DESIGN.md                     # current MVP Figma-derived product landing design system
|-- README.md                     # run/deploy instructions and current product facts
|-- assets/
|   |-- kbo-stadium-hero.webp     # legacy tracked pre-run stadium asset
|   |-- run1-hero.webp            # public WebP derivative: stadium context photo
|   |-- run1-group.webp           # public WebP derivative: approved participant group proof photo
|   |-- run1-opening.webp         # public WebP derivative: opening/stadium context
|   `-- run1-night.webp           # public WebP derivative: night stadium context
|-- .omo/                         # local review/QA evidence; never deploy
`-- .superpowers/                 # local tool state; never deploy
```

Ignored raw KakaoTalk JPGs may exist locally under `assets/`; do not deploy them.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Edit visible landing copy | `index.html` | English/Korean copy lives in `CONTENT_MAP` plus initial fallback DOM text |
| Update design direction | `DESIGN.md`, then `index.html` | Keep tokens aligned with the inline Tailwind config |
| Change application/contact CTA | `index.html` `CONFIG`, hardcoded anchors, visible CTA copy | Google Form is live (`forms.gle/B1fWgX3MjtHUHGNt5`); Instagram DM is the primary inquiry channel and KakaoTalk remains secondary |
| Add a public guide CTA | `index.html` footer and `CONFIG` | The June 25 Run 1 guide is historical and requires an explicitly approved current replacement |
| Replace public photos | `assets/run1-*.webp` and OG image in `index.html` | Use WebP derivatives only, strip EXIF, preserve meaningful alt text; photos support product proof |
| Local preview | `python3 -m http.server 8080` | Open `http://localhost:8080` |
| Deploy artifact | `.vercelignore` allowlist | `npx vercel --prod` uploads only `index.html` and `assets/*.webp`; everything else (docs, raw JPGs, tool folders) is excluded by `.vercelignore` |

## CODE MAP

| Symbol / Section | Type | Location | Role |
|------------------|------|----------|------|
| `tailwind.config` | inline config | `index.html` head | Defines the MVP-app-aligned palette (forest/cream/earth/success), Manrope+Be Vietnam Pro font stacks, and shadow tokens |
| `.skip-link` | CSS utility | `index.html` style block | Keyboard accessibility entry to `#main` |
| `.focusable` | CSS utility | `index.html` style block | Shared focus-visible ring |
| `.eyebrow` | CSS utility | `index.html` style block | Uppercase tracked section label in `earth` |
| `.photo-card` | CSS utility | `index.html` style block | Signature Run 1 photo card: rounded frame, bottom scrim, hover zoom |
| `.photo-card-copy` | CSS utility | `index.html` style block | Overlaid label/title copy inside a photo card |
| `.photo-lift` | CSS utility | `index.html` style block | Low-risk image hover treatment |
| `#top` | section | `index.html` | Hero and primary CTA (guest-voiced) |
| `#programs` | section | `index.html` | Run 2 program cards: KBO baseball game and Han River tour, dates July 18/19 & 25/26 |
| `#why` | section | `index.html` | Guest benefits of joining with a local buddy (hairline rows) |
| `#how` | section | `index.html` | Guest journey step columns: Apply / Confirm / Meet up |
| `#testimonial` | section | `index.html` | Public Run 1 proof, approved testimonial, and completed-operation facts |
| `#policy` | section | `index.html` | Safety, privacy, and manual confirmation expectations |
| `#team` | section | `index.html` | ZeroOne trust/team context |
| `#apply` | section | `index.html` | Final recruitment CTA for July 18/19 & 25/26: live Google Form link, KakaoTalk open chat, one-line buddy-recruitment note |
| `CONFIG` | inline JS object | `index.html` footer script | Maps CTA keys to external URLs |
| `CONTENT_MAP` | inline JS object | `index.html` footer script | English/Korean visible copy, nav, cards, alt strings, meta |

## CONVENTIONS

- Keep this as a buildless static page unless the scope materially grows.
- Production surface is `index.html` plus referenced WebP assets only.
- Current design direction mirrors the live MVP frontend (hanbuddy-frontend.vercel.app): photography-led, centered hero, pill CTAs, hairline editorial lists, and the MVP's own token set. See `DESIGN.md` for the full system.
- The hero is photo-led: centered copy with pill CTAs and status chips, then a three-across row of approved Run 1 photo cards. There is no app-mockup preview anymore.
- Body copy defaults to English for foreign/international participants; Korean toggle exists for local buddies and internal/stakeholder sharing.
- Public page copy targets one primary audience: foreign/international guests who want Korean local-culture experiences. Korean/local buddy recruitment is a secondary one-line note in `#apply` only; do not re-expand it into its own section.
- The Run 2 application window is July 18/19 and 25/26 / 7월 18·19일과 25·26일, with two programs named exactly as in the Google Form: "KBO Baseball Game in Seoul with Local Buddy" and "Han River Tour with Local Buddy" (keep the English program names in both languages so applicants can match the form options). Do not invent price, venue, capacity, exact time, program-to-date mapping, payment method, included items, cancellation terms, refund terms, or guarantees.
- The Google Form application link is live: `https://forms.gle/B1fWgX3MjtHUHGNt5` (set in `CONFIG.apply`). KakaoTalk open chat stays as the questions/updates channel.
- The page intentionally does not store personal information. Applications/questions must go through external channels only.
- Public Run 1 proof should use approved photos, completed-operation facts, and this exact testimonial quote: "If you are looking to experience Korean baseball culture with local Koreans, then this is the program you want to join!"
- Use this fixed Korean testimonial translation: "한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면, HanBuddy가 바로 당신이 참여하고 싶은 프로그램입니다!"
- Maintainer-only guardrail: do not expose F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, learning signal, PMF caveats, payment sensitivity, or improvement criticism in public copy, metadata, alt text, README public summary, or deploy artifacts.
- Participant photo use was approved for marketing, but original JPG/EXIF must not be deployed.
- CTA URLs may appear both as anchor `href` values and in the `CONFIG` object; keep hardcoded anchors, `CONFIG`, and visible labels aligned so the page works before JS enhancement.
- The June 25 Run 1 Notion guide is historical and intentionally absent from the public footer, CTA, and `CONFIG`. Do not restore it without explicit approval for a current guide.
- Tailwind is loaded from CDN and configured inline. Broad public release should consider precompiled or inline CSS.

## ANTI-PATTERNS

- Do not deploy the whole repository folder.
- Do not include `.git/`, `.omo/`, `.superpowers/`, QA screenshots, local tokens, raw JPG/JPEG photos, or tool evidence in any public artifact.
- Do not add participant phone numbers, payment details, secrets, private chat logs, or unapproved direct quotes to this repo.
- Do not reintroduce the old recruitment facts as current truth: `3 spots left`, `50,000 KRW`, `8 seats booked`, or "first pilot recruitment" are historical unless explicitly reframed.
- Do not expose internal weak validation details in public copy. If a maintainer check mentions F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, or learning signal, it must be only to verify those details are absent from public surfaces.
- Do not create package/build tooling just to make small copy changes.
- Do not split the single page into a framework structure unless routing, reusable components, or automated builds become real requirements.
- Do not treat `.omo/evidence/` as current truth without rechecking timestamps and the live file.

## COMMANDS

```bash
# Local preview
cd /home/kimyo/projects/hanbuddy-landing
python3 -m http.server 8080

# Clean deploy folder
cd /home/kimyo/projects/hanbuddy-landing
rm -rf /tmp/hanbuddy-landing-deploy
mkdir -p /tmp/hanbuddy-landing-deploy/assets
cp index.html /tmp/hanbuddy-landing-deploy/index.html
cp assets/run1-hero.webp /tmp/hanbuddy-landing-deploy/assets/run1-hero.webp
cp assets/run1-group.webp /tmp/hanbuddy-landing-deploy/assets/run1-group.webp

# Quick content checks
rg -n "Google Form|KakaoTalk|gDBFqEyi|July 18|July 19|7월 18|7월 19|If you are looking to experience Korean baseball culture|한국 야구 문화를 현지 한국인과 함께 경험" index.html README.md AGENTS.md

# Maintainer-only forbidden public-copy check: run the regex from the guardrail above; matches in index.html or README.md are failures because those details must not be exposed publicly.
find /tmp/hanbuddy-landing-deploy -maxdepth 3 -type f | sort
```

## NOTES

- `assets/run1-group.webp` is referenced by Open Graph metadata and as approved Run 1 proof media.
- `assets/run1-hero.webp` is kept as supporting stadium context, not the main first-viewport image.
- `.gitignore` excludes local tool folders and raw image patterns, but Git ignore rules do not protect drag-and-drop deploys.
- `.vercelignore` (added 2026-07-10) is the deploy guardrail: Vercel CLI uploads the working directory, not the git tree, so without it internal docs and raw JPGs get publicly served (this actually happened until 2026-07-10 — `AGENTS.md`, `DESIGN.md`, and `assets/KakaoTalk_*.jpg` returned 200 on the production domain). Keep the allowlist in sync when adding new public assets.
- There are no tests or CI workflows. For meaningful visual changes, run local preview and capture desktop/tablet/mobile screenshots before sharing.
