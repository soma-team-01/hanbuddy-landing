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

test('does not load third-party analytics on local preview hosts', () => {
  assert.match(analyticsJs, /localhost/);
  assert.match(analyticsJs, /127\.0\.0\.1/);
  assert.match(analyticsJs, /isTrackableHostname/);
});

test('lets visitors reopen their analytics consent settings', () => {
  assert.match(html, /data-consent-settings/);
  assert.match(html, /consent\.settings/);
});
