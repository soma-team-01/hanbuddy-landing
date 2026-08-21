const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const source = readFileSync(join(__dirname, '..', 'api', 'apply.js'), 'utf8');

// 실제 상한(3초)을 기다리면 스위트가 그만큼 느려진다. 모듈을 읽기 전에 줄인다.
process.env.APPLY_REQUEST_TIMEOUT_MS = '40';
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
const { buildApplicationId, buildRow, safeLog, ALLOWED_LOG_KEYS } = handler;

const application = () => ({
  eventId: 'samgyeopsal', slotIso: openFoodSlot(), guests: '1', name: 'Test',
  nationality: 'France', contactMethod: 'WhatsApp', contactId: 'x',
  requests: '', source: '', consent: true, language: 'en',
});

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
  const previousFetch = globalThis.fetch;
  let sheetBody = null;
  globalThis.fetch = (url, init) => {
    const target = String(url);
    if (target.includes('oauth2')) {
      return Promise.resolve({ ok: true, json: async () => ({ access_token: 'stub' }) });
    }
    if (target.includes('sheets.googleapis.com')) {
      sheetBody = JSON.parse(init.body);
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: true });
  };

  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await handler({
      method: 'POST',
      body: {
        ...application(),
        referrer: 'https://www.hanbuddy.kr/?utm_source=private&utm_campaign=julie@example.com',
      },
    }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

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

test('a hung storage call cannot hold the applicant hostage', async () => {
  // 상한이 없으면 시트가 응답하지 않을 때 Promise.allSettled가 끝나지 않는다.
  // 디스코드가 이미 성공했는데도 신청자는 함수가 강제 종료될 때까지 기다리다
  // 오류 화면을 보게 된다. 접수는 된 상태라 가장 나쁜 조합이다.
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

  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await handler({ method: 'POST', body: application() }, response);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 200, 'discord succeeded, so this is an accepted application');
  assert.equal(response.body.ok, true);
  assert.match(response.body.applicationId, /^HB-\d{8}-/);
});

test('the whole sheet path shares one deadline, not one per hop', async () => {
  // OAuth가 마감 직전에 성공한 뒤 append가 멈추는 경우가 진짜 위험한 모양이다.
  // 홉마다 새 마감을 만들면 최악의 대기가 홉 수만큼 곱해지고, 나중에 홉이
  // 하나 늘면 상한이 조용히 따라 늘어난다.
  const previousFetch = globalThis.fetch;
  const keepAlive = setInterval(() => {}, 20);
  const signals = [];
  globalThis.fetch = (url, init) => {
    const target = String(url);
    if (target.includes('discord')) return Promise.resolve({ ok: true });
    signals.push({ hop: target.includes('oauth2') ? 'token' : 'append', signal: init.signal });
    if (target.includes('oauth2')) {
      // 마감 직전에 간신히 성공한다.
      return new Promise((resolve) => setTimeout(() => resolve({
        ok: true, json: async () => ({ access_token: 'late-but-valid' }),
      }), 30));
    }
    return new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  };

  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await handler({ method: 'POST', body: application() }, response);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = previousFetch;
  }

  assert.deepEqual(signals.map((entry) => entry.hop), ['token', 'append'], 'both sheet hops must run');
  assert.equal(signals[0].signal, signals[1].signal, 'both hops must carry the same deadline signal');
  // 시트는 마감에 걸렸지만 디스코드가 받았으므로 접수다.
  assert.equal(response.code, 200);
});

test('applicant text cannot ping the whole Discord server', async () => {
  // 요청사항은 자유 입력이고 그대로 알림에 실린다. 멘션을 끄지 않으면
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

  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await handler({ method: 'POST', body: { ...application(), requests: '@everyone please read' } }, response);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(response.code, 200);
  assert.ok(webhookBody.content.includes('@everyone'), 'the text still reaches the team, it just cannot ping');
  assert.deepEqual(webhookBody.allowed_mentions, { parse: [] });
});
