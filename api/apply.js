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
