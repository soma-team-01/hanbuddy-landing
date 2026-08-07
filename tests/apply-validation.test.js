const assert = require('node:assert/strict');
const test = require('node:test');

const { validateApplication, FIELD_OPTIONS } = require('../assets/apply-validation.js');

const AUG10 = Date.parse('2026-08-10T12:00:00+09:00');

const valid = () => ({
  eventId: 'kbo-jamsil',
  slotIso: '2026-08-15T17:00',
  guests: '2',
  name: 'Julie Martin',
  nationality: 'France',
  koreanLevel: 'Basic',
  contactMethod: 'WhatsApp',
  contactId: '+82 10 1234 5678',
  paymentMethod: 'PayPal',
  requests: '',
  source: 'Instagram',
  consent: true,
  language: 'en',
});

test('a complete application passes and comes back normalised', () => {
  const result = validateApplication(valid(), AUG10);
  assert.equal(result.ok, true);
  assert.equal(result.value.guests, 2);
  assert.equal(result.value.eventTitle, 'Open-Air KBO Baseball Night at Jamsil');
  assert.equal(result.value.name, 'Julie Martin');
});

test('every required field is enforced and reported by name', () => {
  for (const field of ['eventId', 'slotIso', 'guests', 'name', 'nationality',
    'koreanLevel', 'contactMethod', 'contactId', 'paymentMethod']) {
    const payload = valid();
    payload[field] = '';
    const result = validateApplication(payload, AUG10);
    assert.equal(result.ok, false, `${field} should be required`);
    assert.equal(result.field, field);
  }
});

test('consent must be checked', () => {
  const result = validateApplication({ ...valid(), consent: false }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'consent');
});

test('guests must be a whole number between 1 and 10', () => {
  for (const guests of ['0', '11', '2.5', 'two', '-1']) {
    const result = validateApplication({ ...valid(), guests }, AUG10);
    assert.equal(result.ok, false, `guests=${guests} should fail`);
    assert.equal(result.field, 'guests');
  }
  assert.equal(validateApplication({ ...valid(), guests: '10' }, AUG10).ok, true);
});

test('free text is capped so a huge payload cannot be pushed into the sheet', () => {
  assert.equal(validateApplication({ ...valid(), name: 'x'.repeat(101) }, AUG10).field, 'name');
  assert.equal(validateApplication({ ...valid(), requests: 'x'.repeat(1001) }, AUG10).field, 'requests');
  assert.equal(validateApplication({ ...valid(), requests: 'x'.repeat(1000) }, AUG10).ok, true);
});

test('choice fields only accept values the form offers', () => {
  assert.equal(validateApplication({ ...valid(), koreanLevel: 'Native' }, AUG10).field, 'koreanLevel');
  assert.equal(validateApplication({ ...valid(), contactMethod: 'Telegram' }, AUG10).field, 'contactMethod');
  assert.equal(validateApplication({ ...valid(), paymentMethod: 'Crypto' }, AUG10).field, 'paymentMethod');
  assert.equal(validateApplication({ ...valid(), source: 'TikTok' }, AUG10).field, 'source');
  // source는 선택 항목이라 비어 있어도 된다.
  assert.equal(validateApplication({ ...valid(), source: '' }, AUG10).ok, true);
});

test('choosing Other on the source requires typing what it was', () => {
  // Other만 남으면 "그 밖의 어딘가"라는 정보뿐이라 유입 채널을 넓힐 때 쓸 수 없다.
  const blank = validateApplication({ ...valid(), source: 'Other', sourceOther: '  ' }, AUG10);
  assert.equal(blank.ok, false);
  assert.equal(blank.field, 'sourceOther');

  const tooLong = validateApplication({ ...valid(), source: 'Other', sourceOther: 'x'.repeat(101) }, AUG10);
  assert.equal(tooLong.field, 'sourceOther');

  // 저장은 컬럼을 늘리지 않고 source 한 칸에 합친다.
  const filled = validateApplication({ ...valid(), source: 'Other', sourceOther: 'Reddit' }, AUG10);
  assert.equal(filled.ok, true);
  assert.equal(filled.value.source, 'Other: Reddit');

  // Other가 아니면 적어 넣어도 무시한다.
  const ignored = validateApplication({ ...valid(), source: 'Instagram', sourceOther: 'Reddit' }, AUG10);
  assert.equal(ignored.value.source, 'Instagram');
});

test('a slot from another event is rejected', () => {
  // 8/21 5:30은 잠실에만 있다. 한강도 8/15·16을 열기 때문에 날짜만 겹치는
  // 슬롯으로는 이 조작을 재현할 수 없다.
  const result = validateApplication({ ...valid(), eventId: 'hanriver', slotIso: '2026-08-21T17:30' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});

test('a slot that already passed is rejected', () => {
  const result = validateApplication({ ...valid(), eventId: 'hanriver', slotIso: '2026-08-08T17:00' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});

test('the honeypot silently fails validation', () => {
  const result = validateApplication({ ...valid(), website: 'http://spam.example' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'website');
});

test('form options are exposed for the page to render', () => {
  assert.deepEqual(FIELD_OPTIONS.koreanLevel, ['None', 'Basic', 'Intermediate', 'Fluent']);
  assert.ok(FIELD_OPTIONS.contactMethod.includes('KakaoTalk'));
});
