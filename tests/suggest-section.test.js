const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('the suggest section sits between the events grid and how-it-works', () => {
  const events = html.indexOf('id="events"');
  const suggest = html.indexOf('id="suggest"');
  const how = html.indexOf('id="how"');
  assert.ok(events > -1 && suggest > -1 && how > -1, 'all three sections must exist');
  assert.ok(events < suggest && suggest < how, 'order must be events, suggest, how');
});

test('the suggest form carries every field the API validates', () => {
  for (const name of ['activity', 'dates', 'contact', 'website']) {
    assert.match(html, new RegExp(`name="${name}"`), `input ${name} must exist`);
  }
  // honeypot은 스크린 리더와 탭 순서에서 빠져야 진짜 사람이 걸리지 않는다.
  const honeypot = html.match(/<div class="sr-only"[^>]*>[\s\S]*?<\/div>/);
  assert.ok(honeypot, 'the honeypot must be visually hidden');
  assert.match(honeypot[0], /tabindex="-1"/);
});

test('the shared validation module is loaded before the inline script uses it', () => {
  const scriptTag = html.indexOf('/assets/suggest-validation.js');
  const usage = html.indexOf('HanBuddySuggestValidation');
  assert.ok(scriptTag > -1, 'the validation script must be included');
  assert.ok(usage > -1, 'the inline script must call the shared validation');
  assert.ok(scriptTag < usage, 'the module must load before the inline script runs');
});

test('the suggest copy exists in every language', () => {
  // EN·KO 카피 객체 양쪽에 suggest 블록이 있어야 언어 전환에서 키가 비지 않는다.
  const occurrences = html.match(/suggest: \{/g) ?? [];
  assert.equal(occurrences.length, 2, 'both language maps must define suggest copy');
});

test('every data-i18n suggest key resolves in the copy object', () => {
  const keys = [...new Set(
    [...html.matchAll(/data-i18n(?:-placeholder)?="suggest\.([a-zA-Z.]+)"/g)].map((m) => m[1]),
  )];
  assert.ok(keys.length >= 8, 'the section must be wired for translation');
  for (const key of keys) {
    const leaf = key.split('.').pop();
    assert.match(html, new RegExp(`${leaf}: '`), `copy key suggest.${key} must exist`);
  }
});

test('how-it-works steps stay side by side on mobile', () => {
  const container = html.match(/<div class="[^"]*"[^>]*data-how-items><\/div>/);
  assert.ok(container, 'the how-items container must exist');
  // sm: 접두사 없는 grid-cols-3이어야 모바일에서도 가로로 선다.
  assert.match(container[0], /(?<!sm:)grid-cols-3/, 'mobile must keep three columns');
});

test('the suggest endpoint the form posts to is the deployed function path', () => {
  assert.match(html, /fetch\('\/api\/suggest'/);
});

test('placeholders are wired into the language sync', () => {
  // 섹션이 data-i18n-placeholder를 쓰는데 sync가 그 속성을 모르면 KO 전환에서
  // placeholder만 영어로 남는다. 실제로 QA에서 잡힌 회귀다.
  assert.match(html, /data-i18n-placeholder=/);
  assert.match(html, /querySelectorAll\('\[data-i18n-placeholder\]'\)/);
});
