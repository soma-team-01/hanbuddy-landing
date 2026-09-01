const crypto = require('node:crypto');
const { validateApplication } = require('../assets/apply-validation.js');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const MAX_BODY_BYTES = 16 * 1024;
const IDEMPOTENCY_KEY_PATTERN = /^HB-\d{8}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/;
// 시트 경로는 토큰 발급, 조회, append, reconciliation/cleanup을 순서대로 타므로,
// 상한은 그 합이 함수
// 실행 한도 안에 들어오게 잡는다. 디스코드 재시도까지 더해도 여유가 남는다.
// 환경변수는 테스트가 기다리지 않게 하려는 것이다. 배포에서는 설정하지 않는다.
const REQUEST_TIMEOUT_MS = Number(process.env.APPLY_REQUEST_TIMEOUT_MS) || 3000;

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

const buildRow = ({ applicationId, timestampKst, value }) => [
  timestampKst,
  applicationId,
  value.eventId,
  value.eventTitle,
  value.slotIso.replace('T', ' '),
  value.guests,
  value.name,
  value.nationality,
  // 더 이상 묻지 않는 한국어 수준 열. 아래 결제 수단·referrer와 함께 비워 둔다.
  // 열을 당기면 이미 쌓인 신청 행과 헤더가 한 칸씩 어긋난다.
  '',
  value.contactMethod,
  value.contactId,
  '',
  value.requests,
  value.source,
  value.language,
  'TRUE',
  '',
];

const base64url = (input) => Buffer.from(input).toString('base64url');

const idempotencyKeyFrom = (request) => {
  const headers = request.headers;
  const value = typeof headers?.get === 'function'
    ? headers.get('idempotency-key')
    : headers?.['idempotency-key'];
  return typeof value === 'string' && IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null;
};

// 마감은 홉마다가 아니라 저장 경로마다 하나씩 만든다. 시트 경로의 모든 조회,
// append, cleanup에 새로 걸면 최악의 대기가 홉 수만큼 곱해진다.
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

const sheetValuesUrl = (range, suffix = '') => {
  const sheetId = process.env.APPLICATIONS_SHEET_ID;
  const tab = process.env.APPLICATIONS_SHEET_TAB || 'applications';
  const encodedRange = encodeURIComponent(`${tab}!${range}`);
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/`
    + encodedRange + suffix;
};

const readRows = async (token, signal) => {
  const response = await fetch(sheetValuesUrl('A:Q'), {
    method: 'GET',
    signal,
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('sheet-lookup');
  const body = await response.json();
  if (!Array.isArray(body.values)) return [];
  return body.values.map((row, index) => ({
    rowNumber: index + 1,
    values: Array.isArray(row) ? row : [],
  }));
};

const appendRow = async (row, token, signal) => {
  const url = sheetValuesUrl('A:Q', ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS');
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!response.ok) throw new Error('sheet');
  const body = await response.json();
  const updatedRange = body?.updates?.updatedRange;
  const match = typeof updatedRange === 'string' ? /!A(\d+):Q(\d+)$/.exec(updatedRange) : null;
  if (!match || match[1] !== match[2]) return null;
  return Number(match[1]);
};

const clearRow = async (rowNumber, token, signal) => {
  const response = await fetch(sheetValuesUrl(`A${rowNumber}:Q${rowNumber}`, ':clear'), {
    method: 'POST',
    signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) throw new Error('sheet-clear');
};

const comparableCell = (value) => (value === undefined || value === null ? '' : String(value));

const samePayload = (storedRow, expectedRow) => {
  for (let index = 2; index < 17; index += 1) {
    if (comparableCell(storedRow[index]) !== comparableCell(expectedRow[index])) return false;
  }
  return true;
};

const inspectApplication = async ({ applicationId, expectedRow, token, signal }) => {
  const matches = (await readRows(token, signal))
    .filter(({ values }) => comparableCell(values[1]) === applicationId)
    .sort((left, right) => left.rowNumber - right.rowNumber);
  if (matches.length === 0) return { status: 'missing', duplicateRows: [] };

  const [canonical, ...duplicates] = matches;
  const status = samePayload(canonical.values, expectedRow) ? 'stored' : 'conflict';
  return {
    status,
    canonicalRow: canonical.rowNumber,
    duplicateRows: duplicates.map(({ rowNumber }) => rowNumber),
  };
};

const cleanupOwnedDuplicates = async ({
  applicationId, expectedRow, canonicalRow, duplicateRows, token, signal,
}) => {
  // 한 행을 비운 뒤에는 Sheets append가 그 trailing row를 바로 재사용할 수 있다.
  // 다음 stale clear를 미리 보내 두지 않도록 반드시 한 행씩 응답을 확인한다.
  for (const rowNumber of duplicateRows) {
    await clearRow(rowNumber, token, signal);
  }

  // clear 2xx만으로는 중복 제거와 원본 보존을 증명할 수 없다. 같은 deadline 안에서
  // canonical 한 행만, 같은 payload로 남았는지 다시 읽은 뒤에만 owner가 성공한다.
  const verified = await inspectApplication({
    applicationId, expectedRow, token, signal,
  });
  if (verified.status !== 'stored'
    || verified.canonicalRow !== canonicalRow
    || verified.duplicateRows.length !== 0) {
    throw new Error('sheet-reconcile');
  }
  return verified;
};

const appendWithOwnership = async ({ row, token, signal }) => {
  try {
    return await appendRow(row, token, signal);
  } catch {
    // Google이 append를 적용한 뒤 응답만 끊겼을 수 있다. reconciliation은 계속
    // 하되 updatedRange를 못 받았으므로 어느 행을 썼는지 ownership은 주장하지 않는다.
    return null;
  }
};

const reconcileAppend = async ({ applicationId, row, callerRow, token, signal }) => {
  let inspected = await inspectApplication({
    applicationId, expectedRow: row, token, signal,
  });
  if (inspected.status === 'missing') throw new Error('sheet-missing');

  const ownsCanonicalRow = callerRow !== null && callerRow === inspected.canonicalRow;
  if (inspected.duplicateRows.length !== 0) {
    // updatedRange로 lowest row ownership을 증명한 invocation 하나만 cleanup한다.
    // nonowner/ambiguous caller는 owner가 끝낸 뒤의 ordinary retry에서만 성공한다.
    if (!ownsCanonicalRow || inspected.status !== 'stored') {
      throw new Error('sheet-duplicates');
    }
    inspected = await cleanupOwnedDuplicates({
      applicationId,
      expectedRow: row,
      canonicalRow: inspected.canonicalRow,
      duplicateRows: inspected.duplicateRows,
      token,
      signal,
    });
  }

  return { status: inspected.status, ownsCanonicalRow };
};

const storeApplication = async ({ applicationId, row }) => {
  // 서버리스 인스턴스의 메모리는 재시도 사이에 공유되지 않는다. 시트 B열의
  // application_id와 같은 행의 C:Q를 durable idempotency record로 쓴다.
  const signal = deadline();
  const token = await accessToken(signal);
  const prior = await inspectApplication({
    applicationId, expectedRow: row, token, signal,
  });

  // Append ownership이 없는 retry는 과거 중복을 추측해서 지우지 않는다.
  if (prior.duplicateRows.length !== 0) throw new Error('sheet-duplicates');
  if (prior.status !== 'missing') {
    return { status: prior.status, ownsCanonicalRow: false };
  }

  const callerRow = await appendWithOwnership({ row, token, signal });
  return reconcileAppend({ applicationId, row, callerRow, token, signal });
};

const notifyDiscord = async ({ applicationId, value, signal }) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('webhook');
  const lines = [
    '🎉 **새 신청**',
    `\`${applicationId}\``,
    `${value.eventTitle} · ${value.slotIso.replace('T', ' ')} · ${value.guests}명`,
    `${value.name} (${value.nationality})`,
    `${value.contactMethod}: ${value.contactId}`,
    value.source ? `유입: ${value.source}` : null,
    value.requests ? `요청: ${value.requests}` : null,
  ].filter(Boolean);
  const response = await fetch(webhook, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    // 신청자가 적은 글이 그대로 실리므로 멘션을 꺼둔다. 요청사항 칸에
    // @everyone 한 줄이면 팀 전원에게 알림이 간다.
    body: JSON.stringify({ content: lines.join('\n'), allowed_mentions: { parse: [] } }),
  });
  if (!response.ok) throw new Error('webhook');
};

const requestOutcome = (request) => {
  if (request.method !== 'POST') {
    return { response: { status: 405, body: { ok: false, code: 'METHOD' } } };
  }

  const payload = request.body && typeof request.body === 'object' ? request.body : {};
  if (JSON.stringify(payload).length > MAX_BODY_BYTES) {
    return {
      response: {
        status: 400,
        body: { ok: false, code: 'VALIDATION', field: 'requests' },
      },
    };
  }

  const applicationId = idempotencyKeyFrom(request);
  if (!applicationId) {
    return { response: { status: 400, body: { ok: false, code: 'VALIDATION' } } };
  }

  const checked = validateApplication(payload);
  if (!checked.ok) {
    const response = checked.field === 'website'
      ? { status: 200, body: { ok: true, applicationId } }
      : {
          status: 400,
          body: { ok: false, code: 'VALIDATION', field: checked.field },
        };
    return { response };
  }

  const timestampKst = kstParts(Date.now()).slice(0, 19).replace('T', ' ');
  return {
    applicationId,
    row: buildRow({ applicationId, timestampKst, value: checked.value }),
    value: checked.value,
  };
};

const sendResponse = (response, result) => {
  response.status(result.status).json(result.body);
};

const sendStorageFailure = (response, applicationId) => {
  emit({ application_id: applicationId, code: 'STORAGE', stage: 'sheet' });
  sendResponse(response, { status: 500, body: { ok: false, code: 'STORAGE' } });
};

const notifyOwner = async ({ applicationId, value }) => {
  try {
    await notifyDiscord({ applicationId, value, signal: deadline() });
  } catch {
    emit({ application_id: applicationId, code: 'STORAGE', stage: 'discord' });
  }
};

const handler = async (request, response) => {
  const outcome = requestOutcome(request);
  if (outcome.response) {
    sendResponse(response, outcome.response);
    return;
  }

  let stored;
  try {
    stored = await storeApplication(outcome);
  } catch {
    sendStorageFailure(response, outcome.applicationId);
    return;
  }

  if (stored.status === 'conflict') {
    sendResponse(response, { status: 409, body: { ok: false, code: 'CONFLICT' } });
    return;
  }

  // updatedRange로 자기 행을 증명하고 그 행이 lowest canonical일 때만 알린다.
  // 응답을 잃었거나 비정상 응답으로 row ownership이 불명확하면 접수는 성공해도
  // Discord는 보내지 않는다. Discord는 durable authority가 아닌 운영 알림이다.
  if (stored.ownsCanonicalRow) await notifyOwner(outcome);

  sendResponse(response, {
    status: 200,
    body: { ok: true, applicationId: outcome.applicationId },
  });
};

module.exports = handler;
module.exports.buildRow = buildRow;
module.exports.safeLog = safeLog;
module.exports.ALLOWED_LOG_KEYS = ALLOWED_LOG_KEYS;
module.exports.idempotencyKeyFrom = idempotencyKeyFrom;
module.exports.samePayload = samePayload;
