# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-22 05:52:28 KST
**Commit:** a7560d9
**Branch:** main

## OVERVIEW

HanBuddy by ZeroOne static landing page for recruiting foreign participants to the first KBO pilot: Samsung Lions vs LG Twins at Jamsil Baseball Stadium on 2026-06-25. No app framework, package manager, build step, server code, or local data collection exists in this repo.

## STRUCTURE

```text
/home/kimyo/projects/hanbuddy-landing/
|-- index.html                    # entire landing page: content, Tailwind config, CSS, CTA script
|-- assets/
|   `-- kbo-stadium-hero.webp     # only production image asset, 1672x941 WebP
|-- README.md                     # run/deploy instructions and product facts
|-- .omo/                         # local review/QA evidence; never deploy
`-- .superpowers/                 # local tool state; never deploy
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Edit visible landing copy | `index.html` | Single source for hero, sections, CTA labels, footer |
| Update product facts | `index.html`, then `README.md` | Keep date, matchup, price, seats, spots, included scope aligned |
| Change Kakao CTA | `index.html` `CONFIG` object and fallback visible URL | Also check hardcoded `href` values on CTA anchors |
| Replace hero image | `assets/kbo-stadium-hero.webp` and OG image in `index.html` | Preserve inspection-friendly stadium context |
| Local preview | `python3 -m http.server 8080` | Open `http://localhost:8080` |
| Deploy artifact | `/tmp/hanbuddy-landing-deploy` | Copy only `index.html` and `assets/kbo-stadium-hero.webp` |
| Prior QA notes | `.omo/evidence/` | Evidence only; not production input |

## CODE MAP

| Symbol / Section | Type | Location | Role |
|------------------|------|----------|------|
| `tailwind.config` | inline config | `index.html` head | Defines custom palette, font, shadow tokens for CDN Tailwind |
| `.skip-link` | CSS utility | `index.html` style block | Keyboard accessibility entry to `#main` |
| `.hero-surface` | CSS utility | `index.html` style block | Dark stadium-themed hero background |
| `.grain` | CSS utility | `index.html` style block | Subtle grid overlay on hero only |
| `.focusable` | CSS utility | `index.html` style block | Shared focus-visible ring for links/buttons |
| `.card-lift` | CSS utility | `index.html` style block | Hover lift for info cards |
| `#top` | section | `index.html` | Hero and match summary |
| `#pilot` | section | `index.html` | Date, venue, group status, price |
| `#included` | section | `index.html` | Ticket, food budget, guidance, orientation |
| `#how` | section | `index.html` | Kakao application flow |
| `#details` | section | `index.html` | Payment, cancellation, safety copy |
| `#apply` | section | `index.html` | Final CTA and fallback Kakao URL |
| `CONFIG` | inline JS object | `index.html` footer script | Maps `data-cta` keys to Kakao URLs |
| `[data-cta]` enhancer | inline JS loop | `index.html` footer script | Sets CTA href, target, and `rel=noopener` |

LSP/codegraph tools were unavailable in this session; this map is file-structure and static HTML based.

## CONVENTIONS

- Keep this as a buildless static page unless the scope materially grows.
- Production surface is `index.html` plus `assets/kbo-stadium-hero.webp` only.
- Body copy is English for foreign participants; repository instructions are Korean.
- The page intentionally does not store personal information. Application and questions go through KakaoTalk open chat.
- Update repeated facts together: `3 spots`, `50,000 KRW`, `June 25, 2026`, `Samsung Lions vs LG Twins`, `Jamsil`, `8 seats`, `3 ZeroOne members + 2 foreign participants`.
- CTA URL appears both as anchor `href` values and in the `CONFIG` object; keep both aligned so the page still works before JS enhancement.
- Tailwind is loaded from CDN and configured inline. Broad public release should consider precompiled or inline CSS.

## ANTI-PATTERNS

- Do not deploy the whole repository folder.
- Do not include `.git/`, `.omo/`, `.superpowers/`, QA screenshots, local tokens, raw JPG/JPEG photos, or tool evidence in any public artifact.
- Do not add participant names, phone numbers, payment details, secrets, or private chat logs to this repo.
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
cp assets/kbo-stadium-hero.webp /tmp/hanbuddy-landing-deploy/assets/kbo-stadium-hero.webp

# Quick content checks
rg -n "gDBFqEyi|50,000|June 25|3 spots|Samsung Lions|LG Twins|Jamsil" index.html README.md
find /tmp/hanbuddy-landing-deploy -maxdepth 3 -type f | sort
```

## NOTES

- `assets/kbo-stadium-hero.webp` is the only local media file and is referenced by both the hero background and Open Graph metadata.
- `.gitignore` excludes `.superpowers/` and `.omo/`, but Git ignore rules do not protect drag-and-drop deploys.
- Previous review evidence flagged hidden local tool state as a deploy risk; never print or copy token contents.
- There are no tests or CI workflows. For meaningful visual changes, run local preview and capture desktop/mobile screenshots before sharing.
- Root `AGENTS.md` is sufficient now. `assets/AGENTS.md` only becomes useful if asset count and replacement rules grow.
