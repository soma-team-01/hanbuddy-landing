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
// generic detail page는 개별 회차 URL이 아니므로 본문과 JSON-LD 어디에도 대표 날짜를
// 만들지 않는다. 앞으로의 날짜는 신청 캘린더만 authoritative하게 유지한다.
const withoutQuotes = (source) => source
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace(/<figcaption[\s\S]*?<\/figcaption>/g, '')
  .replace(/<blockquote[\s\S]*?<\/blockquote>/g, '');

// 축약형(Aug)만 보면 "August 12"를 놓친다. \b는 Aug 뒤의 u에서 경계가 없어
// 매치되지 않는데, 실제로 고척 본문에 그렇게 한 문단이 살아남아 있었다.
const DATE_PATTERNS = [
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s{0,2}\d{1,2}\b/,
  /\d{1,2}\s*월\s*\d{1,2}\s*일/,
  /\b20\d{2}-\d{2}-\d{2}\b/,
];

test('generic detail pages never print a specific future date', () => {
  // 날짜는 신청 캘린더에서만 고른다. 상세페이지에 박아두면 그날이 지나는 순간
  // 거짓말이 되고, 리그 일정을 갱신할 때마다 여섯 페이지를 손으로 따라가야 한다.
  //
  // 축약형(Aug)만 보면 "August 12"를 놓친다. \b는 Aug 뒤의 u에서 경계가 없어
  // 매치되지 않는데, 실제로 고척 본문에 그렇게 한 문단이 살아남아 있었다.
  for (const slug of pages) {
    const source = withoutQuotes(html(slug));
    for (const pattern of DATE_PATTERNS) {
      assert.doesNotMatch(source, pattern, `${slug}에 날짜가 남아 있다`);
    }
  }
});

test('the date detector actually catches the formats it claims to', () => {
  // 이 파일의 정규식이 한 번 헐거웠다. 축약형만 봐서 "August 12"를 놓쳤고,
  // 고치면서 May를 빠뜨렸다. 검사기 자체를 검사해 두 번 겪지 않게 한다.
  const caught = (text) => DATE_PATTERNS.some((pattern) => pattern.test(text));
  for (const sample of [
    'Aug 12', 'August 12', 'Aug. 12', 'May 12', 'May 12, 2026',
    'September 6 (Sun)', '2026-05-12', '8월 12일', '10월 24일',
  ]) {
    assert.ok(caught(sample), `놓친 날짜 형식: ${sample}`);
  }
  // 날짜가 아닌 문장까지 잡으면 카피를 쓸 때마다 거짓 경보가 난다.
  for (const sample of [
    'You may bring 2 friends', 'Marching in with 3 chants', 'about 2 hours', '₩60,000',
  ]) {
    assert.equal(caught(sample), false, `날짜가 아닌데 잡혔다: ${sample}`);
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
