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

test('nav and shared footer identity stay in sync with index', () => {
  for (const snippet of ['HanBuddy by ZeroOne', '<script src="/assets/analytics.js"></script>']) {
    assert.ok(html.includes(snippet), `apply page missing: ${snippet}`);
  }
});

test('application consent copy states its stricter pre-consent policy', () => {
  const consentBlocks = (source) => source.match(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm) || [];
  const applyConsent = consentBlocks(html);
  assert.equal(applyConsent.length, 2, 'EN and KO application consent copy must exist');
  assert.notDeepEqual(applyConsent, consentBlocks(indexHtml), 'application copy must describe basic mode');
  for (const block of applyConsent) {
    assert.match(block, /before you accept|허용하기 전/);
    assert.match(block, /Google|Meta/);
    assert.match(block, /answers|입력값/);
    assert.match(block, /UTM/);
  }
});

test('the page declares its analytics context', () => {
  assert.match(html, /data-analytics-page-type="application"/);
});

test('a valid prefilled event joins the application page view to the content funnel', () => {
  assert.match(html, /SLOTS\.openEvents\(\)\.some\(\(event\) => event\.id === prefilledEvent\)/);
  assert.match(html, /document\.body\.dataset\.analyticsContentId = prefilledEvent/);
});

test('the three funnel events carry the shared analytics context', () => {
  // trackGa는 파라미터를 자동으로 채우지 않는다. 여기서 빠뜨리면 스펙 9.2가
  // 요구하는 공통 컨텍스트 없이 이벤트가 쌓인다.
  for (const name of ['application_start', 'application_error', 'generate_lead']) {
    const call = html.match(new RegExp(`track\\('${name}',[\\s\\S]*?\\}\\);`));
    assert.ok(call, `missing track call: ${name}`);
    assert.match(call[0], /content_language:/, `${name} must report content_language`);
    assert.match(call[0], /content_type: 'experience'/, `${name} must report content_type`);
    assert.match(call[0], /content_id:/, `${name} must report content_id`);
    assert.doesNotMatch(call[0], /experience_id:|event_id:/, `${name} must not fork the content identifier`);
  }
});

test('a successful application sends the recommended GA lead and the Meta standard Lead', () => {
  assert.match(html, /track\('generate_lead',[\s\S]*?content_language:/);
  assert.match(html, /HanBuddyAnalytics\?\.trackLead\?\.\(\)/);
  assert.doesNotMatch(html, /track\('application_submitted'/);
});

test('application payload never collects browser attribution data', () => {
  const payload = html.match(/const payload = \{[\s\S]*?^      \};/m)?.[0] || '';
  assert.ok(payload, 'application payload block must be readable');
  assert.doesNotMatch(payload, /document\.referrer|location\.search|\butm_|\breferrer\s*:/i);
  assert.match(payload, /source: form\.elements\.source\.value/);
  assert.match(payload, /sourceOther: form\.elements\.sourceOther\.value/);

  const submitted = html.match(/track\('generate_lead',[\s\S]*?^        \}\);/m)?.[0] || '';
  assert.ok(submitted, 'generate_lead event must be readable');
  assert.match(submitted, /lead_source: payload\.source/);
  assert.doesNotMatch(submitted, /sourceOther/);
});

test('the invalid state is visible, not just announced', () => {
  // Tailwind CDN이 이 페이지의 style 블록보다 뒤에 주입되므로 같은 명시도로 쓰면
  // .border-line-strong이 이겨서 잘못된 항목이 정상 항목과 똑같이 보인다.
  assert.match(html, /input\[aria-invalid='true'\]/);
  assert.match(html, /aria-describedby', 'form-error'/);
  assert.match(html, /id="form-error"/);
  // 메시지를 지목된 항목 옆으로 옮기지 않으면 포커스가 이동한 순간 화면 밖으로 나간다.
  assert.match(html, /appendChild\(errorBox\)/);
  assert.match(html, /scrollIntoView\(\{ block: 'center' \}\)/);
});

test('the price survives a narrow screen', () => {
  // 좁은 화면에서 select 안 글자가 잘리면 선택한 회차의 가격이 통째로 사라진다.
  assert.match(html, /data-event-price/);
  for (const locale of [/pricePerPerson: \(amount\) => `₩\$\{amount\} per person`/, /pricePerPerson: \(amount\) => `1인 ₩\$\{amount\}`/]) {
    assert.match(html, locale, 'both locales must state the per-person price');
  }
});
