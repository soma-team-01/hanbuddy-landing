const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const slots = require('../assets/event-slots.js');
const { EVENT_SLOTS, isSlotPast, openEvents, findEvent, findSlot, recurringDates } = slots;

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

test('fixed-slot events spell out every day they open', () => {
  assert.ok(fixedEvents.length > 0);
  for (const event of fixedEvents) {
    assert.ok(event.slots.length > 0);
    for (const slot of event.slots) {
      assert.match(slot.iso, /^2026-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${slot.iso}`);
      assert.ok(slot.label.en.includes('Meet at'), `label must show it is a meeting time: ${slot.label.en}`);
      assert.ok(slot.label.ko.includes('집합'), `KO label must show it is a meeting time: ${slot.label.ko}`);
    }
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

test('recurring dates skip weekends, honour the lead time and stop at the horizon', () => {
  for (const event of recurringEvents) {
    const rule = event.recurring;
    const dates = recurringDates(event, AUG10);
    assert.ok(dates.length > 0, `${event.id}에 신청 가능한 날짜가 없다`);

    for (const slot of dates) {
      assert.match(slot.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${slot.iso}`);
      assert.ok(slot.iso.endsWith(`T${rule.time}`), `집합 시각이 규칙과 다르다: ${slot.iso}`);
      assert.ok(slot.label.en.includes('Meet at'), slot.label.en);
      assert.ok(slot.label.ko.includes('집합'), slot.label.ko);

      // 요일 판정은 KST 달력 기준이다.
      const day = new Date(`${slot.iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
      assert.ok(day >= 1 && day <= 5, `주말이 열렸다: ${slot.iso}`);
    }

    // 리드타임 안쪽과 기간 밖은 아예 목록에 없다.
    const isoDates = dates.map((slot) => slot.iso.slice(0, 10));
    assert.ok(!isoDates.includes('2026-08-10'), '당일이 열렸다');
    assert.ok(!isoDates.includes('2026-08-11'), `리드타임 ${rule.leadDays}일이 지켜지지 않았다`);
    assert.ok(isoDates.includes('2026-08-12'), '리드타임을 넘긴 첫 평일이 빠졌다');
    assert.ok(!isoDates.includes('2026-08-15'), '토요일이 열렸다');
    assert.ok(!isoDates.includes('2026-08-16'), '일요일이 열렸다');
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
  assert.ok(!nextDay.includes('2026-08-12T19:00'), '8/11 기준이면 8/12는 리드타임 이내다');
});

test('recurring slot resolution rejects anything the picker could not have produced', () => {
  const event = recurringEvents[0];
  const good = recurringDates(event, AUG10)[0];
  assert.ok(findSlot(event.id, good.iso, AUG10), '정상 날짜가 거부됐다');

  // 폼을 우회해 직접 보내는 값들. 서버가 같은 함수를 부르므로 여기서 막힌다.
  assert.equal(findSlot(event.id, '2026-08-15T19:00', AUG10), null, '토요일이 통과했다');
  assert.equal(findSlot(event.id, '2026-08-11T19:00', AUG10), null, '리드타임 이내가 통과했다');
  assert.equal(findSlot(event.id, '2026-08-10T19:00', AUG10), null, '당일이 통과했다');
  assert.equal(findSlot(event.id, '2026-10-14T19:00', AUG10), null, '기간 밖이 통과했다');
  assert.equal(findSlot(event.id, '2026-08-12T18:00', AUG10), null, '집합 시각이 다른데 통과했다');
  // 고정 슬롯 회차의 날짜를 상시 오픈 회차에 붙이는 조작.
  assert.equal(findSlot(event.id, '2026-08-22T17:00', AUG10), null, '다른 회차 슬롯이 통과했다');
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
    for (const slot of event.slots) {
      assert.equal(isSlotPast(slot.iso, AUG10), false, `지난 슬롯이 남았다: ${event.id} ${slot.iso}`);
    }
  }

  // 아직 남은 슬롯은 하나도 빠뜨리지 않고, 전부 지난 회차는 목록에서 사라진다.
  for (const defined of fixedEvents) {
    const future = defined.slots.filter((slot) => !isSlotPast(slot.iso, AUG10)).map((slot) => slot.iso);
    const found = open.find((event) => event.id === defined.id);
    if (future.length === 0) {
      assert.equal(found, undefined, `슬롯이 전부 지난 ${defined.id}는 사라져야 한다`);
    } else {
      assert.deepEqual(found?.slots.map((slot) => slot.iso), future, `${defined.id} 잔여 슬롯 불일치`);
    }
  }

  // 고정 슬롯이 전부 지나면 그 회차는 사라지지만, 상시 오픈은 계속 남는다.
  // 날짜를 미리 사두지 않으니 만료될 것이 없다.
  const afterEverything = openEvents(Date.parse('2026-09-01T00:00:00+09:00'));
  assert.deepEqual(
    afterEverything.map((event) => event.id).sort(),
    recurringEvents.map((event) => event.id).sort(),
  );
  for (const event of afterEverything) {
    assert.ok(event.recurring, `${event.id}는 고정 슬롯인데 만료되지 않았다`);
    assert.equal(event.slots, undefined, `${event.id}에 slots가 딸려 나왔다`);
  }
});

test('findSlot only matches a slot that belongs to that event', () => {
  assert.ok(findSlot('kbo-jamsil', '2026-08-15T17:00'));
  // 한강 신청에 잠실 슬롯을 붙이는 조작을 막는다.
  assert.equal(findSlot('hanriver', '2026-08-21T17:30'), null);
  assert.equal(findEvent('nope'), null);
});

const homeHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
// 카드 하나의 date 문자열. EN/KO 두 벌이 있으므로 전부 뽑는다.
const cardDateStrings = (id) => {
  const found = [...homeHtml.matchAll(new RegExp(`id: '${id}',[\\s\\S]{0,400}?date: '([^']+)'`, 'g'))]
    .map((match) => match[1]);
  assert.ok(found.length > 0, `card not found: ${id}`);
  return found;
};

test('fixed-slot cards list exactly the days that EVENT_SLOTS defines', () => {
  // 카드 문자열과 슬롯이 갈라지면 랜딩과 구글폼 사이에서 겪은 불일치가 레포 안에서 재현된다.
  for (const event of fixedEvents) {
    const fromSlots = [...new Set(event.slots.map((s) => Number(s.iso.slice(8, 10))))].sort((a, b) => a - b);
    for (const dateString of cardDateStrings(event.id)) {
      // KO 카드는 "8월 12·21·22일" 꼴이라 월 숫자를 먼저 떼야 날짜만 남는다.
      // 예전 테스트는 EN 카드 한 벌만 봐서 이 문제를 만난 적이 없었다.
      const daysOnly = dateString.replace(/\d+\s*월/g, '');
      const fromCard = [...new Set(
        [...daysOnly.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n <= 31),
      )].sort((a, b) => a - b);
      assert.deepEqual(fromCard, fromSlots, `card days drifted from EVENT_SLOTS for ${event.id}: "${dateString}"`);
    }
  }
});

test('recurring cards advertise the rule instead of a date list', () => {
  // 상시 오픈 회차에 날짜를 박으면 그날이 지나는 순간 거짓말이 된다.
  // 카드는 규칙만 말하고 실제 날짜는 폼이 정한다.
  for (const event of recurringEvents) {
    const clock = Number(event.recurring.time.slice(0, 2));
    const hour12 = ((clock + 11) % 12) + 1;
    for (const dateString of cardDateStrings(event.id)) {
      const days = [...dateString.matchAll(/\b(\d{1,2})\s*일/g)].map((m) => Number(m[1]));
      assert.deepEqual(days, [], `상시 오픈 카드에 날짜가 박혔다: ${event.id} "${dateString}"`);
      assert.match(
        dateString,
        new RegExp(`${hour12}:${event.recurring.time.slice(3, 5)}`),
        `카드가 집합 시각을 알리지 않는다: ${event.id} "${dateString}"`,
      );
    }
  }
});
