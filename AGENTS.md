# PROJECT KNOWLEDGE BASE

**Updated:** 2026-07-30 KST

## OVERVIEW

HanBuddy by ZeroOne static landing site. The site is a public recruitment/promotion surface whose primary audience is international guests; the whole narrative speaks to the guest, and Korean/local buddy recruitment appears only as a one-line note in the final CTA section (pointing to the KakaoTalk open chat). Positioning is date-driven events (not weekend-only): the `#events` section lists Meetup-style cards for currently published dates, each linking to a booking-style detail page under `/events/`. Public proof uses approved photos from completed runs (2026-06-25 and 2026-07-26 KBO at Jamsil, and the 2026-08-01 Han River picnic — the Aug 8 & 9 Han River picnics and K League/jjimjilbang have never actually run, so their photos may only illustrate upcoming items or carry neutral place-describing captions, never completed-operation proof) and the approved guest quotes listed in CONVENTIONS. Applications run through the live Google Form (`https://forms.gle/B1fWgX3MjtHUHGNt5`). No app framework, package manager, build step, server code, or local data collection exists in this repo; tests run on plain `node --test`.

## STRUCTURE

```text
hanbuddy-landing/
|-- index.html                # main landing page: content, inline Tailwind config, CSS, i18n + analytics + backdrop script
|-- about/index.html          # /about — operator-positioning team page (self-contained copy of nav/footer/consent)
|-- events/
|   |-- kbo/index.html        # /events/kbo — booking-style detail page (collage, sticky booking card, lightbox)
|   `-- hanriver/index.html   # /events/hanriver — same template for the Han River picnic
|-- assets/
|   |-- brand/                # logos, favicon, apple-touch icon, soma logo (webp + png)
|   |-- photos/kbo/           # run1-* (2026-06-25) and kbo-0726-* (2026-07-26) public WebP derivatives
|   |-- photos/hanriver/      # hanriver-* public WebP derivatives
|   |-- photos/kleague/       # team-owned K League photos (coming-soon card / backdrop)
|   |-- photos/jjimjilbang/   # CC0 jjimjilbang photos (coming-soon card; no team photos yet)
|   `-- raw/                  # untracked originals (.gitignore); never deploy
|-- tests/                    # node --test suites: about copy sync, analytics consent, palette/typography vs DESIGN.md
|-- docs/superpowers/         # past design specs/plans (history, not current truth)
|-- DESIGN.md                 # design-system SSOT (tokens, components, photo rules)
|-- README.md                 # quick-start, deploy model, public-copy rules pointer
`-- .vercelignore             # deploy allowlist — the only guardrail deciding what Vercel serves
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Edit visible landing copy | `index.html` | EN/KO copy lives in `CONTENT_MAP` plus initial fallback DOM text; keep both in sync |
| Edit about-page copy | `about/index.html` | Self-contained `CONTENT_MAP`; nav/footer/consent copy shared with `index.html` is drift-checked by `tests/about.test.js` — change both files together |
| Edit event detail pages | `events/*/index.html` | Static EN pages; dates/prices must match `#events` cards and CONVENTIONS |
| Update design direction | `DESIGN.md`, then implementations | DESIGN.md first, then keep inline Tailwind tokens aligned (palette/typography are test-enforced) |
| Change application/contact CTA | `index.html` `CONFIG` + hardcoded anchors | Google Form is primary; Instagram DM is the default inquiry channel, KakaoTalk secondary |
| Update event dates/prices | `CONTENT_MAP.events.cards` (EN+KO), `events/*/index.html`, CONVENTIONS below | Only on explicit instruction; never invent details |
| Replace public photos | `assets/photos/**` + referencing pages | WebP only, EXIF stripped; photo rules in DESIGN.md; add new folders/extensions to `.vercelignore` |
| Run tests | `node --test tests/*.test.js` | Directory form `node --test tests/` fails on some Node versions — pass the glob |
| Local preview | `python3 -m http.server 8080` | Open `http://localhost:8080` |
| Deploy | merge to `main` | Vercel GitHub integration auto-deploys `main` to `landing.hanbuddy.kr`; `.vercelignore` allowlists what gets served |

## CODE MAP

| Symbol / Section | Type | Location | Role |
|------------------|------|----------|------|
| `tailwind.config` | inline config | `index.html` head (mirrored in `about/`, `events/*`) | Warm-red brand palette (`primary #d13f32` family, `canvas`/`ink`/`muted`/`panel`), Plus Jakarta Sans + DM Sans + Noto Sans KR stacks, subtle/raised shadows |
| `.skip-link`, `.focusable` | CSS utilities | `index.html` style block | Keyboard accessibility entry + shared focus ring (`.focusable-on-primary-strong` variant for dark surfaces) |
| `.eyebrow` | CSS utility | `index.html` style block | Uppercase tracked section label (`.eyebrow-on-primary` on dark surfaces) |
| `.hero-polaroid` / `.hp1–4` | CSS utilities | `index.html` style block | Hero polaroid scatter: desktop corner-pinned tilted snaps with tape + handwritten captions, mobile offset 2-col collage |
| `.photo-card` | CSS utility | `index.html` style block | Rounded photo frame with hover zoom (event cards, detail collages) |
| `.review-slide` | CSS utility | `index.html` style block | Reviews-backdrop crossfade transition (opacity 1s) |
| `#top` | section | `index.html` | Hero: headline, pill CTAs, rating chip linking to `#reviews`, featured guest-quote card, polaroid scatter |
| `#events` | section | `index.html` | Meetup-style event cards from `CONTENT_MAP.events.cards` (2-col mobile / 4-col desktop): open events link to `/events/*`, coming-soon cards show a toast |
| `#how` | section | `index.html` | 3-step join flow cards (Apply / We confirm / Have fun) |
| `#reviews` | section | `index.html` | Guest reviews over an autoplay crossfading photo backdrop: aggregate rating chip + 3 approved quote cards; rules in DESIGN.md "Guest Reviews" |
| `#apply` | section | `index.html` | Final CTA band: Google Form, Instagram DM, KakaoTalk, one-line buddy note, privacy note |
| `/about` | page | `about/index.html` | Operator-positioning team page: full-bleed photo hero, origin section, zigzag how-we-run-it section, dark timeline band of completed/upcoming runs, team section, final CTA; own CONTENT_MAP |
| `/events/kbo/`, `/events/hanriver/` | pages | `events/*/index.html` | Booking-style detail pages: title block, photo collage + focus-trapped lightbox, sticky booking card (desktop) / bottom CTA bar (mobile) |
| `CONFIG` | inline JS object | `index.html` script | Maps CTA keys to external URLs + GA/Pixel IDs |
| `CONTENT_MAP` | inline JS object | `index.html` script | EN/KO copy: meta, nav, hero, events cards, how, reviews, finalCta, footer, consent |
| `showToast` / `renderEventCards` / `renderReviewCards` | JS | `index.html` script | Dynamic renderers re-run on language switch |
| `startReviewBackdrop` | JS | `index.html` script | 6s autoplay crossfade for `#reviews` backdrop; disabled under `prefers-reduced-motion` |
| Consent + analytics | JS | `index.html` script | GA4 (`G-MW7MFVL50G`) + Meta Pixel load only after opt-in; events: `apply/contact/instagram/meetup_click`, `event_card_click`, `language_switch`, `section_view`; Meta customs `ApplicationFormOpen`, `ContactClick` |
| Lightbox | JS | `events/*/index.html` | Full-screen photo viewer: arrows, arrow-key/Escape, focus moved to close button on open, Tab trapped inside, focus restored to trigger on close |

## CONVENTIONS

### Product facts (update only on explicit instruction)

- Positioning is date-driven events, not weekend-only (2026-07-28): baseball can run on weekdays.
- Current published events — KBO Baseball Night: Aug 5 (Wed) & Aug 12 (Wed), ₩50,000, game ticket & stadium snacks included. Han River Picnic: Aug 1 (Sat), Aug 8 (Sat) & Aug 9 (Sun), ₩25,000, picnic food included. K League Football Day and Jjimjilbang Sauna Hangout are "coming soon" (no date/price; clicking shows a toast).
- Do not invent venue, capacity, exact time, payment method, cancellation/refund terms, or guarantees beyond these facts.
- The Google Form application link is live: `https://forms.gle/B1fWgX3MjtHUHGNt5` (`CONFIG.apply`). Instagram DM (`@hanbuddy_kr`) is the default guest inquiry channel; KakaoTalk open chat is secondary and the local-buddy channel.
- Completed runs usable as public proof: 2026-06-25 Jamsil KBO (Samsung Lions vs LG Twins), 2026-07-26 Jamsil KBO, and 2026-08-01 Han River picnic. The Aug 8 & 9 Han River picnics have not run yet, and K League and jjimjilbang have never been operated — their photos may be used only for upcoming/coming-up items or with neutral place-describing captions, never as completed-operation proof.

### Approved public quotes (verbatim; nothing else may be quoted)

1. Run 1 survey promo field: "If you are looking to experience Korean baseball culture with local Koreans, then this is the program you want to join!" / fixed KO: "한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면, HanBuddy가 바로 당신이 참여하고 싶은 프로그램입니다!"
2. 2026-07-26 survey promo field: "Great experience to enjoy a baseball game with a local" / KO "로컬 버디와 함께 야구 경기를 즐길 수 있어 정말 좋은 경험이었어요"
3. 2026-07-26 survey "What did you like" field (유현님 approved this field for publication, 2026-07-29): "It was fun to watch the game and cheer together!" / KO "함께 응원하며 경기를 보는 게 정말 재미있었어요!" — only the sentence-initial capital is normalized.
4. KakaoTalk message from a July guest, approved in trimmed form (2026-07-28): "I had such a great evening — will definitely be going to another game with HanBuddy!"
- Answers from the "What could be improved" survey field remain off-limits for public copy.
- The aggregate "4.7 / 5 average guest rating" is the mean of all post-event survey satisfaction scores to date; update only by recomputing from the survey sheet, and never expose any individual score.

### Photos

- Public photos are EXIF-stripped WebP derivatives only; originals stay untracked in `assets/raw/` (or outside the repo) and must never deploy.
- Participant photo use is consent-based (tracked per run by the team); bystander faces get blurred (`kbo-0726-group.webp` precedent). Selfies from Samsung front cameras may be saved mirrored — check jersey/sign text after conversion.
- Backdrop/decorative photos must not show identifiable faces up close (유현님 rule, 2026-07-29); landscape orientation only for full-bleed backdrops (see DESIGN.md).
- Jjimjilbang card photo `jjimjilbang-kiln-room.webp` is Wikimedia Commons CC0 (no people, no attribution required; source File:영신불가마사우나24시(강원 원주시 시청로 96)3.jpg); `jjimjilbang-bulgama.webp` is an unused CC0 fallback. Replace with team photos once the event runs. `assets/photos/kleague/*` are team-owned.
- When adding a public asset folder or extension, update the `.vercelignore` allowlist in the same change.

### Copy & structure

- Keep this a buildless static site; production surface is the allowlisted HTML + WebP photos, plus the brand PNGs in `assets/brand/` (apple-touch icon and the fixed email-signature logo).
- Body copy defaults to English for international guests; the KO toggle serves local buddies and stakeholders. Keep `CONTENT_MAP` EN/KO and static fallback DOM text in sync (including `#events` grid classes and dynamic renderers).
- Korean/local buddy recruitment stays a one-line note in `#apply`; do not re-expand it into its own section.
- The page intentionally stores no personal information; applications/questions go through external channels only.
- CTA URLs appear both as hardcoded anchors and in `CONFIG`; keep both aligned so the page works before JS enhancement.
- Maintainer-only guardrail: do not expose F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, learning signal, PMF caveats, payment sensitivity, or improvement criticism in public copy, metadata, alt text, README public summary, or deploy artifacts.
- The June 25 Run 1 Notion guide is historical and intentionally absent from public surfaces; do not restore it without an explicitly approved current replacement.
- Tailwind loads from CDN with inline config on every page. Broad public release should consider precompiled or inline CSS.

## ANTI-PATTERNS

- Do not deploy the whole repository folder or bypass `.vercelignore`.
- Do not include `.git/`, `.omo/`, `.superpowers/`, `.serena/`, QA screenshots, local tokens, raw JPG/JPEG photos, or tool evidence in any public artifact.
- Do not add participant phone numbers, payment details, secrets, private chat logs, or unapproved direct quotes to this repo.
- Do not reintroduce retired recruitment facts as current truth: "3 spots left", "8 seats booked", "first pilot recruitment", and the July 18/19 & 25/26 "Run 2" window are history. (Note: ₩50,000 IS the current KBO price since 2026-07-28 — the retired fact was the old "50,000 KRW" pilot framing, not the number itself.)
- Do not expose internal weak-validation details in public copy; maintainer checks may mention them only to verify their absence.
- Do not create package/build tooling just to make small copy changes, and do not split pages into a framework structure unless routing/reuse/builds become real requirements.
- Do not treat `.omo/evidence/` or `docs/superpowers/` as current truth without rechecking against the live files.

## COMMANDS

```bash
# Local preview
cd ~/projects/hanbuddy-landing
python3 -m http.server 8080

# Tests (pass the glob — `node --test tests/` fails on some Node versions)
node --test tests/*.test.js

# Ship (team rule: never push main directly)
git switch -c feat/<topic>   # work, commit
gh pr create                 # CodeRabbit reviews; apply valid findings
gh pr merge <N> --squash --delete-branch   # merging main auto-deploys via Vercel

# Verify what would deploy (simulate the .vercelignore allowlist)
tmp=$(mktemp -d) && git -C . ls-files >/dev/null && cp .vercelignore "$tmp/.gitignore" && \
  git -C "$tmp" init -q && cp -R index.html about events assets "$tmp/" 2>/dev/null && \
  git -C "$tmp" add -n . | sort

# Quick content check (current facts)
rg -n "forms.gle/B1fWgX3MjtHUHGNt5|Aug 5|Aug 12|₩50,000|₩25,000|landing.hanbuddy.kr" index.html events README.md
```

## NOTES

- Production domain: `landing.hanbuddy.kr` (Vercel project `hanbuddy-landing`); merging `main` auto-deploys — no manual `vercel --prod` needed.
- OG/Twitter image is `assets/photos/kbo/run1-group.webp` (absolute URL on the production domain); event detail pages carry their own OG images.
- `assets/brand/logo-borderless.png` is the fixed email-signature asset at `https://landing.hanbuddy.kr/assets/brand/logo-borderless.png` — do not move or rename it.
- `.vercelignore` is the deploy guardrail: Vercel CLI uploads the working directory, not the git tree. Before it existed (2026-07-10), internal docs and raw JPGs were publicly served — keep the allowlist in sync when adding public files.
- Tests exist but no CI workflow runs them; run the node --test command locally before pushing. For visual changes, use local preview and check desktop/mobile in the browser.
- Team repo rules: always branch + PR (main direct push is hook-blocked), squash merge, no AI co-author trailers in commits or PR bodies.
