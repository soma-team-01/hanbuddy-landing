const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

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
