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
const { buildApplicationId, buildRow, safeLog, ALLOWED_LOG_KEYS } = handler;

const application = () => ({
  eventId: 'kbo-jamsil', slotIso: '2026-08-15T17:00', guests: '1', name: 'Test',
  nationality: 'France', koreanLevel: 'None', contactMethod: 'WhatsApp', contactId: 'x',
  paymentMethod: 'Cash', requests: '', source: '', consent: true, language: 'en',
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
