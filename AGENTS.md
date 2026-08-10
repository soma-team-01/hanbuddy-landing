# PROJECT KNOWLEDGE BASE

**Updated:** 2026-08-07 KST

## OVERVIEW

HanBuddy by ZeroOne static landing site. The site is a public recruitment/promotion surface whose primary audience is international guests; the whole narrative speaks to the guest, and Korean/local buddy recruitment appears only as a one-line note in the final CTA section (pointing to the KakaoTalk open chat). Positioning is date-driven events (not weekend-only): the `#events` section lists Meetup-style cards for currently published dates, each linking to a booking-style detail page under `/events/`. Public proof uses approved photos from the two runs that actually happened (2026-06-25 and 2026-07-26 KBO at Jamsil). The 2026-08-01 Han River picnic was cancelled, and the Aug 15, 16, 22 & 23 picnics, K League and jjimjilbang have never run, so those photos may only illustrate upcoming items or carry neutral place-describing captions, never completed-operation proof and the approved guest quotes listed in CONVENTIONS. Applications run through the site's own form at `/apply/` (since 2026-08-07); the Google Form (`https://forms.gle/B1fWgX3MjtHUHGNt5`) stays alive only for links already handed out on Meetup and Instagram, and nothing on the landing site points at it any more. No app framework, package manager, or build step exists in this repo, and tests run on plain `node --test`. **Server code and personal-data collection do exist now**: one Vercel Function (`api/apply.js`) receives applications and appends them to a team-owned Google Sheet. There are still no npm dependencies.

## STRUCTURE

```text
hanbuddy-landing/
|-- index.html                # main landing page: content, inline Tailwind config, CSS, i18n + analytics + backdrop script
|-- about/index.html          # /about — operator-positioning team page (self-contained copy of nav/footer/consent)
|-- apply/index.html          # /apply — the application form itself (own CONTENT_MAP; renders slots, posts to /api/apply)
|-- privacy/index.html        # /privacy — bilingual limited-measurement, optional-analytics, and application-data notice
|-- api/apply.js              # the only server code: validates, appends to the Sheet, notifies Discord
|-- events/
|   |-- kbo-gocheok/index.html  # /events/kbo-gocheok — Gocheok dome detail page (collage, sticky booking card, lightbox)
|   |-- kbo-jamsil/index.html   # /events/kbo-jamsil — same template for the open-air Jamsil night
|   |-- kleague/index.html    # /events/kleague — same template, three-photo collage
|   |-- samgyeopsal/index.html # /events/samgyeopsal — weekday-recurring food event, four-photo collage
|   |-- chimaek/index.html    # /events/chimaek — same shape as samgyeopsal
|   `-- hanriver/index.html   # /events/hanriver — same template for the Han River picnic
|-- assets/
|   |-- event-slots.js        # EVENT_SLOTS single source: dates, prices, KST expiry (browser + function)
|   |-- apply-validation.js   # form validation shared by the browser and the function
|   |-- brand/                # logos, favicon, apple-touch icon, soma logo (webp + png)
|   |-- photos/kbo/           # run1-* (2026-06-25) and kbo-0726-* (2026-07-26) public WebP derivatives
|   |-- photos/hanriver/      # hanriver-* public WebP derivatives
|   |-- photos/kleague/       # team-owned K League photos (coming-soon card / backdrop)
|   |-- photos/samgyeopsal/   # team-owned Korean BBQ photos: 4 collage shots + landscape OG derivative
|   |-- photos/chimaek/       # team-owned chimaek photos: 4 collage shots + landscape OG derivative
|   `-- raw/                  # untracked originals (.gitignore); never deploy
|-- scripts/dev-server.js     # local dev server (never deployed): real function, stubbed storage, no secrets
|-- tests/                    # node --test suites: about/apply copy sync, slot-vs-card drift, form validation, API privacy, deploy allowlist, analytics consent, review carousel, palette/typography vs DESIGN.md
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
| Change application/contact CTA | `index.html` `CONFIG` + hardcoded anchors | `/apply/` is the only application path on the site; detail pages prefill with `/apply/?event=<id>`. Instagram DM is the default inquiry channel; WhatsApp (`https://wa.me/821082970110`, added 2026-08-10 for international guests) and KakaoTalk follow. A new channel means four edits per surface: `CONFIG`, the anchor, the EN/KO label, and a `CTA_DEFINITIONS` entry plus a `destinations` entry in `assets/analytics.js` (without the latter the Meta `Contact` event is silently dropped) |
| Edit the application form | `apply/index.html` + `assets/apply-validation.js` | Validation is shared with the function — change it once, in the module. Adding a collected field means updating the privacy notice and the sheet header in the same change |
| Update event dates/prices | `assets/event-slots.js` first, then `CONTENT_MAP.events.cards` (EN+KO), `events/*/index.html`, CONVENTIONS below | `EVENT_SLOTS` is the single source; `tests/event-slots.test.js` fails if a card's dates drift from it. Only on explicit instruction; never invent details |
| Close a sold-out date | `assets/event-slots.js` | Capacity is managed by hand (2026-08-06 decision): drop the slot and it disappears from the form |
| Replace public photos | `assets/photos/**` + referencing pages | WebP only, EXIF stripped; photo rules in DESIGN.md; add new folders/extensions to `.vercelignore` |
| Run tests | `node --test tests/*.test.js` | Directory form `node --test tests/` fails on some Node versions — pass the glob |
| Local preview | `node scripts/dev-server.js` (or `python3 -m http.server 8080` for static-only) | The dev server runs the real function with storage stubbed, so the form submits without any secrets. Real Sheet/Discord/GA verification happens on the PR Preview deployment, never locally |
| Deploy | merge to `main` | Vercel GitHub integration auto-deploys `main` to `www.hanbuddy.kr`; `.vercelignore` allowlists what gets served |

## CODE MAP

| Symbol / Section | Type | Location | Role |
|------------------|------|----------|------|
| `tailwind.config` | inline config | `index.html` head (mirrored in `about/`, `events/*`) | Warm-red brand palette (`primary #d13f32` family, `canvas`/`ink`/`muted`/`panel`), Plus Jakarta Sans + DM Sans + Noto Sans KR stacks, subtle/raised shadows |
| `.skip-link`, `.focusable` | CSS utilities | `index.html` style block | Keyboard accessibility entry + shared focus ring (`.focusable-on-primary-strong` variant for dark surfaces) |
| `.eyebrow` | CSS utility | `index.html` style block | Uppercase tracked section label (`.eyebrow-on-primary` on dark surfaces) |
| `.hero-polaroid` / `.hp1–4` | CSS utilities | `index.html` style block | Hero polaroid scatter: desktop corner-pinned tilted snaps with tape + handwritten captions, mobile offset 2-col collage |
| `.photo-card` | CSS utility | `index.html` style block | Rounded photo frame with hover zoom (event cards, detail collages) |
| `.backdrop-slide` | CSS utility | `index.html` style block | Section-backdrop crossfade transition (opacity 1s); used by `#apply` |
| `.review-track` / `.review-arrow` | CSS utility | `index.html` style block | Quote-card carousel: hidden scrollbar on the snap track, dimmed end-state arrows |
| `#top` | section | `index.html` | Hero: headline, pill CTAs, rating chip linking to `#reviews`, featured guest-quote card, polaroid scatter |
| `#events` | section | `index.html` | Meetup-style event cards from `CONTENT_MAP.events.cards` (2-col mobile / 4-col desktop) on the `panel` band shared with `#reviews`: open events link to `/events/*`, coming-soon cards show a toast |
| `#how` | section | `index.html` | 3-step join flow cards (Apply / We confirm / Have fun) |
| `#reviews` | section | `index.html` | Guest reviews on a flat `panel` band (no photos): aggregate rating chip + a manual arrow carousel of 5 approved quote cards, oldest first, opening on card 2; rules in DESIGN.md "Guest Reviews" |
| `#apply` | section | `index.html` | Final CTA `ink` band over an autoplay crossfading photo backdrop (`data-photo-backdrop`, `ink`/70 scrim): `/apply/`, Instagram DM, WhatsApp, KakaoTalk, one-line buddy note. Cookie disclosure lives in the consent banner; the personal-data notice lives in the form |
| `/apply/` | page | `apply/index.html` | The application form: renders open events and their remaining slots from `EVENT_SLOTS`, validates with the shared module, posts to `/api/apply`, and switches to the done screen in place. `?event=<id>` prefills but stays changeable |
| `/privacy/` | page | `privacy/index.html` | Bilingual public notice separating limited cookieless campaign measurement, opt-in Google/Meta behavior analytics, and application-data processing |
| `EVENT_SLOTS` | module | `assets/event-slots.js` | Single source for event dates, prices, and EN/KO slot labels. Expiry is judged in KST so the browser and the function agree regardless of the reader's timezone |
| `validateApplication` | module | `assets/apply-validation.js` | The one validator. The browser runs it for instant feedback and the function runs it again, because browser checks are bypassable |
| `POST /api/apply` | function | `api/apply.js` | Revalidates, then calls the Sheet and Discord in parallel; one success is enough to accept. Each storage path carries **one** deadline for the whole path, not one per hop, so adding a hop cannot quietly raise the ceiling. Signs the service-account JWT with Node's built-in `crypto` (no npm) |
| `/about` | page | `about/index.html` | Operator-positioning team page: full-bleed photo hero, origin section, zigzag how-we-run-it section, dark timeline band of completed/upcoming runs, team section, final CTA; own CONTENT_MAP |
| `/events/kbo-gocheok/`, `/events/kbo-jamsil/`, `/events/kleague/`, `/events/hanriver/` | pages | `events/*/index.html` | Booking-style detail pages: title block, photo collage + focus-trapped lightbox, sticky booking card (desktop) / bottom CTA bar (mobile) |
| `CONFIG` | inline JS object | `index.html` script | Maps CTA keys to external URLs + GA/Pixel IDs |
| `CONTENT_MAP` | inline JS object | `index.html` script | EN/KO copy: meta, nav, hero, events cards, how, reviews, finalCta, footer, consent |
| `showToast` / `renderEventCards` / `renderReviewCards` | JS | `index.html` script | Dynamic renderers re-run on language switch |
| `startPhotoBackdrop` | JS | `index.html` script | 6s autoplay crossfade for the photos inside `[data-photo-backdrop]` (currently `#apply`); disabled under `prefers-reduced-motion` |
| `scrollReviewsBy` / `syncReviewArrows` | JS | `index.html` script | Quote-card carousel: arrows scroll one card, end states set `disabled`; re-synced after every render, scroll, and resize |
| `alignReviewsToDefaultCard` | JS | `index.html` script | Opens the carousel on card `DEFAULT_REVIEW_CARD_INDEX` (2nd — card 1 is the hero quote). Re-runs until layout settles because Tailwind CDN sizes cards late; any arrow click, wheel, pointer, or key input on the track stops it for good |
| Consent + analytics | JS | `assets/analytics.js` + public pages | Marketing pages use Google advanced consent mode: before or after refusal, Google receives one sanitized cookieless `page_view`, while behavior events and Meta stay opt-in only. `/apply/` uses basic mode and blocks Google and Meta until opt-in. CTA keys map to GA4 events as `apply` → `application_form_open`, `contact`/`instagram` → `contact_click`, and `meetup` → `community_click`; other GA4 events include `select_content`, `language_switch`, `section_view`, plus the `/apply/` funnel (`application_start`, `application_error`, `generate_lead`). Every program-related GA event carries GA's predefined `content_id` with `content_type: experience`, so one standard dimension spans the full funnel. Meta uses the custom event `ApplicationFormOpen` and the standard events `Contact` and `Lead`. Application saving is service delivery and remains independent of analytics consent |
| Lightbox | JS | `events/*/index.html` | Full-screen photo viewer: arrows, arrow-key/Escape, focus moved to close button on open, Tab trapped inside, focus restored to trigger on close. Image + counter only, no on-screen caption (유현님 rule, 2026-08-10); the `alt` text stays for screen readers |

## CONVENTIONS

### Product facts (update only on explicit instruction)

- Positioning is date-driven events, not weekend-only (2026-07-28): baseball can run on weekdays.
- The Aug 1 (Han River) and Aug 5 (KBO) runs were cancelled on 2026-08-04 (heat wave + not enough signups); both dates are removed from all public surfaces and must not be reintroduced.
- Current published events — Indoor Dome KBO Baseball Night (Beat the Seoul Heat): Aug 12 (Wed), Aug 21 (Fri) & Aug 22 (Sat) at Gocheok Sky Dome, ₩60,000 since 2026-08-04 (the Aug 12 game is Kiwoom Heroes vs LG Twins, 5:30–9:30 PM; Aug 21 & 22 were added on 2026-08-06 and their opponents are not published), game ticket & stadium food included, run with a professional local guide who reached out to the team. The published Meetup listing is `https://www.meetup.com/discover-korea-with-local-buddies/events/315972054/` (not linked from the landing site by 유현님's decision — `/apply/` is the single application path from the site). Open-Air KBO Baseball Night at Jamsil (`/events/kbo-jamsil/`): Aug 15 (Sat), Aug 16 (Sun), Aug 21 (Fri) & Aug 22 (Sat), ₩60,000, game ticket & stadium food included — split from the dome event on 2026-08-04 so indoor and open-air read as separate activities. Han River Picnic: Aug 15 (Sat), Aug 16 (Sun), Aug 22 (Sat) & Aug 23 (Sun), ₩20,000 since 2026-08-10 (down from ₩25,000), picnic food included: the fee covers delivery ordered to the riverside on the day (Korean fried chicken, tteokbokki and similar), and the detail page says so as of 2026-08-10. It is deliberately written as examples, not a fixed menu, because what gets ordered depends on the group. The main card says `chicken delivery`, not `chimaek delivery` (유현님, 2026-08-10): chimaek means chicken **and beer**, and the fee covers food, so the old wording read as if a drink were included. — Aug 15 & 16 were published on 2026-08-06 to match the slots already offered in the application form, so the picnic and the Jamsil baseball night share those two dates; on 2026-08-10 Aug 8 & 9 came off the list and Aug 22 & 23 were published in their place. Whether the Aug 8 & 9 picnics actually ran is not recorded here, so they are not completed-operation proof. K League Football Night (`/events/kleague/`): Aug 15 (Sat) at Seoul World Cup Stadium, meet 6:30 PM, ₩60,000, match ticket & stadium food included — published on 2026-08-06; the opponent and kickoff time are not published. Korean BBQ Night (`/events/samgyeopsal/`) and Chimaek Night (`/events/chimaek/`): **weekday-recurring, not fixed dates**, meet 7:00 PM, ₩20,000 each, added 2026-08-10. The jjimjilbang card was removed the same day: it had never run and the operating rules (undress, gender separation, entry) were never settled, so an application would have had no answer. Prices now sit on exactly two tiers, ₩20,000 (Han River, BBQ, chimaek) and ₩60,000 (baseball, football); Han River came down from ₩25,000 on 2026-08-10 so the entry price is a single number.
- Baseball meeting time follows one rule: **5:30 PM on weekdays, 5:00 PM on weekends**. Other sports keep their own kickoff-driven time (K League on Aug 15 meets at 6:30 PM). In every case this is when the group gathers, not when play starts, so public copy says "meet at" rather than a bare time.
- Food events (Korean BBQ Night, Chimaek Night), approved 2026-08-10 in `soma-memory/30_planning/2026-08-10-food-program-run-design.md`: **weekday-recurring, no fixed dates**, meet 7:00 PM, about 2 hours, ₩20,000, up to 6 guests with one local buddy. BBQ includes pork belly, side dishes and rice; drinks are not included. ⚠️ The BBQ page deliberately does **not** print the drinks exclusion or the group size (유현님, 2026-08-10): what a fee does not cover is decided on the night anyway, and listing it only adds a condition to an entry product. Both remain true operationally, they are just not public copy. Chimaek includes fried chicken and one draft beer or a non-alcoholic drink at the same price; sides are not included. ⚠️ **The chimaek order is not fixed as half fried / half sauced** (유현님, 2026-08-10). The design doc proposes it as a tasting activity, but the flavour is chosen at the table on the night, so the page must not promise a specific split. Like the BBQ page, chimaek also stops printing the sides exclusion and the group size: both stay true operationally, neither is public copy. `Pork-based` must stay visible before anyone applies to the BBQ night: a guest who does not eat pork finding out on the day is a refund and reputation problem.
- ⚠️ **The BBQ night is not advertised as all-you-can-eat.** The design doc plans for an all-you-can-eat venue but lists three fallbacks where it is not one, and no venue is booked yet. Publishing an unconditional refill promise before the booking exists is a promise we may not be able to keep. Revisit once a venue is confirmed.
- ⚠️ **No restaurant, district, or timeline is published for the food events.** Hongdae > Konkuk > Wangsimni is a search priority, not a decision. Pages say `Seoul` only until a venue is booked. The chimaek page also carries no halal statement: the design doc's caveat is conditional on the venue, so it cannot be asserted yet.
- Do not invent venue, capacity, exact time, payment method, cancellation/refund terms, or guarantees beyond these facts.
- Applications go through `/apply/` (`CONFIG.apply`), the site's own form, since 2026-08-07. The Google Form (`https://forms.gle/B1fWgX3MjtHUHGNt5`) is kept alive only because its link is already out on Meetup and Instagram; no landing surface links to it. Instagram DM (`@hanbuddy_kr`) is the default guest inquiry channel; KakaoTalk open chat is secondary and the local-buddy channel.
- **We answer an application within 24 hours** and confirm the spot in that reply (2026-08-06 decision). The done screen promises this number, so every channel must use the same one. If the team cannot hold it, change the copy before missing the promise.
- Applications are stored in a team-owned Google Sheet, kept for **6 months after the event**, then deleted by hand (2026-08-06 decision). The sheet's column order is fixed and `api/apply.js` appends positionally — never reorder it.
- ⚠️ The purge covers **two places, not one**. Every application is also posted in full to the Discord channel, so deleting only the sheet rows leaves a complete copy of names and contact IDs in Discord history forever. The retention notice in the form promises deletion, so both have to be cleared.
- Completed runs usable as public proof: 2026-06-25 Jamsil KBO (Samsung Lions vs LG Twins), 2026-07-26 Jamsil KBO, and 2026-08-01 Han River picnic (⚠️ the Aug 1 picnic was reported cancelled on 2026-08-04, which contradicts this line — 유현님 chose on 2026-08-04 to change only the main page for now, so the `/about` timeline still shows it as completed. Resolve before the next public-copy change). The Aug 15, 16, 22 & 23 Han River picnics have not run yet, and K League and jjimjilbang have never been operated — their photos may be used only for upcoming/coming-up items or with neutral place-describing captions, never as completed-operation proof.

### Activity names (canonical across every channel)

An activity has exactly one canonical name. Landing cards, event detail titles, and the response sheet use it bare; Meetup, the application form, and ad creative may wrap it with one of the two extensions below, but nothing may replace it. Before 2026-08-06 the same activity carried three different names across channels, which made the two baseball activities read as unrelated products.

| Activity | Canonical EN | Canonical KO |
|---|---|---|
| Gocheok, indoor | `Indoor Dome KBO Baseball Night` | `고척돔 실내 야구 직관` |
| Jamsil, open-air | `Open-Air KBO Baseball Night at Jamsil` | `잠실 야외 야구 직관` |
| Han River | `Han River Picnic` | `한강 피크닉` |
| Seoul World Cup Stadium | `K League Football Night` | `K리그 축구 직관` |

- The two baseball activities share the `KBO Baseball Night` stem; only the indoor/open-air qualifier and the venue differ. Keep that stem when adding a venue. `KBO baseball` reads naturally in English the way `MLB baseball` does, and it captures both search terms: guests who already follow Korean baseball search `KBO`, everyone else searches `baseball`.
- `K League Football Night` carries no venue because there is only one football ground; add one only if a second appears. It was `K League Football Day` while the card sat in "coming soon", renamed on 2026-08-06 when the 6:30 PM meeting time made "Day" wrong.
- `Indoor Dome` is the summer hook (heat wave positioning) and stays in the name while that framing holds.
- Two extensions may wrap a canonical name. Nothing else may rename an activity.
  - **Campaign subtitle**, after a colon, on Meetup titles and on that event's own detail `h1`: `Indoor Dome KBO Baseball Night: Beat the Seoul Heat`. A detail page belongs to one event, so the campaign framing reads naturally there. Landing cards carry no subtitle, because five cards of framing compete instead of inform.
  - **`with a Local Buddy` suffix**, only where the brand context is missing: Meetup titles, the external Google Form, and ad creative. That entry meant the Google Form, which people reach without ever seeing the site; the landing form at `/apply/` has the brand context already, so it uses the bare canonical name. Landing cards, detail headings, and the response sheet also use the bare name, because the page already says who you go with and repeating it on five cards costs contrast without adding information. Write `with a Local Buddy` or `with Local Buddies`, never the article-less `with Local Buddy`.
- Meetup titles carry a subtitle or the suffix, never both: the card truncates after two lines, so adding both cuts off whichever comes last. `Indoor Dome KBO Baseball Night: Beat the Seoul Heat` keeps its subtitle; the Jamsil title has no subtitle and takes the suffix.
- **Event ids** (`CONTENT_MAP.events.cards[].id`, GA `content_id`, the application sheet's `event_id`) follow one rule: when two runs share a sport but differ by venue, the id is `sport-venue`. So `kbo-gocheok` and `kbo-jamsil`, while `hanriver`, `kleague`, `samgyeopsal`, and `chimaek` stay bare until a second venue appears. Until 2026-08-06 the ids were `kbo` (Gocheok only) and `jamsil`, which read as if Jamsil were not a KBO game. GA sends `content_id` with `content_type: experience` on every program-related event so its predefined Content ID dimension spans the full funnel; the application API and sheet keep `event_id` as their operational field.
- An event detail page's `data-analytics-content-id` must equal its card id, or the same run is counted under two names in GA and in the sheet. `tests/analytics-pages.test.js` enforces this.
- Event **URLs** follow the same ids: `/events/kbo-gocheok/`, `/events/kbo-jamsil/`. Renamed on 2026-08-06 once 유현님 confirmed only the root domain had been shared externally (ads, Meetup, and Instagram all point at `hanbuddy.kr`). No redirects were left behind, so never publish a detail URL without checking this list first.
- The `/about` timeline is exempt: its entries are narrative records of what happened on a date (`Jamsil KBO: our first baseball night`), not activity labels, so they keep their own wording.
- `Han River Tour` is retired; the activity is a picnic.

### Approved public quotes (verbatim; nothing else may be quoted)

1. Run 1 survey promo field: "If you are looking to experience Korean baseball culture with local Koreans, then this is the program you want to join!" / fixed KO: "한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면, HanBuddy가 바로 당신이 참여하고 싶은 프로그램입니다!"
2. 2026-07-26 survey promo field: "Great experience to enjoy a baseball game with a local" / KO "로컬 버디와 함께 야구 경기를 즐길 수 있어 정말 좋은 경험이었어요"
3. 2026-07-26 survey "What did you like" field (유현님 approved this field for publication, 2026-07-29): "It was fun to watch the game and cheer together!" / KO "함께 응원하며 경기를 보는 게 정말 재미있었어요!" — only the sentence-initial capital is normalized.
4. KakaoTalk message from a July guest, approved in trimmed form (2026-07-28): "I had such a great evening — will definitely be going to another game with HanBuddy!"
5. 2026-08-02 survey promo field (2026-07-26 run participant), single-sentence excerpt of a longer answer: "They did a fantastic job of explaining what was happening during the game." / KO "경기 중에 무슨 일이 벌어지고 있는지 정말 잘 설명해 줬어요." — the same excerpt is used in the `2026-08-03-ugc-v3` reels script.
- Answers from the "What could be improved" survey field remain off-limits for public copy.
- The aggregate "4.7 / 5 average guest rating" is the mean of all post-event survey satisfaction scores to date; update only by recomputing from the survey sheet, and never expose any individual score.

### Photos

- Public photos are EXIF-stripped WebP derivatives only; originals stay untracked in `assets/raw/` (or outside the repo) and must never deploy.
- Participant photo use is consent-based (tracked per run by the team); bystander faces get blurred (`kbo-0726-group.webp` precedent). Selfies from Samsung front cameras may be saved mirrored — check jersey/sign text after conversion.
- Backdrop/decorative photos must not show identifiable faces up close (유현님 rule, 2026-07-29); landscape orientation only for full-bleed backdrops (see DESIGN.md).
- `assets/photos/kleague/*`, `assets/photos/samgyeopsal/*`, and `assets/photos/chimaek/*` are team-owned. Only `chimaek-table.webp` shows a person (a guest from the shoulders down, consent recorded 2026-08-10). Every other food photo was chosen or cropped so that no person appears at all: `samgyeopsal-table.webp` is cropped 24% off the top for exactly this reason, and shots where people were central to the frame were left out of the set. The CC0 jjimjilbang photos were deleted on 2026-08-10 with the activity.
- Event detail pages need a **landscape** OG image. Card photos are portrait (1200×1600), so the food pages carry a separate `*-og.webp` cropped to 1600×1000. Reusing the portrait card image as OG is the bug that already bit `run1-group.webp`.
- When adding a public asset folder or extension, update the `.vercelignore` allowlist in the same change.

### Copy & structure

- Keep this buildless. Production is the allowlisted HTML + WebP photos, the brand PNGs in `assets/brand/`, and one dependency-free function. Adding tooling needs a functional reason, not a preference: copy, styles, and new pages keep shipping without a build. If an integration genuinely cannot be done with the standard library, take the dependency and write down why. Today there are none because `google-auth-library` would only have signed a JWT and cached a token, which is not worth a lock file and cold-start cost.
- Body copy defaults to English for international guests; the KO toggle serves local buddies and stakeholders. Keep `CONTENT_MAP` EN/KO and static fallback DOM text in sync (including `#events` grid classes and dynamic renderers).
- Korean/local buddy recruitment stays a one-line note in `#apply`; do not re-expand it into its own section.
- The site collects personal information through `/apply/` and stores it in the team's Google Sheet. What it collects, why, how long it is kept (6 months after the event), and the deletion contact (`zeroone.soma@gmail.com`) are all stated in the form, behind a required consent checkbox. Collecting a new field means updating that notice and the sheet header in the same change. Nothing personal is ever committed to this repo.
- CTA URLs appear both as hardcoded anchors and in `CONFIG`; keep both aligned so the page works before JS enhancement.
- Maintainer-only guardrail: do not expose F001, 4/5, 30,000, under 30,000, Less than 30,000, pre-acquaintance, local Korean interaction, proof of scale, learning signal, PMF caveats, payment sensitivity, or improvement criticism in public copy, metadata, alt text, README public summary, or deploy artifacts.
- The June 25 Run 1 Notion guide is historical and intentionally absent from public surfaces; do not restore it without an explicitly approved current replacement.
- Tailwind loads from CDN with inline config on every page. Broad public release should consider precompiled or inline CSS.

## ANTI-PATTERNS

- Do not deploy the whole repository folder or bypass `.vercelignore`.
- Do not include `.git/`, `.omo/`, `.superpowers/`, `.serena/`, QA screenshots, local tokens, raw JPG/JPEG photos, or tool evidence in any public artifact.
- Do not add participant phone numbers, payment details, secrets, private chat logs, or unapproved direct quotes to this repo.
- Do not reintroduce retired recruitment facts as current truth: "3 spots left", "8 seats booked", "first pilot recruitment", and the July 18/19 & 25/26 "Run 2" window are history. (Note: the KBO price is ₩60,000 since 2026-08-04; ₩50,000 and the older "50,000 KRW" pilot framing are both retired.)
- Do not expose internal weak-validation details in public copy; maintainer checks may mention them only to verify their absence.
- Do not create package/build tooling just to make small copy changes, and do not split pages into a framework structure unless routing/reuse/builds become real requirements.
- ⚠️ Do not log applicant data on the server. One `console.log(body)` puts names and contact IDs in the Vercel function log in plain text, and "no personal data in the repo" does not cover that path. `api/apply.js` never calls `console.*` directly: it uses the logging helper, which passes only `application_id`, `code`, and `stage`. `tests/api-apply.test.js` enforces both halves.
- Do not return internal error text from the API. Only the defined codes (`VALIDATION`, `STORAGE`, `METHOD`) go back to the browser.
- Do not put secrets in the repo. The service-account key and the Discord webhook live in Vercel environment variables only, and `.env*` is gitignored because `vercel env pull` writes the key in plain text.
- Do not pull the production service-account key onto a laptop. `scripts/dev-server.js` covers local form work without any credential, and the PR Preview deployment covers real Sheet/Discord verification. If local testing against a real sheet ever becomes necessary, make a separate service account and a separate test sheet rather than reusing production.
- Do not add a server or asset file without extending the `.vercelignore` allowlist in the same change; `tests/deploy-allowlist.test.js` fails if you forget. The same test also fails in the other direction, if a folder-wide un-ignore (`!/scripts`) would push internal files onto the public site.
- Do not treat `.omo/evidence/` or `docs/superpowers/` as current truth without rechecking against the live files.

## COMMANDS

```bash
# Local preview with the form working end to end (no secrets needed)
cd ~/projects/hanbuddy-landing
node scripts/dev-server.js            # http://127.0.0.1:8099/apply/
QA_SCENARIO=sheet-fail node scripts/dev-server.js   # or both-fail, to see the failure branches
# ⚠️ storage is stubbed: a "received" screen here does NOT prove the Sheet works.

# Static-only preview (fastest, but every form submit fails — /api/ does not run)
python3 -m http.server 8080

# Tests (pass the glob — `node --test tests/` fails on some Node versions)
node --test tests/*.test.js

# Ship (team rule: never push main directly)
git switch -c feat/<topic>   # work, commit
gh pr create                 # CodeRabbit reviews; apply valid findings
gh pr merge <N> --squash --delete-branch   # merging main auto-deploys via Vercel

# Verify what would deploy (simulate the .vercelignore allowlist)
tmp=$(mktemp -d) && git -C . ls-files >/dev/null && cp .vercelignore "$tmp/.gitignore" && \
  git -C "$tmp" init -q && cp -R index.html favicon.ico about apply api events assets "$tmp/" 2>/dev/null && \
  git -C "$tmp" add -n . | sort

# Quick content check (current facts)
rg -n "Aug 5|Aug 12|₩50,000|₩25,000|www.hanbuddy.kr" index.html events README.md

# The landing site must never point at the Google Form again — this should print nothing
rg -n "forms.gle" index.html about apply events
```

## NOTES

- Production domain: `www.hanbuddy.kr` (Vercel project `hanbuddy-landing`); merging `main` auto-deploys — no manual `vercel --prod` needed.
- OG/Twitter image for `index.html` and `/about` is `assets/photos/kbo/kbo-0726-group.webp` (absolute URL on the production domain); event detail pages carry their own OG images. Share images must be landscape: the previous `run1-group.webp` was 975×1300 portrait and cropped badly under `summary_large_image`.
- `assets/brand/logo-borderless.png` is the fixed email-signature asset at `https://www.hanbuddy.kr/assets/brand/logo-borderless.png` — do not move or rename it.
- `.vercelignore` is the deploy guardrail: Vercel CLI uploads the working directory, not the git tree. Before it existed (2026-07-10), internal docs and raw JPGs were publicly served — keep the allowlist in sync when adding public files.
- Tests exist but no CI workflow runs them; run the node --test command locally before pushing. For visual changes, use local preview and check desktop/mobile in the browser.
- Team repo rules: always branch + PR (main direct push is hook-blocked), squash merge, no AI co-author trailers in commits or PR bodies.
