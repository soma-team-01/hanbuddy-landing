const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const analyticsJs = readFileSync(join(__dirname, '..', 'assets', 'analytics.js'), 'utf8');

const aboutPath = join(__dirname, '..', 'about', 'index.html');
const aboutHtml = existsSync(aboutPath) ? readFileSync(aboutPath, 'utf8') : '';

test('about page exists with core sections', () => {
  assert.ok(aboutHtml.length > 0, 'about/index.html must exist');
  for (const id of ['top', 'origin', 'how', 'timeline', 'team']) {
    assert.match(aboutHtml, new RegExp(`<section id="${id}"`), `missing section #${id}`);
  }
});

test('about page keeps analytics behind consent (same gate as index)', () => {
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i);
  assert.doesNotMatch(aboutHtml, /<script[^>]+src=["']https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/i);
  assert.match(aboutHtml, /data-consent-banner/);
  assert.match(aboutHtml, /data-consent-action="accept"/);
  assert.match(aboutHtml, /data-consent-action="reject"/);
  assert.match(aboutHtml, /<script src="\/assets\/analytics\.js"><\/script>/);
  assert.match(analyticsJs, /hanbuddy\.analyticsConsent/);
});

test('about page never exposes maintainer-only validation details', () => {
  assert.doesNotMatch(
    aboutHtml,
    /F001|4\/5|30,000|under 30,000|Less than 30,000|pre-acquaintance|proof of scale|learning signal/,
  );
});

test('about page never says weekend (baseball runs on weeknights too)', () => {
  assert.doesNotMatch(aboutHtml, /weekend/i, 'weekend framing is retired — use week');
  assert.doesNotMatch(aboutHtml, /주말/, '주말 표현은 폐기됨 — 매주/week 계열로');
});

test('about page never claims un-operated activities as completed meetups', () => {
  assert.doesNotMatch(aboutHtml, /Real moments from our meetups/);
  assert.doesNotMatch(aboutHtml, /실제 모임의 순간들/);

  // 완료(status: 'done')로 표기할 수 있는 회차는 실제로 운영한 것뿐이다. 날짜 화이트리스트로 고정한다.
  // 2026-08-20 기준 실제 운영: 잠실 KBO 2회(06.25, 07.26) + 상암 K리그 1회(08.15).
  // 한강 피크닉은 8/1 취소 후 운영 기록이 확인된 적 없고(잘못 올라갔던 완료 표기는
  // 2026-08-20에 내렸다), 음식 회차도 미운영이므로 완료 항목에 등장하면 안 된다.
  const doneEntries = aboutHtml.match(/status:\s*'done'[\s\S]*?\}/g) ?? [];
  assert.equal(doneEntries.length, 6, '완료 항목은 EN/KO 각각 3건, 총 6건이어야 함');
  const operatedDates = ['2026.06.25', '2026.07.26', '2026.08.15'];
  for (const entry of doneEntries) {
    assert.ok(
      operatedDates.some((date) => entry.includes(date)),
      `승인되지 않은 완료 날짜: ${entry}`,
    );
    // 활동 이름만 잡는다. `chimaek`을 통짜로 막으면 실제로 운영한 잠실 KBO의
    // "chants and chimaek in the stands"까지 걸린다(2026-08-10에 실제로 걸렸다).
    assert.doesNotMatch(
      entry,
      /hanriver|Han River|한강 피크닉|samgyeopsal|Korean BBQ Night|삼겹살 나이트|Chimaek Night|치맥 나이트/,
      `미운영 활동이 완료로 표기됨: ${entry}`,
    );
  }
});

test('about upcoming entries carry no hardcoded dates (they go stale)', () => {
  // 예정 회차에 날짜를 박으면 지난 날짜가 "예정"으로 남아 운영 중단처럼 보인다
  // (2026-08-20에 실제로 8/12·8/15가 지난 채 걸려 있었다). 날짜는 신청 캘린더가
  // 정본(assets/event-slots.js)이고, About 예정 목록은 상시 라벨만 쓴다.
  const upcomingEntries = aboutHtml.match(/status:\s*'upcoming'[\s\S]*?\}/g) ?? [];
  assert.ok(upcomingEntries.length > 0, '예정 회차가 하나도 없다');
  for (const entry of upcomingEntries) {
    assert.doesNotMatch(
      entry,
      /\b\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?\b|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d+월\s*\d+|coming soon|공개 예정/,
      `예정 회차에 날짜성 문자열이 박혀 있다: ${entry}`,
    );
  }
});

test('about carries exactly one guest quote and points at index #reviews', () => {
  // 2026-08-20 결정: About은 사회적 증거로 승인 인용 5번("explaining" 인용) 딱 하나만
  // 싣고, 나머지 인용과 종합 평점은 index #reviews 전용으로 남긴다. About은 결제 직전
  // "믿을 만한가"를 확인하러 오는 페이지라 인용 0개는 구멍이고, 전부 실으면 중복이다.
  assert.match(aboutHtml, /fantastic job of explaining/, 'about must carry the approved explaining quote (EN)');
  assert.match(aboutHtml, /무슨 일이 벌어지고 있는지/, 'about must carry the approved explaining quote (KO)');
  assert.match(aboutHtml, /href="\/#reviews"[^>]*data-i18n="how\.quoteLink"/, 'quote must link to index #reviews');
  // "딱 하나"를 실제로 센다 — 존재만 확인하면 인용 블록이 늘어나도 통과해 버린다.
  assert.equal((aboutHtml.match(/data-i18n="how\.quote"/g) ?? []).length, 1, 'quote block must appear exactly once');
  assert.equal((aboutHtml.match(/data-i18n="how\.quoteLink"/g) ?? []).length, 1, 'review link must appear exactly once');

  // 맨 숫자 `4.7`은 쓰지 않는다 — 푸터 카카오 SVG path 데이터(`5.03 4.7 6.36L5.5`)에 우연히 포함돼
  // 영원히 실패하는 검사가 된다. 실제 평점 표기 형태(`4.7 / 5`)만 막는다.
  assert.doesNotMatch(aboutHtml, /4\.\d\s*\/\s*5/, 'aggregate rating belongs to index #reviews only');
  for (const quote of [
    'this is the program you want to join',
    'Great experience to enjoy a baseball game with a local',
    'It was fun to watch the game and cheer together',
    'will definitely be going to another game with HanBuddy',
    'The guide was nice and it was like being with friends',
    'Super fun experience and our guide was super kind',
  ]) {
    assert.ok(!aboutHtml.includes(quote), `guest quote duplicated on about: ${quote}`);
  }
});

test('about hero image is not lazy-loaded (it is the LCP element)', () => {
  const heroImg = aboutHtml.match(/<img[^>]*run1-hero\.webp[^>]*>/);
  assert.ok(heroImg, 'hero backdrop image missing');
  assert.doesNotMatch(heroImg[0], /loading="lazy"/, 'hero image must not be lazy');
  assert.match(heroImg[0], /fetchpriority="high"/);
});

test('about team links match the spec exactly and open safely', () => {
  const links = [
    ['linkedin_minhyung', 'https://www.linkedin.com/in/minbros/'],
    ['linkedin_yoohyun', 'https://www.linkedin.com/in/yoohyun-kim-6655ba409/'],
    ['linkedin_junyoung', 'https://kr.linkedin.com/in/%EC%9D%B4%EC%A4%80%EC%98%81-undefined-a63590398'],
  ];
  for (const [cta, url] of links) {
    const pattern = new RegExp(
      `<a href="${url.replace(/[/.]/g, '\\$&')}"[^>]*target="_blank"[^>]*rel="noopener"[^>]*data-cta="${cta}"`,
    );
    assert.match(aboutHtml, pattern, `broken or missing link for ${cta}`);
  }
});

test('about page uses root-absolute asset paths only', () => {
  assert.doesNotMatch(aboutHtml, /(?:src|href)="assets\//, 'relative asset path breaks under /about/');
  assert.match(aboutHtml, /src="\/assets\/brand\/logo-borderless\.webp"/);
  assert.match(aboutHtml, /src="\/assets\/brand\/soma-logo\.webp"/);
});

test('about never links to a landing anchor that no longer exists', () => {
  // About의 내비게이션은 랜딩 섹션을 `/#id`로 가리킨다. 랜딩에서 섹션을 지울 때
  // 여기를 같이 안 고치면 About에서만 죽은 앵커로 점프한다(#how, 2026-08-18).
  const landingAnchors = [...aboutHtml.matchAll(/href\s*[:=]\s*["']\/#([a-z-]+)["']/g)].map((m) => m[1]);
  assert.ok(landingAnchors.length > 0, 'About는 랜딩 섹션 링크를 갖고 있어야 한다');
  for (const id of new Set(landingAnchors)) {
    assert.match(indexHtml, new RegExp(`<section id="${id}"`), `랜딩에 없는 #${id}를 가리킨다`);
  }
});

test('shared copy stays in sync between index and about', () => {
  const sharedSnippets = [
    "{ href: '/about', label: 'About' }",
    "{ href: '/about', label: '소개' }",
    "aboutLink: 'About HanBuddy'",
    "aboutLink: 'HanBuddy 소개'",
    'HanBuddy by ZeroOne',
    '<script src="/assets/analytics.js"></script>',
  ];
  for (const snippet of sharedSnippets) {
    assert.ok(indexHtml.includes(snippet), `index.html missing: ${snippet}`);
    assert.ok(aboutHtml.includes(snippet), `about/index.html missing: ${snippet}`);
  }
});

test('consent banner copy stays identical between index and about', () => {
  // 문구를 여기에 적어두면 카피를 고칠 때마다 테스트도 따라 고쳐야 하고,
  // 목록에 없는 항목은 두 파일이 어긋나도 통과한다. 블록째 비교한다.
  const consentBlocks = (html) => html.match(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm) || [];
  const fromIndex = consentBlocks(indexHtml);
  const fromAbout = consentBlocks(aboutHtml);

  assert.equal(fromIndex.length, 2, 'index.html must carry EN and KO consent copy');
  assert.deepEqual(fromAbout, fromIndex, 'consent copy drifted between index and about');
  for (const key of ['title', 'body', 'note', 'reject', 'accept', 'settings']) {
    assert.ok(fromIndex.every((block) => block.includes(`${key}:`)), `consent copy missing ${key}`);
  }
});

test('index nav links include About in both languages', () => {
  assert.match(indexHtml, /\{ href: '\/about', label: 'About' \}/);
  assert.match(indexHtml, /\{ href: '\/about', label: '소개' \}/);
});

test('index header exposes a mobile-only About link', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*class="[^"]*lg:hidden[^"]*"[^>]*data-i18n="nav\.aboutLabel"/,
  );
  assert.match(indexHtml, /aboutLabel: 'About'/);
  assert.match(indexHtml, /aboutLabel: '소개'/);
});

test('index header wordmark hides below 380px instead of overflowing', () => {
  assert.match(indexHtml, /<span class="hidden min-\[380px\]:inline">HanBuddy<\/span>/);
});

test('index footer links to the About page', () => {
  assert.match(
    indexHtml,
    /<a href="\/about"[^>]*data-i18n="footer\.aboutLink"/,
  );
  assert.match(indexHtml, /aboutLink: 'About HanBuddy'/);
  assert.match(indexHtml, /aboutLink: 'HanBuddy 소개'/);
});

test('about ends on its own story, not a duplicated final CTA', () => {
  // 랜딩의 #apply와 같은 말을 하는 CTA 섹션이 About 끝에도 있었다(2026-08-18 제거).
  // 신청 경로는 헤더와 히어로에 이미 있고, 문의는 푸터 아이콘이 받는다.
  // 속성 순서에 기대지 않는다. class가 id보다 먼저 와도 잡아야 한다.
  assert.doesNotMatch(aboutHtml, /<section[^>]*\bid=["']join["']/, 'CTA 섹션이 다시 붙었다');
  assert.doesNotMatch(aboutHtml, /data-i18n=["']join\./, 'join 카피가 남아 있다');
  // 신청 경로 자체는 사라지면 안 된다. data-cta만 세면 주석이나 다른 요소도
  // 경로로 계산되므로, /apply/로 가는 <a>인지까지 확인한다.
  const applyLinks = [...aboutHtml.matchAll(/<a\s[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /href=["']\/apply\/["']/.test(tag) && /data-cta=["']apply["']/.test(tag));
  assert.ok(applyLinks.length >= 2, `About에 신청 경로가 ${applyLinks.length}개뿐이다`);
});
