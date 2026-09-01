const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const homeHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

const structuredData = [...homeHtml.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => JSON.parse(match[1]));

test('home page identifies the site as HanBuddy for search engines', () => {
  assert.equal(
    structuredData.filter((entry) => entry['@type'] === 'WebSite').length,
    1,
    'exactly one WebSite structured data entity must exist',
  );
  const website = structuredData.find((entry) => entry['@type'] === 'WebSite');

  assert.ok(website, 'WebSite structured data must exist');
  assert.equal(website['@context'], 'https://schema.org');
  assert.equal(website.name, 'HanBuddy');
  assert.equal(Object.hasOwn(website, 'alternateName'), false);
  assert.equal(website.url, 'https://www.hanbuddy.kr/');
});

test('home page publishes matching canonical and Open Graph site identity', () => {
  assert.match(
    homeHtml,
    /<link rel="canonical" href="https:\/\/www\.hanbuddy\.kr\/" \/>/,
  );
  assert.match(
    homeHtml,
    /<meta property="og:site_name" content="HanBuddy" \/>/,
  );
});
