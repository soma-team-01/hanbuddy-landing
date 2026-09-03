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
      assert.ok(review.en.meta.includes(`${monthName} ${day}, ${year}`),
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
  // 2026-09-04: K리그 페이지를 10월 FC서울 홈경기까지 내려서 후기 섹션은 야구 둘뿐이다.
  // 국가대표 페이지는 아직 운영 전이라 후기 섹션이 없다. K리그가 돌아오면 3으로 올린다.
  assert.ok(sectionsSeen >= 2, `후기 섹션이 너무 적다: ${sectionsSeen}`);
});

test('detail pages put key facts in a one-per-line table and describe the actual day', () => {
  for (const slug of pages) {
    const source = html(slug);
    // 핵심 정보는 본문 첫 블록의 <dl>: 모든 폭에서 한 줄에 하나씩(유현님 rule, 2026-08-22).
    const facts = source.match(/<dl data-key-facts[\s\S]*?<\/dl>/)?.[0];
    assert.ok(facts, `${slug}: 핵심 정보 표(data-key-facts)가 없다`);
    assert.doesNotMatch(facts, /flex-wrap/, `${slug}: 정보 표가 칩처럼 한 줄에 여러 개 흐른다`);
    const rows = [...facts.matchAll(/<dt[^>]*>[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((m) => m[1].trim());
    assert.ok(rows.length >= 4, `${slug}: 정보 행이 4개 미만이다`);
    const row = (label) => facts.match(new RegExp(`<dt[^>]*>[\\s\\S]*?<\\/span> ${label}<\\/dt>\\s*<dd[^>]*>([^<]*)<\\/dd>`))?.[1];
    // Fee와 Included는 따로 적는다("₩60,000 · ticket & food"는 뜻이 안 읽혔다).
    assert.match(row('Fee') ?? '', /^₩[\d,]+ per person$/, `${slug}: Fee 행이 없거나 형식이 다르다`);
    assert.ok((row('Included') ?? '').length > 0, `${slug}: Included 행이 없다`);
    assert.doesNotMatch(row('Fee'), /included|ticket|food/i, `${slug}: Fee 행에 포함 항목이 섞여 있다`);
    assert.ok((row('Meet') ?? '').length > 0, `${slug}: Meet 행이 없다`);
    assert.equal(row('Date'), 'Pick your date when you apply', `${slug}: Date 행이 신청 캘린더를 가리키지 않는다`);
    // Date와 Meet는 붙어 있어야 한다(언제 오는지가 한 덩어리).
    const labels = [...facts.matchAll(/<\/span> ([A-Za-z]+)<\/dt>/g)].map((m) => m[1]);
    assert.equal(labels.indexOf('Meet') - labels.indexOf('Date'), 1, `${slug}: Date 바로 다음에 Meet가 와야 한다: ${labels.join(', ')}`);
    assert.ok(!labels.includes('Language'), `${slug}: Language 행은 뺐다`);
    // 어디서 만나는지는 첫 행. 식당이 고정이 아닌 음식 회차도 "서울, 장소는 메시지로"로 답한다.
    assert.equal(labels[0], 'Venue', `${slug}: 첫 행은 Venue여야 한다: ${labels.join(', ')}`);

    // "How joining works"(Apply → Confirm → 당연한 절차) 대신 실제 당일 흐름을 적는다.
    assert.doesNotMatch(source, /How joining works/, `${slug}: 당연한 절차 블록이 되살아났다`);
    const itinerary = source.match(/<ol[^>]*data-itinerary[\s\S]*?<\/ol>/)?.[0];
    assert.ok(itinerary, `${slug}: 당일 흐름(data-itinerary)이 없다`);
    assert.ok((itinerary.match(/<li/g) ?? []).length >= 3, `${slug}: 당일 흐름이 3단계 미만이다`);
    assert.match(itinerary, /<li[^>]*>[\s\S]*?<span[^>]*>1<\/span>/, `${slug}: 당일 흐름은 1부터 번호가 보여야 한다`);
    // 개인정보 보관 문구는 신청 폼에만 둔다(상세에서는 뺐다, 2026-08-22).
    assert.doesNotMatch(source, /We keep your application only/, `${slug}: 보관 문구가 되살아났다`);
  }
});
