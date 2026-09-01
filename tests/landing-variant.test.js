const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const VARIANT = require('../assets/landing-variant.js');

const read = (page) => readFileSync(join(root, page), 'utf8');
const html = read('index.html');
const applyHtml = read('apply/index.html');

const eventPages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `events/${entry.name}/index.html`)
  .sort();

// 랜딩 밖의 페이지들은 카피를 바꾸지 않는다. 값을 흘리지만 않으면 된다.
const relayPages = ['about/index.html', 'apply/index.html', ...eventPages];

test('only the two published arms count as a variant', () => {
  assert.equal(VARIANT.resolve('?v=local'), 'local');
  assert.equal(VARIANT.resolve('?v=friends'), 'friends');
  assert.deepEqual(VARIANT.VARIANTS, ['local', 'friends']);
});

test('anything else falls back to the default screen', () => {
  // 이 목록이 전부 null이어야 "파라미터가 없으면 기존 화면"이라는 약속이 선다.
  // 하나라도 통과하면 광고 URL에 붙인 아무 문자열이 히어로와 GA로 들어간다.
  for (const search of ['', '?', '?v=', '?v=LOCAL', '?v=friend', '?v=<script>', '?v=local&v=x', '?event=kleague']) {
    assert.equal(VARIANT.resolve(search), null, `${search} must not resolve to a variant`);
  }
  for (const bad of [null, undefined, 42, ['?v=local'], { v: 'local' }]) {
    assert.equal(VARIANT.resolve(bad), null);
  }
});

test('the value rides along on site links only', () => {
  assert.equal(VARIANT.withVariant('/apply/', 'friends'), '/apply/?v=friends');
  assert.equal(VARIANT.withVariant('/apply/?event=kbo-jamsil', 'local'), '/apply/?event=kbo-jamsil&v=local');
  assert.equal(VARIANT.withVariant('/about#team', 'friends'), '/about?v=friends#team');
  // 같은 링크를 두 번 지나가도 값이 쌓이지 않는다(렌더마다 다시 부른다).
  assert.equal(VARIANT.withVariant('/apply/?v=local', 'local'), '/apply/?v=local');
});

test('external channels and anchors are left alone', () => {
  // 인스타·카카오·왓츠앱은 우리 실험과 무관한 남의 URL이다. 앵커는 페이지를
  // 떠나지 않으므로 붙일 이유가 없다.
  for (const url of ['https://www.instagram.com/hanbuddy_kr/', 'https://wa.me/821082970110', '#events', 'mailto:x@y.z']) {
    assert.equal(VARIANT.withVariant(url, 'friends'), url);
  }
  assert.equal(VARIANT.withVariant('/apply/', 'bogus'), '/apply/');
  assert.equal(VARIANT.withVariant('/apply/', null), '/apply/');
});

test('the hero carries copy for both arms in both languages', () => {
  // 히어로 블록은 EN·KO 두 벌이다. 한쪽만 채우면 그 언어로 보는 사람에게는
  // 실험이 없던 일이 되고, arm 비교가 언어별로 갈린다.
  const heroBlocks = [...html.matchAll(/\n {8}hero: \{[\s\S]*?\n {8}\},/g)].map((m) => m[0]);
  assert.equal(heroBlocks.length, 2, 'index.html should carry EN and KO hero copy');

  for (const block of heroBlocks) {
    const variants = block.match(/variants: \{[\s\S]*?\n {10}\},/)?.[0];
    assert.ok(variants, 'hero copy must define variants');
    // local은 헤드라인을 그대로 두고 서브카피만 바꾼다.
    assert.match(variants, /local: \{\s*\n\s*subtitle:/);
    // friends는 헤드라인부터 바꾼다. 헤드라인이 없으면 C arm의 메시지 일치가
    // 서브카피 한 줄에만 걸린다.
    assert.match(variants, /friends: \{[\s\S]*?title:[\s\S]*?subtitle:/);
  }
});

test('the friends arm says both halves of its pitch', () => {
  // 계획 정본이 요구하는 두 축이다. ① 한국인 버디 ② 같은 활동에 참여한 다른
  // 참가자. 한쪽만 남으면 이 arm은 기존 소구점과 구분되지 않아 실험이 무의미해진다.
  const friends = html.match(/friends: \{\s*\n\s*title: '([^']*)',\s*\n\s*subtitle: '([^']*)',/);
  assert.ok(friends, 'EN friends copy must be readable');
  const pitch = `${friends[1]} ${friends[2]}`;
  assert.match(pitch, /korean|buddy/i, 'friends copy must name the Korean buddy');
  assert.match(pitch, /traveler|other guests|international/i, 'friends copy must name the other participants');
});

test('the hero subtitle is readable on a phone', () => {
  // 광고 유입은 대부분 폰이다. 서브카피가 sm 미만에서 접히면 소구점 문장을
  // 정작 실험 대상이 못 읽는다(2026-08-24). `hidden`이 돌아오면 실패한다.
  const subtitle = html.match(/<p class="hero-subtitle ([^"]*)"/);
  assert.ok(subtitle, 'hero subtitle must exist');
  assert.doesNotMatch(subtitle[1], /\bhidden\b/, '히어로 서브카피는 모바일에서 접지 않는다');
});

test('variant copy is written after the default copy, not before', () => {
  // syncStaticText가 CONTENT_MAP의 기본 카피를 다시 써 넣는다. 순서가 뒤집히면
  // 언어를 바꿀 때마다 variant 카피가 조용히 사라진다.
  const body = html.match(/const applyLanguage = \(lang\) => \{[\s\S]*?\n {4}\};/)?.[0];
  assert.ok(body, 'applyLanguage must be readable');
  assert.ok(
    body.indexOf('syncStaticText(copy)') < body.indexOf('applyHeroVariant(copy)'),
    'applyHeroVariant must run after syncStaticText',
  );
  // 렌더가 끝난 뒤에 링크를 실어야 방금 그려진 카드·공지도 값을 물고 간다.
  assert.ok(
    body.indexOf('renderDynamicContent') < body.indexOf('propagateLinks'),
    'links must be tagged after the dynamic render',
  );
});

test('the landing never touches the hero when there is no variant', () => {
  const helper = html.match(/const applyHeroVariant = \(copy\) => \{[\s\S]*?\n {4}\};/)?.[0];
  assert.ok(helper, 'applyHeroVariant must be readable');
  // 파라미터가 없으면 querySelector조차 부르지 않고 빠져나간다. 이 조기 반환이
  // "파라미터 없으면 기존 화면 그대로"라는 롤백 계획의 전부다.
  assert.match(helper, /if \(!variant\) return;/);
  assert.ok(
    helper.indexOf('if (!variant) return;') < helper.indexOf('querySelector'),
    'the guard must come before any DOM access',
  );
});

test('every page that can lead to the form relays the value', () => {
  // 스크립트를 붙이는 것으로 끝나야 한다. 페이지마다 호출 한 줄을 복사해 두면
  // 새 페이지에서 조용히 빠지고, 거기를 거쳐 온 신청이 arm 미상으로 샌다.
  for (const page of ['index.html', ...relayPages]) {
    const source = read(page);
    assert.match(source, /<script src="\/assets\/landing-variant\.js"><\/script>/, `${page} must load the module`);
  }
  const module = readFileSync(join(root, 'assets/landing-variant.js'), 'utf8');
  assert.match(module, /api\.tagWhenReady\(root\.document\)/, '모듈이 스스로 링크를 이어야 한다');
  assert.match(module, /DOMContentLoaded/, 'head에서 실행되므로 DOM을 기다려야 한다');

  // 랜딩만 예외다. 카드·공지·네비가 언어 전환 때 다시 그려지므로 그 뒤에 한 번 더
  // 불러야 새로 만들어진 링크도 값을 물고 간다.
  assert.match(html, /HanBuddyVariant\?\.propagateLinks\?\.\(document\)/, '랜딩은 렌더 뒤에 다시 이어야 한다');
});

test('the application funnel reports which arm the guest came from', () => {
  const context = applyHtml.match(/const applicationContext = \(\) => \(\{[\s\S]*?^    \}\);/m)?.[0] || '';
  assert.ok(context, 'application measurement context must be readable');
  assert.match(context, /landing_variant: landingVariantParam\(\)/);
  assert.match(applyHtml, /createApplicationFunnel\(\{[\s\S]*?context: applicationContext/);
});

test('the arm reaches analytics through the whitelist, never raw', () => {
  // 주소창 값을 그대로 GA로 보내면 광고 URL에 뭘 붙이든 리포트에 쌓인다.
  const source = applyHtml.match(/const LANDING_VARIANT = [^\n]*\n[^\n]*landingVariantParam[^\n]*/)?.[0];
  assert.ok(source, 'the variant must be resolved in one place');
  assert.match(source, /HanBuddyVariant\?\.current\?\.\(\)/);
  assert.doesNotMatch(source, /location\.search|URLSearchParams/);

  // 신청 데이터는 서비스 제공용이고 시트 열 순서는 고정이다. 실험 파라미터가
  // 페이로드에 끼면 열이 밀리거나 개인정보 고지와 어긋난다.
  const payload = applyHtml.match(/const payload = \{[\s\S]*?^      \};/m)?.[0] || '';
  assert.ok(payload, 'application payload block must be readable');
  assert.doesNotMatch(payload, /landing_variant|LANDING_VARIANT/);
});
