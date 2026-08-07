# 랜딩 자체 신청 폼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글폼으로 나가던 신청을 랜딩 안 `/apply/`에서 직접 받고, 신청 데이터를 팀 소유 시트에 쌓는다.

**Architecture:** 정적 폼 페이지가 same-origin `POST /api/apply`(Vercel Function)를 호출한다. 함수는 서버측 재검증 후 Google Sheets append와 Discord 웹훅을 병렬로 호출하고, 하나만 성공해도 접수로 응답한다. 슬롯 데이터와 검증 로직은 브라우저와 함수가 같은 모듈을 공유한다.

**Tech Stack:** 순수 HTML/CSS/JS, Tailwind CDN, Node.js 내장 `crypto`(서비스 계정 JWT 서명), Google Sheets REST API v4, Discord Webhook. **npm 의존성 없음.**

**스펙 정본:** `docs/superpowers/specs/2026-08-06-native-application-form-design.md`

## Global Constraints

- **npm 의존성 0.** `package.json`을 만들지 않는다. 서비스 계정 JWT는 Node 내장 `crypto`로 직접 서명한다.
- **서버 로그에 개인정보 금지.** `console.*` 직접 호출 금지. 로깅 헬퍼만 쓰고 허용 키는 `application_id`·`code`·`stage` 셋뿐이다.
- **API 응답에 내부 오류 메시지 금지.** 정해진 코드(`VALIDATION`·`STORAGE`)만 반환한다.
- **시크릿은 Vercel 환경변수로만.** 레포에 서비스 계정 키가 들어가면 안 된다.
- **`.vercelignore`는 앵커드 allowlist.** 새 파일을 추가하면 같은 커밋에서 allowlist를 갱신한다. 빠뜨리면 조용히 404가 된다.
- **활동명은 canonical name을 접미사 없이 쓴다.** `Indoor Dome KBO Baseball Night` / `Open-Air KBO Baseball Night at Jamsil` / `K League Football Night` / `Han River Picnic`.
- **event id는 `kbo-gocheok`·`kbo-jamsil`·`kleague`·`hanriver`.**
- **시각은 집합 시간이다.** 라벨에 `Meet at`을 드러낸다.
- **KST(UTC+9) 기준으로 만료를 판정한다.** 클라이언트와 서버가 같은 결과를 내야 한다.
- **완료 화면에 부정문("자리 확정이 아니다")을 쓰지 않는다.** `We'll be in touch within 24 hours to confirm your spot.`으로 같은 사실을 전달한다.
- **연락 채널 이름을 완료 화면에 쓰지 않는다.**
- **테스트 커맨드는 `node --test tests/*.test.js`** (디렉터리 형태는 일부 Node 버전에서 실패).
- **커밋에 AI co-author 트레일러를 넣지 않는다.**
- **작업 브랜치는 `feat/native-application-form`** (이미 존재, `main` 위에 최신).

## File Structure

| 파일 | 책임 |
|---|---|
| `assets/event-slots.js` (신규) | `EVENT_SLOTS` 단일 소스, KST 만료 판정, 이벤트별 유효 슬롯 조회 |
| `assets/apply-validation.js` (신규) | 폼 필드 검증. 브라우저와 함수가 공유 |
| `apply/index.html` (신규) | 폼 페이지. 마크업 + `CONTENT_MAP` + 렌더·제출 스크립트 |
| `api/apply.js` (신규) | Vercel Function. 재검증 → Sheets append + Discord → 응답 |
| `index.html` (수정) | 신청 CTA URL 교체, 최종 CTA 카피 |
| `events/*/index.html` (수정) | 신청 CTA URL 교체, 개인정보 카피 |
| `assets/analytics.js` (수정) | `application_page` destination, 새 이벤트 3종 |
| `.vercelignore` (수정) | `/apply`, `/api`, 새 asset allowlist |
| `AGENTS.md`·`README.md`·`DESIGN.md`·`.gitignore` (수정) | 규약 개정 (스펙 11절) |

---

### Task 1: 이벤트 슬롯 단일 소스

**Files:**
- Create: `assets/event-slots.js`
- Test: `tests/event-slots.test.js`
- Modify: `.vercelignore`

**Interfaces:**
- Produces: `EVENT_SLOTS` (배열), `slotEpoch(iso)`, `isSlotPast(iso, now)`, `openEvents(now)`, `findEvent(eventId)`, `findSlot(eventId, iso)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/event-slots.test.js`:

```js
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/event-slots.test.js`
Expected: FAIL — `Cannot find module '../assets/event-slots.js'`

- [ ] **Step 3: 모듈을 구현한다**

`assets/event-slots.js`:

```js
// 신청 폼과 랜딩 카드가 같은 날짜를 보게 하는 단일 소스.
// 브라우저(apply 페이지)와 Vercel Function이 함께 읽는다.
(function initEventSlots(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyEventSlots = api;
})(typeof window === 'undefined' ? null : window, () => {
  // iso는 KST 벽시계 시각이다. 타임존은 slotEpoch에서 붙인다.
  // label은 집합 시간임을 드러낸다(경기 시작 시각이 아니다).
  const EVENT_SLOTS = Object.freeze([
    {
      id: 'kbo-gocheok',
      title: { en: 'Indoor Dome KBO Baseball Night', ko: '고척돔 실내 야구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-12T17:30', label: { en: 'Wed, Aug 12 · Meet at 5:30 PM', ko: '8월 12일 (수) · 5:30 집합' } },
        { iso: '2026-08-21T17:30', label: { en: 'Fri, Aug 21 · Meet at 5:30 PM', ko: '8월 21일 (금) · 5:30 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
      ],
    },
    {
      id: 'kbo-jamsil',
      title: { en: 'Open-Air KBO Baseball Night at Jamsil', ko: '잠실 야외 야구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-15T17:00', label: { en: 'Sat, Aug 15 · Meet at 5:00 PM', ko: '8월 15일 (토) · 5:00 집합' } },
        { iso: '2026-08-16T17:00', label: { en: 'Sun, Aug 16 · Meet at 5:00 PM', ko: '8월 16일 (일) · 5:00 집합' } },
        { iso: '2026-08-21T17:30', label: { en: 'Fri, Aug 21 · Meet at 5:30 PM', ko: '8월 21일 (금) · 5:30 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
      ],
    },
    {
      id: 'kleague',
      title: { en: 'K League Football Night', ko: 'K리그 축구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-15T18:30', label: { en: 'Sat, Aug 15 · Meet at 6:30 PM', ko: '8월 15일 (토) · 6:30 집합' } },
      ],
    },
    {
      id: 'hanriver',
      title: { en: 'Han River Picnic', ko: '한강 피크닉' },
      price: 25000,
      slots: [
        { iso: '2026-08-08T17:00', label: { en: 'Sat, Aug 8 · Meet at 5:00 PM', ko: '8월 8일 (토) · 5:00 집합' } },
        { iso: '2026-08-09T17:00', label: { en: 'Sun, Aug 9 · Meet at 5:00 PM', ko: '8월 9일 (일) · 5:00 집합' } },
        { iso: '2026-08-15T17:00', label: { en: 'Sat, Aug 15 · Meet at 5:00 PM', ko: '8월 15일 (토) · 5:00 집합' } },
        { iso: '2026-08-16T17:00', label: { en: 'Sun, Aug 16 · Meet at 5:00 PM', ko: '8월 16일 (일) · 5:00 집합' } },
      ],
    },
  ]);

  // 방문자 기기의 시간대와 무관하게 같은 결과를 내야 하므로 KST를 명시해 파싱한다.
  const slotEpoch = (iso) => Date.parse(`${iso}:00+09:00`);
  const isSlotPast = (iso, now = Date.now()) => slotEpoch(iso) <= now;

  const openEvents = (now = Date.now()) => EVENT_SLOTS
    .map((event) => ({ ...event, slots: event.slots.filter((slot) => !isSlotPast(slot.iso, now)) }))
    .filter((event) => event.slots.length > 0);

  const findEvent = (eventId) => EVENT_SLOTS.find((event) => event.id === eventId) || null;

  const findSlot = (eventId, iso) => {
    const event = findEvent(eventId);
    if (!event) return null;
    return event.slots.find((slot) => slot.iso === iso) || null;
  };

  return { EVENT_SLOTS, slotEpoch, isSlotPast, openEvents, findEvent, findSlot };
});
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `node --test tests/event-slots.test.js`
Expected: PASS (5 tests)

카드 일치 테스트가 실패하면 `index.html`의 `date` 문자열과 `EVENT_SLOTS` 중 어느 쪽이 틀렸는지 확인한다. 스펙 5.2 표가 정본이다.

- [ ] **Step 5: 배포 allowlist에 추가하고 검증한다**

`.vercelignore`의 `!/assets/analytics.js` 다음 줄에 추가:

```
!/assets/event-slots.js
```

Run:
```bash
tmp=$(mktemp -d) && cp .vercelignore "$tmp/.gitignore" && git -C "$tmp" init -q && \
  cp -R index.html about events assets favicon.ico "$tmp/" 2>/dev/null; \
  git -C "$tmp" add -n . 2>/dev/null | grep -c "assets/event-slots.js"; rm -rf "$tmp"
```
Expected: `1`

- [ ] **Step 6: 커밋**

```bash
git add assets/event-slots.js tests/event-slots.test.js .vercelignore
git commit -m "feat(apply): 이벤트 슬롯 단일 소스 추가

폼과 랜딩 카드가 날짜를 따로 들고 있으면 랜딩과 구글폼 사이에서 겪은
불일치를 레포 안에서 재현한다. EVENT_SLOTS 하나만 보게 하고, 카드에
적힌 날짜가 슬롯과 일치하는지 테스트로 강제한다.

만료 판정은 KST를 명시해 파싱하므로 방문자 기기 시간대와 무관하다."
```

---

### Task 2: 신청 검증 모듈

**Files:**
- Create: `assets/apply-validation.js`
- Test: `tests/apply-validation.test.js`
- Modify: `.vercelignore`

**Interfaces:**
- Consumes: Task 1의 `findEvent`, `findSlot`, `isSlotPast`
- Produces: `FIELD_OPTIONS`, `validateApplication(payload, now)` → `{ ok: true, value } | { ok: false, field }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/apply-validation.test.js`:

```js
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

test('a slot from another event is rejected', () => {
  const result = validateApplication({ ...valid(), eventId: 'hanriver' }, AUG10);
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/apply-validation.test.js`
Expected: FAIL — `Cannot find module '../assets/apply-validation.js'`

- [ ] **Step 3: 모듈을 구현한다**

`assets/apply-validation.js`:

```js
// 폼 검증. 브라우저 검증은 우회할 수 있으므로 서버가 같은 함수로 다시 판정한다.
(function initApplyValidation(root, factory) {
  const slots = typeof require === 'function'
    ? require('./event-slots.js')
    : root.HanBuddyEventSlots;
  const api = factory(slots);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyApplyValidation = api;
})(typeof window === 'undefined' ? null : window, (slots) => {
  const FIELD_OPTIONS = Object.freeze({
    koreanLevel: ['None', 'Basic', 'Intermediate', 'Fluent'],
    contactMethod: ['WhatsApp', 'LINE', 'KakaoTalk', 'Instagram DM', 'WeChat', 'Other'],
    paymentMethod: ['Korean bank transfer', 'PayPal', 'Card payment link', 'Cash', 'I need help'],
    source: ['Offline promotion', 'Meetup', 'Instagram', 'Friend', 'University community', 'Other'],
  });

  const MAX_LENGTH = { name: 100, nationality: 100, contactId: 200, requests: 1000 };

  const fail = (field) => ({ ok: false, field });
  const text = (value) => (typeof value === 'string' ? value.trim() : '');

  const validateApplication = (payload = {}, now = Date.now()) => {
    // 봇만 채우는 필드. 성공처럼 보이게 응답하되 저장하지 않는다(호출부에서 처리).
    if (text(payload.website)) return fail('website');

    const event = slots.findEvent(text(payload.eventId));
    if (!event) return fail('eventId');

    const slot = slots.findSlot(event.id, text(payload.slotIso));
    if (!slot || slots.isSlotPast(slot.iso, now)) return fail('slotIso');

    const guests = Number(text(payload.guests));
    if (!Number.isInteger(guests) || guests < 1 || guests > 10) return fail('guests');

    for (const field of ['name', 'nationality', 'contactId']) {
      const value = text(payload[field]);
      if (!value || value.length > MAX_LENGTH[field]) return fail(field);
    }

    for (const field of ['koreanLevel', 'contactMethod', 'paymentMethod']) {
      if (!FIELD_OPTIONS[field].includes(text(payload[field]))) return fail(field);
    }

    const source = text(payload.source);
    if (source && !FIELD_OPTIONS.source.includes(source)) return fail('source');

    const requests = text(payload.requests);
    if (requests.length > MAX_LENGTH.requests) return fail('requests');

    if (payload.consent !== true) return fail('consent');

    const language = text(payload.language) === 'ko' ? 'ko' : 'en';

    return {
      ok: true,
      value: {
        eventId: event.id,
        eventTitle: event.title.en,
        slotIso: slot.iso,
        guests,
        name: text(payload.name),
        nationality: text(payload.nationality),
        koreanLevel: text(payload.koreanLevel),
        contactMethod: text(payload.contactMethod),
        contactId: text(payload.contactId),
        paymentMethod: text(payload.paymentMethod),
        requests,
        source,
        language,
      },
    };
  };

  return { FIELD_OPTIONS, MAX_LENGTH, validateApplication };
});
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `node --test tests/apply-validation.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: allowlist 추가 후 커밋**

`.vercelignore`에 `!/assets/apply-validation.js` 추가.

```bash
git add assets/apply-validation.js tests/apply-validation.test.js .vercelignore
git commit -m "feat(apply): 폼 검증 모듈 추가

브라우저 검증은 우회할 수 있으므로 서버가 같은 함수로 다시 판정한다.
이벤트와 슬롯의 조합까지 확인해 한강 신청에 잠실 슬롯을 붙이는 조작을
막고, 지난 슬롯도 거부한다."
```

---

### Task 3: `/apply/` 페이지

**Files:**
- Create: `apply/index.html`
- Test: `tests/apply-page.test.js`
- Modify: `.vercelignore`

**Interfaces:**
- Consumes: Task 1 `HanBuddyEventSlots`, Task 2 `HanBuddyApplyValidation`
- Produces: `POST /api/apply`로 보내는 JSON 페이로드 형태(Task 4가 받는다)

**참고:** 나브·푸터·동의 배너 마크업과 `tailwind.config`는 `events/kbo-gocheok/index.html`에서 그대로 가져온다. 이 레포는 페이지마다 인라인으로 복제하는 구조다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/apply-page.test.js`:

```js
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/apply-page.test.js`
Expected: FAIL — `ENOENT: no such file or directory ... apply/index.html`

- [ ] **Step 3: 페이지를 만든다**

`apply/index.html`을 만든다. `events/kbo-gocheok/index.html`의 `<head>`(タタイトル·메타 제외), 나브, 푸터, 동의 배너를 복사한 뒤 `<main>`을 아래로 채운다.

`<head>` 차이점:
```html
<title>Apply | HanBuddy</title>
<meta name="description" content="Apply to join a HanBuddy meetup in Seoul. Takes about 2 minutes." />
<meta name="robots" content="noindex" />
<script src="/assets/event-slots.js"></script>
<script src="/assets/apply-validation.js"></script>
```

`<body>` 속성: `data-analytics-page-type="application"`

`<main>` 구조:
```html
<main id="main" class="mx-auto max-w-2xl px-5 pb-20 pt-10">
  <div data-apply-form>
    <h1 class="font-display text-3xl font-extrabold tracking-tight" data-i18n="apply.title">Join a meetup</h1>
    <p class="mt-3 text-base leading-7 text-muted" data-i18n="apply.subtitle">
      Takes about 2 minutes. We’ll be in touch within 24 hours to confirm your spot.
    </p>

    <form novalidate class="mt-8 space-y-6" data-apply>
      <!-- 봇만 채운다. 화면에서 감추고 포커스도 받지 않는다. -->
      <div class="hidden" aria-hidden="true">
        <label for="field-website">Website</label>
        <input type="text" id="field-website" name="website" tabindex="-1" autocomplete="off" />
      </div>

      <div>
        <label for="field-eventId" class="block text-sm font-bold text-ink" data-i18n="apply.fields.event">Which meetup?</label>
        <select id="field-eventId" name="eventId" required
                class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base"></select>
      </div>

      <fieldset>
        <legend class="text-sm font-bold text-ink" data-i18n="apply.fields.slot">Which day?</legend>
        <div class="mt-2 space-y-2" data-slot-options></div>
      </fieldset>

      <div>
        <label for="field-guests" class="block text-sm font-bold text-ink" data-i18n="apply.fields.guests">How many people, including you?</label>
        <input type="number" id="field-guests" name="guests" min="1" max="10" value="1" required
               class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base" />
      </div>

      <div>
        <label for="field-name" class="block text-sm font-bold text-ink" data-i18n="apply.fields.name">Full name</label>
        <input type="text" id="field-name" name="name" maxlength="100" required autocomplete="name"
               class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base" />
      </div>

      <div>
        <label for="field-nationality" class="block text-sm font-bold text-ink" data-i18n="apply.fields.nationality">Nationality</label>
        <input type="text" id="field-nationality" name="nationality" maxlength="100" required
               class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base" />
      </div>

      <fieldset>
        <legend class="text-sm font-bold text-ink" data-i18n="apply.fields.koreanLevel">Korean level</legend>
        <div class="mt-2 flex flex-wrap gap-2" data-options="koreanLevel"></div>
      </fieldset>

      <div>
        <label for="field-contactMethod" class="block text-sm font-bold text-ink" data-i18n="apply.fields.contactMethod">How should we reach you?</label>
        <select id="field-contactMethod" name="contactMethod" required
                class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base"></select>
      </div>

      <div>
        <label for="field-contactId" class="block text-sm font-bold text-ink" data-i18n="apply.fields.contactId">Your ID or number there</label>
        <input type="text" id="field-contactId" name="contactId" maxlength="200" required
               class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base" />
      </div>

      <div>
        <label for="field-paymentMethod" class="block text-sm font-bold text-ink" data-i18n="apply.fields.paymentMethod">Preferred payment method</label>
        <select id="field-paymentMethod" name="paymentMethod" required
                class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base"></select>
      </div>

      <div>
        <label for="field-requests" class="block text-sm font-bold text-ink" data-i18n="apply.fields.requests">Anything we should prepare for?</label>
        <textarea id="field-requests" name="requests" rows="3" maxlength="1000"
                  class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base"></textarea>
      </div>

      <div>
        <label for="field-source" class="block text-sm font-bold text-ink" data-i18n="apply.fields.source">How did you hear about us?</label>
        <select id="field-source" name="source"
                class="focusable mt-2 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base"></select>
      </div>

      <div class="rounded-2xl bg-panel p-5">
        <p class="text-xs leading-6 text-muted" data-i18n="apply.privacy"></p>
        <label class="mt-3 flex items-start gap-3 text-sm font-semibold text-ink">
          <input type="checkbox" id="field-consent" name="consent" required class="focusable mt-1 h-5 w-5" />
          <span data-i18n="apply.consentLabel">I agree to the collection and use of my information above.</span>
        </label>
      </div>

      <p class="hidden rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-strong"
         role="alert" data-form-error></p>

      <button type="submit" data-submit
              class="focusable w-full rounded-full bg-primary px-7 py-4 text-base font-bold text-on-primary transition hover:bg-primary-hover active:translate-y-px"
              data-i18n="apply.submit">Send application</button>
    </form>
  </div>

  <div class="hidden" data-apply-done>
    <p class="text-4xl" aria-hidden="true">🎉</p>
    <h1 class="mt-3 font-display text-3xl font-extrabold tracking-tight" data-i18n="apply.done.title">Application received</h1>
    <p class="mt-3 text-base leading-7 text-muted" data-i18n="apply.done.body">
      We’ll be in touch within 24 hours to confirm your spot, the meeting point and payment.
    </p>
    <p class="mt-6 rounded-2xl bg-panel px-5 py-4 text-sm font-semibold text-ink">
      <span data-i18n="apply.done.idLabel">Your application number</span>
      <span class="ml-2 font-display text-base font-extrabold tracking-tight" data-application-id></span>
    </p>
    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href="https://www.instagram.com/hanbuddy_kr/" target="_blank" rel="noopener" data-cta="instagram"
         class="focusable rounded-full border border-line-strong px-6 py-3 text-center text-sm font-bold text-ink"
         data-i18n="apply.done.instagram">DM us on Instagram</a>
      <a href="https://open.kakao.com/o/sP3n4rFi" target="_blank" rel="noopener" data-cta="contact"
         class="focusable rounded-full border border-line-strong px-6 py-3 text-center text-sm font-bold text-ink"
         data-i18n="apply.done.kakao">KakaoTalk open chat</a>
    </div>
  </div>

  <div class="hidden" data-apply-closed>
    <h1 class="font-display text-3xl font-extrabold tracking-tight" data-i18n="apply.closed.title">Next dates are on the way</h1>
    <p class="mt-3 text-base leading-7 text-muted" data-i18n="apply.closed.body">
      Follow us on Instagram and we’ll post the next meetup there first.
    </p>
  </div>
</main>
```

`CONTENT_MAP`에 넣을 `apply` 블록(EN):

```js
apply: {
  title: 'Join a meetup',
  subtitle: 'Takes about 2 minutes. We’ll be in touch within 24 hours to confirm your spot.',
  fields: {
    event: 'Which meetup?',
    slot: 'Which day?',
    guests: 'How many people, including you?',
    name: 'Full name',
    nationality: 'Nationality',
    koreanLevel: 'Korean level',
    contactMethod: 'How should we reach you?',
    contactId: 'Your ID or number there',
    paymentMethod: 'Preferred payment method',
    requests: 'Anything we should prepare for?',
    source: 'How did you hear about us?',
  },
  privacy: 'We collect your name, nationality, Korean level, contact details, payment preference and any requests to run this meetup: confirming your spot, arranging payment, sharing the meeting point, and matching you with a buddy. Your assigned buddy sees what they need for the day. We keep it for 6 months after the meetup, then delete it. You can decline, but we cannot confirm a spot without it. To see or delete your data, email zeroone.soma@gmail.com.',
  consentLabel: 'I agree to the collection and use of my information above.',
  submit: 'Send application',
  sending: 'Sending…',
  errors: {
    generic: 'Something went wrong on our side. Please DM us on Instagram and we’ll sort it out.',
    field: 'Please check this field.',
  },
  done: {
    title: 'Application received',
    body: 'We’ll be in touch within 24 hours to confirm your spot, the meeting point and payment.',
    idLabel: 'Your application number',
    instagram: 'DM us on Instagram',
    kakao: 'KakaoTalk open chat',
  },
  closed: {
    title: 'Next dates are on the way',
    body: 'Follow us on Instagram and we’ll post the next meetup there first.',
  },
},
```

KO 블록:

```js
apply: {
  title: '모임 신청',
  subtitle: '2분이면 됩니다. 24시간 안에 연락드려 자리를 확정해 드립니다.',
  fields: {
    event: '어떤 모임인가요?',
    slot: '어느 날짜인가요?',
    guests: '본인 포함 몇 분인가요?',
    name: '이름',
    nationality: '국적',
    koreanLevel: '한국어 수준',
    contactMethod: '어떻게 연락드릴까요?',
    contactId: '해당 채널의 아이디나 번호',
    paymentMethod: '희망 결제 수단',
    requests: '미리 준비할 것이 있을까요?',
    source: '어떻게 알고 오셨나요?',
  },
  privacy: '이 회차 운영을 위해 이름, 국적, 한국어 수준, 연락처, 희망 결제 수단, 요청사항을 수집합니다. 참가 확인, 결제 안내, 집결 장소 공유, 버디 배정에 사용하며 배정된 버디에게는 당일 필요한 정보만 공유합니다. 행사 종료 후 6개월간 보관한 뒤 파기합니다. 동의를 거부하실 수 있으나 그 경우 자리를 확정해 드릴 수 없습니다. 열람·삭제 요청은 zeroone.soma@gmail.com으로 보내주세요.',
  consentLabel: '위 개인정보 수집·이용에 동의합니다.',
  submit: '신청 보내기',
  sending: '보내는 중…',
  errors: {
    generic: '저희 쪽에서 문제가 생겼습니다. 인스타그램 DM 주시면 바로 처리해 드릴게요.',
    field: '이 항목을 확인해 주세요.',
  },
  done: {
    title: '신청이 접수되었습니다',
    body: '24시간 안에 연락드려 자리를 확정해 드립니다. 집결 장소와 결제도 그때 안내해 드려요.',
    idLabel: '신청 번호',
    instagram: '인스타그램 DM 보내기',
    kakao: '카카오톡 오픈채팅',
  },
  closed: {
    title: '다음 일정을 준비하고 있어요',
    body: '인스타그램을 팔로우하시면 다음 모임을 가장 먼저 알려드립니다.',
  },
},
```

폼 동작 스크립트(페이지 하단 인라인):

```js
const SLOTS = window.HanBuddyEventSlots;
const VALIDATION = window.HanBuddyApplyValidation;

const form = document.querySelector('[data-apply]');
const errorBox = document.querySelector('[data-form-error]');
const prefilledEvent = new URLSearchParams(location.search).get('event');
let startedTracked = false;

const track = (name, params) => window.HanBuddyAnalytics?.trackEvent?.(name, params);

const renderEvents = (copy, language) => {
  const open = SLOTS.openEvents();
  if (open.length === 0) {
    document.querySelector('[data-apply-form]').classList.add('hidden');
    document.querySelector('[data-apply-closed]').classList.remove('hidden');
    return;
  }
  const select = form.elements.eventId;
  select.innerHTML = '';
  open.forEach((event) => {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = `${event.title[language]} · ₩${event.price.toLocaleString()}`;
    select.appendChild(option);
  });
  if (prefilledEvent && open.some((e) => e.id === prefilledEvent)) select.value = prefilledEvent;
  renderSlots(language);
};

const renderSlots = (language) => {
  const container = document.querySelector('[data-slot-options]');
  container.innerHTML = '';
  const event = SLOTS.openEvents().find((e) => e.id === form.elements.eventId.value);
  if (!event) return;
  event.slots.forEach((slot, index) => {
    const label = document.createElement('label');
    label.className = 'focusable flex cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'slotIso';
    input.value = slot.iso;
    input.required = true;
    input.className = 'h-5 w-5';
    if (index === 0) input.checked = true;
    const span = document.createElement('span');
    span.textContent = slot.label[language];
    label.append(input, span);
    container.appendChild(label);
  });
};

const renderChoices = (language) => {
  const container = document.querySelector('[data-options="koreanLevel"]');
  container.innerHTML = '';
  VALIDATION.FIELD_OPTIONS.koreanLevel.forEach((value, index) => {
    const label = document.createElement('label');
    label.className = 'focusable flex cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'koreanLevel';
    input.value = value;
    input.required = true;
    if (index === 0) input.checked = true;
    label.append(input, document.createTextNode(value));
    container.appendChild(label);
  });
  for (const field of ['contactMethod', 'paymentMethod', 'source']) {
    const select = form.elements[field];
    select.innerHTML = '';
    if (field === 'source') select.appendChild(new Option('', ''));
    VALIDATION.FIELD_OPTIONS[field].forEach((value) => select.appendChild(new Option(value, value)));
  }
};

const showFieldError = (field, copy) => {
  const input = form.elements[field];
  errorBox.textContent = copy.apply.errors.field;
  errorBox.classList.remove('hidden');
  if (input) {
    const target = input.length ? input[0] : input;
    target.setAttribute('aria-invalid', 'true');
    target.focus();
  }
  track('application_error', { event_id: form.elements.eventId.value, field });
};

form.addEventListener('input', () => {
  if (startedTracked) return;
  startedTracked = true;
  track('application_start', {
    event_id: form.elements.eventId.value,
    prefilled: Boolean(prefilledEvent),
  });
});

form.elements.eventId.addEventListener('change', () => renderSlots(currentLanguage()));

form.addEventListener('submit', async (submitEvent) => {
  submitEvent.preventDefault();
  const copy = currentCopy();
  errorBox.classList.add('hidden');
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const payload = {
    eventId: form.elements.eventId.value,
    slotIso: form.querySelector('input[name="slotIso"]:checked')?.value || '',
    guests: form.elements.guests.value,
    name: form.elements.name.value,
    nationality: form.elements.nationality.value,
    koreanLevel: form.querySelector('input[name="koreanLevel"]:checked')?.value || '',
    contactMethod: form.elements.contactMethod.value,
    contactId: form.elements.contactId.value,
    paymentMethod: form.elements.paymentMethod.value,
    requests: form.elements.requests.value,
    source: form.elements.source.value,
    website: form.elements.website.value,
    consent: form.elements.consent.checked,
    language: document.documentElement.lang || 'en',
    referrer: document.referrer || '',
  };

  const local = VALIDATION.validateApplication(payload);
  if (!local.ok) return showFieldError(local.field, copy);

  const button = form.querySelector('[data-submit]');
  button.disabled = true;
  button.textContent = copy.apply.sending;

  try {
    const response = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) {
      if (result.code === 'VALIDATION' && result.field) return showFieldError(result.field, copy);
      throw new Error('storage');
    }
    document.querySelector('[data-application-id]').textContent = result.applicationId;
    document.querySelector('[data-apply-form]').classList.add('hidden');
    document.querySelector('[data-apply-done]').classList.remove('hidden');
    window.scrollTo({ top: 0 });
    track('application_submitted', {
      event_id: payload.eventId,
      date_slot: payload.slotIso,
      guests: Number(payload.guests),
      source: payload.source,
      prefilled: Boolean(prefilledEvent),
    });
  } catch {
    errorBox.textContent = copy.apply.errors.generic;
    errorBox.classList.remove('hidden');
  } finally {
    button.disabled = false;
    button.textContent = copy.apply.submit;
  }
});
```

`currentCopy()`·`currentLanguage()`는 페이지의 기존 i18n 스위처가 쓰는 것을 그대로 재사용한다(`index.html`의 `applyContent` 패턴).

⚠️ `window.HanBuddyAnalytics.trackEvent`는 **Task 5에서 노출한다.** 이 태스크 시점에는 아직 없으므로 위 코드의 `?.`가 조용히 통과한다. 폼은 정상 동작하지만 GA 이벤트는 Task 5를 마쳐야 찍히기 시작한다. 종단 확인은 Task 5 이후에 한다.

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `node --test tests/apply-page.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: 인라인 스크립트 문법과 배포 allowlist를 확인한다**

`.vercelignore`에 추가:
```
!/apply
/apply/*
!/apply/index.html
```

Run: `node --test tests/*.test.js`
Expected: 전부 PASS. 특히 `inline-scripts.test.js`가 `apply/index.html`을 자동으로 잡아야 한다(events 디렉터리만 훑으므로 **`publicPages`에 `apply/index.html`을 추가**한다).

`tests/inline-scripts.test.js`의 `publicPages`를 수정:
```js
const publicPages = ['index.html', 'about/index.html', 'apply/index.html', ...eventPages];
```

- [ ] **Step 6: 커밋**

```bash
git add apply/index.html tests/apply-page.test.js tests/inline-scripts.test.js .vercelignore
git commit -m "feat(apply): /apply/ 신청 페이지 추가

이벤트는 ?event=로 프리필하되 바꿀 수 있게 두고, 이벤트를 바꾸면
날짜 선택지를 다시 그린다. 지난 슬롯은 렌더 시 빠지고, 모든 슬롯이
지나면 폼 대신 다음 일정 안내를 보여준다.

완료 화면은 같은 페이지의 상태 전환으로 처리한다. 새로고침하면 빈
폼으로 돌아가고 남의 신청번호가 URL로 새지 않는다."
```

---

### Task 4: 신청 접수 함수

**Files:**
- Create: `api/apply.js`
- Test: `tests/api-apply.test.js`
- Modify: `.vercelignore`, `.gitignore`

**Interfaces:**
- Consumes: Task 2 `validateApplication`
- Produces: `POST /api/apply` → `{ ok: true, applicationId }` / `{ ok: false, code, field? }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/api-apply.test.js`:

```js
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const source = readFileSync(join(__dirname, '..', 'api', 'apply.js'), 'utf8');
const { buildApplicationId, buildRow, safeLog, ALLOWED_LOG_KEYS } = require('../api/apply.js');

test('application id is readable, KST-dated and free of look-alike characters', () => {
  const id = buildApplicationId(Date.parse('2026-08-06T23:30:00+09:00'));
  assert.match(id, /^HB-20260806-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  // 자정 직전 KST는 아직 같은 날이다. UTC로 계산하면 하루 밀린다.
  const late = buildApplicationId(Date.parse('2026-08-06T23:59:00+09:00'));
  assert.ok(late.startsWith('HB-20260806-'));
});

test('the row matches the sheet header order exactly', () => {
  const row = buildRow({
    applicationId: 'HB-20260806-ABCDEF',
    timestampKst: '2026-08-06 21:14:03',
    value: {
      eventId: 'kbo-jamsil',
      eventTitle: 'Open-Air KBO Baseball Night at Jamsil',
      slotIso: '2026-08-15T17:00',
      guests: 2,
      name: 'Julie',
      nationality: 'France',
      koreanLevel: 'Basic',
      contactMethod: 'WhatsApp',
      contactId: '+82 10 0000 0000',
      paymentMethod: 'PayPal',
      requests: '',
      source: 'Instagram',
      language: 'en',
    },
    referrer: 'https://www.hanbuddy.kr/',
  });
  assert.deepEqual(row, [
    '2026-08-06 21:14:03', 'HB-20260806-ABCDEF', 'kbo-jamsil',
    'Open-Air KBO Baseball Night at Jamsil', '2026-08-15 17:00', 2,
    'Julie', 'France', 'Basic', 'WhatsApp', '+82 10 0000 0000', 'PayPal',
    '', 'Instagram', 'en', 'TRUE', 'https://www.hanbuddy.kr/',
  ]);
  assert.equal(row.length, 17);
});

test('logging drops everything except the allowed keys', () => {
  assert.deepEqual(ALLOWED_LOG_KEYS, ['application_id', 'code', 'stage']);
  const line = safeLog({ application_id: 'HB-1', code: 'STORAGE', stage: 'sheet', name: 'Julie', contact_id: '+82' });
  assert.deepEqual(Object.keys(line), ['application_id', 'code', 'stage']);
  assert.equal(JSON.stringify(line).includes('Julie'), false);
});

test('the function never calls console directly', () => {
  // console.log(body) 한 줄이면 신청자 연락처가 Vercel 로그에 평문으로 쌓인다.
  const withoutHelper = source.replace(/const safeLog[\s\S]*?\n\};/, '');
  assert.doesNotMatch(withoutHelper, /console\./, 'use the logging helper, not console directly');
});

test('error responses carry a code but never an internal message', () => {
  assert.match(source, /code: 'VALIDATION'/);
  assert.match(source, /code: 'STORAGE'/);
  assert.doesNotMatch(source, /error\.message|err\.message|String\(error\)/);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/api-apply.test.js`
Expected: FAIL — `ENOENT ... api/apply.js`

- [ ] **Step 3: 함수를 구현한다**

`api/apply.js`:

```js
const crypto = require('node:crypto');
const { validateApplication } = require('../assets/apply-validation.js');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 0·O·1·I를 뺀 32자. 사람이 전화로 불러줄 수 있어야 한다.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const MAX_BODY_BYTES = 16 * 1024;

const ALLOWED_LOG_KEYS = ['application_id', 'code', 'stage'];

// 신청자 필드가 로그로 새지 않도록 허용 키만 통과시킨다.
const safeLog = (fields) => {
  const line = {};
  for (const key of ALLOWED_LOG_KEYS) {
    if (fields[key] !== undefined) line[key] = fields[key];
  }
  return line;
};

const emit = (fields) => {
  process.stdout.write(`${JSON.stringify(safeLog(fields))}\n`);
};

const kstParts = (now) => new Date(now + KST_OFFSET_MS).toISOString();

const buildApplicationId = (now = Date.now()) => {
  const ymd = kstParts(now).slice(0, 10).replace(/-/g, '');
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  // 32는 256의 약수라 나머지 연산에 치우침이 없다.
  for (const byte of bytes) suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `HB-${ymd}-${suffix}`;
};

const buildRow = ({ applicationId, timestampKst, value, referrer }) => [
  timestampKst,
  applicationId,
  value.eventId,
  value.eventTitle,
  value.slotIso.replace('T', ' '),
  value.guests,
  value.name,
  value.nationality,
  value.koreanLevel,
  value.contactMethod,
  value.contactId,
  value.paymentMethod,
  value.requests,
  value.source,
  value.language,
  'TRUE',
  referrer,
];

const base64url = (input) => Buffer.from(input).toString('base64url');

const accessToken = async () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: email,
    scope: SHEET_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signature = crypto.createSign('RSA-SHA256')
    .update(`${header}.${claim}`)
    .sign(key, 'base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error('token');
  const body = await response.json();
  return body.access_token;
};

const appendRow = async (row) => {
  const token = await accessToken();
  const sheetId = process.env.APPLICATIONS_SHEET_ID;
  const tab = process.env.APPLICATIONS_SHEET_TAB || 'applications';
  const range = encodeURIComponent(`${tab}!A:Q`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append`
    + '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!response.ok) throw new Error('sheet');
};

const notifyDiscord = async ({ applicationId, value, sheetFailed }) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('webhook');
  const lines = [
    sheetFailed ? '⚠️ **시트 저장 실패** 아래 내용을 수동으로 옮겨주세요' : '🎉 **새 신청**',
    `\`${applicationId}\``,
    `${value.eventTitle} · ${value.slotIso.replace('T', ' ')} · ${value.guests}명`,
    `${value.name} (${value.nationality}, Korean: ${value.koreanLevel})`,
    `${value.contactMethod}: ${value.contactId}`,
    `결제 희망: ${value.paymentMethod}`,
    value.source ? `유입: ${value.source}` : null,
    value.requests ? `요청: ${value.requests}` : null,
  ].filter(Boolean);
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  });
  if (!response.ok) throw new Error('webhook');
};

const handler = async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ ok: false, code: 'METHOD' });
    return;
  }

  const payload = request.body && typeof request.body === 'object' ? request.body : {};
  if (JSON.stringify(payload).length > MAX_BODY_BYTES) {
    response.status(400).json({ ok: false, code: 'VALIDATION', field: 'requests' });
    return;
  }

  const checked = validateApplication(payload);
  if (!checked.ok) {
    // 봇은 성공처럼 보내고 저장하지 않는다. 실패를 알려주면 우회를 학습한다.
    if (checked.field === 'website') {
      response.status(200).json({ ok: true, applicationId: buildApplicationId() });
      return;
    }
    response.status(400).json({ ok: false, code: 'VALIDATION', field: checked.field });
    return;
  }

  const applicationId = buildApplicationId();
  const timestampKst = kstParts(Date.now()).slice(0, 19).replace('T', ' ');
  const referrer = typeof payload.referrer === 'string' ? payload.referrer.slice(0, 300) : '';
  const row = buildRow({ applicationId, timestampKst, value: checked.value, referrer });

  const [sheet, discord] = await Promise.allSettled([
    appendRow(row),
    notifyDiscord({ applicationId, value: checked.value, sheetFailed: false }),
  ]);

  const sheetFailed = sheet.status === 'rejected';
  const discordFailed = discord.status === 'rejected';

  if (sheetFailed && discordFailed) {
    emit({ application_id: applicationId, code: 'STORAGE', stage: 'both' });
    response.status(500).json({ ok: false, code: 'STORAGE' });
    return;
  }

  if (sheetFailed) {
    // 디스코드에 내용이 남아 수동 복구가 되므로 접수로 처리한다. 여기서
    // 오류를 띄우면 그 사람은 대부분 그냥 이탈한다.
    emit({ application_id: applicationId, code: 'STORAGE', stage: 'sheet' });
    await notifyDiscord({ applicationId, value: checked.value, sheetFailed: true }).catch(() => {});
  }
  if (discordFailed) emit({ application_id: applicationId, code: 'STORAGE', stage: 'discord' });

  response.status(200).json({ ok: true, applicationId });
};

module.exports = handler;
module.exports.buildApplicationId = buildApplicationId;
module.exports.buildRow = buildRow;
module.exports.safeLog = safeLog;
module.exports.ALLOWED_LOG_KEYS = ALLOWED_LOG_KEYS;
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `node --test tests/api-apply.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: 배포 allowlist와 시크릿 방어를 추가한다**

`.vercelignore`:
```
!/api
/api/*
!/api/apply.js
```

`.gitignore`에 추가:
```
.env*
```

Run:
```bash
tmp=$(mktemp -d) && cp .vercelignore "$tmp/.gitignore" && git -C "$tmp" init -q && \
  cp -R index.html about apply api events assets favicon.ico "$tmp/" 2>/dev/null; \
  git -C "$tmp" add -n . 2>/dev/null | grep -E "api/apply.js|apply/index.html"; rm -rf "$tmp"
```
Expected: 두 경로가 모두 출력된다.

- [ ] **Step 6: 배포 누락을 테스트로 막는다**

수동 시뮬레이션은 사람이 잊는다. 이 레포에서 배포 누락은 반복된 사고 유형이므로 테스트로 고정한다.

`tests/deploy-allowlist.test.js`:

```js
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = join(__dirname, '..');

// 빠뜨리면 배포에서 조용히 사라지고 폼이 404를 받는다.
const MUST_DEPLOY = [
  'index.html',
  'favicon.ico',
  'about/index.html',
  'apply/index.html',
  'api/apply.js',
  'assets/analytics.js',
  'assets/event-slots.js',
  'assets/apply-validation.js',
  'events/kbo-gocheok/index.html',
  'events/kbo-jamsil/index.html',
  'events/kleague/index.html',
  'events/hanriver/index.html',
];

test('the Vercel allowlist publishes every file the site needs', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'hanbuddy-deploy-'));
  try {
    writeFileSync(join(sandbox, '.gitignore'), readFileSync(join(root, '.vercelignore')));
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: sandbox }).status, 0);
    for (const path of MUST_DEPLOY) {
      mkdirSync(join(sandbox, dirname(path)), { recursive: true });
      writeFileSync(join(sandbox, path), 'x');
      const ignored = spawnSync('git', ['check-ignore', '--quiet', path], { cwd: sandbox });
      assert.equal(ignored.status, 1, `${path} would be excluded from the deployment`);
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
```

Run: `node --test tests/deploy-allowlist.test.js`
Expected: PASS

검증: `.vercelignore`에서 `!/api/apply.js` 줄을 잠시 지우고 실행하면 `api/apply.js would be excluded from the deployment`로 실패해야 한다. 확인 후 되돌린다.

- [ ] **Step 7: 커밋**

```bash
git add api/apply.js tests/api-apply.test.js tests/deploy-allowlist.test.js .vercelignore .gitignore
git commit -m "feat(apply): 신청 접수 함수 추가

의존성 없이 Node 내장 crypto로 서비스 계정 JWT를 서명해 Sheets에
append하고, 같은 내용을 디스코드로 보낸다. 둘을 병렬로 호출하고
하나만 성공해도 접수로 응답한다. 시트가 실패해도 디스코드에 전문이
남아 수동 복구가 되므로 사용자를 돌려보내지 않는다.

로그에는 application_id·code·stage만 남는다. console을 직접 부르지
않고 허용 키만 통과시키는 헬퍼를 쓰며, 테스트가 이를 강제한다."
```

---

### Task 5: 신청 경로 전환과 문서 갱신

**Files:**
- Modify: `index.html`, `events/kbo-gocheok/index.html`, `events/kbo-jamsil/index.html`, `events/kleague/index.html`, `events/hanriver/index.html`
- Modify: `assets/analytics.js`, `tests/analytics.test.js`, `tests/analytics-schema.test.js`
- Modify: `AGENTS.md`, `README.md`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 3의 `/apply/` 페이지

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/analytics.test.js`에 추가:

```js
test('apply CTAs point at the landing form, not the Google Form', () => {
  const pages = ['index.html', 'events/kbo-gocheok/index.html', 'events/kbo-jamsil/index.html',
    'events/kleague/index.html', 'events/hanriver/index.html'];
  for (const page of pages) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.doesNotMatch(source, /forms\.gle/, `${page} still links the Google Form`);
    assert.match(source, /href="\/apply\//, `${page} must link the landing form`);
  }
  assert.match(analyticsJs, /application_page: '\/apply\/'/);
  assert.doesNotMatch(analyticsJs, /google_form:/);
});

test('pages no longer claim they store nothing', () => {
  for (const page of ['events/kbo-gocheok/index.html', 'events/hanriver/index.html']) {
    const source = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.doesNotMatch(source, /never stores your application answers/);
  }
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/analytics.test.js`
Expected: FAIL — `index.html still links the Google Form`

- [ ] **Step 3: CTA와 카피를 바꾼다**

각 페이지의 신청 링크를 이벤트별 프리필로 교체한다.

| 파일 | 이전 | 이후 |
|---|---|---|
| `index.html` `CONFIG.apply` | `https://forms.gle/B1fWgX3MjtHUHGNt5` | `/apply/` |
| `index.html` 하드코딩 앵커 2곳 | 같은 URL | `/apply/` |
| `events/kbo-gocheok/` 2곳 | 같은 URL | `/apply/?event=kbo-gocheok` |
| `events/kbo-jamsil/` 2곳 | 같은 URL | `/apply/?event=kbo-jamsil` |
| `events/kleague/` 2곳 | 같은 URL | `/apply/?event=kleague` |
| `events/hanriver/` 2곳 | 같은 URL | `/apply/?event=hanriver` |

이벤트 카드는 상세페이지로 가므로 그대로 둔다.

`index.html` 최종 CTA 본문(EN·KO 양쪽):
```
Tell us which event and which day in the Google Form. It takes about 2 minutes.
  ↓
Pick your event and day, and we’ll take it from there. It takes about 2 minutes.
```

`events/*/index.html` 하단 고지:
```
This page never stores your application answers. You apply through the Google Form and we confirm details with you directly.
  ↓
We keep your application only to run this meetup, and delete it 6 months after the day.
```

`assets/analytics.js`:
```js
destinations: Object.freeze({
  application_page: '/apply/',
  instagram: 'https://www.instagram.com/hanbuddy_kr/',
  kakaotalk: 'https://open.kakao.com/o/sP3n4rFi',
}),
```
```js
apply: Object.freeze({
  gaEvent: 'application_form_open',
  destination: 'application_page',
  metaEvent: 'ApplicationFormOpen',
}),
```

`matchesConfiguredDestination`이 상대 경로를 다루도록, `/apply/`로 시작하는 href를 허용한다.

`trackEvent`를 공개 API로 노출한다(폼 페이지가 쓴다):
```js
return { ..., trackEvent: trackGa };
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `node --test tests/*.test.js`
Expected: 전부 PASS

- [ ] **Step 5: 문서를 갱신한다 (스펙 11절)**

`AGENTS.md`:
- OVERVIEW의 `No app framework, package manager, build step, server code, or local data collection exists in this repo` → 앱 프레임워크·패키지 매니저·빌드 스텝은 여전히 없고, `api/apply.js` 한 개의 서버 함수와 신청 수집이 생겼다고 분리 서술
- `Applications run through the live Google Form` → `/apply/`가 1차 경로, 구글폼은 외부 채널용 병행
- STRUCTURE에 `apply/index.html`, `api/apply.js`, `assets/event-slots.js`, `assets/apply-validation.js` 추가
- CONVENTIONS의 `The page intentionally stores no personal information; applications/questions go through external channels only` → 수집·보관(행사 후 6개월)·파기 규칙으로 교체
- Activity names의 접미사 허용 대상에서 "the application form"이 외부 구글폼을 가리켰음을 정정
- COMMANDS의 로컬 프리뷰에 `vercel dev` 추가 (`python3 -m http.server`로는 `/api/`가 돌지 않는다)
- ANTI-PATTERNS에 추가: 서버 로그 개인정보 금지, API 응답에 내부 오류 금지, 서버 파일 추가 시 `.vercelignore` 동시 갱신, 수집 항목 변경 시 고지문 동시 갱신
- Product facts에 24시간 응답 약속 기록
- `Keep this a buildless static site`를 조건부로 개정: 도구 도입에는 기능적 사유가 필요하고 카피·스타일·페이지 추가는 계속 빌드 없이 한다

`README.md`: "빌드 없는 정적 HTML" 서술과 로컬 실행 커맨드 갱신

`DESIGN.md` 5절: 폼 컴포넌트 규격 추가 (입력·라디오·셀렉트·오류 상태·완료 화면)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(apply): 신청 경로를 랜딩 폼으로 전환하고 규약 갱신

CTA 10곳을 /apply/로 돌리고 상세페이지는 이벤트를 프리필한다.
구글폼은 이미 외부에 뿌린 링크가 있어 당분간 살려두되 랜딩에서는
더 이상 가리키지 않는다.

'이 페이지는 신청 내용을 저장하지 않는다'는 고지가 사실이 아니게
되므로 보관 기간 안내로 교체했다. AGENTS.md의 '서버 코드 없음'
서술도 함께 정정했다. 규약에 맞추려 설계를 비틀지 않는다."
```

---

## 배포 전 수동 확인

코드 머지 전에 팀이 끝내야 하는 것들이다. 하나라도 빠지면 폼이 500을 돌려준다.

- [ ] 시트 1행에 헤더 17개 입력 (`timestamp_kst`부터 `referrer`까지, 순서 고정)
- [ ] 시트를 서비스 계정 `client_email`에 **편집자**로 공유 (빠뜨리면 403)
- [ ] 시트 탭 이름이 환경변수 `APPLICATIONS_SHEET_TAB`과 일치 (영문 권장)
- [ ] 디스코드 웹훅이 팀원이 실제로 보는 채널인지 확인 (24시간 약속의 근거)
- [ ] Vercel 환경변수 5개: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `APPLICATIONS_SHEET_ID`, `APPLICATIONS_SHEET_TAB`, `DISCORD_WEBHOOK_URL`
- [ ] 프로덕션에서 실제 제출 1건으로 종단 확인: 시트 기록, 디스코드 알림, 완료 화면, GA 이벤트. 확인 후 시트 테스트 행 삭제
- [ ] GA4에서 `application_submitted`를 키 이벤트로 지정 (이벤트가 1건 이상 수집된 뒤 가능)

## 롤백

`CONFIG.apply`와 하드코딩 앵커를 구글폼 URL로 되돌리면 즉시 원복된다. `/apply/`와 함수는 남겨둬도 무해하다.
