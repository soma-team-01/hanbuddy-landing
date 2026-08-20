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
  assert.equal(result.value.eventTitle, 'Open-Air KBO Baseball Night at Jamsil');
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
  // 한강은 상시 오픈이라 날짜는 겹쳐도 집합 시각이 다르다. 잠실 슬롯을 그대로
  // 붙이면 시각이 어긋나 걸린다.
  const result = validateApplication({ ...valid(), eventId: 'hanriver', slotIso: firstOpen('kbo-jamsil') }, AUG10);
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
  assert.ok(FIELD_OPTIONS.contactMethod.includes('KakaoTalk'));
  assert.ok(FIELD_OPTIONS.source.includes('Instagram'));
});

// 상시 오픈 회차는 서버가 날짜를 직접 판정한다. 폼의 select는 브라우저에만 있고,
// 신청 요청은 누구나 손으로 만들어 보낼 수 있다.
const foodApplication = (slotIso) => ({ ...valid(), eventId: 'samgyeopsal', slotIso });

test('a weekday inside the booking window is accepted for a recurring event', () => {
  const result = validateApplication(foodApplication('2026-08-12T19:00'), AUG10);
  assert.equal(result.ok, true, result.field);
  assert.equal(result.value.eventTitle, 'Korean BBQ Night');
  // slotIso 형식은 고정 슬롯 회차와 같아야 한다. 시트 5열이 이 문자열을 그대로 받는다.
  assert.match(result.value.slotIso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(result.value.slotIso, '2026-08-12T19:00');
});

test('the server rejects recurring dates the date picker would never offer', () => {
  const rejected = {
    '리드타임 이내': '2026-08-11T19:00',
    '당일': '2026-08-10T19:00',
    '지난 날짜': '2026-08-05T19:00',
    '기간 밖': '2026-10-14T19:00',
    '다른 집합 시각': '2026-08-12T20:00',
    '다른 회차의 슬롯': '2026-08-22T13:00',
  };
  for (const [label, slotIso] of Object.entries(rejected)) {
    const result = validateApplication(foodApplication(slotIso), AUG10);
    assert.equal(result.ok, false, `${label}(${slotIso})이 통과했다`);
    assert.equal(result.field, 'slotIso', `${label}은 slotIso로 걸려야 한다`);
  }
});

test('a recurring date cannot be attached to a fixed-slot event', () => {
  // 야구는 티켓을 미리 사두므로 임의의 평일을 열어 줄 수 없다.
  const result = validateApplication({ ...valid(), slotIso: '2026-08-12T19:00' }, AUG10);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'slotIso');
});
