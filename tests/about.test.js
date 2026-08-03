const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const analyticsJs = readFileSync(join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');

const aboutPath = join(__dirname, '..', 'about', 'index.html');
const aboutHtml = existsSync(aboutPath) ? readFileSync(aboutPath, 'utf8') : '';

test('about page exists with core sections', () => {
  assert.ok(aboutHtml.length > 0, 'about/index.html must exist');
  for (const id of ['top', 'origin', 'how', 'timeline', 'team', 'join']) {
    assert.match(aboutHtml, new RegExp(`<section id="${id}"`), `missing section #${id}`);
  }
});

test('about page keeps analytics behind consent (same gate as index)', () => {
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i);
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/i);
  assert.match(aboutHtml, /data-consent-banner/);
  assert.match(aboutHtml, /data-consent-action="accept"/);
  assert.match(aboutHtml, /data-consent-action="reject"/);
  assert.match(aboutHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(analyticsJs, /hanbuddy\.analyticsConsent/);
});

test('about page never exposes maintainer-only validation details', () => {
  assert.doesNotMatch(
    aboutHtml,
    /F001|4\/5|30,000|under 30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal/,
  );
});

test('about page never says weekend (baseball runs on weeknights too)', () => {
  assert.doesNotMatch(aboutHtml, /weekend/i, 'weekend framing is retired — use week');
  assert.doesNotMatch(aboutHtml, /주말/, '주말 표현은 폐기됨 — 매주/week 계열로');
});

test('about page never claims un-operated activities as completed meetups', () => {
  assert.doesNotMatch(aboutHtml, /Real moments from our meetups/);
  assert.doesNotMatch(aboutHtml, /실제 모임의 순간들/);

  // 완료(status: 'done')로 표기할 수 있는 회차는 실제로 운영한 것뿐이다. 날짜 화이트리스트로 고정한다.
  // K리그·찜질방은 여전히 미운영이므로 완료 항목에 등장하면 안 된다.
  const doneEntries = aboutHtml.match(/status:\s*'done'[\s\S]*?\}/g) ?? [];
  assert.equal(doneEntries.length, 6, '완료 항목은 EN/KO 각각 3건, 총 6건이어야 함');
  const operatedDates = ['2026.06.25', '2026.07.26', '2026.08.01'];
  for (const entry of doneEntries) {
    assert.ok(
      operatedDates.some((date) => entry.includes(date)),
      `승인되지 않은 완료 날짜: ${entry}`,
    );
    assert.doesNotMatch(entry, /kleague|jjimjilbang/, `미운영 활동이 완료로 표기됨: ${entry}`);
  }
});

test('about page does not duplicate the rating or guest quotes from index', () => {
  // 맨 숫자 `4.7`은 쓰지 않는다 — 푸터 카카오 SVG path 데이터(`5.03 4.7 6.36L5.5`)에 우연히 포함돼
  // 영원히 실패하는 검사가 된다. 실제 평점 표기 형태(`4.7 / 5`)만 막는다.
  assert.doesNotMatch(aboutHtml, /4\.7\s*\/\s*5/, 'aggregate rating belongs to index #reviews only');
  for (const quote of [
    'this is the program you want to join',
    'Great experience to enjoy a baseball game with a local',
    'It was fun to watch the game and cheer together',
    'will definitely be going to another game with HanBuddy',
  ]) {
    assert.ok(!aboutHtml.includes(quote), `guest quote duplicated on about: ${quote}`);
  }
});

test('about hero image is not lazy-loaded (it is the LCP element)', () => {
  const heroImg = aboutHtml.match(/<img[^>]*run1-hero\.webp[^>]*>/);
  assert.ok(heroImg, 'hero backdrop image missing');
  assert.doesNotMatch(heroImg[0], /loading="lazy"/, 'hero image must not be lazy');
  assert.match(heroImg[0], /fetchpriority="high"/);
});

test('about team links match the spec exactly and open safely', () => {
  const links = [
    ['linkedin_minhyung', 'https://www.linkedin.com/in/minbros/'],
    ['linkedin_yoohyun', 'https://www.linkedin.com/in/yoohyun-kim-6655ba409/'],
    ['linkedin_junyoung', 'https://kr.linkedin.com/in/%EC%9D%B4%EC%A4%80%EC%98%81-undefined-a63590398'],
  ];
  for (const [cta, url] of links) {
    const pattern = new RegExp(
      `<a href="${url.replace(/[/.]/g, '\\$&')}"[^>]*target="_blank"[^>]*rel="noopener"[^>]*data-cta="${cta}"`,
    );
    assert.match(aboutHtml, pattern, `broken or missing link for ${cta}`);
  }
});

test('about page uses root-absolute asset paths only', () => {
  assert.doesNotMatch(aboutHtml, /(?:src|href)="assets\//, 'relative asset path breaks under /about/');
  assert.match(aboutHtml, /src="\/assets\/brand\/logo-borderless\.webp"/);
  assert.match(aboutHtml, /src="\/assets\/brand\/soma-logo\.webp"/);
});

test('shared copy stays in sync between index and about', () => {
  const sharedSnippets = [
    "{ href: '/about', label: 'About' }",
    "{ href: '/about', label: '소개' }",
    "aboutLink: 'About HanBuddy'",
    "aboutLink: 'HanBuddy 소개'",
    'Help us improve HanBuddy',
    'HanBuddy 개선에 동의해 주세요',
    'Continue without optional cookies',
    '분석 및 광고 허용',
    'HanBuddy by ZeroOne',
    '<script src="/assets/analytics.js"></script>',
  ];
  for (const snippet of sharedSnippets) {
    assert.ok(indexHtml.includes(snippet), `index.html missing: ${snippet}`);
    assert.ok(aboutHtml.includes(snippet), `about/index.html missing: ${snippet}`);
  }
});

test('index nav links include About in both languages', () => {
  assert.match(indexHtml, /\{ href: '\/about', label: 'About' \}/);
  assert.match(indexHtml, /\{ href: '\/about', label: '소개' \}/);
});

test('index header exposes a mobile-only About link', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*class="[^"]*lg:hidden[^"]*"[^>]*data-i18n="nav\.aboutLabel"/,
  );
  assert.match(indexHtml, /aboutLabel: 'About'/);
  assert.match(indexHtml, /aboutLabel: '소개'/);
});

test('index header wordmark hides below 380px instead of overflowing', () => {
  assert.match(indexHtml, /<span class="hidden min-\[380px\]:inline">HanBuddy<\/span>/);
});

test('index footer links to the About page', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*data-i18n="footer\.aboutLink"/,
  );
  assert.match(indexHtml, /aboutLink: 'About HanBuddy'/);
  assert.match(indexHtml, /aboutLink: 'HanBuddy 소개'/);
});
