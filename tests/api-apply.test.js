const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const source = readFileSync(join(__dirname, '..', 'api', 'apply.js'), 'utf8');

// 실제 상한(3초)을 기다리면 스위트가 그만큼 느려진다. 모듈을 읽기 전에 줄이되,
// 전체 스위트의 병렬 프로세스 부하로 정상 요청이 우연히 마감되지 않을 여유는 둔다.
process.env.APPLY_REQUEST_TIMEOUT_MS = '200';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = require('node:crypto')
  .generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
  .replace(/\n/g, '\\n');
process.env.APPLICATIONS_SHEET_ID = 'test-sheet';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/webhook';

const handler = require('../api/apply.js');
const { findEvent, openDates } = require('../assets/event-slots.js');

// 핸들러는 now를 받지 않고 Date.now()로 판정하므로, 고정 시각을 넘겨 맞출 수가 없다.
// 야구 회차를 쓰면 리그 일정이 떨어진 날부터 열린 슬롯이 없어 이 스위트가
// 통째로 죽는다(신청 API의 문제가 아닌데도). 언제 돌려도 날짜가 있는 상시 오픈
// 회차를 쓴다. 고정 슬롯 경로는 apply-validation 테스트가 따로 덮는다.
const openFoodSlot = () => openDates(findEvent('samgyeopsal'))[0].iso;
const { buildRow, safeLog, ALLOWED_LOG_KEYS } = handler;

const application = () => ({
  eventId: 'samgyeopsal', slotIso: openFoodSlot(), guests: '1', name: 'Test',
  nationality: 'France', contactMethod: 'WhatsApp', contactId: 'x',
  requests: '', source: '', consent: true, language: 'en',
});
const IDEMPOTENCY_KEY = 'HB-20260901-ABCDEFGHJKLMNPQR';
const applicationRequest = (body = application(), key = IDEMPOTENCY_KEY) => ({
  method: 'POST',
  headers: { 'idempotency-key': key },
  body,
});
const apiResponse = () => ({
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});
const sheetSnapshot = (rows) => {
  let lastUsed = rows.length - 1;
  while (lastUsed >= 0 && rows[lastUsed].length === 0) lastUsed -= 1;
  return rows.slice(0, lastUsed + 1).map((row) => [...row]);
};
const appendLikeSheets = (rows, row) => {
  let lastUsed = rows.length - 1;
  while (lastUsed >= 0 && rows[lastUsed].length === 0) lastUsed -= 1;
  const rowIndex = lastUsed + 1;
  rows[rowIndex] = row;
  return rowIndex + 1;
};
const jsonResponse = (body) => ({ ok: true, json: async () => body });
const clearRowNumberFrom = (target) => {
  const match = /!A(\d+):Q\1:clear$/.exec(target);
  assert.ok(match, `clear range must target one A:Q row: ${target}`);
  return Number(match[1]);
};
const withFetch = async (fetchStub, callback) => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  try {
    return await callback();
  } finally {
    globalThis.fetch = previousFetch;
  }
};
const createBarrier = (parties) => {
  let arrivals = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  return {
    async arrive() {
      arrivals += 1;
      if (arrivals === parties) release();
      if (arrivals <= parties) await pending;
    },
  };
};
const createDeferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const createSheetHarness = ({
  rows = [],
  onLookup,
  onAppend,
  onClear,
  onDiscord,
} = {}) => {
  const calls = { append: 0, clear: 0, discord: 0, sheetSignals: [] };
  const discordBodies = [];

  const fetch = async (url, init = {}) => {
    const target = decodeURIComponent(String(url));
    if (target.includes('oauth2')) {
      return jsonResponse({ access_token: 'stub' });
    }
    if (target.includes('discord')) {
      calls.discord += 1;
      const body = JSON.parse(init.body);
      discordBodies.push(body);
      return onDiscord ? onDiscord({ body, calls, init, target }) : { ok: true };
    }
    if (!target.includes('sheets.googleapis.com')) {
      throw new Error(`unexpected URL: ${target}`);
    }

    calls.sheetSignals.push(init.signal);
    if (init.method === 'GET') {
      const snapshot = sheetSnapshot(rows);
      if (onLookup) return onLookup({ calls, init, rows, snapshot, target });
      return jsonResponse({ values: snapshot });
    }
    if (target.endsWith(':clear')) {
      calls.clear += 1;
      const rowNumber = clearRowNumberFrom(target);
      const clearDefault = () => {
        rows[rowNumber - 1] = [];
        return jsonResponse({});
      };
      if (onClear) return onClear({ calls, clearDefault, init, rowNumber, rows, target });
      return clearDefault();
    }

    calls.append += 1;
    const row = JSON.parse(init.body).values[0];
    const appendDefault = () => {
      const rowNumber = appendLikeSheets(rows, row);
      return jsonResponse({
        updates: { updatedRange: `applications!A${rowNumber}:Q${rowNumber}` },
      });
    };
    if (onAppend) return onAppend({ appendDefault, calls, init, row, rows, target });
    return appendDefault();
  };

  return { calls, discordBodies, fetch, rows };
};

test('the row matches the sheet header order exactly', () => {
  const row = buildRow({
    applicationId: 'HB-20260806-ABCDEF',
    timestampKst: '2026-08-06 21:14:03',
    value: {
      eventId: 'kbo-jamsil',
      eventTitle: 'Open-Air KBO Baseball Night',
      slotIso: '2026-08-15T17:00',
      guests: 2,
      name: 'Julie',
      nationality: 'France',
      contactMethod: 'WhatsApp',
      contactId: '+82 10 0000 0000',
      requests: '',
      source: 'Instagram',
      language: 'en',
    },
  });
  assert.deepEqual(row, [
    '2026-08-06 21:14:03', 'HB-20260806-ABCDEF', 'kbo-jamsil',
    'Open-Air KBO Baseball Night', '2026-08-15 17:00', 2,
    // 9·12·17열은 더 이상 묻지 않는 한국어 수준·결제 수단·referrer 자리다.
    // 비워 두어야 이미 쌓인 신청 행과 열이 어긋나지 않는다.
    'Julie', 'France', '', 'WhatsApp', '+82 10 0000 0000', '',
    '', 'Instagram', 'en', 'TRUE', '',
  ]);
  assert.equal(row.length, 17);
});

test('the API ignores a client-supplied referrer when appending the sheet row', async () => {
  let sheetBody = null;
  const sheet = createSheetHarness({
    onAppend: ({ appendDefault, init }) => {
      sheetBody = JSON.parse(init.body);
      return appendDefault();
    },
  });

  const response = apiResponse();
  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest({
      ...application(),
      referrer: 'https://www.hanbuddy.kr/?utm_source=private&utm_campaign=julie@example.com',
    }), response);
  });

  assert.equal(response.code, 200);
  assert.ok(sheetBody, 'the Sheet append request must be captured');
  assert.equal(sheetBody.values[0].length, 17);
  assert.equal(sheetBody.values[0][16], '');
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

test('the API rejects a missing or malformed idempotency key before storage', async () => {
  let fetches = 0;
  const fetchStub = async () => {
    fetches += 1;
    return { ok: true };
  };
  const response = apiResponse();

  await withFetch(fetchStub, async () => {
    await handler(applicationRequest(application(), 'not-a-key'), response);
  });

  assert.equal(response.code, 400);
  assert.deepEqual(response.body, { ok: false, code: 'VALIDATION' });
  assert.equal(fetches, 0);
});

test('two overlapping same-key requests reconcile to one row and at most one notification', async () => {
  const rows = [Array.from({ length: 17 }, (_value, index) => `header-${index + 1}`)];
  const lookupBarrier = createBarrier(2);
  const appendBarrier = createBarrier(2);
  const sheet = createSheetHarness({
    rows,
    onLookup: async ({ snapshot }) => {
      await lookupBarrier.arrive();
      return jsonResponse({ values: snapshot });
    },
    onAppend: async ({ appendDefault }) => {
      const result = appendDefault();
      await appendBarrier.arrive();
      return result;
    },
  });

  const responses = [apiResponse(), apiResponse()];
  await withFetch(sheet.fetch, async () => {
    await Promise.all(responses.map((response) => handler(applicationRequest(), response)));
  });

  assert.deepEqual(responses.map(({ code }) => code).sort((left, right) => left - right), [200, 500],
    'the canonical owner succeeds; an overlapping nonowner may fail closed');
  assert.equal(sheet.calls.append, 2, 'the barrier proves both requests passed the initial lookup');
  assert.equal(sheet.calls.clear, 1, 'only the canonical owner may clear the noncanonical row');
  assert.equal(rows.filter((row) => row[1] === IDEMPOTENCY_KEY).length, 1);
  assert.equal(rows[1][1], IDEMPOTENCY_KEY, 'the lowest matching row remains canonical');
  assert.deepEqual(rows[2], [], 'the later row is cleared rather than deleting or shifting rows');
  assert.ok(sheet.calls.discord <= 1, 'only the caller owning the lowest row may notify');
  const signalCounts = [...new Set(sheet.calls.sheetSignals)]
    .map((signal) => sheet.calls.sheetSignals.filter((candidate) => candidate === signal).length);
  assert.equal(signalCounts.length, 2, 'each concurrent invocation owns one Sheet deadline');
  assert.ok(signalCounts.every((count) => count >= 3),
    'each invocation reuses its deadline across lookup, append, and reconciliation');
});

test('the canonical owner waits for each duplicate clear before issuing the next one', async () => {
  const rows = [Array.from({ length: 17 }, (_value, index) => `header-${index + 1}`)];
  const initialLookupBarrier = createBarrier(3);
  const appendBarrier = createBarrier(3);
  const postAppendLookupBarrier = createBarrier(3);
  const firstClearStarted = createDeferred();
  const allowFirstClear = createDeferred();
  const sheet = createSheetHarness({
    rows,
    onLookup: async ({ snapshot }) => {
      const matches = snapshot.filter((row) => row[1] === IDEMPOTENCY_KEY).length;
      if (matches === 0) await initialLookupBarrier.arrive();
      else if (matches === 3) await postAppendLookupBarrier.arrive();
      return jsonResponse({ values: snapshot });
    },
    onClear: async ({ calls, clearDefault }) => {
      if (calls.clear === 1) {
        firstClearStarted.resolve();
        await allowFirstClear.promise;
      }
      return clearDefault();
    },
    onAppend: async ({ appendDefault }) => {
      const result = appendDefault();
      await appendBarrier.arrive();
      return result;
    },
  });

  const responses = [apiResponse(), apiResponse(), apiResponse()];
  await withFetch(sheet.fetch, async () => {
    const requests = responses.map((response) => handler(applicationRequest(), response));
    try {
      await firstClearStarted.promise;
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(sheet.calls.clear, 1,
        'no second clear may be outstanding while the first clear response is pending');
      allowFirstClear.resolve();
      await Promise.all(requests);

      assert.equal(sheet.calls.clear, 2);
      assert.deepEqual(
        responses.map(({ code }) => code).sort((left, right) => left - right),
        [200, 500, 500],
      );
      assert.equal(rows.filter((row) => row[1] === IDEMPOTENCY_KEY).length, 1);
      assert.equal(sheet.calls.discord, 1);
    } finally {
      allowFirstClear.resolve();
      await Promise.allSettled(requests);
    }
  });
});

test('a stale reconciler cannot clear a trailing row reused by another accepted application', async () => {
  const otherKey = 'HB-20260901-RQP98765432NMLKJ';
  const rows = [Array.from({ length: 17 }, (_value, index) => `header-${index + 1}`)];
  const initialLookupBarrier = createBarrier(2);
  const appendBarrier = createBarrier(2);
  const postAppendLookupBarrier = createBarrier(2);
  const firstClearApplied = createDeferred();
  const allowLaterClears = createDeferred();
  const sheet = createSheetHarness({
    rows,
    onLookup: async ({ snapshot }) => {
      const sameKeyRows = snapshot.filter((row) => row[1] === IDEMPOTENCY_KEY).length;
      if (sameKeyRows === 0) await initialLookupBarrier.arrive();
      else if (sameKeyRows === 2) await postAppendLookupBarrier.arrive();
      return jsonResponse({ values: snapshot });
    },
    onClear: async ({ calls, clearDefault }) => {
      if (calls.clear > 1) await allowLaterClears.promise;
      const result = clearDefault();
      if (calls.clear === 1) firstClearApplied.resolve();
      return result;
    },
    onAppend: async ({ appendDefault, row }) => {
      const result = appendDefault();
      if (row[1] === IDEMPOTENCY_KEY) await appendBarrier.arrive();
      return result;
    },
  });

  const duplicateResponses = [apiResponse(), apiResponse()];
  await withFetch(sheet.fetch, async () => {
    const duplicateRequests = duplicateResponses
      .map((response) => handler(applicationRequest(), response));
    try {
      await firstClearApplied.promise;
      const otherResponse = apiResponse();
      await handler(applicationRequest({ ...application(), contactId: 'other' }, otherKey), otherResponse);
      allowLaterClears.resolve();
      await Promise.all(duplicateRequests);

      const notifications = sheet.discordBodies.map(({ content }) => content);
      assert.equal(otherResponse.code, 200);
      assert.equal(otherResponse.body.applicationId, otherKey);
      assert.equal(rows.filter((row) => row[1] === otherKey).length, 1,
        'the unrelated accepted row must survive every duplicate cleanup attempt');
      assert.equal(notifications.filter((message) => message.includes(otherKey)).length, 1,
        'the unrelated owner sends exactly one correct notification');
      assert.deepEqual(
        duplicateResponses.map(({ code }) => code).sort((left, right) => left - right),
        [200, 500],
      );
      assert.equal(notifications.filter((message) => message.includes(IDEMPOTENCY_KEY)).length, 1);
      assert.equal(sheet.calls.clear, 1, 'no stale nonowner clear remains outstanding');
    } finally {
      allowLaterClears.resolve();
    }
  });
});

test('append response loss can confirm storage but never claims notification ownership', async () => {
  const rows = [Array.from({ length: 17 }, (_value, index) => `header-${index + 1}`)];
  const sheet = createSheetHarness({
    rows,
    onAppend: ({ appendDefault }) => {
      appendDefault();
      throw new Error('append response lost after storage');
    },
  });

  const first = apiResponse();
  const retry = apiResponse();
  const edited = apiResponse();
  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest(), first);
    await handler(applicationRequest(), retry);
    await handler(applicationRequest({ ...application(), contactId: 'edited-after-loss' }), edited);
  });

  assert.equal(first.code, 200, 'confirmed durable storage survives response loss');
  assert.deepEqual(retry.body, first.body, 'a sequential retry returns the stored result');
  assert.equal(edited.code, 409, 'editing after an ambiguous response cannot claim the old receipt');
  assert.deepEqual(edited.body, { ok: false, code: 'CONFLICT' });
  assert.equal(sheet.calls.append, 1);
  assert.equal(sheet.calls.discord, 0, 'neither unknown ownership nor a prior-row retry may notify');
});

test('an idempotency key is bound to its first normalized C:Q payload', async () => {
  const rows = [Array.from({ length: 17 }, (_value, index) => `header-${index + 1}`)];
  const sheet = createSheetHarness({
    rows,
    onClear: () => {
      throw new Error('no duplicate row should exist in this test');
    },
  });

  const first = apiResponse();
  const changed = apiResponse();
  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest(), first);
    await handler(applicationRequest({ ...application(), contactId: 'edited-after-timeout' }), changed);
  });

  assert.equal(first.code, 200);
  assert.equal(changed.code, 409);
  assert.deepEqual(changed.body, { ok: false, code: 'CONFLICT' });
  assert.equal(sheet.calls.append, 1, 'a conflicting sequential retry is rejected before append');
  assert.equal(sheet.calls.discord, 1, 'only the original stored application is notified');
  assert.equal(rows.filter((row) => row[1] === IDEMPOTENCY_KEY).length, 1);
});

test('unproven duplicate cleanup fails closed without Discord notification', async () => {
  const canonical = buildRow({
    applicationId: IDEMPOTENCY_KEY,
    timestampKst: '2026-09-01 10:00:00',
    value: require('../assets/apply-validation.js').validateApplication(application()).value,
  });
  const rows = [canonical, [...canonical]];
  const sheet = createSheetHarness({
    rows,
    onAppend: () => ({ ok: true }),
    onClear: () => ({ ok: false }),
  });

  const response = apiResponse();
  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest(), response);
  });

  assert.equal(response.code, 500);
  assert.deepEqual(response.body, { ok: false, code: 'STORAGE' });
  assert.equal(sheet.calls.append, 0);
  assert.equal(sheet.calls.clear, 0, 'a retry without updatedRange ownership preserves stale duplicates');
  assert.equal(rows.length, 2);
  assert.equal(sheet.calls.discord, 0);
});

test('a lost-response retry returns the prior result without appending or notifying again', async () => {
  const sheet = createSheetHarness();
  const firstResponse = apiResponse();
  const retryResponse = apiResponse();

  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest(), firstResponse);
    // The caller never receives firstResponse and retries the same logical submission.
    await handler(applicationRequest(), retryResponse);
  });

  assert.equal(firstResponse.code, 200);
  assert.deepEqual(retryResponse.body, firstResponse.body);
  assert.equal(firstResponse.body.applicationId, IDEMPOTENCY_KEY);
  assert.equal(sheet.calls.append, 1);
  assert.equal(sheet.calls.discord, 1);
});

test('a hung durable storage call fails within its deadline without sending a duplicate-prone notification', async () => {
  // 시트 확인 전에 Discord로 보내면 durable idempotency record가 없다. 재시도마다
  // 알림이 다시 가므로, 마감 안에 시트를 확인하지 못한 요청은 부작용 없이 실패한다.
  // AbortSignal.timeout의 타이머는 unref이라 이벤트 루프를 잡지 않는다. 실제
  // fetch는 소켓이 잡아주지만 이 스텁에는 없으므로 인위적으로 붙인다.
  const keepAlive = setInterval(() => {}, 20);
  let discordCalls = 0;
  const fetchStub = (url, init) => {
    if (String(url).includes('discord')) {
      discordCalls += 1;
      return Promise.resolve({ ok: true });
    }
    return new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  };

  const response = apiResponse();
  try {
    await withFetch(fetchStub, () => handler(applicationRequest(), response));
  } finally {
    clearInterval(keepAlive);
  }

  assert.equal(response.code, 500);
  assert.deepEqual(response.body, { ok: false, code: 'STORAGE' });
  assert.equal(discordCalls, 0);
});

test('the whole sheet path shares one deadline, not one per hop', async () => {
  // OAuth와 중복 조회가 마감 직전에 성공한 뒤 append가 멈추는 경우가 진짜 위험한 모양이다.
  // 홉마다 새 마감을 만들면 최악의 대기가 홉 수만큼 곱해지고, 나중에 홉이
  // 하나 늘면 상한이 조용히 따라 늘어난다.
  const keepAlive = setInterval(() => {}, 20);
  const signals = [];
  const fetchStub = (url, init) => {
    const target = String(url);
    if (target.includes('discord')) return Promise.resolve({ ok: true });
    const hop = target.includes('oauth2') ? 'token' : (init.method === 'GET' ? 'lookup' : 'append');
    signals.push({ hop, signal: init.signal });
    if (target.includes('oauth2')) {
      return new Promise((resolve) => setTimeout(() => resolve({
        ok: true, json: async () => ({ access_token: 'late-but-valid' }),
      }), 10));
    }
    if (init.method === 'GET') {
      return new Promise((resolve) => setTimeout(() => resolve({
        ok: true, json: async () => ({ values: [] }),
      }), 10));
    }
    return new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  };

  const response = apiResponse();
  try {
    await withFetch(fetchStub, () => handler(applicationRequest(), response));
  } finally {
    clearInterval(keepAlive);
  }

  assert.deepEqual(signals.map((entry) => entry.hop), ['token', 'lookup', 'append', 'lookup'],
    'append failure must be checked once without extending the sheet deadline');
  assert.ok(signals.every((entry) => entry.signal === signals[0].signal),
    'all sheet hops must carry the same deadline signal');
  assert.equal(response.code, 500);
});

test('applicant text cannot ping the whole Discord server', async () => {
  // 요청사항은 자유 입력이고 그대로 알림에 실린다. 멘션을 끄지 않으면
  // "@everyone" 한 줄로 팀 전원을 호출할 수 있다.
  const sheet = createSheetHarness();

  const response = apiResponse();
  await withFetch(sheet.fetch, async () => {
    await handler(applicationRequest({ ...application(), requests: '@everyone please read' }), response);
  });

  const [webhookBody] = sheet.discordBodies;
  assert.equal(response.code, 200);
  assert.ok(webhookBody.content.includes('@everyone'), 'the text still reaches the team, it just cannot ping');
  assert.deepEqual(webhookBody.allowed_mentions, { parse: [] });
});
