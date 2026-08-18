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

test('the final CTA does not name the channels its own buttons already are', () => {
  // 본문이 Instagram·WhatsApp·KakaoTalk을 나열하고, 바로 아래 버튼 셋이 같은
  // 채널이고, 푸터 아이콘이 한 번 더 말하고 있었다(2026-08-18).
  const copy = html.match(/finalCta: \{[\s\S]*?\n {8}\},/g) ?? [];
  assert.equal(copy.length, 2, 'EN·KO finalCta 카피가 둘 다 있어야 한다');
  for (const block of copy) {
    const body = block.match(/body: '([^']+)'/);
    assert.ok(body, 'finalCta.body를 찾지 못했다');
    assert.doesNotMatch(
      body[1],
      /Instagram|WhatsApp|KakaoTalk|오픈채팅/,
      '채널 이름은 버튼이 말한다. 문장으로 다시 나열하지 않는다',
    );
  }
});

test('the final CTA gives phones a shorter vertical frame than the photo band needs', () => {
  // 사진 배경이 보일 여백이 폰에서는 상하 160px이라 섹션이 화면 하나를 넘겼다.
  // 좁은 화면만 줄이고 sm 이상은 원래 여백을 되찾아야 한다.
  const inner = html.match(/<div class="(relative z-10 mx-auto grid max-w-6xl[^"]*)"/);
  assert.ok(inner, '최종 CTA 안쪽 래퍼를 찾지 못했다');
  assert.match(inner[1], /(?:^|\s)py-12(?:\s|$)/, '폰에서는 세로 여백을 줄여야 한다');
  assert.match(inner[1], /\bsm:py-20\b/, 'sm 이상에서 사진 배경 여백을 되찾아야 한다');
  assert.match(inner[1], /\blg:py-32\b/, '데스크톱 여백은 그대로다');
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
