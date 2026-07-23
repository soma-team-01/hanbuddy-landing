const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const design = readFileSync(join(__dirname, '..', 'DESIGN.md'), 'utf8');

test('loads the selected Plus Jakarta Sans and DM Sans families', () => {
  assert.match(
    html,
    /family=Plus\+Jakarta\+Sans:wght@500;600;700;800/,
  );
  assert.match(
    html,
    /family=DM\+Sans:wght@400;500;600;700/,
  );
  assert.match(
    html,
    /family=Noto\+Sans\+KR:wght@400;500;700/,
  );
  assert.doesNotMatch(html, /family=Manrope|family=Be\+Vietnam\+Pro/);
});

test('maps display and body roles to the selected font system', () => {
  assert.match(
    html,
    /sans:\s*\['DM Sans',\s*'Noto Sans KR'/,
  );
  assert.match(
    html,
    /display:\s*\['Plus Jakarta Sans',\s*'Noto Sans KR'/,
  );
  assert.doesNotMatch(html, /sans:\s*\['Be Vietnam Pro'/);
  assert.doesNotMatch(html, /display:\s*\['Manrope'/);
});

test('keeps DESIGN.md synchronized with the selected typography', () => {
  assert.match(
    design,
    /Body and UI \(`font-sans`\): `"DM Sans", "Noto Sans KR"/,
  );
  assert.match(
    design,
    /Display and headings \(`font-display`\): `"Plus Jakarta Sans", "Noto Sans KR"/,
  );
  assert.match(
    design,
    /Plus Jakarta Sans.*display geometry.*DM Sans.*bilingual body copy/i,
  );
  assert.doesNotMatch(design, /Manrope display over Be Vietnam Pro body/);
});
