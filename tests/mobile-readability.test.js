const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

// 2026-08-18: 좁은 화면에서 섹션마다 제목 밑에 서너 줄짜리 회색 문단이 반복돼
// 읽는 부담이 컸다. 데스크톱에는 남기고 모바일에서만 접는 방식으로 정리했다.
// `hidden ... sm:block` 한 쌍이 계약이다. 한쪽만 지우면 조용히 되돌아간다.
const hiddenOnMobile = (attr) => {
  const el = html.match(new RegExp(`<p class="([^"]*)"[^>]*${attr}`));
  assert.ok(el, `${attr} 문단을 찾지 못했다`);
  return el[1];
};

test('section lead paragraphs are desktop-only', () => {
  for (const key of ['events.body', 'reviews.body']) {
    const cls = hiddenOnMobile(`data-i18n="${key}"`);
    assert.match(cls, /\bhidden\b/, `${key}는 모바일에서 접혀야 한다`);
    assert.match(cls, /\bsm:block\b/, `${key}는 데스크톱에서 다시 보여야 한다`);
  }
});

test('the suggest lead stays on mobile because the heading does not replace it', () => {
  // 다른 리드 문단과 달리 이건 제목이 못 하는 말을 한다(원하는 날짜를 직접 고를 수
  // 있다는 안내). 같이 접었다가는 정보가 사라진다.
  const cls = hiddenOnMobile('data-i18n="suggest.body"');
  assert.doesNotMatch(cls, /\bhidden\b/, '제안 섹션 안내까지 접으면 안 된다');
});

test('event cards drop their one-line tagline on mobile only', () => {
  // 2열이라 폭이 좁아 이 문장이 3~4줄로 늘어나면서 카드 높이를 324~230px로
  // 들쭉날쭉하게 만들었다. 사진·가격 배지·제목만으로 무엇인지 읽힌다.
  const renderer = html.slice(
    html.indexOf('const renderEventCards'),
    html.indexOf('const renderReviewCards'),
  );
  const tagline = renderer.match(/textNode\('p', '([^']*)', item\.tagline\)/);
  assert.ok(tagline, '카드 태그라인 렌더링을 찾지 못했다');
  assert.match(tagline[1], /\bhidden\b/, '모바일에서는 접혀야 한다');
  assert.match(tagline[1], /\bsm:block\b/, '데스크톱에서는 보여야 한다');
});
