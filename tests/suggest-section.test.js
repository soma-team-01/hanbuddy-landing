const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('the suggest section sits between the events grid and the reviews', () => {
  const events = html.indexOf('id="events"');
  const suggest = html.indexOf('id="suggest"');
  const reviews = html.indexOf('id="reviews"');
  assert.ok(events > -1 && suggest > -1 && reviews > -1, 'all three sections must exist');
  assert.ok(events < suggest && suggest < reviews, 'order must be events, suggest, reviews');
});

test('the suggest form carries every field the API validates', () => {
  for (const name of ['activity', 'contact', 'website']) {
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

test('the how-it-works section is gone, wiring included', () => {
  // 2026-08-18 삭제. 마크업만 지우고 카피·렌더러·내비 링크가 남으면 죽은 앵커와
  // 호출되지 않는 코드가 조용히 쌓인다.
  assert.doesNotMatch(html, /id="how"/, '섹션 마크업이 남아 있다');
  assert.doesNotMatch(html, /data-how-items/, '렌더 대상 컨테이너가 남아 있다');
  assert.doesNotMatch(html, /renderHowItems/, '렌더러가 남아 있다');
  // 내비게이션은 CONTENT_MAP이 그리지만 정적 fallback 마크업도 같은 앵커를 쓸 수 있다.
  // 한쪽만 보면 나머지 한쪽에 남은 죽은 앵커가 그대로 배포된다.
  assert.doesNotMatch(html, /href\s*:\s*["']#how["']/, '동적 내비게이션에 죽은 앵커가 남아 있다');
  assert.doesNotMatch(html, /href\s*=\s*["']#how["']/, '정적 마크업에 죽은 앵커가 남아 있다');
});

test('the suggest endpoint the form posts to is the deployed function path', () => {
  assert.match(html, /fetch\('\/api\/suggest'/);
});

test('the suggest form no longer asks for a date', () => {
  // 날짜는 신청 캘린더가 받는다. 제안 폼에 남아 있으면 같은 것을 두 번 묻는다.
  const section = html.slice(html.indexOf('id="suggest"'), html.indexOf('id="reviews"'));
  assert.doesNotMatch(section, /name="dates"/, '제안 폼에 날짜 입력이 남아 있다');
});

test('placeholders are wired into the language sync', () => {
  // 섹션이 data-i18n-placeholder를 쓰는데 sync가 그 속성을 모르면 KO 전환에서
  // placeholder만 영어로 남는다. 실제로 QA에서 잡힌 회귀다.
  assert.match(html, /data-i18n-placeholder=/);
  assert.match(html, /querySelectorAll\('\[data-i18n-placeholder\]'\)/);
});
