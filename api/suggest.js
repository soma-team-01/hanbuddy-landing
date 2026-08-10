const crypto = require('node:crypto');
const { validateSuggestion } = require('../assets/suggest-validation.js');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 0·O·1·I를 뺀 32자. 사람이 전화로 불러줄 수 있어야 한다.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const MAX_BODY_BYTES = 4 * 1024;
// 시트 경로는 토큰 발급과 append 두 번을 순서대로 타므로, 상한은 그 합이 함수
// 실행 한도 안에 들어오게 잡는다. 환경변수는 테스트가 기다리지 않게 하려는 것이다.
const REQUEST_TIMEOUT_MS = Number(process.env.SUGGEST_REQUEST_TIMEOUT_MS) || 3000;

const ALLOWED_LOG_KEYS = ['suggestion_id', 'code', 'stage'];

// 제안자 필드가 로그로 새지 않도록 허용 키만 통과시킨다.
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

const buildSuggestionId = (now = Date.now()) => {
  const ymd = kstParts(now).slice(0, 10).replace(/-/g, '');
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  // 32는 256의 약수라 나머지 연산에 치우침이 없다.
  for (const byte of bytes) suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `HBS-${ymd}-${suffix}`;
};

const buildRow = ({ suggestionId, timestampKst, value }) => [
  timestampKst,
  suggestionId,
  value.activity,
  value.dates,
  value.contact,
  value.language,
];

const base64url = (input) => Buffer.from(input).toString('base64url');

// 상한이 없으면 시트가 응답하지 않을 때 Promise.allSettled가 끝나지 않는다.
// 마감은 홉마다가 아니라 저장 경로마다 하나씩 만든다.
const deadline = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS);

const accessToken = async (signal) => {
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
    signal,
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

const appendRow = async (row, signal) => {
  const token = await accessToken(signal);
  const sheetId = process.env.APPLICATIONS_SHEET_ID;
  const tab = process.env.SUGGESTIONS_SHEET_TAB || 'suggestions';
  const range = encodeURIComponent(`${tab}!A:F`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append`
    + '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!response.ok) throw new Error('sheet');
};

const notifyDiscord = async ({ suggestionId, value, sheetFailed, signal }) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('webhook');
  const lines = [
    sheetFailed ? '⚠️ **시트 저장 실패** 아래 내용을 수동으로 옮겨주세요' : '💡 **새 활동 제안**',
    `\`${suggestionId}\``,
    `활동: ${value.activity}`,
    `날짜: ${value.dates}`,
    value.contact ? `연락처: ${value.contact} (팔로업 가능)` : '연락처 없음',
    `언어: ${value.language}`,
  ];
  const response = await fetch(webhook, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    // 제안자가 적은 글이 그대로 실리므로 멘션을 꺼둔다.
    body: JSON.stringify({ content: lines.join('\n'), allowed_mentions: { parse: [] } }),
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
    response.status(400).json({ ok: false, code: 'VALIDATION', field: 'activity' });
    return;
  }

  const checked = validateSuggestion(payload);
  if (!checked.ok) {
    // 봇은 성공처럼 보내고 저장하지 않는다. 실패를 알려주면 우회를 학습한다.
    if (checked.field === 'website') {
      response.status(200).json({ ok: true, suggestionId: buildSuggestionId() });
      return;
    }
    response.status(400).json({ ok: false, code: 'VALIDATION', field: checked.field });
    return;
  }

  const suggestionId = buildSuggestionId();
  const timestampKst = kstParts(Date.now()).slice(0, 19).replace('T', ' ');
  const row = buildRow({ suggestionId, timestampKst, value: checked.value });

  const [sheet, discord] = await Promise.allSettled([
    appendRow(row, deadline()),
    notifyDiscord({ suggestionId, value: checked.value, sheetFailed: false, signal: deadline() }),
  ]);

  const sheetFailed = sheet.status === 'rejected';
  const discordFailed = discord.status === 'rejected';

  if (sheetFailed && discordFailed) {
    emit({ suggestion_id: suggestionId, code: 'STORAGE', stage: 'both' });
    response.status(500).json({ ok: false, code: 'STORAGE' });
    return;
  }

  if (sheetFailed) {
    // 디스코드에 내용이 남아 수동 복구가 되므로 접수로 처리한다. 여기서
    // 오류를 띄우면 그 사람은 대부분 그냥 이탈한다.
    emit({ suggestion_id: suggestionId, code: 'STORAGE', stage: 'sheet' });
    await notifyDiscord({
      suggestionId, value: checked.value, sheetFailed: true, signal: deadline(),
    }).catch(() => {});
  }
  if (discordFailed) emit({ suggestion_id: suggestionId, code: 'STORAGE', stage: 'discord' });

  response.status(200).json({ ok: true, suggestionId });
};

module.exports = handler;
module.exports.buildSuggestionId = buildSuggestionId;
module.exports.buildRow = buildRow;
module.exports.safeLog = safeLog;
module.exports.ALLOWED_LOG_KEYS = ALLOWED_LOG_KEYS;
