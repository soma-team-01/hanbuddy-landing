const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const source = readFileSync(join(__dirname, '..', 'api', 'suggest.js'), 'utf8');

// 실제 상한(3초)을 기다리면 스위트가 그만큼 느려진다. 모듈을 읽기 전에 줄인다.
process.env.SUGGEST_REQUEST_TIMEOUT_MS = '40';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = require('node:crypto')
  .generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
  .replace(/\n/g, '\\n');
process.env.APPLICATIONS_SHEET_ID = 'test-sheet';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/webhook';

const handler = require('../api/suggest.js');
const { buildSuggestionId, buildRow, safeLog, ALLOWED_LOG_KEYS } = handler;

const suggestion = () => ({
  activity: 'Noraebang night',
  contact: '@hanbuddy_fan',
  website: '',
  language: 'en',
});

const makeResponse = () => ({
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('suggestion id is readable, KST-dated and free of look-alike characters', () => {
  const id = buildSuggestionId(Date.parse('2026-08-10T23:30:00+09:00'));
  assert.match(id, /^HBS-20260810-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  // 자정 직전 KST는 아직 같은 날이다. UTC로 계산하면 하루 밀린다.
  const late = buildSuggestionId(Date.parse('2026-08-10T23:59:00+09:00'));
  assert.ok(late.startsWith('HBS-20260810-'));
});

test('the row matches the suggestions sheet header order exactly', () => {
  const row = buildRow({
    suggestionId: 'HBS-20260810-ABCDEF',
    timestampKst: '2026-08-10 21:14:03',
    value: { activity: 'Noraebang night', contact: '@julie', language: 'en' },
  });
  assert.deepEqual(row, [
    '2026-08-10 21:14:03', 'HBS-20260810-ABCDEF', 'Noraebang night', '@julie', 'en',
  ]);
  assert.equal(row.length, 5);
});

test('non-POST methods are rejected', async () => {
  const response = makeResponse();
  await handler({ method: 'GET' }, response);
  assert.equal(response.code, 405);
});

test('a filled honeypot looks like success but stores nothing', async () => {
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; return Promise.resolve({ ok: true }); };

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: { ...suggestion(), website: 'spam' } }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 200);
  assert.equal(response.body.ok, true);
  assert.equal(fetchCalls, 0, 'a bot submission must never reach storage');
});

test('validation failures return the field without touching storage', async () => {
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; return Promise.resolve({ ok: true }); };

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: { ...suggestion(), activity: '' } }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 400);
  assert.deepEqual(response.body, { ok: false, code: 'VALIDATION', field: 'activity' });
  assert.equal(fetchCalls, 0);
});

test('a successful submission appends the row and notifies Discord', async () => {
  const previousFetch = globalThis.fetch;
  let sheetBody = null;
  let webhookBody = null;
  globalThis.fetch = (url, init) => {
    const target = String(url);
    if (target.includes('oauth2')) {
      return Promise.resolve({ ok: true, json: async () => ({ access_token: 'stub' }) });
    }
    if (target.includes('sheets.googleapis.com')) {
      sheetBody = JSON.parse(init.body);
      return Promise.resolve({ ok: true });
    }
    if (target.includes('discord')) {
      webhookBody = JSON.parse(init.body);
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: true });
  };

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: suggestion() }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 200);
  assert.match(response.body.suggestionId, /^HBS-\d{8}-/);
  assert.equal(sheetBody.values[0].length, 5);
  assert.equal(sheetBody.values[0][2], 'Noraebang night');
  assert.ok(webhookBody.content.includes('Noraebang night'));
});

test('suggester text cannot ping the whole Discord server', async () => {
  // 활동 칸은 자유 입력이고 그대로 알림에 실린다. 멘션을 끄지 않으면
  // "@everyone" 한 줄로 팀 전원을 호출할 수 있다.
  const previousFetch = globalThis.fetch;
  let webhookBody = null;
  globalThis.fetch = (url, init) => {
    if (String(url).includes('discord')) {
      webhookBody = JSON.parse(init.body);
      return Promise.resolve({ ok: true });
    }
    if (String(url).includes('oauth2')) {
      return Promise.resolve({ ok: true, json: async () => ({ access_token: 'stub' }) });
    }
    return Promise.resolve({ ok: true });
  };

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: { ...suggestion(), activity: '@everyone party' } }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.deepEqual(webhookBody.allowed_mentions, { parse: [] });
});

test('a hung sheet call cannot hold the suggester hostage when Discord succeeded', async () => {
  const previousFetch = globalThis.fetch;
  // AbortSignal.timeout의 타이머는 unref이라 이벤트 루프를 잡지 않는다. 실제
  // fetch는 소켓이 잡아주지만 이 스텁에는 없으므로 인위적으로 붙인다.
  const keepAlive = setInterval(() => {}, 20);
  globalThis.fetch = (url, init) => {
    if (String(url).includes('discord')) return Promise.resolve({ ok: true });
    return new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  };

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: suggestion() }, response);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 200, 'discord succeeded, so this is an accepted suggestion');
  assert.match(response.body.suggestionId, /^HBS-\d{8}-/);
});

test('when both stores fail the suggester sees a storage error', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve({ ok: false });

  const response = makeResponse();
  try {
    await handler({ method: 'POST', body: suggestion() }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 500);
  assert.deepEqual(response.body, { ok: false, code: 'STORAGE' });
});

test('logging drops everything except the allowed keys', () => {
  assert.deepEqual(ALLOWED_LOG_KEYS, ['suggestion_id', 'code', 'stage']);
  const line = safeLog({ suggestion_id: 'HBS-1', code: 'STORAGE', stage: 'sheet', activity: 'secret', contact: '@x' });
  assert.deepEqual(Object.keys(line), ['suggestion_id', 'code', 'stage']);
  assert.equal(JSON.stringify(line).includes('secret'), false);
});

test('the function never calls console directly', () => {
  // console.log(body) 한 줄이면 제안자 연락처가 Vercel 로그에 평문으로 쌓인다.
  const withoutHelper = source.replace(/const safeLog[\s\S]*?\n\};/, '');
  assert.doesNotMatch(withoutHelper, /console\./, 'use the logging helper, not console directly');
});

test('error responses carry a code but never an internal message', () => {
  assert.match(source, /code: 'VALIDATION'/);
  assert.match(source, /code: 'STORAGE'/);
  assert.doesNotMatch(source, /error\.message|err\.message|String\(error\)/);
});
