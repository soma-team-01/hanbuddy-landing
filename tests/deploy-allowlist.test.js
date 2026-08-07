const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = join(__dirname, '..');

// 빠뜨리면 배포에서 조용히 사라지고 폼이 404를 받는다.
const MUST_DEPLOY = [
  'index.html',
  'favicon.ico',
  'about/index.html',
  'apply/index.html',
  'api/apply.js',
  'assets/analytics.js',
  'assets/event-slots.js',
  'assets/apply-validation.js',
  'events/kbo-gocheok/index.html',
  'events/kbo-jamsil/index.html',
  'events/kleague/index.html',
  'events/hanriver/index.html',
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
