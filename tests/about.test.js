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
  for (const id of ['top', 'why', 'operate', 'team', 'join']) {
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
