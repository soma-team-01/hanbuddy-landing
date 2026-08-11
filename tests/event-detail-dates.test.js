const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');

// 페이지 목록을 손으로 적으면 새로 추가한 이벤트가 검사에서 통째로 빠진다.
const pages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const html = (slug) => readFileSync(join(root, 'events', slug, 'index.html'), 'utf8');

test('there is an event detail page to check', () => {
  assert.ok(pages.length >= 6, `이벤트 페이지가 너무 적다: ${pages.length}`);
});

// 후기 캡션은 지난 운영을 증명하는 문장이라 "July 2026" 같은 날짜가 정당하게 들어간다.
// 앞으로의 일정만 검사해야 하므로 인용 블록은 먼저 걷어낸다.
const withoutQuotes = (source) => source
  .replace(/<figcaption[\s\S]*?<\/figcaption>/g, '')
  .replace(/<blockquote[\s\S]*?<\/blockquote>/g, '');

test('detail pages never print a specific date', () => {
  // 날짜는 신청 캘린더에서만 고른다. 상세페이지에 박아두면 그날이 지나는 순간
  // 거짓말이 되고, 리그 일정을 갱신할 때마다 여섯 페이지를 손으로 따라가야 한다.
  //
  // 축약형(Aug)만 보면 "August 12"를 놓친다. \b는 Aug 뒤의 u에서 경계가 없어
  // 매치되지 않는데, 실제로 고척 본문에 그렇게 한 문단이 살아남아 있었다.
  const monthDay = /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s{0,2}\d{1,2}\b/;
  const koreanDate = /\d{1,2}\s*월\s*\d{1,2}\s*일/;
  const isoDate = /\b20\d{2}-\d{2}-\d{2}\b/;
  for (const slug of pages) {
    const source = withoutQuotes(html(slug));
    assert.doesNotMatch(source, monthDay, `${slug}에 영문 날짜가 남아 있다`);
    assert.doesNotMatch(source, koreanDate, `${slug}에 한글 날짜가 남아 있다`);
    assert.doesNotMatch(source, isoDate, `${slug}에 ISO 날짜가 남아 있다`);
  }
});

test('detail pages do not promise a weekday-only rule any more', () => {
  // 음식 회차는 주말도 열렸다. "Every weekday"가 남으면 카피가 폼보다 좁게 약속한다.
  for (const slug of pages) {
    assert.doesNotMatch(html(slug), /Every weekday/i, `${slug}에 평일 전용 문구가 남아 있다`);
  }
});

test('detail pages point at the application form for the date', () => {
  for (const slug of pages) {
    assert.match(
      html(slug),
      /Pick your date when you apply/,
      `${slug}가 날짜를 어디서 고르는지 알려주지 않는다`,
    );
  }
});
