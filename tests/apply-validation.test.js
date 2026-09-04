const assert = require('node:assert/strict');
const test = require('node:test');

const { validateApplication, FIELD_OPTIONS } = require('../assets/apply-validation.js');
const { findEvent, openDates } = require('../assets/event-slots.js');

const AUG10 = Date.parse('2026-08-10T12:00:00+09:00');

// 경기 일정은 리그가 정하고 우리는 갱신만 한다. 날짜를 박아두면 갱신할 때마다
// 무관한 테스트가 깨지므로, 그때그때 열려 있는 슬롯을 데이터에서 집어 온다.
const firstOpen = (eventId) => openDates(findEvent(eventId), AUG10)[0].iso;

const valid = () => ({
  eventId: 'kbo-jamsil',
  slotIso: firstOpen('kbo-jamsil'),
  guests: '2',
  name: 'Julie Martin',
  nationality: 'France',
  contactMethod: 'WhatsApp',
  contactId: '+82 10 1234 5678',
  requests: '',
  source: 'Instagram',
  consent: true,
  language: 'en',
});

test('a complete application passes and comes back normalised', () => {
  const result = validateApplication(valid(), AUG10);
  assert.equal(result.ok, true);
  assert.equal(result.value.guests, 2);
  assert.equal(result.value.eventTitle, 'Open-Air KBO Baseball Night');
  assert.equal(result.value.name, 'Julie Martin');
});

test('every required field is enforced and reported by name', () => {
  for (const field of ['eventId', 'slotIso', 'guests', 'name', 'nationality',
    'contactMethod', 'contactId']) {
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
  assert.equal(validateApplication({ ...valid(), contactMethod: 'Telegram' }, AUG10).field, 'contactMethod');
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
  // 국가대표 축구는 경기일이 따로 있다. 잠실 슬롯을 그대로 붙이면 그 회차에
  // 없는 날짜라 걸린다.
  const result = validateApplication({ ...valid(), eventId: 'korea-football', slotIso: firstOpen('kbo-jamsil') }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});

test('a slot that already passed is rejected', () => {
  // 실재하는 경기일을 고르고 시계만 그 뒤로 돌린다. 목록에 없는 날짜로 검사하면
  // "지났다"가 아니라 "없다"로 걸려 만료 판정을 검증하지 못한다.
  const slotIso = firstOpen('kbo-jamsil');
  const afterSlot = Date.parse(`${slotIso}:00+09:00`) + 60 * 60 * 1000;
  const result = validateApplication({ ...valid(), slotIso }, afterSlot);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});

test('what we store is exactly what the privacy notice declares', () => {
  // 고지문은 사람이 쓰고 저장 항목은 코드가 정한다. 둘이 갈라지면 동의를 받은
  // 범위 밖의 정보를 갖고 있게 된다. 여기에 키가 늘거나 줄면 apply/index.html의
  // apply.privacySummary와 apply.privacy(각 EN/KO) 네 벌을 같이 고치라는 뜻이다. 카피 문장 자체는 박지
  // 않는다. 표현은 바뀌어도 되고 범위만 어긋나면 안 된다.
  const result = validateApplication(valid(), AUG10);
  assert.equal(result.ok, true, result.field);
  assert.deepEqual(Object.keys(result.value).sort(), [
    'contactId', 'contactMethod', 'eventId', 'eventTitle', 'guests',
    'language', 'name', 'nationality', 'requests', 'slotIso', 'source',
  ]);
});

test('the honeypot silently fails validation', () => {
  const result = validateApplication({ ...valid(), website: 'http://spam.example' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'website');
});

test('form options are exposed for the page to render', () => {
  assert.ok(FIELD_OPTIONS.contactMethod.includes('KakaoTalk'));
  assert.ok(FIELD_OPTIONS.source.includes('Instagram'));
  // 검색 광고를 돌리는 동안 이 칸이 빠지면 검색 유입이 전부 Other로 뭉개진다.
  assert.ok(FIELD_OPTIONS.source.includes('Google search'));
});

// 상시 오픈 회차(한강·삼겹살·치맥)는 2026-09-04에 접었다. 그 모델의 날짜 판정은
// tests/event-slots.test.js가 픽스처로 계속 지킨다. 여기서는 서버가 같은 창구
// (findSlot → openDates)를 지나는지만 고정 슬롯 회차로 확인한다.
test('an arbitrary weekday cannot be attached to a fixed-slot event', () => {
  // 야구는 티켓을 미리 사두므로 임의의 평일을 열어 줄 수 없다.
  const result = validateApplication({ ...valid(), slotIso: '2026-08-12T19:00' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});
