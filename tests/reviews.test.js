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

test('both locales ship the same five approved review cards', () => {
  for (const locale of ['en', 'ko']) {
    const block = reviewCardsBlock(locale);
    const quotes = block.match(/quote: '/g) ?? [];
    assert.equal(quotes.length, 5, `${locale} must have 5 review cards`);
    assert.equal((block.match(/meta: '/g) ?? []).length, 5, `${locale} cards need meta lines`);
    assert.equal((block.match(/tag: '/g) ?? []).length, 5, `${locale} cards need program tags`);
  }
});

test('newly added quotes match the approved survey wording', () => {
  const en = reviewCardsBlock('en');
  assert.match(en, /If you are looking to experience Korean baseball culture with local Koreans/);
  assert.match(en, /They did a fantastic job of explaining what was happening during the game/);
  const ko = reviewCardsBlock('ko');
  assert.match(ko, /한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면/);
  assert.match(ko, /경기 중에 무슨 일이 벌어지고 있는지 정말 잘 설명해 줬어요/);
});

test('review section never exposes maintainer-only validation details', () => {
  const sectionStart = indexHtml.indexOf('<section id="reviews"');
  const sectionEnd = indexHtml.indexOf('<section id="apply"');
  const section = indexHtml.slice(sectionStart, sectionEnd);
  assert.doesNotMatch(section, /F001|4\/5|30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal/);
});

test('review backdrop stays autoplay-only (no arrows on the photo layer)', () => {
  assert.match(indexHtml, /startReviewBackdrop/);
  assert.doesNotMatch(indexHtml, /review-slide[^"]*"[^>]*data-review-(?:prev|next)/);
});
