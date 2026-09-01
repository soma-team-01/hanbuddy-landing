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
    const events = nodes.filter((entry) => entry['@type'] === 'Event');
    const breadcrumbNodes = nodes.filter((entry) => entry['@type'] === 'BreadcrumbList');
    const canonical = `https://www.hanbuddy.kr/events/${id}/`;
    const title = metadataValue(html, /<title>([^<]+) \| HanBuddy<\/title>/, `${id} title`);
    const description = metadataValue(
      html,
      /<meta name="description" content="([^"]+)" \/>/,
      `${id} description`,
    );
    const image = metadataValue(
      html,
      /<meta property="og:image" content="([^"]+)" \/>/,
      `${id} image`,
    );
    const venue = metadataValue(
      html,
      /<dt[^>]*>[^<]*<span[^>]*>[^<]*<\/span> Venue<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/,
      `${id} venue`,
    );

    assert.ok(events.length > 0, `${id} Event JSON-LD`);
    for (const event of events) {
      assert.equal(event['@context'], undefined, '@context belongs on the graph wrapper');
      assert.equal(event.name, title);
      assert.equal(event.description, description);
      assert.equal(event.url, canonical);
      assert.equal(event.image, image);
      assert.deepEqual(event.location, { '@type': 'Place', name: venue });
      for (const unsupported of ['offers', 'availability', 'aggregateRating', 'review', 'organizer', 'endDate']) {
        assert.equal(event[unsupported], undefined, `${id} must not invent ${unsupported}`);
      }
    }
    assert.equal(breadcrumbNodes.length, 1, `${id} must have exactly one BreadcrumbList`);
    const [breadcrumbs] = breadcrumbNodes;
    assert.deepEqual(breadcrumbs.itemListElement, [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hanbuddy.kr/' },
      { '@type': 'ListItem', position: 2, name: title, item: canonical },
    ]);
  }
});

test('event JSON-LD schedules agree exactly with canonical slot data', () => {
  for (const slotSource of EVENT_SLOTS) {
    const page = eventPages.find(({ id }) => id === slotSource.id);
    assert.ok(page, `missing detail page for ${slotSource.id}`);
    const events = graphNodes(page.html).filter((entry) => entry['@type'] === 'Event');

    if (slotSource.slots) {
      assert.equal(events.length, slotSource.slots.length, `${slotSource.id} needs one Event per fixed slot`);
      assert.deepEqual(
        events.map((event) => event.startDate),
        slotSource.slots.map((slot) => `${slot}:00+09:00`),
        `${slotSource.id} structured dates drifted from EVENT_SLOTS`,
      );
      assert.equal(new Set(events.map((event) => event['@id'])).size, events.length,
        `${slotSource.id} fixed Event @ids must be unique`);
      for (const event of events) {
        assert.match(event['@id'], new RegExp(`^https://www\\.hanbuddy\\.kr/events/${slotSource.id}/#event-`));
        assert.equal(event.eventSchedule, undefined, `${slotSource.id} fixed Events must not use Schedule`);
        assert.match(event.startDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+09:00$/);
      }
    } else {
      assert.equal(events.length, 1, `${slotSource.id} recurring activity needs one Event`);
      assert.equal(events[0].startDate, undefined);
      assert.deepEqual(events[0].eventSchedule, {
        '@type': 'Schedule',
        repeatFrequency: 'P1D',
        startTime: `${slotSource.recurring.time}:00`,
        scheduleTimezone: 'Asia/Seoul',
      });
      assert.match(events[0].eventSchedule.startTime, /^\d{2}:\d{2}:\d{2}$/,
        `${slotSource.id} Schedule startTime must use the Schema.org Time format`);
    }
  }
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
