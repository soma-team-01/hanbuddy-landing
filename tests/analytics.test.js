const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const analyticsJs = readFileSync(join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');
const privacyPath = join(__dirname, '..', 'privacy', 'index.html');
const privacyHtml = readFileSync(privacyPath, 'utf8');

test('keeps vendor scripts out of the initial HTML', () => {
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
  assert.match(analyticsJs, /metaEvent: 'Contact'/);
  assert.match(analyticsJs, /trackCustom/);
  assert.match(analyticsJs, /trackMetaStandard/);
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

test('discloses cookieless campaign measurement and optional advertising analytics', () => {
  assert.match(html, /consent\.note/, 'the banner needs its disclosure line');

  const consentCopy = [...html.matchAll(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm)].map((m) => m[0]);
  assert.equal(consentCopy.length, 2, 'EN and KO consent copy must both exist');

  for (const block of consentCopy) {
    assert.match(block, /Google Analytics/, 'name the analytics recipient');
    assert.match(block, /Meta Pixel/, 'name the advertising recipient');
    assert.match(block, /UTM/, 'disclose campaign-tag measurement');
    assert.match(block, /cookie-free|쿠키 없이/, 'disclose the cookieless visit');
    assert.match(block, /form answers|폼 입력값/, 'exclude application answers');
    assert.match(block, /ads|ad reach|reach people|광고/, 'disclose the advertising purpose');
    assert.match(block, /Cookie settings|쿠키 설정/, 'point to the way out');
  }
});

test('publishes a bilingual privacy notice for analytics and applications', () => {
  assert.ok(privacyHtml, 'privacy/index.html must exist');
  assert.match(privacyHtml, /data-analytics-page-type="privacy"/);
  assert.match(privacyHtml, /data-analytics-consent-mode="advanced"/);
  for (const term of [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term',
    'Google Analytics', 'Meta Pixel', 'Google Sheet', 'Discord', '6 months',
    'zeroone.soma@gmail.com', 'Cookie settings', '쿠키 설정',
  ]) {
    assert.ok(privacyHtml.includes(term), `privacy notice missing: ${term}`);
  }
  assert.match(privacyHtml, /not link|연결하지/);
  assert.match(privacyHtml, /GPC|Global Privacy Control/);
  assert.match(privacyHtml, /Do Not Track|DNT/);
  assert.doesNotMatch(
    privacyHtml,
    /capped at 100 characters|100자로 제한|email- or phone-looking|이메일·전화번호처럼 보이는/,
    'public copy must describe the privacy rule without exposing filter implementation details',
  );
  assert.match(privacyHtml, /appear to contain personal information|개인정보가 포함된 것으로 보이는/);
});

test('every consent banner links to the privacy notice before a choice', () => {
  const pages = [
    'index.html',
    'about/index.html',
    'apply/index.html',
    'privacy/index.html',
    'events/kbo-gocheok/index.html',
    'events/kbo-jamsil/index.html',
    'events/korea-football/index.html',
    'events/hanriver/index.html',
  ];

  for (const page of pages) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    const banner = source.match(/<section[^>]*id="analytics-consent"[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(banner, `${page} must include the analytics consent banner`);
    assert.match(
      banner,
      /<a[^>]*href="\/privacy\/"/,
      `${page} must link Privacy directly from the consent banner`,
    );
  }
});

test('every public footer links to the privacy notice', () => {
  const pages = [
    'index.html',
    'about/index.html',
    'apply/index.html',
    'events/kbo-gocheok/index.html',
    'events/kbo-jamsil/index.html',
    'events/korea-football/index.html',
    'events/hanriver/index.html',
  ];
  for (const page of pages) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.match(source, /href="\/privacy\/"/, `${page} must link the privacy notice`);
  }
  assert.match(privacyHtml, /href="\/privacy\/"/);
});

test('apply CTAs point at the landing form, not the Google Form', () => {
  // 스펙 14절이 세어둔 6개 파일 전부. about을 빠뜨리면 그 페이지만 외부 폼으로 나간다.
  const pages = ['index.html', 'about/index.html', 'events/kbo-gocheok/index.html',
    'events/kbo-jamsil/index.html', 'events/korea-football/index.html', 'events/hanriver/index.html'];
  for (const page of pages) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.doesNotMatch(source, /forms\.gle/, `${page} still links the Google Form`);
    assert.match(source, /href="\/apply\//, `${page} must link the landing form`);
  }
  assert.match(analyticsJs, /application_page: '\/apply\/'/);
  assert.doesNotMatch(analyticsJs, /google_form:/);
});

test('event pages prefill their own event on the landing form', () => {
  // 프리필이 없으면 잠실 카드를 눌러도 폼에서 회차를 처음부터 골라야 한다.
  for (const eventId of ['kbo-gocheok', 'kbo-jamsil', 'korea-football', 'hanriver']) {
    const source = readFileSync(join(__dirname, '..', 'events', eventId, 'index.html'), 'utf8');
    const links = source.match(/href="\/apply\/\?event=([a-z-]+)"/g) || [];
    assert.equal(links.length, 2, `${eventId} should carry both apply CTAs`);
    for (const link of links) {
      assert.ok(link.includes(`event=${eventId}`), `${eventId} prefills the wrong event: ${link}`);
    }
  }
});

test('pages no longer claim they store nothing', () => {
  for (const page of ['events/kbo-gocheok/index.html', 'events/hanriver/index.html']) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.doesNotMatch(source, /never stores your application answers/);
  }
});
