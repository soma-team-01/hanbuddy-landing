const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const slots = require('../assets/event-slots.js');
const {
  EVENT_SLOTS, isSlotPast, isWeekend, openEvents, findEvent, findSlot, openDates, recurringDates,
  highlightDates,
} = slots;

// 2026-08-10 12:00 KST (월요일)
const AUG10 = Date.parse('2026-08-10T12:00:00+09:00');

// 회차는 두 모델로 나뉜다. 고정 슬롯(티켓·자리를 미리 잡는 회차)과
// 상시 오픈(식당 예약만 하면 되는 회차). 검사도 둘로 갈라야 한다.
const fixedEvents = EVENT_SLOTS.filter((event) => !event.recurring);
const recurringEvents = EVENT_SLOTS.filter((event) => event.recurring);

test('every event carries an id, canonical title and price', () => {
  assert.ok(EVENT_SLOTS.length >= 4);
  for (const event of EVENT_SLOTS) {
    assert.match(event.id, /^[a-z][a-z-]*$/, `bad id: ${event.id}`);
    assert.ok(event.title.en.length > 0);
    assert.ok(event.title.ko.length > 0);
    assert.equal(typeof event.price, 'number');
    // 두 모델 중 정확히 하나여야 한다. 둘 다 있으면 어느 쪽이 이기는지가
    // 호출부마다 달라지고, 둘 다 없으면 신청할 날짜가 없는 회차가 열린다.
    assert.equal(
      Boolean(event.slots) !== Boolean(event.recurring),
      true,
      `${event.id}는 slots나 recurring 중 하나만 가져야 한다`,
    );
  }
});

test('fixed-slot events list match days as bare KST strings', () => {
  assert.ok(fixedEvents.length > 0);
  for (const event of fixedEvents) {
    assert.ok(event.slots.length > 0);
    for (const iso of event.slots) {
      assert.equal(typeof iso, 'string', `${event.id} 슬롯은 문자열이어야 한다`);
      assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${iso}`);
    }
    // 같은 날에 두 번 모이지 않는다. 복붙으로 날짜가 겹치면 캘린더에서
    // 어느 쪽이 이기는지가 배열 순서에 달리게 된다.
    const days = event.slots.map((iso) => iso.slice(0, 10));
    assert.deepEqual([...new Set(days)], days, `${event.id}에 같은 날짜가 두 번 있다`);
    assert.deepEqual([...event.slots].sort(), [...event.slots], `${event.id} 슬롯이 시간순이 아니다`);
  }
});

test('every openable date carries a label that says it is a meeting time', () => {
  for (const event of EVENT_SLOTS) {
    const dates = openDates(event, AUG10);
    assert.ok(dates.length > 0, `${event.id}에 열린 날짜가 없다`);
    for (const slot of dates) {
      assert.match(slot.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${slot.iso}`);
      assert.ok(slot.label.en.includes('Meet at'), `label must show it is a meeting time: ${slot.label.en}`);
      assert.ok(slot.label.ko.includes('집합'), `KO label must show it is a meeting time: ${slot.label.ko}`);
    }
  }
});

test('the meeting label reads the time from the slot, not from the weekday', () => {
  // 주말 경기가 14:00에 시작하는 날이 있다. 요일만 보고 집합 시각을 정하면
  // 경기가 끝난 뒤에 모이라고 안내하게 된다.
  const gocheok = findEvent('kbo-gocheok');
  const afternoon = gocheok.slots.find((iso) => iso.endsWith('T13:00'));
  assert.ok(afternoon, '오후 경기 슬롯이 사라졌다. 이 테스트의 전제가 깨졌다');
  const slot = openDates(gocheok, AUG10).find((s) => s.iso === afternoon);
  assert.match(slot.label.en, /Meet at 1:00 PM/);
  // 한국어는 24시간제다. 12시간제면 13:00과 새벽 1시가 같은 문자열이 된다.
  assert.match(slot.label.ko, /13:00 집합/);
});

test('Korean labels never render an ambiguous 12-hour clock', () => {
  for (const event of EVENT_SLOTS) {
    for (const slot of openDates(event, AUG10)) {
      const time = slot.iso.slice(11, 16);
      assert.ok(
        slot.label.ko.includes(`${time} 집합`),
        `${event.id} ${slot.iso}: KO 라벨이 24시간제가 아니다 -> ${slot.label.ko}`,
      );
    }
  }
});

test('featured days point at real match days', () => {
  // featured는 운영자가 카드에 먼저 띄우고 싶은 날이다. slots에 없는 날을 적으면
  // 조용히 무시되므로, 오타를 여기서 잡지 않으면 밀고 싶던 날이 그냥 안 뜬다.
  for (const event of fixedEvents) {
    for (const ymd of event.featured || []) {
      assert.match(ymd, /^\d{4}-\d{2}-\d{2}$/, `bad featured: ${ymd}`);
      assert.ok(
        event.slots.some((iso) => iso.slice(0, 10) === ymd),
        `${event.id} featured ${ymd}는 경기일이 아니다`,
      );
    }
  }
});

test('card highlights put featured first, skip today and cap the count', () => {
  // 실데이터는 날짜가 계속 바뀌므로 규칙은 합성 회차로 검사한다. 슬롯을 일부러
  // 뒤섞어 둔다: "가까운 순"이 선언 순서가 아니라 정렬에서 나와야 한다.
  const event = {
    id: 'synthetic',
    slots: ['2026-08-20T18:00', '2026-08-10T18:00', '2026-08-30T18:00', '2026-08-12T18:00', '2026-08-11T18:00'],
    featured: ['2026-08-30'],
  };
  // 8/10 아침: 당일 경기가 아직 시작 전이라 openDates에는 살아 있는 시각.
  const morning = Date.parse('2026-08-10T09:00:00+09:00');

  // featured가 맨 앞, 나머지는 가까운 순. 당일(8/10)은 신청은 가능해도 카드에서 뺀다.
  assert.deepEqual(
    highlightDates(event, 3, morning).map((slot) => slot.iso),
    ['2026-08-30T18:00', '2026-08-11T18:00', '2026-08-12T18:00'],
  );
  assert.equal(highlightDates(event, 4, morning).length, 4);

  // featured가 지나가면 강조 없이 가까운 순으로 돌아간다.
  const afterFeatured = Date.parse('2026-08-30T23:00:00+09:00');
  assert.deepEqual(highlightDates(event, 3, afterFeatured), []);

  // 경기일이 아닌 featured는 무시된다(위 테스트가 실데이터에서 오타를 막는다).
  const typo = { ...event, featured: ['2026-08-25'] };
  assert.equal(highlightDates(typo, 3, morning)[0].iso, '2026-08-11T18:00');
});

test('card highlight labels carry a date but never a meeting time', () => {
  // 카드는 "언제쯤 열리나"만 답한다. 집합 시각까지 찍으면 신청 캘린더와
  // 두 군데서 시각을 관리하게 되고, 하나만 고치는 사고가 돌아온다.
  for (const event of fixedEvents) {
    const highlights = highlightDates(event, 3, AUG10);
    assert.ok(highlights.length > 0, `${event.id}에 카드 날짜가 없다`);
    for (const slot of highlights) {
      assert.match(slot.label.en, /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), [A-Z][a-z]{2} \d+$/, slot.label.en);
      assert.match(slot.label.ko, /^\d+월 \d+일 \([일월화수목금토]\)$/, slot.label.ko);
    }
  }
  // 상시 오픈 회차는 카드에 날짜를 찍지 않는다. 다음 날짜가 항상 리드타임 끝이라
  // 정보가 없고, 고정 일정처럼 읽히면 "아무 날이나"라는 장점이 가려진다.
  for (const event of recurringEvents) {
    assert.deepEqual(highlightDates(event, 3, AUG10), []);
  }
});

test('recurring events declare a complete weekday rule', () => {
  assert.ok(recurringEvents.length > 0);
  for (const event of recurringEvents) {
    const rule = event.recurring;
    assert.match(rule.time, /^\d{2}:\d{2}$/, `bad time: ${rule.time}`);
    assert.ok(Number.isInteger(rule.leadDays) && rule.leadDays >= 1, `${event.id} leadDays`);
    assert.ok(Number.isInteger(rule.horizonDays) && rule.horizonDays > rule.leadDays, `${event.id} horizonDays`);
  }
});

test('recurring dates open every day, honour the lead time and stop at the horizon', () => {
  for (const event of recurringEvents) {
    const rule = event.recurring;
    const dates = recurringDates(event, AUG10);
    assert.ok(dates.length > 0, `${event.id}에 신청 가능한 날짜가 없다`);

    for (const slot of dates) {
      assert.match(slot.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${slot.iso}`);
      assert.ok(slot.iso.endsWith(`T${rule.time}`), `집합 시각이 규칙과 다르다: ${slot.iso}`);
    }

    // 리드타임 안쪽과 기간 밖은 아예 목록에 없다.
    const isoDates = dates.map((slot) => slot.iso.slice(0, 10));
    assert.ok(!isoDates.includes('2026-08-10'), '당일이 열렸다');
    assert.ok(!isoDates.includes('2026-08-11'), `리드타임 ${rule.leadDays}일이 지켜지지 않았다`);
    assert.ok(isoDates.includes('2026-08-12'), '리드타임을 넘긴 첫 날이 빠졌다');

    // 주말도 연다. 예약만 하면 되는 활동이라 날짜를 막을 이유가 없다.
    assert.ok(isoDates.includes('2026-08-15'), '토요일이 막혔다');
    assert.ok(isoDates.includes('2026-08-16'), '일요일이 막혔다');
    assert.ok(isoDates.some((ymd) => isWeekend(ymd)), `${event.id}에 주말이 하나도 없다`);

    // 리드타임부터 기간 끝까지 하루도 빠지지 않는다.
    assert.equal(dates.length, rule.horizonDays - rule.leadDays + 1, `${event.id} 날짜 수가 규칙과 다르다`);
    assert.ok(
      isoDates.every((ymd) => ymd <= '2026-09-09'),
      `기간 ${rule.horizonDays}일을 넘긴 날짜가 있다: ${isoDates.at(-1)}`,
    );
  }
});

test('recurring dates are counted from the KST calendar day, not UTC', () => {
  const event = recurringEvents[0];
  // 8/10 00:30 KST = 8/9 15:30 UTC. 계산이 UTC 날짜로 새면 "오늘"이 8/9가 되어
  // 창이 통째로 하루 앞당겨진다. 정오와 같은 결과가 나와야 한다.
  const justAfterMidnightKst = Date.parse('2026-08-10T00:30:00+09:00');
  const lateEveningKst = Date.parse('2026-08-10T23:30:00+09:00');

  const atNoon = recurringDates(event, AUG10).map((slot) => slot.iso);
  assert.deepEqual(recurringDates(event, justAfterMidnightKst).map((s) => s.iso), atNoon);
  assert.deepEqual(recurringDates(event, lateEveningKst).map((s) => s.iso), atNoon);

  // 하루가 넘어가면 창도 하루 움직인다.
  const nextDay = recurringDates(event, Date.parse('2026-08-11T00:30:00+09:00')).map((s) => s.iso);
  assert.notDeepEqual(nextDay, atNoon, 'KST 날짜가 바뀌었는데 창이 그대로다');
  // 집합 시각을 문자열로 박으면 회차 시간이 바뀔 때 이 단언이 조용히 무력해진다.
  assert.ok(
    !nextDay.includes(`2026-08-12T${event.recurring.time}`),
    '8/11 기준이면 8/12는 리드타임 이내다',
  );
});

test('recurring slot resolution rejects anything the picker could not have produced', () => {
  const event = recurringEvents[0];
  const time = event.recurring.time;
  const good = recurringDates(event, AUG10)[0];
  assert.ok(findSlot(event.id, good.iso, AUG10), '정상 날짜가 거부됐다');

  // 폼을 우회해 직접 보내는 값들. 서버가 같은 함수를 부르므로 여기서 막힌다.
  assert.equal(findSlot(event.id, `2026-08-11T${time}`, AUG10), null, '리드타임 이내가 통과했다');
  assert.equal(findSlot(event.id, `2026-08-10T${time}`, AUG10), null, '당일이 통과했다');
  assert.equal(findSlot(event.id, `2026-10-14T${time}`, AUG10), null, '기간 밖이 통과했다');
  assert.equal(findSlot(event.id, '2026-08-12T04:00', AUG10), null, '집합 시각이 다른데 통과했다');
  // 고정 슬롯 회차의 날짜를 상시 오픈 회차에 붙이는 조작.
  const fixedIso = fixedEvents[0].slots.find((iso) => !iso.endsWith(`T${time}`));
  assert.ok(fixedIso, '집합 시각이 다른 고정 슬롯이 없다. 이 검사의 전제가 깨졌다');
  assert.equal(findSlot(event.id, fixedIso, AUG10), null, '다른 회차 슬롯이 통과했다');
});

test('fixed-slot resolution accepts only that event own match days', () => {
  const jamsil = findEvent('kbo-jamsil');
  const mine = jamsil.slots.find((iso) => !isSlotPast(iso, AUG10));
  assert.ok(findSlot('kbo-jamsil', mine, AUG10), '자기 경기일이 거부됐다');

  // 경기가 없는 날. 리그 휴식일인 월요일을 고른다.
  const monday = '2026-08-17T18:00';
  assert.equal(isWeekend(monday.slice(0, 10)), false);
  assert.equal(findSlot('kbo-jamsil', monday, AUG10), null, '경기 없는 날이 통과했다');

  // 다른 구장의 경기일을 붙이는 조작.
  const gocheokOnly = findEvent('kbo-gocheok').slots
    .filter((iso) => !isSlotPast(iso, AUG10))
    .find((iso) => !jamsil.slots.includes(iso));
  assert.ok(gocheokOnly, '고척에만 있는 경기일이 없다. 이 검사의 전제가 깨졌다');
  assert.equal(findSlot('kbo-jamsil', gocheokOnly, AUG10), null, '다른 구장 경기일이 통과했다');
});

test('slot expiry is judged in KST regardless of the reader timezone', () => {
  // 8/8 17:00 KST는 8/10 시점에서 지났다.
  assert.equal(isSlotPast('2026-08-08T17:00', AUG10), true);
  assert.equal(isSlotPast('2026-08-12T17:30', AUG10), false);
  // 경계: 슬롯 시작 시각 정각은 지난 것으로 본다.
  assert.equal(isSlotPast('2026-08-10T12:00', AUG10), true);
});

test('openEvents drops past slots and events whose slots have all passed', () => {
  // 날짜 목록은 회차마다 바뀐다. 특정 날짜를 박지 말고 규칙 자체를 검사한다.
  const open = openEvents(AUG10);
  assert.ok(open.length > 0, 'AUG10 기준으로 열려 있는 회차가 있어야 한다');

  for (const event of open.filter((e) => !e.recurring)) {
    for (const iso of event.slots) {
      assert.equal(isSlotPast(iso, AUG10), false, `지난 슬롯이 남았다: ${event.id} ${iso}`);
    }
  }

  // 아직 남은 슬롯은 하나도 빠뜨리지 않고, 전부 지난 회차는 목록에서 사라진다.
  for (const defined of fixedEvents) {
    const future = defined.slots.filter((iso) => !isSlotPast(iso, AUG10));
    const found = open.find((event) => event.id === defined.id);
    if (future.length === 0) {
      assert.equal(found, undefined, `슬롯이 전부 지난 ${defined.id}는 사라져야 한다`);
    } else {
      assert.deepEqual(found?.slots, future, `${defined.id} 잔여 슬롯 불일치`);
    }
  }

  // 고정 슬롯이 전부 지나면 그 회차는 사라지지만, 상시 오픈은 계속 남는다.
  // 날짜를 미리 사두지 않으니 만료될 것이 없다. 기준 시각은 마지막 경기일보다
  // 뒤여야 하므로 EVENT_SLOTS에서 직접 구한다(날짜를 박으면 일정 갱신 때 깨진다).
  const lastMatchDay = fixedEvents.flatMap((event) => event.slots).sort().at(-1);
  const afterEverything = openEvents(Date.parse(`${lastMatchDay}:00+09:00`) + 1000);
  assert.deepEqual(
    afterEverything.map((event) => event.id).sort(),
    recurringEvents.map((event) => event.id).sort(),
  );
  for (const event of afterEverything) {
    assert.ok(event.recurring, `${event.id}는 고정 슬롯인데 만료되지 않았다`);
    assert.equal(event.slots, undefined, `${event.id}에 slots가 딸려 나왔다`);
  }
});

test('findSlot rejects unknown events', () => {
  assert.equal(findEvent('nope'), null);
  assert.equal(findSlot('nope', '2026-08-15T18:00', AUG10), null);
});

const homeHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('event cards carry no hardcoded dates', () => {
  // 카드의 날짜 칩은 렌더 시점에 highlightDates()로 뽑는다. 카피에 날짜를 손으로
  // 적으면 그날이 지나는 순간 거짓말이 되므로, 하드코딩만은 계속 막는다.
  // 카드 하나치 블록으로 잘라서 본다. 통째로 훑으면 다른 섹션의 날짜까지 걸린다.
  const blocks = homeHtml.split(/\n {12}\{\n/).slice(1);
  for (const event of EVENT_SLOTS) {
    const cards = blocks.filter((block) => block.includes(`id: '${event.id}'`))
      .map((block) => block.slice(0, block.indexOf('\n            },')));
    assert.ok(cards.length > 0, `card not found: ${event.id}`);
    for (const card of cards) {
      assert.doesNotMatch(card, /\bdate:/, `${event.id} 카드에 date 필드가 남아 있다`);
      assert.doesNotMatch(card, /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b \d/, `${event.id} 카드에 영문 날짜가 있다`);
      assert.doesNotMatch(card, /\d+\s*월\s*\d+/, `${event.id} 카드에 한글 날짜가 있다`);
    }
  }
});
