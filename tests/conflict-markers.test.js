const assert = require('node:assert/strict');
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');

// 병합 충돌을 잘못 정리하면 마커가 마크업 한가운데 텍스트로 남는다.
// 인라인 스크립트 파서는 마크업 텍스트를 보지 않고, 카피 테스트는 정해진
// 문자열만 확인해서 이 사고를 아무도 못 잡는다. 실제로 리베이스 중에
// 동의 배너 자리에 마커가 그대로 렌더링된 화면을 봤다.
// 길이를 정확히 7로 묶으면 `<<<<<<<<`(8자)처럼 더 긴 런이 통과한다. 8번째
// 문자가 공백도 줄끝도 아니어서 경계 조건에서 탈락하기 때문이다. 7자 이상으로
// 연다. `|||||||`는 merge.conflictStyle=diff3(zdiff3)가 넣는 베이스 마커라
// 함께 잡는다. 이 저장소는 기본 merge 스타일이지만 설정은 사람마다 다르다.
//
// `={7,}`는 마크다운 setext 제목(제목 아래 등호 줄)과 겹칠 수 있다. 지금
// 저장소에는 그런 줄이 없어서 그대로 두지만, 오탐이 나면 여기부터 본다.
const CONFLICT_MARKER = /^(<{7,}|={7,}|>{7,}|\|{7,})(\s|$)/m;

// 배포되는 텍스트 자산만 본다. 바이너리와 로컬 전용 폴더는 제외한다.
const CHECKED_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.md']);
const SKIPPED_DIRS = new Set([
  '.git',
  '.omo',
  '.serena',
  '.superpowers',
  '.vercel',
  'node_modules',
]);

function collectTextFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue;
    if (SKIPPED_DIRS.has(entry.name)) continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectTextFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;

    const dot = entry.name.lastIndexOf('.');
    if (dot < 0) continue;
    if (!CHECKED_EXTENSIONS.has(entry.name.slice(dot))) continue;
    if (statSync(full).size > 2_000_000) continue;

    found.push(full);
  }
  return found;
}

test('no merge conflict markers survive anywhere in the repo', () => {
  const files = collectTextFiles(root);

  // 목록을 손으로 적으면 새 페이지가 검사에서 빠진다. 훑어서 모으되,
  // 훑기 자체가 망가져 0건이 되는 경우를 막으려고 하한을 둔다.
  assert.ok(
    files.length >= 10,
    `검사 대상 파일이 ${files.length}개뿐이다. 파일 수집이 깨졌는지 확인할 것`,
  );

  const offenders = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const match = source.match(CONFLICT_MARKER);
    if (!match) continue;

    const line = source.slice(0, match.index).split('\n').length;
    offenders.push(`${relative(root, file)}:${line} -> ${match[0].trim()}`);
  }

  assert.deepEqual(
    offenders,
    [],
    '충돌 마커가 남아 있다. 배포되면 방문자에게 그대로 보인다:\n' + offenders.join('\n'),
  );
});

test('the guard actually looks at the deployed public pages', () => {
  const files = collectTextFiles(root).map((file) => relative(root, file));

  // 검사망에서 빠지면 안 되는 대표 파일들. 실제로 훑히는지 확인한다.
  for (const required of ['index.html', 'about/index.html', 'apply/index.html', 'assets/analytics.js']) {
    assert.ok(files.includes(required), `${required}이 충돌 마커 검사 대상에 없다`);
  }

  const eventPages = files.filter((file) => /^events\/[^/]+\/index\.html$/.test(file));
  assert.ok(eventPages.length >= 4, `이벤트 페이지가 ${eventPages.length}개만 잡혔다`);
});
