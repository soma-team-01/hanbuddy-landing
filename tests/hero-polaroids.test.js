const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

// 히어로 CSS는 브레이크포인트마다 배치가 완전히 달라서, 한 블록을 손대면 다른
// 화면 폭이 조용히 망가진다. 세 폭의 계약만 문자열로 고정해 둔다.
const mediaBlock = (query) => {
  const start = html.indexOf(`@media (${query}) {`);
  assert.ok(start > -1, `@media (${query}) 블록이 없다`);
  // 중괄호를 세어 블록 끝을 찾는다. 안쪽 규칙이 여러 개라 첫 '}'로는 못 끊는다.
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`@media (${query}) 블록이 닫히지 않았다`);
};

test('the hero keeps four polaroids on desktop and tablet', () => {
  const desktop = mediaBlock('min-width: 1280px');
  for (const cls of ['.hp1', '.hp2', '.hp3', '.hp4']) {
    assert.match(desktop, new RegExp(`\\${cls} \\{`), `데스크톱에 ${cls} 배치가 없다`);
  }
  // 768~1279px는 네 장 그대로. 태블릿까지 숨기면 폭이 남는데 사진만 사라진다.
  const tablet = mediaBlock('max-width: 1279px');
  assert.match(tablet, /\.hp3 \{/);
  assert.match(tablet, /\.hp4 \{/);
});

test('phones drop the lower polaroid pair and close the gap it left', () => {
  // 좁은 화면에 네 장이 연달아 깔리면 히어로가 빽빽해진다(2026-08-18).
  const phone = mediaBlock('max-width: 767px');
  assert.match(
    phone,
    /\.hero-cta-band > \.hero-polaroids \{[^}]*display: none/,
    '버튼 뒤 폴라로이드 쌍이 모바일에서 숨겨져야 한다',
  );
  // 사진이 빠진 자리를 그대로 두면 본문 앞이 빈 공백이 된다. 여백도 같이 줄인다.
  assert.match(
    phone,
    /\.hero-cta-band > \.hero-subtitle \{[^}]*margin-top/,
    '사진을 숨겼으면 본문 위 여백도 줄여야 한다',
  );
  // 제목을 감싸는 위 두 장은 남는다. 여기까지 숨기면 첫 화면에 사진이 없어진다.
  assert.doesNotMatch(phone, /\.hero-lead[^}]*display: none/);
});
