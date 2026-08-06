const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

const announcement = (() => {
  const block = html.match(/const ANNOUNCEMENT = \{([\s\S]*?)\};/);
  if (!block) return null;
  const read = (key) => (block[1].match(new RegExp(`${key}: '([^']+)'`)) || [])[1];
  return { id: read('id'), href: read('href'), endsAt: read('endsAt') };
})();

test('the announcement bar is wired to copy, a target, and a dismiss control', () => {
  assert.ok(announcement, 'ANNOUNCEMENT config must exist');
  assert.match(html, /<aside data-announcement hidden/, 'the bar must start hidden until JS decides');
  assert.match(html, /data-announcement-link/);
  assert.match(html, /data-i18n="announcement\.text"/);
  assert.match(html, /data-i18n="announcement\.cta"/);
  assert.match(html, /data-announcement-dismiss/);
  assert.match(html, /data-i18n-aria="announcement\.dismissAria"/, 'the dismiss control needs a translated label');

  // 이벤트 카드와 같은 스키마로 클릭을 센다.
  assert.match(html, /data-announcement-link[\s\S]{0,200}data-analytics-content-id="kbo"/);

  // CTA가 문장에 섞여 있으면 클릭 대상으로 읽히지 않는다. 버튼 모양을 고정한다.
  const link = html.match(/<a data-announcement-link[\s\S]*?<\/a>/)[0];
  assert.match(link, /rounded-full/, 'the CTA must read as a button, not inline text');
  assert.match(link, /bg-on-primary/, 'the CTA needs a filled background on the dark bar');
});

test('announcement copy ships in both languages', () => {
  const blocks = [...html.matchAll(/^ {8}announcement: \{[\s\S]*?^ {8}\},$/gm)].map((m) => m[0]);
  assert.equal(blocks.length, 2, 'EN and KO announcement copy must both exist');
  for (const block of blocks) {
    assert.match(block, /text: '[^']+'/);
    assert.match(block, /cta: '[^']+'/);
    assert.match(block, /dismissAria: '[^']+'/);
  }
});

test('the announcement retires itself instead of waiting to be taken down', () => {
  assert.match(html, /const isAnnouncementLive =/, 'expiry must be computed, not manual');
  assert.match(html, /deadline > now\.getTime\(\)/);
  // 오프셋이 없으면 방문자 시간대에 따라 만료 시점이 흔들린다.
  assert.match(
    announcement.endsAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/,
    'endsAt must pin the KST offset',
  );
  assert.ok(Number.isFinite(new Date(announcement.endsAt).getTime()), 'endsAt must parse');
});

test('the promoted run has not already happened', () => {
  // 런타임에는 만료된 공지가 저절로 숨겨지지만, 설정이 남아 있으면 다음 사람이
  // 지난 회차를 홍보 중이라고 착각한다. 지나면 여기서 알려 정리를 유도한다.
  const deadline = new Date(announcement.endsAt).getTime();
  assert.ok(
    deadline > Date.now(),
    `공지 회차(${announcement.endsAt})가 지났습니다. index.html의 ANNOUNCEMENT를 다음 회차로 바꾸거나, 밀어줄 회차가 없으면 공지 바를 제거하세요.`,
  );
});

test('the announcement points at a published event page', () => {
  assert.match(announcement.href, /^\/events\/[a-z]+\/$/);
  const slug = announcement.href.split('/')[2];
  assert.match(html, new RegExp(`href: '/events/${slug}/'`), 'the target must be an open event card');
});
