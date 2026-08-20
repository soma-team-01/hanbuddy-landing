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
  for (const id of ['events', 'suggest', 'reviews', 'apply']) {
    assert.match(
      homeHtml,
      new RegExp(`<section id="${id}"[^>]*data-analytics-section`),
      `home section #${id} must be tracked`,
    );
  }
  for (const id of ['origin', 'how', 'timeline', 'team']) {
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

test('every apply CTA opens the form instead of scrolling to a section', () => {
  // 2026-08-20까지 상단 nav 버튼만 `#apply`(최종 CTA 섹션)로 스크롤했다. 폼까지
  // 한 번 더 눌러야 해서 유현님 지시로 전부 폼 직행으로 통일했다. 섹션 스크롤과
  // 폼 오픈을 분리해 세던 `apply_section` 키는 이제 홈에서 쓰지 않는다.
  assert.doesNotMatch(homeHtml, /data-cta="apply_section"/, '홈에 섹션 스크롤 CTA가 다시 생겼다');
  assert.doesNotMatch(homeHtml, /href="#apply"/, '신청 CTA가 폼 대신 섹션으로 간다');

  // 헤더 버튼이 실제로 폼을 가리키는지 본다. href만 맞고 data-cta가 없으면
  // 링크는 되지만 전환이 집계되지 않는다.
  const header = homeHtml.match(/<header[\s\S]*?<\/header>/);
  assert.ok(header, '헤더를 찾지 못했다');
  assert.match(
    header[0],
    /<a href="\/apply\/" data-cta="apply"/,
    '헤더 CTA는 /apply/를 열고 apply로 집계돼야 한다',
  );

  // placement로 갈라 보므로 nav·히어로·최종 CTA가 한 숫자로 뭉치지 않는다.
  // 세 자리 모두 살아 있어야 그 구분이 의미를 갖는다.
  const applyCtas = [...homeHtml.matchAll(/<a href="\/apply\/" data-cta="apply"/g)];
  assert.equal(applyCtas.length, 3, '신청 CTA는 헤더·히어로·최종 CTA 세 곳이다');
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

test('the mobile photo gallery button opens at the first photo', () => {
  // data-photo="1"이면 갤러리가 2번째 사진부터 열린다. 한강 템플릿에서 복사되며
  // 6개 페이지 중 5개에 같은 값이 퍼져 있었다(2026-08-10 CodeRabbit 지적).
  for (const { name, html } of detailPages) {
    const mobileButton = html.match(
      /<button type="button" data-photo="(\d+)"[^>]*lg:hidden"[^>]*aria-label="Open photo gallery">/,
    );
    assert.ok(mobileButton, `${name}: 모바일 갤러리 버튼을 찾지 못했다`);
    assert.equal(mobileButton[1], '0', `${name}: 갤러리가 ${Number(mobileButton[1]) + 1}번째 사진부터 열린다`);
  }
});
