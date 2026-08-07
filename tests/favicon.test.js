const assert = require('node:assert/strict');
const { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { inflateSync } = require('node:zlib');

const root = join(__dirname, '..');

// 이벤트 상세페이지는 계속 늘어난다. 목록을 손으로 적으면 새 페이지가
// 옛 파비콘을 달고도 조용히 통과하므로, 디렉터리를 훑어 대상을 만든다.
const eventPages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `events/${entry.name}/index.html`)
  .sort();

const publicPages = ['index.html', 'about/index.html', 'privacy/index.html', ...eventPages];

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeRgbaPng(png) {
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let width;
  let height;
  const imageData = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'favicon PNG must use 8-bit channels');
      assert.equal(data[9], 6, 'favicon PNG must use RGBA color');
      assert.equal(data[12], 0, 'favicon PNG must not be interlaced');
    } else if (type === 'IDAT') {
      imageData.push(data);
    }
    offset += length + 12;
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(height * stride);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[rowOffset - stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset - stride + x - bytesPerPixel]
        : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
      else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);
      pixels[rowOffset + x] = (filtered[inputOffset] + predictor) & 255;
      inputOffset += 1;
    }
  }

  const alphaAt = (x, y) => pixels[(y * stride) + (x * bytesPerPixel) + 3];
  return { alphaAt, height, width };
}

test('every public page advertises the root favicon', () => {
  for (const page of publicPages) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.match(
      html,
      /<link\s+rel="icon"\s+href="\/favicon\.ico"\s+sizes="any"\s*\/>/,
      `${page} must advertise /favicon.ico`,
    );
  }
});

test('favicon.ico is a non-empty Windows icon file', () => {
  const favicon = readFileSync(join(root, 'favicon.ico'));
  assert.ok(favicon.length > 4, 'favicon.ico must contain image data');
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
});

test('favicon master has transparent corners and an opaque center mark', () => {
  const { alphaAt, height, width } = decodeRgbaPng(
    readFileSync(join(root, 'assets', 'brand', 'favicon.png')),
  );
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
    assert.equal(alphaAt(x, y), 0, `favicon background is opaque at ${x},${y}`);
  }
  assert.ok(alphaAt(Math.floor(width / 2), Math.floor(height / 2)) >= 240);
});

test('the Vercel allowlist publishes favicon.ico', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'hanbuddy-favicon-'));
  try {
    writeFileSync(join(sandbox, '.gitignore'), readFileSync(join(root, '.vercelignore')));
    writeFileSync(join(sandbox, 'favicon.ico'), 'test');
    const init = spawnSync('git', ['init', '-q'], { cwd: sandbox });
    assert.equal(init.status, 0, init.stderr.toString());

    const check = spawnSync('git', ['check-ignore', '--quiet', 'favicon.ico'], { cwd: sandbox });
    assert.equal(check.status, 1, 'favicon.ico would be excluded from the Vercel deployment');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
