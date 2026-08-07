const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');

const eventPages = readdirSync(join(root, 'events'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `events/${entry.name}/index.html`)
  .sort();

const publicPages = ['index.html', 'about/index.html', 'apply/index.html', ...eventPages];

// 여는 태그에 속성이 없는 블록만 고른다. `src=`가 붙은 로더와
// `type="application/ld+json"` 구조화 데이터는 JS 파서로 볼 대상이 아니다.
const inlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test('the consent banner never covers the mobile apply bar', () => {
  // 이벤트 상세페이지는 모바일 하단에 신청 CTA 바를 고정해 둔다. 동의 배너가
  // 더 높은 z-index로 같은 자리에 뜨면 신청 버튼을 통째로 가린다. 데스크톱에서는
  // CTA 바가 사라지므로(lg:hidden) 배너도 원래 자리로 돌아와야 한다.
  for (const page of eventPages) {
    const html = readFileSync(join(root, page), 'utf8');
    const bar = html.match(/<div class="fixed inset-x-0 bottom-0[^"]*"/);
    assert.ok(bar, `${page} should keep its sticky mobile apply bar`);

    const banner = html.match(/data-consent-banner[\s\S]*?class="([^"]+)"/);
    assert.ok(banner, `${page} should carry the consent banner`);
    assert.match(banner[1], /\bbottom-24\b/, `${page} banner would cover the apply bar`);
    assert.match(banner[1], /\blg:bottom-4\b/, `${page} banner should drop back on desktop`);
  }
});

test('every inline script parses as JavaScript', () => {
  // 이 사이트는 카피와 렌더러가 한 파일 안 인라인 스크립트에 함께 산다.
  // 그래서 카피에 이스케이프하지 않은 작은따옴표 하나만 들어가도 스크립트가
  // 통째로 죽고, 이벤트 카드와 리뷰가 화면에서 사라진다(2026-08-06 실제 발생:
  // "We're a student team"의 아포스트로피가 CONTENT_MAP 문자열을 끊었다).
  // 문자열 매칭 테스트로는 이런 사고를 잡을 수 없어 파싱으로 확인한다.
  for (const page of publicPages) {
    const scripts = inlineScripts(readFileSync(join(root, page), 'utf8'));
    assert.ok(scripts.length > 0, `${page} should carry at least one inline script`);
    scripts.forEach((code, index) => {
      assert.doesNotThrow(
        // 파싱만 하고 실행하지 않는다.
        () => new Function(code), // eslint-disable-line no-new-func
        `${page} inline script #${index} has a syntax error`,
      );
    });
  }
});
