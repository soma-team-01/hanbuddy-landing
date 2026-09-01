const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { EVENT_SLOTS } = require('../assets/event-slots.js');

const root = join(__dirname, '..');
const homeHtml = readFileSync(join(root, 'index.html'), 'utf8');
const applyHtml = readFileSync(join(root, 'apply', 'index.html'), 'utf8');
const eventPages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    id: entry.name,
    html: readFileSync(join(root, 'events', entry.name, 'index.html'), 'utf8'),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

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

const metadataValue = (html, pattern, label) => {
  const match = html.match(pattern);
  assert.ok(match, `missing ${label}`);
  return match[1];
};

const jsonLd = (html) => [...html.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => JSON.parse(match[1]));

const graphNodes = (html) => jsonLd(html).flatMap((entry) => entry['@graph'] || [entry]);

test('every event detail has a matching absolute self-canonical and og:url', () => {
  assert.equal(eventPages.length, EVENT_SLOTS.length, 'every canonical event must have one detail page');
  for (const { id, html } of eventPages) {
    const expected = `https://www.hanbuddy.kr/events/${id}/`;
    assert.equal(
      metadataValue(html, /<link rel="canonical" href="([^"]+)" \/>/, `${id} canonical`),
      expected,
    );
    assert.equal(
      metadataValue(html, /<meta property="og:url" content="([^"]+)" \/>/, `${id} og:url`),
      expected,
    );
  }
});

test('event and breadcrumb JSON-LD is valid and agrees with page metadata', () => {
  for (const { id, html } of eventPages) {
    const nodes = graphNodes(html);
    const breadcrumbNodes = nodes.filter((entry) => entry['@type'] === 'BreadcrumbList');
    const canonical = `https://www.hanbuddy.kr/events/${id}/`;
    const title = metadataValue(html, /<title>([^<]+) \| HanBuddy<\/title>/, `${id} title`);
    assert.equal(breadcrumbNodes.length, 1, `${id} must have exactly one BreadcrumbList`);
    const [breadcrumbs] = breadcrumbNodes;
    assert.deepEqual(breadcrumbs.itemListElement, [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hanbuddy.kr/' },
      { '@type': 'ListItem', position: 2, name: title, item: canonical },
    ]);
  }
});

test('every generic event page avoids Event, Schedule, fake addresses, and representative dates', () => {
  for (const { id, html } of eventPages) {
    const nodes = graphNodes(html);
    assert.equal(nodes.filter((entry) => entry['@type'] === 'Event').length, 0,
      `${id} has no separately routed occurrence and must not claim Event eligibility`);
    assert.equal(nodes.filter((entry) => entry['@type'] === 'Schedule').length, 0,
      `${id} must not claim a schedule for a flexible generic page`);
    assert.doesNotMatch(html, /"address"\s*:/,
      `${id} must not disguise a venue name as a PostalAddress`);
    assert.doesNotMatch(html, /September (?:5|13), 2026/,
      `${id} must not retain the stale representative occurrence`);
    assert.match(html, /<dt[^>]*>[^<]*<span[^>]*>[^<]*<\/span> Date<\/dt>\s*<dd[^>]*>Pick your date when you apply<\/dd>/,
      `${id} generic visible Date copy`);
  }
});

test('Jamsil metadata does not promise a night game for flexible dates', () => {
  const page = eventPages.find(({ id }) => id === 'kbo-jamsil');
  assert.doesNotMatch(
    metadataValue(page.html, /<meta name="description" content="([^"]+)" \/>/, 'Jamsil description'),
    /night game/i,
  );
  assert.doesNotMatch(
    metadataValue(page.html, /<meta property="og:description" content="([^"]+)" \/>/, 'Jamsil og description'),
    /night game/i,
  );
});

test('robots and sitemap publish only the intended indexable surface', () => {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedUrls = [
    'https://www.hanbuddy.kr/',
    ...eventPages.map(({ id }) => `https://www.hanbuddy.kr/events/${id}/`),
  ];

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.hanbuddy\.kr\/sitemap\.xml$/m);
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(sitemapUrls.sort(), expectedUrls.sort());
  assert.doesNotMatch(sitemap, /\/apply\//);
  assert.match(applyHtml, /<meta name="robots" content="noindex" \/>/);
});
