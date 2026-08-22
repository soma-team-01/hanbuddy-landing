const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

// 상세페이지 후기 블록은 정적 HTML이라 손으로 옮겨 적는다. 이 테스트가
// assets/reviews-data.js(단일 소스)와의 드리프트를 잡는다 — 과거에 고척 페이지가
// 잠실 인용을 잘못 달고 있던 류의 사고를 구조적으로 막는 목적이다.
const { ratedReviews, detailReviews, ratingSummary } = require('../assets/reviews-data.js');

const root = join(__dirname, '..');

// 페이지 목록을 손으로 적으면 새로 추가한 이벤트가 검사에서 통째로 빠진다.
const pages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const html = (slug) => readFileSync(join(root, 'events', slug, 'index.html'), 'utf8')
  .replace(/&middot;/g, '·')
  .replace(/&amp;/g, '&');

const reviewSection = (source) => source.match(/<section id="reviews"[\s\S]*?<\/section>/)?.[0] ?? null;

test('every activity with rated reviews shows them on its own detail page', () => {
  for (const slug of pages) {
    if (ratedReviews(slug).length === 0) continue;
    const section = reviewSection(html(slug));
    assert.ok(section, `${slug}: 별점 확인된 후기가 있는데 후기 섹션이 없다`);
    assert.ok(
      section.includes(`data-review-activity="${slug}"`),
      `${slug}: 후기 섹션이 자기 활동의 후기를 싣지 않는다`,
    );
  }
});

test('review sections mirror reviews-data.js exactly', () => {
  let sectionsSeen = 0;
  for (const slug of pages) {
    const section = reviewSection(html(slug));
    if (!section) continue;
    sectionsSeen += 1;

    const activity = section.match(/data-review-activity="([^"]+)"/)?.[1];
    assert.ok(activity, `${slug}: 후기 섹션에 data-review-activity가 없다`);
    // 상세는 최신 운영부터 보여준다(유현님 지시, 2026-08-22). 데이터 배열은 오래된 순이다.
    const reviews = detailReviews(activity);
    assert.ok(reviews.length > 0, `${slug}: ${activity}에는 별점 확인된 후기가 없다`);
    assert.equal(reviews.length, ratedReviews(activity).length, `${slug}: 최신순 목록이 후기를 빠뜨렸다`);
    for (let i = 1; i < reviews.length; i += 1) {
      assert.ok(reviews[i - 1].date >= reviews[i].date, `${slug}: 후기가 최신순이 아니다`);
    }
    // 출처 줄에는 운영 날짜가 정확히 적혀야 한다(월만 적으면 회차를 특정할 수 없다).
    for (const review of reviews) {
      const [year, month, day] = review.date.split('-').map(Number);
      const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
      assert.ok(review.en.meta.includes(`${monthName} ${day}, ${year}`) || review.en.meta.includes(`${monthName} ${day} `),
        `${slug}: 출처 줄에 운영 날짜(${monthName} ${day}, ${year})가 없다: ${review.en.meta}`);
    }

    // 인용·출처는 승인 원문과 글자 단위로 같아야 하고, 순서도 데이터를 따른다.
    const quotes = [...section.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => m[1].trim());
    assert.deepEqual(quotes, reviews.map((review) => review.en.quote), `${slug}: 인용이 데이터와 다르다`);
    const metas = [...section.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) => m[1].trim());
    assert.deepEqual(metas, reviews.map((review) => review.en.meta), `${slug}: 출처가 데이터와 다르다`);

    // 별점 행은 후기마다 하나씩, 채워진 별 개수가 설문 점수와 같아야 한다.
    // 헤더의 단독 ★은 길이 5가 아니라서 걸리지 않는다.
    const starRows = [...section.matchAll(/>(★+☆*)</g)].map((m) => m[1]).filter((row) => row.length === 5);
    assert.equal(starRows.length, quotes.length, `${slug}: 별점 행 없는 후기가 있다`);
    assert.deepEqual(
      starRows,
      reviews.map((review) => '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)),
      `${slug}: 별점이 설문 점수와 다르다`,
    );

    // 활동별 평균·개수는 데이터에서 계산한 값과 표기가 일치해야 한다.
    const summary = ratingSummary(activity);
    const summaryText = `${summary.average.toFixed(1)} · ${summary.count} review`;
    assert.ok(section.includes(summaryText), `${slug}: 후기 헤더의 평점 표기가 계산값(${summaryText})과 다르다`);
    assert.ok(
      html(slug).includes(`${summary.average.toFixed(1)} (${summary.count} review`),
      `${slug}: 제목 아래 평점 배지가 계산값과 다르다`,
    );

    // 다른 활동의 후기를 빌려 쓰면 출처 안내가 있어야 하고, 자기 후기면 없어야 한다.
    if (activity === slug) {
      assert.doesNotMatch(section, /data-review-source-note/, `${slug}: 자기 후기인데 출처 안내가 있다`);
    } else {
      assert.match(section, /data-review-source-note/, `${slug}: 빌려온 후기인데 출처 안내가 없다`);
    }
  }
  assert.ok(sectionsSeen >= 3, `후기 섹션이 너무 적다: ${sectionsSeen}`);
});

test('detail pages surface key facts as chips', () => {
  for (const slug of pages) {
    const chips = html(slug).match(/<ul data-key-facts[\s\S]*?<\/ul>/)?.[0];
    assert.ok(chips, `${slug}: 핵심 정보 칩(data-key-facts)이 없다`);
    assert.ok((chips.match(/<li/g) ?? []).length >= 3, `${slug}: 칩이 3개 미만이다`);
    assert.match(chips, /₩[\d,]+/, `${slug}: 가격 칩이 없다`);
    assert.match(chips, /Meet/, `${slug}: 집합 시간 칩이 없다`);
    assert.match(chips, /Pick your date when you apply/, `${slug}: 날짜 안내 칩이 없다`);
  }
});
