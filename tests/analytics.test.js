const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const analyticsJs = readFileSync(join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');

test('keeps Google and Meta analytics behind an explicit consent choice', () => {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i,
    'Google Analytics must not load eagerly from the initial HTML',
  );
  assert.doesNotMatch(
    html,
    /<script[^>]+src=["']https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/i,
    'Meta Pixel must not load eagerly from the initial HTML',
  );
  assert.match(html, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(html, /data-consent-banner/);
  assert.match(html, /data-consent-action="accept"/);
  assert.match(html, /data-consent-action="reject"/);
  assert.match(analyticsJs, /hanbuddy\.analyticsConsent/);
});

test('configures the Meta Pixel and maps only high-intent outbound CTA events', () => {
  assert.match(analyticsJs, /4569887956575986/);
  assert.match(analyticsJs, /connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(analyticsJs, /ApplicationFormOpen/);
  assert.match(analyticsJs, /ContactClick/);
  assert.match(analyticsJs, /trackCustom/);
});

test('lets visitors reopen their analytics consent settings', () => {
  assert.match(html, /data-consent-settings/);
  assert.match(html, /consent\.settings/);
});

test('asks for consent only after the visitor has seen some of the page', () => {
  // 배너가 끝내 안 뜨면 아무도 동의할 수 없다. 지연 경로와 폴백을 함께 고정한다.
  assert.match(analyticsJs, /deferConsentBanner/, 'consent banner must be deferred, not shown on load');
  assert.match(analyticsJs, /CONSENT_BANNER_DELAY_MS/, 'the delay must stay a named constant');
  assert.match(analyticsJs, /CONSENT_BANNER_SCROLL_PX/, 'scrolling must also reveal the banner');
  assert.match(analyticsJs, /canDelay/);
  assert.match(analyticsJs, /canWatchScroll/);
});

test('states the advertising purpose and the way out in the banner itself', () => {
  // 버튼에서 "ads"를 뺀 만큼 본문이 목적과 철회 방법을 져야 한다. 문구 자체를
  // 적어두면 카피를 다듬을 때마다 테스트가 깨지므로 요소가 있는지만 확인한다.
  assert.match(html, /consent\.note/, 'the banner needs its disclosure line');

  const consentCopy = [...html.matchAll(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm)].map((m) => m[0]);
  assert.equal(consentCopy.length, 2, 'EN and KO consent copy must both exist');

  for (const block of consentCopy) {
    assert.match(block, /Google Analytics/, 'name the analytics recipient');
    assert.match(block, /Meta Pixel/, 'name the advertising recipient');
    assert.match(block, /ads|reach people|광고/, 'disclose the advertising purpose');
    assert.match(block, /Cookie settings|쿠키 설정/, 'point to the way out');
  }
});
