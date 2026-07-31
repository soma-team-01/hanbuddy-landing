# Sitewide Analytics Schema Design

## Goal

Extend the existing consent-gated GA4 and Meta Pixel tracking to the KBO and
Han River event-detail pages, while giving every tracked interaction a
consistent, page-independent parameter schema.

## Scope

- Keep direct `gtag.js` and Meta Pixel integration for the imminent ad launch.
- Do not introduce GTM in this change.
- Preserve the existing explicit opt-in behavior and the shared
  `hanbuddy.analyticsConsent` local-storage choice.
- Track the home, About, KBO detail, and Han River detail pages.
- Never send Google Form answers or other personal information.

## Architecture

Move the duplicated analytics loader, consent controller, and event builders
into `/assets/analytics.js`. Every public HTML page loads this same-origin
script synchronously in the document head. The script establishes Google's
default denied consent state immediately, then binds the consent UI and event
listeners after the DOM is ready.

Page-specific context comes from body data attributes:

- `data-analytics-page-type="home"`
- `data-analytics-page-type="about"`
- `data-analytics-page-type="event_detail"`
- `data-analytics-experience-type="kbo|hanriver"` on detail pages

The current landing-page language is read from `document.documentElement.lang`
at event time.

## Canonical Event Schema

### GA4 `cta_click`

Every element with `data-cta` sends one `cta_click` event:

- `cta_type`: `apply`, `navigation`, `contact`, `community`, or `profile`
- `destination`: `google_form`, `instagram`, `kakaotalk`, `meetup`, or
  `linkedin`; the home-page anchor uses `apply_section`
- `placement`: `nav`, `footer`, an explicit `data-analytics-placement`, the
  nearest section ID, or `page`
- `page_type`: `home`, `about`, or `event_detail`
- `content_language`: current `html[lang]`
- `experience_type`: `kbo` or `hanriver` on detail pages only
- `profile_id`: team-member slug for LinkedIn profile CTAs only

Meta keeps the existing high-intent custom events:

- `ApplicationFormOpen` for the live Google Form
- `ContactClick` for the live Instagram and KakaoTalk destinations

Both receive the same contextual parameters as GA4.

### GA4 `select_content`

An event-card click sends Google's recommended `select_content` event:

- `content_type`: `experience`
- `item_id`: the stable event-card ID (GA4's documented `select_content` parameter)
- `availability_status`: `open` or `soon`
- common page context

### GA4 `section_view`

Every section marked `data-analytics-section` sends one event when at least 20%
is visible:

- `section_id`
- common page context

### GA4 `language_switch`

A real language change sends:

- `content_language`: new language
- `previous_content_language`: previous language
- common page context

## Detail-Page Coverage

Both event-detail pages receive:

- the shared consent banner and footer cookie-settings control
- consent-gated GA4 `page_view` and Meta `PageView`
- `cta_click` for desktop and mobile Google Form buttons
- `cta_click` for Instagram contact
- `ApplicationFormOpen` and `ContactClick` Meta custom events
- `page_type="event_detail"` plus the page's `experience_type`

The two application placements are explicitly distinguished as
`desktop_sidebar` and `mobile_sticky`.

## Host and Consent Behavior

Tracking remains disabled on `localhost`, `127.0.0.1`, and `::1`. A production
hostname allowlist is intentionally deferred because the canonical production
hostname must be confirmed separately; changing host policy is outside this
approved scope.

Rejecting or revoking consent updates Google to denied and calls Meta consent
revoke. No custom event is sent unless consent is stored as `granted`.

## Verification

- Node tests exercise event-payload builders as real functions.
- Integration tests ensure all four deployable pages load the shared module,
  expose the consent controls, and declare the required page/CTA metadata.
- Existing copy, design, privacy-guardrail, and deployment tests remain green.
- A local HTTP preview is checked at desktop and mobile widths for the modified
  consent UI and event-detail CTA layout.
