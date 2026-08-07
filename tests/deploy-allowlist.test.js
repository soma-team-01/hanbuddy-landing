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
