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
  assert.doesNotMatch(h1[0], /text-wrap:balance/, 'balance는 끊는 지점을 우리 뜻대로 두지 않는다');
});

test('the two hero CTAs share one width', () => {
  // 라벨 길이가 달라 버튼 폭이 제각각이었다. 그리드가 칸을 균등하게 나눈다.
  const actions = html.match(/<div class="hero-actions ([^"]*)"/);
  assert.ok(actions, '히어로 버튼 묶음을 찾지 못했다');
  const classes = actions[1].split(/\s+/);
  assert.ok(classes.includes('grid'), '폭을 맞추려면 그리드여야 한다');
  assert.ok(classes.includes('sm:grid-cols-2'), '넓은 화면에서 두 칸이 균등해야 한다');
  assert.ok(!classes.includes('sm:flex-row'), 'flex로 되돌리면 폭이 내용 길이를 따라간다');
});

test('the hero opens on the headline, not a label above it', () => {
  // "Seoul · Meetups every week"은 제목이 이미 하는 말이었다(2026-08-18 제거).
  assert.doesNotMatch(html, /data-i18n="hero\.eyebrow"/, '히어로 eyebrow가 다시 붙었다');
  assert.doesNotMatch(html, /hero-eyebrow/, 'eyebrow 전용 규칙이 남아 있다');
});
