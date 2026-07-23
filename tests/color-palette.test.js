const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const design = readFileSync(join(__dirname, '..', 'DESIGN.md'), 'utf8');

const approvedTokens = [
  ['canvas', '#fffaf7'],
  ['canvas-soft', '#ffffff'],
  ['primary', '#d13f32'],
  ['primary-hover', '#b9342b'],
  ['primary-strong', '#8f2f28'],
  ['primary-soft', '#fff0ec'],
  ['ink', '#261b18'],
  ['muted', '#675b56'],
  ['line-strong', '#d6c5bf'],
  ['line-soft', '#eee2dd'],
  ['panel', '#f8f3f0'],
  ['panel-raised', '#fcf8f6'],
  ['on-primary', '#ffffff'],
  ['on-primary-strong', '#ffffff'],
];

const retiredHexValues = [
  '#fbf9f4',
  '#fbf9f7',
  '#182820',
  '#2d3e35',
  '#96a99d',
  '#434844',
  '#c3c8c3',
  '#e4e2dd',
  '#f0eee9',
  '#f5f3ee',
  '#8a6c33',
  '#b13f8f',
  '#943476',
  '#79285f',
  '#fceff7',
  '#ff635a',
  '#f0524b',
  '#a8322d',
  '#fff1ef',
  '#fcfcfd',
  '#ff4a79',
  '#f74572',
  '#a51f48',
  '#fff0f4',
  '#201a20',
  '#625a61',
  '#cfc6cc',
  '#e9e3e7',
  '#f7f5f7',
  '#fbf8fa',
];

test('defines the approved HanBuddy warm-red tokens in Tailwind and CSS', () => {
  for (const [token, value] of approvedTokens) {
    const tailwindToken = new RegExp(
      `['"]?${token}['"]?\\s*:\\s*['"]${value}['"]`,
      'i',
    );
    const cssVariable = new RegExp(
      `--color-${token}:\\s*${value}`,
      'i',
    );

    assert.match(html, tailwindToken, `missing Tailwind token ${token}`);
    assert.match(html, cssVariable, `missing CSS variable ${token}`);
  }
});

test('removes the retired cream, forest, sage, and earth palette', () => {
  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      html,
      new RegExp(value, 'i'),
      `retired color ${value} must not remain in index.html`,
    );
  }

  assert.doesNotMatch(html, /\b(?:sage|sage-mist|earth)\b/i);
});

test('maps interactive and emphasized components to the approved warm-red roles', () => {
  assert.match(html, /bg-primary[^"]*hover:bg-primary-hover/);
  assert.match(
    html,
    /<section id="apply" class="bg-primary-strong text-on-primary-strong">/,
  );
  assert.match(html, /bg-primary-soft/);
  assert.match(html, /text-primary(?:-strong)?/);
  assert.match(html, /classList\.toggle\('bg-primary', selected\)/);
  assert.match(html, /classList\.toggle\('text-on-primary', selected\)/);
  assert.match(html, /color:\s*var\(--color-primary-strong\)/);
});

test('keeps the logo as the only decorative gradient source', () => {
  assert.match(html, /assets\/logo-borderless\.webp/);
  assert.doesNotMatch(html, /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i);
});

test('keeps DESIGN.md synchronized with the approved runtime palette', () => {
  for (const [token, value] of approvedTokens) {
    assert.match(
      design,
      new RegExp(`\\| \`${token}\` \\| \`${value}\` \\|`, 'i'),
      `DESIGN.md is missing ${token} ${value}`,
    );
  }

  for (const value of retiredHexValues) {
    assert.doesNotMatch(
      design,
      new RegExp(value, 'i'),
      `DESIGN.md still documents retired color ${value}`,
    );
  }

  assert.match(
    design,
    /Primary CTA: warm-red `primary` fill, white `on-primary` text/i,
  );
  assert.match(
    design,
    /HanBuddy red is the only interactive brand color/i,
  );
  assert.match(
    design,
    /existing logo gradient remains the only multi-color brand treatment/i,
  );
});
