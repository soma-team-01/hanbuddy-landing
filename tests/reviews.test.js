const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

// CONTENT_MAP 안의 reviews.cards 배열을 로케일별로 뽑아낸다.
const reviewCardsBlock = (locale) => {
  const localeStart = indexHtml.indexOf(`${locale}: {`);
  assert.ok(localeStart > -1, `missing ${locale} copy block`);
  const reviewsStart = indexHtml.indexOf('reviews: {', localeStart);
  assert.ok(reviewsStart > -1, `missing ${locale} reviews copy`);
  const cardsStart = indexHtml.indexOf('cards: [', reviewsStart);
  const cardsEnd = indexHtml.indexOf('finalCta: {', reviewsStart);
  assert.ok(cardsStart > -1 && cardsEnd > cardsStart, `missing ${locale} review cards`);
  return indexHtml.slice(cardsStart, cardsEnd);
};

test('review cards share one height at every width', () => {
  // 트랙이 items-start면 카드가 인용문 길이만큼만 자라 높이가 제각각이 된다.
  // 모바일에서 272/198/222/247px로 어긋나 있었다(2026-08-18).
  const track = indexHtml.match(/class="review-track[^"]*"/)[0];
  // \b는 `sm:items-stretch`의 콜론 뒤에서도 성립한다. 접두사 없는 유틸리티를
  // 요구해야 "모바일에서만 어긋난다"는 원래 회귀를 잡는다.
  assert.match(track, /(?:^|\s)items-stretch(?:\s|$)/, '기본 폭부터 카드 높이를 맞춰야 한다');
  assert.doesNotMatch(track, /\bitems-start\b/, '어느 폭에서도 높이를 풀면 안 된다');
  // 높이를 맞추면 짧은 후기는 남는 자리가 인용문과 출처 사이에 통째로 몰린다.
  // 인용문을 세로 가운데 두어 위아래로 나눈다.
  assert.match(
    indexHtml,
    /blockquote\.className = '[^']*\bflex\b[^']*\bflex-1\b[^']*\bitems-center\b/,
    '인용문은 남는 높이 안에서 세로 가운데에 놓여야 한다',
  );
});

test('review carousel exposes a scroll track and both arrow controls', () => {
  assert.match(indexHtml, /class="review-track[^"]*"/);
  assert.match(indexHtml, /data-review-cards/);
  assert.match(indexHtml, /data-review-prev/);
  assert.match(indexHtml, /data-review-next/);
  assert.match(indexHtml, /role="region"[^>]*data-i18n-aria="reviews\.trackAria"/);
  assert.match(indexHtml, /data-i18n-aria="reviews\.prevAria"/);
  assert.match(indexHtml, /data-i18n-aria="reviews\.nextAria"/);
});

test('arrow controls stay keyboard- and screen-reader-usable', () => {
  const arrows = indexHtml.match(/<button type="button" data-review-(?:prev|next)[\s\S]*?<\/button>/g) ?? [];
  assert.equal(arrows.length, 2, 'expected exactly two review arrow buttons');
  for (const arrow of arrows) {
    assert.match(arrow, /class="[^"]*\bfocusable\b/, 'arrow needs the shared focus ring');
    assert.match(arrow, /aria-label="/, 'arrow needs a default aria-label');
    assert.match(arrow, /<span aria-hidden="true">/, 'arrow glyph must be hidden from AT');
  }
  // 화살표 상태는 disabled 속성으로만 표현한다 (CSS로 흐리게 처리).
  assert.match(indexHtml, /\.review-arrow\[disabled\]/);
  // 카드가 렌더되기 전에는 눌러도 움직일 게 없으므로 마크업에서 비활성으로 출발한다.
  for (const arrow of arrows) {
    assert.match(arrow, /data-review-(?:prev|next) disabled/, 'arrow must ship disabled and be enabled by the first sync');
  }
});

test('both locales ship the same seven approved review cards', () => {
  for (const locale of ['en', 'ko']) {
    const block = reviewCardsBlock(locale);
    const quotes = block.match(/quote: '/g) ?? [];
    assert.equal(quotes.length, 7, `${locale} must have 7 review cards`);
    assert.equal((block.match(/meta: '/g) ?? []).length, 7, `${locale} cards need meta lines`);
    assert.equal((block.match(/tag: '/g) ?? []).length, 7, `${locale} cards need program tags`);
  }
});

test('newly added quotes match the approved survey wording', () => {
  const en = reviewCardsBlock('en');
  assert.match(en, /If you are looking to experience Korean baseball culture with local Koreans/);
  assert.match(en, /They did a fantastic job of explaining what was happening during the game/);
  assert.match(en, /The experience was great! The guide was nice and it was like being with friends/);
  assert.match(en, /Super fun experience and our guide was super kind, helpful and made the experience amazing!!/);
  const ko = reviewCardsBlock('ko');
  assert.match(ko, /한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면/);
  assert.match(ko, /경기 중에 무슨 일이 벌어지고 있는지 정말 잘 설명해 줬어요/);
  assert.match(ko, /가이드는 친절했고 친구들과 함께 있는 것 같았어요/);
  assert.match(ko, /가이드가 무척 친절하고 큰 도움이 되어 최고의 경험이 됐어요/);
});

test('cards run oldest to newest, and the carousel opens on the second one', () => {
  // 1번(6월 파일럿)은 히어로가 이미 대표 인용으로 쓰고 있어 기본 노출에서 빠진다.
  const quoteOrder = (locale) => [...reviewCardsBlock(locale).matchAll(/quote: '“([^”]+)”'/g)].map((m) => m[1]);

  const en = quoteOrder('en');
  assert.equal(en.length, 7);
  assert.match(en[0], /^If you are looking to experience Korean baseball culture/);
  assert.match(en[6], /^Super fun experience and our guide/);

  // KO 순서가 EN과 어긋나면 언어를 바꿨을 때 다른 후기가 기본 노출된다.
  const ko = quoteOrder('ko');
  assert.equal(ko.length, 7);
  assert.match(ko[0], /^한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면/);
  assert.match(ko[6], /^정말 재미있는 경험이었고/);

  assert.match(indexHtml, /const DEFAULT_REVIEW_CARD_INDEX = 1;/);
  assert.match(indexHtml, /function alignReviewsToDefaultCard\(\)/);
  // 렌더 직후 시작 위치를 잡아야 언어 전환 뒤에도 2번 카드에서 출발한다.
  // 끝 표시는 renderReviewCards 바로 다음에 오는 선언이어야 한다. 없는 문자열을 쓰면
  // indexOf가 -1이라 파일 전체를 훑게 되고, 호출이 어디에 있든 통과해 버린다.
  const rendererStart = indexHtml.indexOf('const renderReviewCards');
  const rendererEnd = indexHtml.indexOf('const renderAnnouncement');
  assert.ok(rendererStart !== -1 && rendererEnd > rendererStart, 'renderReviewCards 범위를 잡지 못했다');
  const renderer = indexHtml.slice(rendererStart, rendererEnd);
  assert.match(renderer, /restartReviewAlignment\(\);/);
  // 사용자가 직접 넘긴 뒤에는 시작 위치를 다시 강제하지 않는다.
  assert.match(indexHtml, /const stopReviewAlignment = \(\) => \{ reviewAlignmentPending = false; \};/);
  assert.match(indexHtml, /\['pointerdown', 'wheel', 'keydown'\]/);
});

test('review section never exposes maintainer-only validation details', () => {
  const sectionStart = indexHtml.indexOf('<section id="reviews"');
  const sectionEnd = indexHtml.indexOf('<section id="apply"');
  const section = indexHtml.slice(sectionStart, sectionEnd);
  assert.doesNotMatch(section, /F001|4\/5|30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal/);
});

test('the photo backdrop lives in the final CTA, not the review section', () => {
  const reviews = indexHtml.slice(indexHtml.indexOf('<section id="reviews"'), indexHtml.indexOf('<section id="apply"'));
  const apply = indexHtml.slice(indexHtml.indexOf('<section id="apply"'), indexHtml.indexOf('</main>'));

  assert.doesNotMatch(reviews, /backdrop-slide|data-photo-backdrop/, 'reviews is a plain light band now');
  assert.match(reviews, /<section id="reviews" class="bg-panel"/);

  assert.match(apply, /data-photo-backdrop/);
  assert.equal((apply.match(/backdrop-slide/g) ?? []).length, 5, 'five landscape backdrop photos');
  assert.match(apply, /aria-hidden="true" data-photo-backdrop/, 'backdrop is decorative');
  assert.doesNotMatch(apply, /<img[^>]*backdrop-slide[^>]*alt="[^"]+"/, 'backdrop photos carry empty alt');
  // 리뷰 섹션에 있던 배경을 그대로 옮겼다. 스크림도 같은 ink/70이다.
  assert.match(apply, /class="absolute inset-0 bg-ink\/70"/);
  assert.match(indexHtml, /<section id="apply" class="[^"]*\bbg-ink\b/);
});

test('the backdrop stays autoplay-only, with no manual controls', () => {
  assert.match(indexHtml, /const startPhotoBackdrop = \(\) => \{/);
  assert.match(indexHtml, /startPhotoBackdrop\(\);/);
  // 자동재생은 모션 민감 사용자에게 꺼진다.
  const driverStart = indexHtml.indexOf('const startPhotoBackdrop');
  const driver = indexHtml.slice(driverStart, indexHtml.indexOf('// ===== 리뷰 카드 캐러셀', driverStart));
  assert.match(driver, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(indexHtml, /backdrop-slide[^"]*"[^>]*data-review-(?:prev|next)/);

  // DESIGN.md의 자동 전환 계약: 6초마다 교체, 1초 페이드.
  assert.match(driver, /\}, 6000\);/);
  assert.match(indexHtml, /\.backdrop-slide \{\s*transition: opacity 1000ms ease-in-out;/);
});

test('phones show exactly one review card, with no sliver of the next one', () => {
  // 카드가 85%였을 때 다음 카드가 15% 걸쳐 보였다(2026-08-20 유현님 지적).
  // 더 있다는 신호는 트랙 아래 화살표가 하므로 엿보기 폭은 필요 없다.
  // `figure.className`은 사진 카드에도 있고 그쪽이 먼저 나온다.
  // 리뷰 카드만 가진 `snap-start`로 잡는다.
  const cls = indexHtml.match(/figure\.className = '([^']*\bsnap-start\b[^']*)'/);
  assert.ok(cls, '리뷰 카드 className을 찾지 못했다');
  const classes = cls[1].split(/\s+/);

  assert.ok(classes.includes('w-full'), '폰에서는 카드가 트랙 폭을 다 써야 한다');
  // 모바일 기본 폭에 퍼센트가 남으면 엿보기가 되살아난다. sm: 이상 분기는 무관.
  const mobileWidths = classes.filter((c) => /^w-/.test(c));
  assert.deepEqual(mobileWidths, ['w-full'], `모바일 폭이 하나가 아니다: ${mobileWidths.join(', ')}`);

  // 여러 장 보이는 화면은 그대로 둔다. 폰만 바꾼 것이지 캐러셀을 없앤 게 아니다.
  assert.ok(classes.some((c) => c.startsWith('sm:w-')), 'sm 이상에서는 여러 장이 보여야 한다');
  assert.ok(classes.some((c) => c.startsWith('md:w-')), 'md 이상에서는 세 장이 보여야 한다');

  // 화살표가 유일한 "더 있다" 신호가 되므로 폰에서 사라지면 안 된다.
  const arrowRow = indexHtml.match(/<div class="(mt-8 flex items-center justify-center[^"]*)"/);
  assert.ok(arrowRow, '화살표 줄을 찾지 못했다');
  assert.doesNotMatch(arrowRow[1], /\bhidden\b/, '폰에서 화살표를 숨기면 넘길 방법이 사라진다');
});
