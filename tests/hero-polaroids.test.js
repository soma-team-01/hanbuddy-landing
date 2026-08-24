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
  // 배치 규칙이 있어도 같은 블록이 컨테이너를 숨기면 사진은 사라진다.
  for (const [label, block] of [['데스크톱', desktop], ['태블릿', tablet]]) {
    assert.doesNotMatch(
      block,
      /\.hero-polaroids \{[^}]*display:\s*none/,
      `${label}에서 폴라로이드 묶음을 숨기고 있다`,
    );
  }
});

test('phones drop the lower polaroid pair', () => {
  // 좁은 화면에 네 장이 연달아 깔리면 히어로가 빽빽해진다(2026-08-18).
  const phone = mediaBlock('max-width: 767px');
  assert.match(
    phone,
    /\.hero-cta-band > \.hero-polaroids \{[^}]*display: none/,
    '버튼 뒤 폴라로이드 쌍이 모바일에서 숨겨져야 한다',
  );
  // 제목을 감싸는 위 두 장은 남는다. 여기까지 숨기면 첫 화면에 사진이 없어진다.
  assert.doesNotMatch(phone, /\.hero-lead[^}]*display: none/);
});

test('the hero body sits under the headline on every width', () => {
  // 데스크톱은 원래 제목 → 본문 → 버튼이었는데 태블릿·폰만 버튼이 먼저 왔다.
  // 사진 위를 얇은 muted 글씨가 지나지 않게 본문을 62px 밀어 둔 배치였다.
  // 2026-08-24에 되돌렸다. 본문은 가운데 320px 안에 갇혀 있고 사진은 좌우
  // 바깥(hp3 left -62px / hp4 right -62px, 폭 156px)이라 가로로 만나지 않는다.
  // 광고 소구점 문장이 헤드라인 바로 밑에 붙어야 한 호흡에 읽힌다.
  const narrow = mediaBlock('max-width: 1279px');
  const rule = (selector) => narrow.match(new RegExp(`${selector} \\{[^}]*\\}`))?.[0] ?? '';

  const subtitle = rule('#top \\.hero-cta-band > \\.hero-subtitle');
  assert.match(subtitle, /order:\s*0/, '본문이 버튼보다 먼저 와야 한다');
  assert.doesNotMatch(subtitle, /margin:\s*\d*[1-9]\d*px auto/, '본문 위 여백은 cta-band가 만든다');

  const actions = rule('#top \\.hero-cta-band > \\.hero-actions');
  assert.match(actions, /order:\s*1/, '버튼이 본문 뒤로 와야 한다');
  assert.match(actions, /margin-top:\s*[1-9]/, '본문과 버튼 사이 여백이 있어야 한다');
});
