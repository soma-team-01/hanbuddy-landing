const assert = require('node:assert/strict');
const { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = join(__dirname, '..');

// 이벤트 페이지 목록을 손으로 적으면 새로 추가한 페이지가 검사에서 통째로
// 빠진다(events/kleague가 실제로 그렇게 빠져 있었다). 디렉터리에서 읽는다.
const eventPages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `events/${entry.name}/index.html`)
  .sort();

// 빠뜨리면 배포에서 조용히 사라지고 폼이 404를 받는다.
// 자산은 폴더·확장자 규칙이 살아 있는지 확인하는 게 목적이라 대표 파일만 든다.
const MUST_DEPLOY = [
  'index.html',
  'favicon.ico',
  'about/index.html',
  'apply/index.html',
  'privacy/index.html',
  'api/apply.js',
  'api/suggest.js',
  'assets/analytics.js',
  'assets/event-slots.js',
  'assets/reviews-data.js',
  'assets/apply-validation.js',
  'assets/suggest-validation.js',
  'assets/date-picker.js',
  'assets/landing-variant.js',
  'assets/brand/logo-borderless.webp',
  'assets/brand/apple-touch-icon.png',
  'assets/photos/kbo/run1-hero.webp',
  'assets/photos/hanriver/hanriver-fountain.webp',
  'assets/photos/kleague/kleague-0815-crew.webp',
  'assets/photos/samgyeopsal/samgyeopsal-grill.webp',
  'assets/photos/samgyeopsal/samgyeopsal-table.webp',
  'assets/photos/chimaek/chimaek-og.webp',
  'assets/photos/chimaek/chimaek-half.webp',
  ...eventPages,
];

// 반대 방향의 사고도 막는다. allowlist는 deny-by-default지만, 누군가 폴더째
// 되살리면(`!/scripts`) 개발 도구나 시크릿이 공개 URL로 나간다.
const MUST_NOT_DEPLOY = [
  'scripts/dev-server.js',
  '.env.local',
  '.env',
  'AGENTS.md',
  'DESIGN.md',
  'docs/superpowers/plans/example.md',
  'assets/raw/original.jpg',
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

test('the Vercel allowlist keeps internal files off the public site', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'hanbuddy-deny-'));
  try {
    writeFileSync(join(sandbox, '.gitignore'), readFileSync(join(root, '.vercelignore')));
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: sandbox }).status, 0);
    for (const path of MUST_NOT_DEPLOY) {
      mkdirSync(join(sandbox, dirname(path)), { recursive: true });
      writeFileSync(join(sandbox, path), 'x');
      const ignored = spawnSync('git', ['check-ignore', '--quiet', path], { cwd: sandbox });
      assert.equal(ignored.status, 0, `${path} would be published on the public site`);
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('the must-deploy list names files that actually exist', () => {
  // 시뮬레이션은 샌드박스에 가짜 파일을 만들어 검사하므로, 없는 경로를 적어도
  // 통과한다. 그러면 목록이 지켜주는 척만 하는 허구가 된다.
  for (const path of MUST_DEPLOY) {
    assert.ok(existsSync(join(root, path)), `must-deploy list names a missing file: ${path}`);
  }
});
