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
