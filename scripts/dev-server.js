#!/usr/bin/env node
/*
 * 로컬에서 /apply/ 를 제출까지 돌려보기 위한 개발 서버.
 *
 * ⚠️ 저장은 전부 스텁이다. 실제 구글 시트에 쓰지 않고 디스코드로 보내지도 않는다.
 * 시트 기록·디스코드 알림·GA 수집을 실제로 확인하려면 PR Preview 배포에서 해야 한다.
 *
 * 이게 있는 이유는 두 가지다.
 *   1. 시크릿 없이 폼 전체를 돌릴 수 있다. vercel dev는 서비스 계정 개인키를
 *      각자 노트북에 내려받아야 하는데, 폼 동작을 보려고 치를 값은 아니다.
 *      여기서는 임시 RSA 키를 즉석에서 만들어 JWT 서명 경로까지 진짜로 태운다.
 *   2. 실패 분기를 재현할 수 있다. 시트가 실패하면 durable 접수도 실패하고,
 *      Discord만 실패하면 시트 접수는 성공하는 분기를 실제 권한 없이 볼 수 있다.
 *
 * 사용:
 *   node scripts/dev-server.js                  # 저장 성공 시나리오
 *   QA_SCENARIO=sheet-fail node scripts/dev-server.js
 *   QA_SCENARIO=discord-fail node scripts/dev-server.js
 *   QA_SCENARIO=both-fail  node scripts/dev-server.js
 *   실행 중 전환: curl "http://127.0.0.1:8099/__scenario?mode=both-fail"
 */
const http = require('node:http');
const { generateKeyPairSync } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const { extname, join, resolve, sep } = require('node:path');

const ROOT = resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8099;
const SCENARIOS = ['ok', 'sheet-fail', 'discord-fail', 'both-fail'];

let scenario = SCENARIOS.includes(process.env.QA_SCENARIO) ? process.env.QA_SCENARIO : 'ok';

// 진짜 자격증명은 쓰지 않는다. 서명이 통과해야 함수가 끝까지 도는 것뿐이므로
// 일회용 키를 만들어 넣고, 바깥으로 나가는 호출은 전부 아래에서 가로챈다.
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'dev-stub@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
  .replace(/\n/g, '\\n');
process.env.APPLICATIONS_SHEET_ID = 'dev-stub-sheet';
process.env.APPLICATIONS_SHEET_TAB = 'applications';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.invalid/dev-stub';

const sent = [];
const storedRows = [];
global.fetch = async (url, init = {}) => {
  const target = decodeURIComponent(String(url));
  if (target.includes('oauth2.googleapis.com')) {
    return { ok: true, json: async () => ({ access_token: 'dev-stub-token' }) };
  }
  const channel = target.includes('sheets.googleapis.com') ? 'sheet' : 'discord';
  const failed = scenario === 'both-fail'
    || (scenario === 'sheet-fail' && channel === 'sheet')
    || (scenario === 'discord-fail' && channel === 'discord');
  sent.push(`${channel}:${failed ? 'fail' : 'ok'}`);
  if (failed) return { ok: false };
  if (channel === 'sheet' && init.method === 'GET') {
    return {
      ok: true,
      json: async () => ({ values: storedRows.map((row) => [...row]) }),
    };
  }
  if (channel === 'sheet') {
    if (target.endsWith(':clear')) {
      const match = /!A(\d+):Q\1:clear$/.exec(target);
      if (!match) return { ok: false };
      storedRows[Number(match[1]) - 1] = [];
      return { ok: true, json: async () => ({}) };
    }
    const row = JSON.parse(init.body).values[0];
    storedRows.push(row);
    const rowNumber = storedRows.length;
    return {
      ok: true,
      json: async () => ({ updates: { updatedRange: `applications!A${rowNumber}:Q${rowNumber}` } }),
    };
  }
  return { ok: true };
};

const handler = require(join(ROOT, 'api', 'apply.js'));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Vercel도 파싱에 실패하면 본문 없이 넘긴다. 함수가 검증 실패로 답하면 된다.
    return {};
  }
};

const serveStatic = async (pathname, response) => {
  const wanted = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = resolve(ROOT, `.${wanted}`);
  // 레포 밖으로 나가는 경로는 거절한다.
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  // 점으로 시작하는 것은 공개 대상이 아니다. vercel env pull을 한 적이 있으면
  // .env.local에 서비스 계정 키가 평문으로 들어 있다.
  if (wanted.split('/').some((segment) => segment.startsWith('.'))) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found');
  }
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/__scenario') {
    const mode = url.searchParams.get('mode');
    if (!SCENARIOS.includes(mode)) {
      response.writeHead(400).end(`mode must be one of: ${SCENARIOS.join(', ')}`);
      return;
    }
    scenario = mode;
    process.stdout.write(`  시나리오 → ${scenario}\n`);
    response.writeHead(200).end(scenario);
    return;
  }

  if (url.pathname === '/api/apply') {
    sent.length = 0;
    // Vercel Node 런타임과 같은 모양으로 맞춘다: 파싱된 body, status().json().
    const shim = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        response.writeHead(this.code ?? 200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(payload));
        process.stdout.write(`  POST /api/apply → ${this.code} [${sent.join(', ') || '호출 없음'}]\n`);
        return this;
      },
    };
    await handler({
      method: request.method,
      headers: request.headers,
      body: await readBody(request),
    }, shim);
    return;
  }

  await serveStatic(decodeURIComponent(url.pathname), response);
});

// 호스트를 생략하면 Node가 와일드카드(::)에 붙어 같은 망의 다른 기기가 레포
// 파일을 읽을 수 있다. 개발용이므로 loopback에만 붙인다.
server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write([
    '',
    `  http://127.0.0.1:${PORT}/apply/`,
    '',
    `  시나리오: ${scenario}  (${SCENARIOS.join(' | ')})`,
    '',
    '  ⚠️  저장은 스텁입니다. 실제 시트에 쓰지 않고 디스코드로 보내지도 않습니다.',
    '     접수 완료 화면이 떠도 시트 연동이 동작한다는 뜻은 아닙니다.',
    '     시트·디스코드·GA 실물 확인은 PR Preview 배포에서 하세요.',
    '',
  ].join('\n'));
});
