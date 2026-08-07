const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const design = readFileSync(join(__dirname, '..', 'DESIGN.md'), 'utf8');

const approvedTokens = [
  ['canvas', '#fffaf7'],
  ['canvas-soft', '#ffffff'],
  ['primary', '#d13f32'],
  ['primary-hover', '#b9342b'],
  ['primary-strong', '#8f2f28'],
  ['primary-soft', '#fff0ec'],
  ['ink', '#261b18'],
  ['muted', '#675b56'],
  ['line-strong', '#d6c5bf'],
  ['line-soft', '#eee2dd'],
  ['panel', '#f8f3f0'],
  ['panel-raised', '#fcf8f6'],
  ['on-primary', '#ffffff'],
  ['on-primary-strong', '#ffffff'],
];

const retiredHexValues = [
  '#fbf9f4',
  '#fbf9f7',
  '#182820',
  '#2d3e35',
  '#96a99d',
  '#434844',
  '#c3c8c3',
  '#e4e2dd',
  '#f0eee9',
  '#f5f3ee',
  '#8a6c33',
  '#b13f8f',
  '#943476',
  '#79285f',
  '#fceff7',
  '#ff635a',
  '#f0524b',
  '#a8322d',
  '#fff1ef',
  '#fcfcfd',
  '#ff4a79',
  '#f74572',
  '#a51f48',
  '#fff0f4',
  '#201a20',
  '#625a61',
  '#cfc6cc',
  '#e9e3e7',
  '#f7f5f7',
  '#fbf8fa',
];

test('defines the approved HanBuddy warm-red tokens in Tailwind and CSS', () => {
  for (const [token, value] of approvedTokens) {
    const tailwindToken = new RegExp(
      `['"]?${token}['"]?\\s*:\\s*['"]${value}['"]`,
      'i',
    );
    const cssVariable = new RegExp(
      `--color-${token}:\\s*${value}`,
      'i',
    );

    assert.match(html, tailwindToken, `missing Tailwind token ${token}`);
    assert.match(html, cssVariable, `missing CSS variable ${token}`);
  }
});

test('removes the retired cream, forest, sage, and earth palette', () => {
  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      html,
      new RegExp(value, 'i'),
      `retired color ${value} must not remain in index.html`,
    );
  }

  assert.doesNotMatch(html, /\b(?:sage|sage-mist|earth)\b/i);
});

test('maps interactive and emphasized components to the approved warm-red roles', () => {
  assert.match(html, /bg-primary[^"]*hover:bg-primary-hover/);
  // #apply는 사진 배경을 받으면서 ink 밴드가 됐다. 본문은 계속 on-primary-strong(흰색)이다.
  assert.match(
    html,
    /<section id="apply" class="[^"]*\bbg-ink\b[^"]*\btext-on-primary-strong\b[^"]*"[^>]*>/,
  );
  // 붉은 계열은 CTA 버튼·칩·강조 텍스트에서 계속 쓰인다.
  assert.match(html, /text-primary-strong/);
  assert.match(html, /bg-primary-soft/);
  assert.match(html, /text-primary(?:-strong)?/);
  assert.match(html, /classList\.toggle\('bg-primary', selected\)/);
  assert.match(html, /classList\.toggle\('text-on-primary', selected\)/);
  assert.match(html, /color:\s*var\(--color-primary-strong\)/);
});

test('keeps the logo as the only decorative gradient source', () => {
  assert.match(
    html,
    /src="assets\/brand\/logo-borderless\.webp"/,
    'logo must be referenced as an actual img src at its new brand/ path',
  );
  assert.doesNotMatch(
    html,
    /assets\/logo-borderless\.webp/,
    'pre-reorg top-level logo path must not remain anywhere in the HTML',
  );
  assert.ok(
    existsSync(join(__dirname, '..', 'assets', 'brand', 'logo-borderless.webp')),
    'referenced logo asset assets/brand/logo-borderless.webp must exist on disk',
  );
  // DESIGN.md 2절은 사진 가독성 처리를 장식 그라디언트와 구분해 허용한다.
  // 히어로 겹침 레이어의 페이드가 그 예외에 해당하는 유일한 사용처다.
  // 이 블록만 들어내고, 나머지 어디에도 그라디언트가 없어야 한다.
  const heroFade = html.match(/\.hero-lead::after\s*\{[^}]*\}/);
  assert.ok(heroFade, '.hero-lead::after 페이드 블록이 있어야 한다');
  assert.match(
    heroFade[0],
    /linear-gradient\s*\(/i,
    '히어로 페이드는 linear-gradient로 구현되어 있어야 한다',
  );
  assert.match(
    design,
    /`\.hero-lead::after`/,
    'DESIGN.md가 히어로 페이드를 승인된 예외로 문서화해야 한다',
  );

  const htmlWithoutApprovedFade = html.replace(heroFade[0], '');
  assert.doesNotMatch(
    htmlWithoutApprovedFade,
    /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i,
    '승인된 히어로 페이드 외에는 그라디언트를 쓰지 않는다',
  );
});

test('keeps DESIGN.md synchronized with the approved runtime palette', () => {
  for (const [token, value] of approvedTokens) {
    assert.match(
      design,
      new RegExp(`\\| \`${token}\` \\| \`${value}\` \\|`, 'i'),
      `DESIGN.md is missing ${token} ${value}`,
    );
  }

  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      design,
      new RegExp(value, 'i'),
      `DESIGN.md still documents retired color ${value}`,
    );
  }

  assert.match(
    design,
    /Primary CTA: warm-red `primary` fill, white `on-primary` text/i,
  );
  assert.match(
    design,
    /HanBuddy red is the only interactive brand color/i,
  );
  assert.match(
    design,
    /existing logo gradient remains the only multi-color brand treatment/i,
  );
});

test('the two card sections share one band color, keeping the light rhythm to two tones', () => {
  // #events와 #reviews가 서로 다른 밝은 톤이면 위쪽 페이지가 무관한 줄무늬처럼 읽힌다.
  // 첫 토큰만 보면 `bg-panel bg-canvas-soft`처럼 겹쳐 쓴 경우를 놓친다. 전부 모아서 비교한다.
  const sectionBgs = (id) => {
    const match = html.match(new RegExp(`<section id="${id}" class="([^"]*)"`));
    assert.ok(match, `missing section #${id}`);
    return match[1].match(/\bbg-[a-z0-9/-]+\b/g) ?? [];
  };
  assert.deepEqual(sectionBgs('events'), ['bg-panel']);
  assert.deepEqual(sectionBgs('reviews'), ['bg-panel']);
  assert.deepEqual(sectionBgs('apply'), ['bg-ink']);
  // 톤 차이가 구분선 역할을 하므로 #events의 상단 보더는 없앴다.
  assert.doesNotMatch(html, /<section id="events" class="[^"]*\bborder-t\b/);
  // 문서에도 리듬 전체가 값으로 적혀 있어야 한다. 제목만 맞추면 값이 바뀌어도 통과한다.
  assert.match(
    design,
    /hero `canvas` -> `#events` `panel` -> `#how` `canvas` -> `#reviews` `panel` -> `#apply` `ink`/,
  );
});
