const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const slots = require('../assets/event-slots.js');
const { EVENT_SLOTS, isSlotPast, openEvents, findEvent, findSlot } = slots;

// 2026-08-10 12:00 KST
const AUG10 = Date.parse('2026-08-10T12:00:00+09:00');

test('every event carries an id, canonical title, price and at least one slot', () => {
  assert.ok(EVENT_SLOTS.length >= 4);
  for (const event of EVENT_SLOTS) {
    assert.match(event.id, /^[a-z][a-z-]*$/, `bad id: ${event.id}`);
    assert.ok(event.title.en.length > 0);
    assert.ok(event.title.ko.length > 0);
    assert.equal(typeof event.price, 'number');
    assert.ok(event.slots.length > 0);
    for (const slot of event.slots) {
      assert.match(slot.iso, /^2026-\d{2}-\d{2}T\d{2}:\d{2}$/, `bad iso: ${slot.iso}`);
      assert.ok(slot.label.en.includes('Meet at'), `label must show it is a meeting time: ${slot.label.en}`);
      assert.ok(slot.label.ko.includes('집합'), `KO label must show it is a meeting time: ${slot.label.ko}`);
    }
  }
});

test('slot expiry is judged in KST regardless of the reader timezone', () => {
  // 8/8 17:00 KST 슬롯은 8/10 시점에서 지났다.
  assert.equal(isSlotPast('2026-08-08T17:00', AUG10), true);
  assert.equal(isSlotPast('2026-08-12T17:30', AUG10), false);
  // 경계: 슬롯 시작 시각 정각은 지난 것으로 본다.
  assert.equal(isSlotPast('2026-08-10T12:00', AUG10), true);
});

test('openEvents drops past slots and events whose slots have all passed', () => {
  const open = openEvents(AUG10);
  const hanriver = open.find((e) => e.id === 'hanriver');
  assert.ok(hanriver, 'han river still has 8/15 and 8/16');
  assert.deepEqual(hanriver.slots.map((s) => s.iso), ['2026-08-15T17:00', '2026-08-16T17:00']);

  // 모든 슬롯이 지난 뒤에는 이벤트 자체가 사라진다.
  const afterEverything = openEvents(Date.parse('2026-09-01T00:00:00+09:00'));
  assert.deepEqual(afterEverything, []);
});

test('findSlot only matches a slot that belongs to that event', () => {
  assert.ok(findSlot('kbo-jamsil', '2026-08-15T17:00'));
  // 한강 신청에 잠실 슬롯을 붙이는 조작을 막는다.
  assert.equal(findSlot('hanriver', '2026-08-21T17:30'), null);
  assert.equal(findEvent('nope'), null);
});

test('landing cards list exactly the days that EVENT_SLOTS defines', () => {
  // 카드 문자열과 슬롯이 갈라지면 랜딩과 구글폼 사이에서 겪은 불일치가 레포 안에서 재현된다.
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
  const cardDays = (id) => {
    const block = html.match(new RegExp(`id: '${id}'[\\s\\S]*?date: '([^']+)'`));
    assert.ok(block, `card not found: ${id}`);
    return [...block[1].matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n <= 31);
  };
  for (const event of EVENT_SLOTS) {
    const fromSlots = [...new Set(event.slots.map((s) => Number(s.iso.slice(8, 10))))].sort((a, b) => a - b);
    const fromCard = [...new Set(cardDays(event.id))].sort((a, b) => a - b);
    assert.deepEqual(fromCard, fromSlots, `card days drifted from EVENT_SLOTS for ${event.id}`);
  }
});
