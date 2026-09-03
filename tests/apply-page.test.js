const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const html = readFileSync(join(root, 'apply', 'index.html'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const measurementJs = readFileSync(join(root, 'assets', 'application-measurement.js'), 'utf8');

test('every required field is present, labelled and marked required', () => {
  for (const name of ['eventId', 'slotIso', 'guests', 'name', 'nationality',
    'contactMethod', 'contactId', 'consent']) {
    assert.match(html, new RegExp(`name="${name}"`), `missing field: ${name}`);
  }
  // 라벨이 입력과 연결되어야 스크린리더가 읽는다.
  for (const id of ['field-name', 'field-nationality', 'field-contactId', 'field-guests']) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `missing label for ${id}`);
    assert.match(html, new RegExp(`id="${id}"[^>]*required`), `${id} must be required`);
  }
});

test('the fields we stopped asking for are gone from every layer of the page', () => {
  // 필드 하나는 마크업·i18n·payload 세 군데에 흩어져 있다. 한 군데만 지우면
  // 라벨은 사라졌는데 payload가 undefined를 보내거나 그 반대가 된다.
  for (const field of ['koreanLevel', 'paymentMethod']) {
    assert.doesNotMatch(html, new RegExp(field), `${field} still appears on the page`);
  }
});

test('the contact channel and its ID read as one field on every screen width', () => {
  // 폼 길이를 줄이려고 제목 하나에 칸 둘을 묶었다. 테두리를 공유하는 상자가
  // 사라지면 다시 따로 노는 두 필드로 보인다. sm: 접두사가 붙으면 정작 길이가
  // 문제인 모바일에서만 두 줄로 돌아간다.
  const pair = html.match(/<div class="contact-pair[^"]*">[\s\S]*?<\/div>/);
  assert.ok(pair, 'contactMethod and contactId must share one bordered box');
  assert.match(pair[0], /id="field-contactMethod"/);
  assert.match(pair[0], /id="field-contactId"/);
  // 표준 중단점 전부 + 이 레포가 실제로 쓰는 임의 중단점(min-[380px]:)까지 막는다.
  // 하나라도 빠지면 "모든 폭에서 한 줄"이라는 계약이 그 폭에서만 조용히 깨진다.
  assert.doesNotMatch(pair[0], /\b(?:sm|md|lg|xl|2xl):|\b(?:min|max)-\[/, 'the pair must not restack at any width');

  // 제목이 하나뿐이니 각 칸의 역할은 sr-only 라벨만 말한다. 이게 빠지면
  // 스크린리더에는 이름 없는 입력 두 개가 남는다.
  for (const id of ['field-contactMethod', 'field-contactId']) {
    assert.match(html, new RegExp(`<label for="${id}" class="sr-only"`), `${id} needs an sr-only label`);
  }
  assert.match(html, /<legend[^>]*data-i18n="apply\.fields\.contactMethod"/, 'the pair needs one visible heading');

  // 안쪽 칸에는 테두리가 없다. 초점과 오류 표시를 칸에 걸면 아무것도 안 보인다.
  assert.match(html, /\.contact-pair:focus-within/);
  assert.match(html, /\.contact-pair:has\(\[aria-invalid='true'\]\)/);
});

test('the optional questions come after the one we act on', () => {
  // 유입 경로는 우리 참고용이고 요청사항은 당일 준비에 쓴다. 준비할 것이
  // 마지막에 있어야 신청자가 방금 고른 회차를 떠올리며 적는다.
  const source = html.indexOf('name="source"');
  const requests = html.indexOf('name="requests"');
  assert.ok(source > 0 && requests > 0, 'both fields must exist');
  assert.ok(source < requests, 'the source question must come before the requests box');
});

test('the guests question starts folded behind the friends link', () => {
  // 지금까지 신청 전원이 1인이라 인원 입력은 접혀서 시작한다. 접혀 있어도
  // input이 DOM에 있어 항상 숫자가 전송되므로 폼 계약은 그대로다.
  assert.match(html, /<button type="button" data-guests-toggle/);
  const box = html.match(/<div id="guests-box" class="hidden mt-2" data-guests-box>[\s\S]*?<\/div>/);
  assert.ok(box, 'the guests box must start hidden');
  assert.match(box[0], /name="guests"/);
  assert.match(box[0], /value="1"/, 'the folded state must submit 1');
  assert.match(html, /guestsToggle\.addEventListener\('click'/, 'the link must reveal the box');
  // 서버가 guests 오류를 돌려주면 접힌 상자를 먼저 펼쳐야 오류가 보인다.
  assert.match(html, /if \(field === 'guests'\) revealGuests\(\);/);
  // 링크 카피는 EN/KO 양쪽에 있어야 한다.
  const koStart = html.indexOf('      ko: {');
  for (const [lang, block] of Object.entries({ EN: html.slice(0, koStart), KO: html.slice(koStart) })) {
    assert.match(block, /guestsToggle: '/, `guestsToggle copy missing in ${lang}`);
  }
});

test('the friends link folds the guests question back up', () => {
  // 잘못 눌러 펼친 사람이 되돌릴 길이 없으면 인원 질문이 화면에 박힌다.
  // 버튼은 사라지지 않고, 상태를 aria-expanded로 알리며, 접을 때 값을 1로
  // 되돌려야 보이지 않는 인원수가 전송되지 않는다.
  assert.match(html, /data-guests-toggle aria-expanded="false" aria-controls="guests-box"/);
  const setOpen = html.match(/const setGuestsOpen = \([\s\S]*?\n    \};/);
  assert.ok(setOpen, 'the toggle must run through one open/close function');
  assert.match(setOpen[0], /classList\.toggle\('hidden', !open\)/, 'closing must hide the box again');
  assert.match(setOpen[0], /setAttribute\('aria-expanded', String\(open\)\)/);
  assert.match(setOpen[0], /if \(!open\) form\.elements\.guests\.value = '1';/, 'folding must reset the count');
  // 라벨은 키를 갈아 끼워야 언어를 바꿔도 펼침 상태의 문구가 유지된다.
  assert.match(setOpen[0], /open \? 'apply\.guestsToggleOpen' : 'apply\.guestsToggle'/);
  const koStart = html.indexOf('      ko: {');
  for (const [lang, block] of Object.entries({ EN: html.slice(0, koStart), KO: html.slice(koStart) })) {
    assert.match(block, /guestsToggleOpen: '/, `guestsToggleOpen copy missing in ${lang}`);
  }
});

test('choosing Other on the source reveals a text input', () => {
  assert.match(html, /name="sourceOther"/);
  assert.match(html, /data-source-other/);
  // 감춰진 상태로 시작해야 한다.
  assert.match(html, /class="hidden" data-source-other/);
  assert.match(html, /form\.elements\.source\.addEventListener/);
});

test('the honeypot is hidden from people but present for bots', () => {
  assert.match(html, /name="website"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /tabindex="-1"/);
});

test('the page loads the shared slot and validation modules, not its own copy', () => {
  assert.match(html, /<script src="\/assets\/event-slots\.js"><\/script>/);
  assert.match(html, /<script src="\/assets\/apply-validation\.js"><\/script>/);
  assert.match(html, /<script src="\/assets\/application-measurement\.js"><\/script>/);
  assert.doesNotMatch(html, /const EVENT_SLOTS = /, 'slots must not be duplicated on the page');
});

test('the done screen keeps its promise positive and channel-agnostic', () => {
  assert.match(html, /within 24 hours to confirm your spot/);
  assert.match(html, /24시간 안에 연락드려 자리를 확정해 드립니다/);
  // 부정문과 채널 이름은 쓰지 않기로 했다(스펙 5.5).
  assert.doesNotMatch(html, /not confirmed|자리가 확정된 것은 아닙니다/);

  // 스펙 5.5가 막는 건 "어느 채널로 연락하겠다"는 약속 문장이다. 게스트가 폼에서
  // 고른 수단이 제각각이라, 약속에 특정 앱을 박으면 다른 걸 고른 사람에게 틀린
  // 문장이 된다. 아래 버튼들은 반대 방향(게스트가 우리에게 연락하는 창구)이고
  // 이미 Instagram·KakaoTalk이 버튼으로 있으므로 이 금지 대상이 아니다.
  // 2026-08-10 이전에는 done 이후 400자를 통째로 훑어서 둘을 구분하지 못했다.
  const promises = [
    ...html.matchAll(/data-i18n="apply\.done\.body">([\s\S]*?)<\/p>/g),
    ...html.matchAll(/\bbody: '([^']*(?:24 hours|24시간)[^']*)'/g),
  ].map((match) => match[1]);
  // 정규식이 아무것도 못 잡으면 아래 단언은 통과해 버린다. 마크업 한 벌 + 카피 EN/KO.
  assert.equal(promises.length, 3, `약속 문장을 못 찾았다: ${promises.length}`);
  // 폼의 연락 수단 선택지 전부 + 흔한 한글 표기. 대소문자는 무시한다.
  const channelNames = /whats\s?app|왓츠앱|\bline\b|라인|wechat|위챗|instagram|인스타(그램)?|kakao\s?talk|카카오톡|카톡/i;
  for (const promise of promises) {
    assert.doesNotMatch(promise, channelNames, `약속 문장에 채널 이름이 들어갔다: ${promise.trim()}`);
  }
});

test('privacy notice states purpose, retention and the request channel', () => {
  assert.match(html, /6 months|6개월/);
  assert.match(html, /zeroone\.soma@gmail\.com/);
  assert.match(html, /buddy/i, 'must disclose sharing with the assigned buddy');
});

test('the collapsed half of the notice is still readable before consenting', () => {
  // 고지를 접은 건 길이 때문이지 감추려는 게 아니다. details는 닫혀 있어도
  // 내용이 DOM에 있어야 하고, hidden이 붙거나 스크립트가 열어줘야 하는
  // 구조가 되면 동의 전에 읽을 수 없는 고지가 된다.
  const box = html.match(/<details class="privacy-toggle[^"]*">[\s\S]*?<\/details>/);
  assert.ok(box, 'the notice detail must live in a details element');
  const summary = box[0].match(/<summary[\s\S]*?>/)[0];
  assert.match(summary, /data-i18n="apply\.privacyToggle"/, 'the toggle needs a label');
  // summary의 display를 바꾸면 브라우저에 따라 펼침 위젯 취급을 잃어 키보드로
  // 열 수 없게 된다. 마우스로는 멀쩡해 보여서 눈으로는 못 잡는다.
  assert.doesNotMatch(summary, /\b(?:inline-block|inline-flex|flex|grid|contents|hidden)\b/,
    'summary must keep its native display');
  assert.match(box[0], /data-i18n="apply\.privacy"/, 'the full notice belongs inside the toggle');
  // 클래스만 보면 hidden 속성이나 aria-hidden, 인라인 display:none으로도
  // 같은 사고가 난다. 감추는 수단을 전부 차단한다.
  assert.doesNotMatch(box[0], /class="[^"]*\bhidden\b|\shidden[\s>]|aria-hidden="true"|display:\s*none/,
    'nothing in the notice may be hidden from anyone');

  // 접힌 쪽과 보이는 쪽을 합친 것이 고지 전체다. 요약만 남고 상세가 빠지면
  // 수집 항목을 알리지 않은 채 동의를 받게 된다.
  assert.match(html, /data-i18n="apply\.privacySummary"/, 'the always-visible summary must exist');
  const consent = html.indexOf('name="consent"');
  assert.ok(html.indexOf('data-i18n="apply.privacySummary"') < consent, 'the notice must precede the checkbox');
  // 클래스 이름만 찾으면 style 블록의 .privacy-toggle 규칙이 먼저 잡혀
  // 순서 검사가 늘 통과한다. 마크업 여는 태그로 고정한다.
  assert.ok(html.indexOf('<details class="privacy-toggle') < consent, 'the toggle must precede the checkbox');
});

test('every language ships both halves of the privacy notice', () => {
  // 한쪽 언어에만 키를 넣으면 그 언어에서 고지가 통째로 빈 문단이 된다.
  // 전체 개수만 세면 EN에 두 번, KO에 0번이어도 통과하므로 블록을 갈라 센다.
  const koStart = html.indexOf('      ko: {');
  assert.ok(koStart > 0, 'the KO copy block must exist');
  const blocks = { EN: html.slice(0, koStart), KO: html.slice(koStart) };
  for (const key of ['privacySummary', 'privacyToggle', 'privacy']) {
    for (const [lang, block] of Object.entries(blocks)) {
      const hits = block.match(new RegExp(`^ {10}${key}: '`, 'gm')) || [];
      assert.equal(hits.length, 1, `${key} must appear exactly once in ${lang}`);
    }
  }
});

test('nav and shared footer identity stay in sync with index', () => {
  for (const snippet of ['HanBuddy by ZeroOne', '<script src="/assets/analytics.js"></script>']) {
    assert.ok(html.includes(snippet), `apply page missing: ${snippet}`);
  }
});

test('application consent copy states its stricter pre-consent policy', () => {
  const consentBlocks = (source) => source.match(/^ {8}consent: \{[\s\S]*?^ {8}\},$/gm) || [];
  const applyConsent = consentBlocks(html);
  assert.equal(applyConsent.length, 2, 'EN and KO application consent copy must exist');
  assert.notDeepEqual(applyConsent, consentBlocks(indexHtml), 'application copy must describe basic mode');
  for (const block of applyConsent) {
    assert.match(block, /before you accept|허용하기 전/);
    assert.match(block, /Google|Meta/);
    assert.match(block, /answers|입력값/);
    assert.match(block, /UTM/);
  }
});

test('the page declares its analytics context', () => {
  assert.match(html, /data-analytics-page-type="application"/);
});

test('a valid prefilled event joins the application page view to the content funnel', () => {
  assert.match(html, /SLOTS\.openEvents\(\)\.some\(\(event\) => event\.id === prefilledEvent\)/);
  assert.match(html, /document\.body\.dataset\.analyticsContentId = prefilledEvent/);
});

test('the canonical funnel uses shared context without reading selected form values', () => {
  assert.match(measurementJs, /application_form_open[\s\S]*application_start[\s\S]*generate_lead/);
  const context = html.match(/const applicationContext = \(\) => \(\{[\s\S]*?^    \}\);/m)?.[0] || '';
  assert.ok(context, 'application context must be readable');
  assert.match(context, /content_language: currentLanguage\(\)/);
  assert.match(context, /content_id: document\.body\.dataset\.analyticsContentId/);
  assert.doesNotMatch(context, /form\.elements|payload\./);
  assert.match(html, /applicationFunnel\.start\(\{ isTrusted: inputEvent\.isTrusted \}\)/);
  assert.match(html, /onEnabled\?\.\(\(\) => applicationFunnel\.retry\(\)\)/,
    'granting consent must retry an eligible start that was previously blocked');
  assert.match(html, /normalizePayload: \(payload\) => \{[\s\S]*?VALIDATION\.validateApplication\(payload\)/,
    'idempotency compares the same normalized payload that the API validates');
  assert.match(
    html,
    /datePicker\.onChange\(\(_iso, isTrusted\) => applicationFunnel\.start\(\{ isTrusted \}\)\);/,
    'choosing a date is a real form interaction even though the picker writes a hidden input',
  );
});

test('a successful application sends the recommended GA lead and the Meta standard Lead', () => {
  assert.match(html, /if \(outcome\.status !== 'success'\)[\s\S]*applicationFunnel\.complete\(\)/);
  assert.match(measurementJs, /trackEvent\('generate_lead'/);
  assert.match(measurementJs, /trackLead\(\)/);
  assert.doesNotMatch(html, /track\('application_submitted'/);
});

test('validation and failed API outcomes cannot reach lead completion', () => {
  const validation = html.indexOf('if (!local.ok) return showFieldError(local.field, copy);');
  const request = html.indexOf('applicationSubmitter.submit(payload)');
  const successGate = html.indexOf("if (outcome.status !== 'success')");
  const completion = html.indexOf('applicationFunnel.complete();');
  assert.ok(validation >= 0 && validation < request, 'local validation must precede the request');
  assert.ok(request < successGate && successGate < completion, 'only the success branch may complete the funnel');
});

test('application payload never collects browser attribution data', () => {
  const payload = html.match(/const payload = \{[\s\S]*?^      \};/m)?.[0] || '';
  assert.ok(payload, 'application payload block must be readable');
  assert.doesNotMatch(payload, /document\.referrer|location\.search|\butm_|\breferrer\s*:/i);
  assert.match(payload, /source: form\.elements\.source\.value/);
  assert.match(payload, /sourceOther: form\.elements\.sourceOther\.value/);

  for (const field of ['name', 'nationality', 'contactMethod', 'contactId', 'requests',
    'source', 'sourceOther', 'slotIso', 'guests', 'consent']) {
    assert.doesNotMatch(measurementJs, new RegExp(`['"]${field}['"]`), `${field} must not be allowlisted`);
  }
});

test('the invalid state is visible, not just announced', () => {
  // Tailwind CDN이 이 페이지의 style 블록보다 뒤에 주입되므로 같은 명시도로 쓰면
  // .border-line-strong이 이겨서 잘못된 항목이 정상 항목과 똑같이 보인다.
  assert.match(html, /input\[aria-invalid='true'\]/);
  assert.match(html, /aria-describedby', 'form-error'/);
  assert.match(html, /id="form-error"/);
  // 메시지를 지목된 항목 옆으로 옮기지 않으면 포커스가 이동한 순간 화면 밖으로 나간다.
  assert.match(html, /appendChild\(errorBox\)/);
  assert.match(html, /scrollIntoView\(\{ block: 'center' \}\)/);
});

test('the price survives a narrow screen', () => {
  // 좁은 화면에서 select 안 글자가 잘리면 선택한 회차의 가격이 통째로 사라진다.
  assert.match(html, /data-event-price/);
  for (const locale of [/pricePerPerson: \(amount\) => `₩\$\{amount\} per person`/, /pricePerPerson: \(amount\) => `1인 ₩\$\{amount\}`/]) {
    assert.match(html, locale, 'both locales must state the per-person price');
  }
});
