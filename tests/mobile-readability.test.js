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
      /Instagram|WhatsApp|KakaoTalk|오픈채팅|인스타그램|왓츠앱|카카오톡/,
      '채널 이름은 버튼이 말한다. 문장으로 다시 나열하지 않는다',
    );
  }
});

test('the final CTA gives phones a shorter vertical frame than the photo band needs', () => {
  // 사진 배경이 보일 여백이 폰에서는 상하 160px이라 섹션이 화면 하나를 넘겼다.
  // 좁은 화면만 줄이고 sm 이상은 원래 여백을 되찾아야 한다.
  const inner = html.match(/<div class="(relative z-10 mx-auto grid max-w-6xl[^"]*)"/);
  assert.ok(inner, '최종 CTA 안쪽 래퍼를 찾지 못했다');
  // 클래스를 쪼개서 본다. `py-12 py-20`처럼 둘 다 남으면 Tailwind에서 뒤가 이겨
  // 폰 축소가 무효가 되는데, 존재 여부만 보는 검사는 그대로 통과한다.
  const classes = inner[1].split(/\s+/);
  assert.ok(classes.includes('py-12'), '폰에서는 세로 여백을 줄여야 한다');
  assert.ok(!classes.includes('py-20'), '모바일 기본 여백에 py-20이 남아 있으면 축소가 무효다');
  assert.ok(classes.includes('sm:py-20'), 'sm 이상에서 사진 배경 여백을 되찾아야 한다');
  assert.ok(classes.includes('lg:py-32'), '데스크톱 여백은 그대로다');
});

test('event cards render no tagline at all, but life cards keep the any-day line', () => {
  // 태그라인은 2026-08-18 모바일 접기를 거쳐 2026-08-22 유현님 결정으로 스포츠에
  // 이어 라이프까지 어느 화면에서도 그리지 않는다. 카드는 사진·제목에 스포츠는
  // 날짜 칩, 라이프는 상시 안내 한 줄만 얹는다. 카피는 CONTENT_MAP에 남긴다
  // (지우는 대신 안 그린다). anyDay 줄은 날짜 칩의 카운터파트라 같이 지우면
  // 회차 모델 구분(경기일 고정 vs 아무 날이나)이 카드에서 사라진다.
  const renderer = html.slice(
    html.indexOf('const renderEventCards'),
    html.indexOf('const renderReviewCards'),
  );
  assert.doesNotMatch(renderer, /item\.tagline/, '카드 태그라인 렌더링이 되살아났다');
  // 상시 안내는 짧은 판(모바일)·긴 판(데스크톱) 한 쌍이다. 모바일 3열 폭에서는
  // 긴 문장이 어중간하게 꺾인다("pick"만 다음 줄). 히어로 인용과 같은 계약:
  // 서로 반대 조건을 들고 있어야 폰에 한 줄만 남는다.
  const anyShort = renderer.match(/textNode\('p', '([^']*)', copy\.events\.anyDayShort\)/);
  assert.ok(anyShort, '모바일용 짧은 상시 안내가 없다');
  assert.match(anyShort[1], /\bsm:hidden\b/, '짧은 판은 데스크톱에서 사라져야 한다');
  const anyFull = renderer.match(/textNode\('p', '([^']*)', copy\.events\.anyDay\)/);
  assert.ok(anyFull, '데스크톱용 상시 안내가 없다');
  assert.match(anyFull[1], /\bhidden\b/, '긴 판은 모바일에서 접혀야 한다');
  assert.match(anyFull[1], /\bsm:block\b/, '긴 판은 데스크톱에서 다시 보여야 한다');
});

test('the contact channels sit in one row that matches the primary button width', () => {
  // 버튼 4개가 세로로 쌓여 섹션이 길었다(2026-08-18). 문의 채널은 로고로 알아보므로
  // 아이콘 한 줄로 접었다. 3열 그리드여야 행 폭이 위 버튼과 같아진다.
  const group = html.match(/<div class="([^"]*)" role="group"\n\s*aria-label="Contact channels"/);
  assert.ok(group, '문의 채널 그룹을 찾지 못했다');
  const classes = group[1].split(/\s+/);
  assert.ok(classes.includes('grid'), '행 폭을 버튼에 맞추려면 그리드여야 한다');
  assert.ok(classes.includes('grid-cols-3'), '세 채널이 한 줄에 서야 한다');
});

test('each contact icon keeps a visible label and a spoken one', () => {
  // 아이콘만 두면 30px 아래 푸터 아이콘과 같은 요소로 읽힌다. 라벨이 그 구분이다.
  // 링크 단위로 봐야 한다. 섹션 전체에서 찾으면 Instagram의 라벨이 WhatsApp
  // 링크에 붙어 있어도 통과한다.
  const start = html.indexOf('aria-label="Contact channels"');
  const section = html.slice(start, html.indexOf('</section>', start));
  const links = [...section.matchAll(/<a\s[\s\S]*?<\/a>/g)].map((m) => m[0]);
  // KakaoTalk의 추적 키만 채널명이 아니라 contact다. 링크마다 셋을 함께 확인한다.
  const channels = [
    { cta: 'instagram', key: 'instagram' },
    { cta: 'whatsapp', key: 'whatsapp' },
    { cta: 'contact', key: 'kakao' },
  ];
  assert.equal(links.length, channels.length, '문의 채널 링크 수가 맞지 않는다');
  for (const { cta, key } of channels) {
    const link = links.find((a) => a.includes(`data-cta="${cta}"`));
    assert.ok(link, `${cta} 링크가 없다`);
    assert.match(link, new RegExp(`data-i18n="finalCta\\.${key}Label"`), `${cta} 링크에 보이는 라벨이 없다`);
    assert.match(link, new RegExp(`data-i18n-aria="finalCta\\.${key}Aria"`), `${cta} 링크에 접근성 이름이 없다`);
  }
});

test('the KakaoTalk glyph stays legible when the bubble is inverted', () => {
  // 푸터는 밝은 바탕에 어두운 말풍선이라 점이 흰색이다. 최종 CTA는 말풍선이
  // 흰색이므로 같은 SVG를 그대로 쓰면 점 세 개가 사라진다.
  const start = html.indexOf('aria-label="Contact channels"');
  const section = html.slice(start, html.indexOf('</section>', start));
  const kakao = section.match(/<a[^>]*data-cta="contact"[\s\S]*?<\/a>/);
  assert.ok(kakao, '카카오 링크를 찾지 못했다');
  assert.doesNotMatch(kakao[0], /fill="white"/, '흰 말풍선 위에 흰 점을 찍으면 안 보인다');
  // 하나만 세면 나머지 두 개가 다른 색이어도 통과한다. 점 전부를 확인한다.
  const dots = [...kakao[0].matchAll(/<circle[^>]*>/g)].map((m) => m[0]);
  assert.equal(dots.length, 3, '말풍선 안 점은 세 개다');
  for (const dot of dots) {
    assert.match(dot, /fill="var\(--color-ink\)"/, '점은 모두 배경색으로 뚫어야 한다');
  }
});

test('the hero headline breaks between the two phrases, not mid-phrase', () => {
  // 두 줄이 되는 폭에서 컨테이너 폭에 맡기면 "Experience Korea like a / local!"처럼
  // 의미 단위가 잘리고, text-wrap: balance는 줄 폭만 보고 "Experience /
  // Korea like a local!"을 고른다. em 기반 max-width가 끊는 지점을 고정한다.
  const rule = html.match(/\.hero-title \{ max-width: ([^;]+); \}/);
  assert.ok(rule, '제목 폭 제한 규칙이 없다');
  assert.match(rule[1], /em$/, '두 폰트 크기에 함께 맞으려면 em이어야 한다');
  // 한 줄이 들어가는 폭에서는 제한이 풀려야 한다.
  assert.match(
    html,
    /@media \(min-width: 880px\) \{\s*\.hero-title \{ max-width: none; \}/,
    '넓은 화면에서는 제한을 풀어 한 줄로 둔다',
  );
  // balance가 살아 있으면 max-width 안에서 다시 어절 단위를 무시한다.
  const h1 = html.match(/<h1 class="hero-title[^"]*"/);
  assert.ok(h1);
  // Tailwind는 같은 것을 두 표기로 쓸 수 있다. 임의값만 막으면 유틸리티
  // 클래스(text-balance)로 다시 들어온다.
  assert.doesNotMatch(h1[0], /text-wrap:balance/, 'balance는 끊는 지점을 우리 뜻대로 두지 않는다');
  assert.doesNotMatch(h1[0], /\btext-balance\b/, 'text-balance 유틸리티도 같은 결과를 낸다');
});

test('the hero offers exactly one action', () => {
  // 버튼 둘을 나란히 두려고 폭을 맞추다 보니 "DM us on Instagram"이 칸 안에서
  // 두 줄이 되어 옆 버튼과 어긋났다(2026-08-18). 히어로의 주 행동은 신청 하나이고,
  // 문의는 최종 CTA의 아이콘 셋과 푸터가 받는다.
  const actions = html.match(/<div class="hero-actions[^"]*">([\s\S]*?)<\/div>/);
  assert.ok(actions, '히어로 버튼 묶음을 찾지 못했다');
  const links = [...actions[1].matchAll(/<a\s/g)];
  assert.equal(links.length, 1, `히어로 버튼이 ${links.length}개다`);
  assert.match(actions[1], /data-cta="apply"/, '남는 하나는 신청 버튼이어야 한다');
  assert.doesNotMatch(html, /data-i18n="hero\.contactCta"/, '히어로 문의 버튼 카피가 남아 있다');
  // 문의 경로 자체는 페이지에 남아야 한다.
  const instagramCtas = [...html.matchAll(/data-cta="instagram"/g)];
  assert.ok(instagramCtas.length >= 2, 'Instagram 경로가 최종 CTA와 푸터에 남아야 한다');
});

test('the hero opens on the headline, not a label above it', () => {
  // "Seoul · Meetups every week"은 제목이 이미 하는 말이었다(2026-08-18 제거).
  assert.doesNotMatch(html, /data-i18n="hero\.eyebrow"/, '히어로 eyebrow가 다시 붙었다');
  assert.doesNotMatch(html, /hero-eyebrow/, 'eyebrow 전용 규칙이 남아 있다');
});

test('the hero lead stays on phones because it is the ad message', () => {
  // 2026-08-18에는 접는 게 맞았다. 넉 줄짜리 회색 문단이 제목과 버튼 사이를
  // 막고 있었고, 제목이 이미 하는 말이었다.
  // 2026-08-24에 뒤집었다. 검색 광고 소구점 A/B가 이 문단으로 arm을 가르는데
  // 광고 유입은 대부분 폰이다. 접어 두면 실험 대상이 소구점을 못 읽는다.
  // 대신 문단을 폰 기준으로 짧게 다시 썼다(한 줄짜리 나열).
  const cls = hiddenOnMobile('data-i18n="hero.subtitle"');
  assert.doesNotMatch(cls, /\bhidden\b/, '히어로 본문을 접으면 광고 소구점이 폰에서 사라진다');

  const lead = html.match(/subtitle: '([^']*)',\n\s*\/\/ 구글 검색 광고 A\/B/);
  assert.ok(lead, 'EN 히어로 서브카피를 찾지 못했다');
  assert.ok(lead[1].length <= 90, `폰에서 읽을 길이여야 한다 (지금 ${lead[1].length}자)`);
});

test('the hero shows one guest quote, the same one on every screen', () => {
  // 2026-08-18에는 폰용·데스크톱용 두 벌이었다. 110자짜리 대표 인용이 375px에서
  // 네 줄이 돼서 폰만 짧은 후기로 바꿨다.
  // 2026-08-24에 한 벌로 합쳤다. 화면마다 다른 후기가 뜨면 같은 페이지를 두 사람이
  // 다르게 인용하는 셈이고, 광고 arm까지 카피를 갈아끼우는 지금은 경우의 수가 네
  // 배가 된다. 대신 길이를 폰 기준으로 고른다. 긴 인용은 캐러셀 1번 카드에 남는다.
  const one = (tag, key) => {
    const all = [...html.matchAll(new RegExp(`<${tag} class="([^"]*)"[^>]*data-i18n="hero\\.${key}[^"]*"`, 'g'))];
    assert.equal(all.length, 1, `히어로 ${key}는 하나여야 한다 (지금 ${all.length}개)`);
    return all[0][1].split(/\s+/);
  };

  for (const [tag, key] of [['blockquote', 'quote'], ['figcaption', 'quoteBy']]) {
    const cls = one(tag, key);
    assert.ok(!cls.includes('hidden'), `히어로 ${key}를 접으면 그 화면에는 후기가 없다`);
    assert.ok(!cls.includes('sm:hidden'), `히어로 ${key}가 데스크톱에서 사라진다`);
  }

  // 인용만 갈아끼우고 출처를 놔두면 남의 후기에 다른 사람 출처가 붙는다. 실제로
  // 그렇게 만들었다가 브라우저에서 잡았다(2026-08-20: 7월 회차 후기에 "our first
  // baseball night"이 붙어 있었다). 짝이 맞는지는 아래 테스트가 회차로 확인한다.
  assert.doesNotMatch(html, /data-i18n="hero\.quoteShort/, '폰 전용 인용이 다시 붙었다');
});

test('the hero quote is an approved review that the carousel does not open on', () => {
  // 캐러셀은 DEFAULT_REVIEW_CARD_INDEX 카드에서 출발한다. 히어로가 그 카드와 같은
  // 문장을 쓰면, 없애려던 중복이 바로 아래에서 그대로 다시 생긴다.
  const defaultIndex = Number(html.match(/const DEFAULT_REVIEW_CARD_INDEX = (\d+);/)[1]);
  // 리뷰 카드는 assets/reviews-data.js가 단일 소스다(캐러셀·상세페이지 공유).
  const { cardsForLocale, GUEST_REVIEWS } = require('../assets/reviews-data.js');
  for (const locale of ['en', 'ko']) {
    const block = html.match(new RegExp(`^ {6}${locale}: \\{[\\s\\S]*?^ {6}\\},$`, 'm'))[0];
    const heroQuote = block.match(/\n {10}quote: '(“[^”]+”)'/);
    assert.ok(heroQuote, `${locale} hero.quote 카피가 없다`);

    const cards = cardsForLocale(locale);
    const cardQuotes = cards.map((card) => card.quote);
    assert.equal(cardQuotes.length, 7, `${locale} 리뷰 카드가 7개가 아니다`);
    assert.ok(cardQuotes.includes(heroQuote[1]), `${locale} 히어로 인용이 승인된 후기가 아니다`);
    assert.notEqual(
      heroQuote[1],
      cardQuotes[defaultIndex],
      `${locale} 히어로 인용이 캐러셀 첫 화면과 같은 문장이다`,
    );

    // 클래스 짝만 맞아도 출처가 다른 회차를 가리키면 사실이 틀린다.
    // 인용이 온 카드의 meta와 같은 회차를 말하는지 본다. 달만 보면 같은 달에
    // 두 종목이 열린 순간 야구 후기에 축구 출처가 붙어도 통과하므로 종목까지 본다
    // (지금은 8월이 K리그뿐이라 안 걸리지만, 8월 야구 후기가 하나 들어오면 바로
    // 생기는 구멍이다).
    const run = (text) => (text.match(/June|July|August|6월|7월|8월/) ?? [])[0];
    const sport = (text) => (text.match(/baseball|football|야구|축구/i) ?? [])[0]?.toLowerCase();
    const sportOf = (activity) => (activity.startsWith('kbo')
      ? (locale === 'ko' ? '야구' : 'baseball')
      : (locale === 'ko' ? '축구' : 'football'));
    const heroIndex = cardQuotes.indexOf(heroQuote[1]);
    const heroQuoteBy = block.match(/\n {10}quoteBy: '([^']+)'/);
    assert.ok(heroQuoteBy, `${locale} hero.quoteBy 카피가 없다`);
    assert.equal(
      run(heroQuoteBy[1]),
      run(cards[heroIndex].meta),
      `${locale} 히어로 인용의 출처 회차가 그 후기가 나온 회차와 다르다`,
    );
    assert.equal(
      sport(heroQuoteBy[1]),
      sportOf(GUEST_REVIEWS[heroIndex].activity),
      `${locale} 히어로 인용의 출처 종목이 그 후기가 나온 활동과 다르다`,
    );

    // 광고 A/B arm이 갈아끼우는 인용도 같은 계약을 받는다. 승인된 후기여야 하고,
    // 캐러셀이 여는 카드와 겹치면 안 되고, 출처가 그 후기의 회차를 말해야 한다.
    // 여기가 비어 있으면 arm 화면에서만 승인 밖 인용이 도는 길이 열린다.
    const variants = block.match(/variants: \{[\s\S]*?\n {10}\},/)[0];
    for (const arm of ['local', 'friends']) {
      const armBlock = variants.match(new RegExp(`\\n {12}${arm}: \\{[\\s\\S]*?\\n {12}\\},`));
      assert.ok(armBlock, `${locale} ${arm} arm 카피가 없다`);

      const pairs = [...armBlock[0].matchAll(/\n {14}quote: '(“[^”]+”)',\n {14}quoteBy: '([^']+)',/g)];
      assert.equal(pairs.length, 1, `${locale} ${arm} arm은 인용과 출처를 한 쌍만 가져야 한다`);

      const [, quote, by] = pairs[0];
      const index = cardQuotes.indexOf(quote);
      assert.notEqual(index, -1, `${locale} ${arm} arm 인용이 승인된 후기가 아니다`);
      assert.notEqual(index, defaultIndex, `${locale} ${arm} arm 인용이 캐러셀 첫 화면과 같다`);
      assert.equal(run(by), run(cards[index].meta), `${locale} ${arm} arm 인용의 출처 회차가 후기와 다르다`);
      assert.equal(
        sport(by),
        sportOf(GUEST_REVIEWS[index].activity),
        `${locale} ${arm} arm 인용의 출처 종목이 후기와 다르다`,
      );
    }
  }
});

test('the sections do not repeat a promise the apply flow already makes', () => {
  // upcoming 하단 note와 제안 폼의 "No commitment" 줄은 각각 데스크톱 리드 문단과
  // 바로 위 버튼이 이미 하는 말이었다(2026-08-20 제거). 개인정보 고지는 남는다.
  assert.doesNotMatch(html, /data-i18n="events\.note"/, 'upcoming 하단 note가 다시 붙었다');
  assert.doesNotMatch(html, /data-i18n="suggest\.note"/, '제안 폼 안심 문구가 다시 붙었다');
  const privacyNotes = [...html.matchAll(/data-i18n="suggest\.privacyNote"/g)];
  assert.equal(privacyNotes.length, 1, '연락처 수집 목적 고지는 남아 있어야 한다');
});

test('the rating pill stays one line on phones instead of wrapping around the stars', () => {
  // 43자짜리 문구가 폰에서 두 줄로 감기면, 별과 화살표만 세로 중앙에 남아
  // 알약이 뚱뚱해진다(2026-08-20). 좁은 화면에서만 짧은 문구를 쓴다.
  const spanClass = (key) => {
    const el = html.match(new RegExp(`<span class="([^"]*)"[^>]*data-i18n="${key}"`));
    assert.ok(el, `${key} span을 찾지 못했다`);
    return el[1].split(/\s+/);
  };

  const short = spanClass('hero\\.ratingNoteShort');
  assert.ok(short.includes('sm:hidden'), '짧은 문구는 데스크톱에서 사라져야 한다');
  assert.ok(!short.includes('hidden'), '짧은 문구가 폰에서도 숨으면 별점이 사라진다');

  const full = spanClass('hero\\.ratingNote');
  assert.ok(full.includes('hidden'), '긴 문구는 폰에서 접혀야 한다');
  assert.ok(full.includes('sm:inline'), '긴 문구는 데스크톱에서 다시 보여야 한다');

  // 짧은 쪽이 길어지면 다시 감긴다. 별·화살표·좌우 여백을 뺀 폭에 들어갈 만큼만 둔다.
  for (const locale of ['en', 'ko']) {
    const block = html.match(new RegExp(`^ {6}${locale}: \\{[\\s\\S]*?^ {6}\\},$`, 'm'))[0];
    const copy = block.match(/ratingNoteShort: '([^']+)'/);
    assert.ok(copy, `${locale} hero.ratingNoteShort 카피가 없다`);
    assert.ok(copy[1].length <= 24, `${locale} 폰 문구가 길어 다시 감긴다: "${copy[1]}"`);
  }

  // 320px(구형 SE·폴드 커버)에서는 짧은 문구만으로도 11px이 모자랐다.
  // 좁은 화면에서만 좌우 여백과 간격을 줄여 채웠고, sm 이상에서 되찾는다.
  // 클래스를 쪼개서 본다. `px-4 px-5`처럼 둘 다 남으면 뒤가 이겨 축소가 무효인데,
  // 존재 여부만 보는 검사는 그대로 통과한다.
  const pill = html.match(/<a href="#reviews" class="(hero-rating[^"]*)"/);
  assert.ok(pill, '별점 알약을 찾지 못했다');
  const pillClasses = pill[1].split(/\s+/);
  assert.ok(pillClasses.includes('px-4'), '폰에서는 좌우 여백을 줄여야 320px에 들어간다');
  assert.ok(!pillClasses.includes('px-5'), '모바일 기본 여백에 px-5가 남아 있으면 축소가 무효다');
  assert.ok(pillClasses.includes('sm:px-5'), 'sm 이상에서 원래 여백을 되찾아야 한다');
  assert.ok(pillClasses.includes('gap-1.5'), '폰에서는 별과 문구 간격도 줄인다');
  assert.ok(pillClasses.includes('sm:gap-2'), 'sm 이상에서 원래 간격을 되찾아야 한다');
});
