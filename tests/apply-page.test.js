const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const html = readFileSync(join(root, 'apply', 'index.html'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('every required field is present, labelled and marked required', () => {
  for (const name of ['eventId', 'slotIso', 'guests', 'name', 'nationality',
    'koreanLevel', 'contactMethod', 'contactId', 'paymentMethod', 'consent']) {
    assert.match(html, new RegExp(`name="${name}"`), `missing field: ${name}`);
  }
  // 라벨이 입력과 연결되어야 스크린리더가 읽는다.
  for (const id of ['field-name', 'field-nationality', 'field-contactId', 'field-guests']) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `missing label for ${id}`);
    assert.match(html, new RegExp(`id="${id}"[^>]*required`), `${id} must be required`);
  }
});

test('choosing Other on the source reveals a text input', () => {
  assert.match(html, /name="sourceOther"/);
  assert.match(html, /data-source-other/);
  // 감춰진 상태로 시작해야 한다.
  assert.match(html, /class="hidden" data-source-other/);
  assert.match(html, /form\.elements\.source\.addEventListener/);
});

test('the honeypot is hidden from people but present for bots', () => {
  assert.match(html, /name="website"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /tabindex="-1"/);
});

test('the page loads the shared slot and validation modules, not its own copy', () => {
  assert.match(html, /<script src="\/assets\/event-slots\.js"><\/script>/);
  assert.match(html, /<script src="\/assets\/apply-validation\.js"><\/script>/);
  assert.doesNotMatch(html, /const EVENT_SLOTS = /, 'slots must not be duplicated on the page');
});

test('the done screen keeps its promise positive and channel-agnostic', () => {
  assert.match(html, /within 24 hours to confirm your spot/);
  assert.match(html, /24시간 안에 연락드려 자리를 확정해 드립니다/);
  // 부정문과 채널 이름은 쓰지 않기로 했다(스펙 5.5).
  assert.doesNotMatch(html, /not confirmed|자리가 확정된 것은 아닙니다/);
  assert.doesNotMatch(html, /done[\s\S]{0,400}(WhatsApp|LINE|WeChat)/);
});

test('privacy notice states purpose, retention and the request channel', () => {
  assert.match(html, /6 months|6개월/);
  assert.match(html, /zeroone\.soma@gmail\.com/);
  assert.match(html, /buddy/i, 'must disclose sharing with the assigned buddy');
});

test('nav and footer copy stay in sync with index', () => {
  for (const snippet of ['HanBuddy by ZeroOne', '<script src="/assets/analytics.js"></script>']) {
    assert.ok(html.includes(snippet), `apply page missing: ${snippet}`);
  }
  const consentBlocks = (source) => source.match(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm) || [];
  assert.deepEqual(consentBlocks(html), consentBlocks(indexHtml), 'consent copy drifted');
});

test('the page declares its analytics context', () => {
  assert.match(html, /data-analytics-page-type="application"/);
});

test('the three funnel events carry the language, as the analytics spec requires', () => {
  // trackGa는 파라미터를 자동으로 채우지 않는다. 여기서 빠뜨리면 스펙 9.2가
  // 요구하는 content_language 없이 이벤트가 쌓인다.
  for (const name of ['application_start', 'application_error', 'application_submitted']) {
    const call = html.match(new RegExp(`track\\('${name}',[\\s\\S]*?\\}\\);`));
    assert.ok(call, `missing track call: ${name}`);
    assert.match(call[0], /content_language:/, `${name} must report content_language`);
  }
});
