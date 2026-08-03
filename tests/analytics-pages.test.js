const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const readPage = (...parts) => readFileSync(join(__dirname, '..', ...parts), 'utf8');
const homeHtml = readPage('index.html');
const aboutHtml = readPage('about', 'index.html');
const detailPages = [
  { name: 'KBO', experienceType: 'kbo', html: readPage('events', 'kbo', 'index.html') },
  { name: 'Han River', experienceType: 'hanriver', html: readPage('events', 'hanriver', 'index.html') },
];
const publicPages = [
  { name: 'Home', html: homeHtml },
  { name: 'About', html: aboutHtml },
  ...detailPages,
];

test('home and About load the shared analytics module with canonical page context', () => {
  assert.match(homeHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(homeHtml, /<body[^>]*data-analytics-page-type="home"/);
  assert.match(aboutHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(aboutHtml, /<body[^>]*data-analytics-page-type="about"/);
});

test('home and About no longer embed vendor loader implementations', () => {
  for (const html of [homeHtml, aboutHtml]) {
    assert.doesNotMatch(html, /googleMeasurementId|metaPixelId/);
    assert.doesNotMatch(html, /const loadGoogleAnalytics|const loadMetaPixel/);
    assert.doesNotMatch(html, /connect\.facebook\.net\/en_US\/fbevents\.js/);
    assert.doesNotMatch(html, /googletagmanager\.com\/gtag\/js/);
  }
});

test('tracked landing sections declare the shared section contract', () => {
  for (const id of ['events', 'how', 'reviews', 'apply']) {
    assert.match(
      homeHtml,
      new RegExp(`<section id="${id}"[^>]*data-analytics-section`),
      `home section #${id} must be tracked`,
    );
  }
  for (const id of ['origin', 'how', 'timeline', 'team', 'join']) {
    assert.match(
      aboutHtml,
      new RegExp(`<section id="${id}"[^>]*data-analytics-section`),
      `About section #${id} must be tracked`,
    );
  }
});

test('event cards expose canonical content-selection metadata', () => {
  assert.match(homeHtml, /card\.dataset\.analyticsContentId = item\.id/);
  assert.match(homeHtml, /card\.dataset\.analyticsContentStatus = item\.status/);
  assert.doesNotMatch(homeHtml, /track\('event_card_click'/);
});

test('on-page application navigation is distinct from a Google Form open', () => {
  assert.match(homeHtml, /href="#apply" data-cta="apply_section"/);
  assert.doesNotMatch(homeHtml, /href="#apply" data-cta="apply"/);
});

const languageSwitchStatement = (html) => {
  const match = html.match(/if \(previous !== lang\) [^\n]+;/);
  assert.ok(match, 'language switch tracking statement must exist');
  return match[0];
};

test('language switching remains available when analytics is unavailable', () => {
  for (const html of [homeHtml, aboutHtml]) {
    assert.doesNotThrow(() => runInNewContext(
      languageSwitchStatement(html),
      { lang: 'ko', previous: 'en', window: {} },
    ));
  }
});

test('language switches call the shared analytics API with both languages', () => {
  for (const html of [homeHtml, aboutHtml]) {
    const calls = [];
    runInNewContext(
      languageSwitchStatement(html),
      {
        lang: 'ko',
        previous: 'en',
        window: {
          HanBuddyAnalytics: {
            trackLanguageSwitch(...args) {
              calls.push(args);
            },
          },
        },
      },
    );
    assert.deepEqual(calls, [['ko', 'en']]);
  }
});

test('event detail pages load shared analytics with canonical page and experience context', () => {
  for (const { name, experienceType, html } of detailPages) {
    assert.match(html, /<script src="\/assets\/analytics\.js"><\/script>/, `${name} analytics module`);
    assert.match(
      html,
      new RegExp(`<body[^>]*data-analytics-page-type="event_detail"[^>]*data-analytics-experience-type="${experienceType}"`),
      `${name} detail context`,
    );
  }
});

test('event detail application and contact CTAs declare stable placements', () => {
  for (const { name, html } of detailPages) {
    assert.match(
      html,
      /<a[^>]*data-cta="apply"[^>]*data-analytics-placement="desktop_sidebar"/,
      `${name} desktop application CTA`,
    );
    assert.match(
      html,
      /<a[^>]*data-cta="apply"[^>]*data-analytics-placement="mobile_sticky"/,
      `${name} mobile application CTA`,
    );
    assert.match(
      html,
      /<a[^>]*data-cta="instagram"[^>]*data-analytics-placement="desktop_sidebar"/,
      `${name} Instagram CTA`,
    );
  }
});

test('event detail pages expose the same explicit analytics consent controls', () => {
  for (const { name, html } of detailPages) {
    assert.match(html, /data-consent-banner/, `${name} consent banner`);
    assert.match(html, /data-consent-action="accept"/, `${name} accept control`);
    assert.match(html, /data-consent-action="reject"/, `${name} reject control`);
    assert.match(html, /data-consent-settings/, `${name} settings control`);
  }
});

test('all cookie-settings controls expose their dialog expansion state', () => {
  for (const { name, html } of publicPages) {
    assert.match(
      html,
      /<button[^>]*data-consent-settings[^>]*aria-expanded="false"/,
      `${name} cookie settings expansion state`,
    );
  }
});

test('public metadata uses the canonical production origin', () => {
  for (const { name, html } of publicPages) {
    assert.doesNotMatch(
      html,
      /https:\/\/landing\.hanbuddy\.kr/,
      `${name} must not reference the retired production origin`,
    );
  }

  assert.match(
    homeHtml,
    /<meta property="og:image" content="https:\/\/www\.hanbuddy\.kr\/assets\//,
  );
  assert.match(
    aboutHtml,
    /<link rel="canonical" href="https:\/\/www\.hanbuddy\.kr\/about" \/>/,
  );
  for (const { name, html } of detailPages) {
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/www\.hanbuddy\.kr\/assets\//,
      `${name} Open Graph image origin`,
    );
  }
});
