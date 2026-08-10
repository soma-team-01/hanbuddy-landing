const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const readPage = (...parts) => readFileSync(join(__dirname, '..', ...parts), 'utf8');
const homeHtml = readPage('index.html');
const aboutHtml = readPage('about', 'index.html');
const applyHtml = readPage('apply', 'index.html');
const privacyHtml = readPage('privacy', 'index.html');

// 상세페이지 목록과 각 페이지의 experience type을 손으로 적으면, 새 이벤트
// 페이지가 검사에서 통째로 빠지고 id 체계가 어긋나도 통과한다(실제로
// events/kleague가 빠져 있었다). 디렉터리를 훑고 값은 카드 데이터와 대조한다.
const detailPages = readdirSync(join(__dirname, '..', 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .map((name) => ({ name, html: readPage('events', name, 'index.html') }));

const eventCardIds = new Set(
  [...homeHtml.matchAll(/\bid: '([a-z0-9-]+)',\s*\n\s*status: '(?:open|soon)'/g)].map((m) => m[1]),
);
const publicPages = [
  { name: 'Home', html: homeHtml },
  { name: 'About', html: aboutHtml },
  { name: 'Apply', html: applyHtml },
  { name: 'Privacy', html: privacyHtml },
  ...detailPages,
];

test('privacy page loads shared analytics with the advanced marketing policy', () => {
  assert.match(privacyHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(privacyHtml, /<body[^>]*data-analytics-page-type="privacy"[^>]*data-analytics-consent-mode="advanced"/);
});

test('home and About load the shared analytics module with canonical page context', () => {
  assert.match(homeHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(homeHtml, /<body[^>]*data-analytics-page-type="home"[^>]*data-analytics-consent-mode="advanced"/);
  assert.match(aboutHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(aboutHtml, /<body[^>]*data-analytics-page-type="about"[^>]*data-analytics-consent-mode="advanced"/);
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

test('scrolling to the apply section is distinct from opening the form', () => {
  // 같은 CTA 키를 쓰면 섹션까지 스크롤한 사람과 폼을 연 사람이 한 숫자로 뭉친다.
  assert.match(homeHtml, /href="#apply" data-cta="apply_section"/);
  assert.doesNotMatch(homeHtml, /href="#apply" data-cta="apply"/);
});

test('the apply page loads shared analytics with its own page context', () => {
  assert.match(applyHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(applyHtml, /<body[^>]*data-analytics-page-type="application"[^>]*data-analytics-consent-mode="basic"/);
  assert.doesNotMatch(applyHtml, /googleMeasurementId|metaPixelId/);
  assert.doesNotMatch(applyHtml, /googletagmanager\.com\/gtag\/js/);
});

test('the apply page never links back to itself as a CTA', () => {
  // 폼 위에서 다시 폼으로 보내는 버튼은 application_form_open을 자기 자신에게 찍는다.
  assert.doesNotMatch(applyHtml, /data-cta="apply"/);
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

test('event detail pages load shared analytics with canonical page and content context', () => {
  assert.ok(eventCardIds.size >= 3, 'event card ids must be readable from the home page');

  for (const { name, html } of detailPages) {
    assert.match(html, /<script src="\/assets\/analytics\.js"><\/script>/, `${name} analytics module`);

    const context = html.match(
      /<body[^>]*data-analytics-page-type="event_detail"[^>]*data-analytics-content-id="([a-z0-9-]+)"[^>]*data-analytics-consent-mode="advanced"/,
    );
    assert.ok(context, `${name} detail context`);

    // 상세페이지의 content id와 카드 id가 갈리면 GA와 시트에서 같은 회차가
    // 두 이름으로 집계된다.
    assert.ok(
      eventCardIds.has(context[1]),
      `${name} content id "${context[1]}" must match an event card id (${[...eventCardIds].join(', ')})`,
    );
    assert.strictEqual(
      context[1],
      name,
      `${name} content id "${context[1]}" must match its event page id`,
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
