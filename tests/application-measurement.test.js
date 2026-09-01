const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const measurement = require('../assets/application-measurement.js');
const measurementSource = readFileSync(
  join(__dirname, '..', 'assets', 'application-measurement.js'),
  'utf8',
);

const context = {
  page_type: 'application',
  content_type: 'experience',
  content_id: 'kbo-gocheok',
  content_language: 'en',
  landing_variant: 'local',
  prefilled: true,
};
const FIXTURE_APPLICATION_ID = 'HB-20260901-ABCDEFGHJKLMNPQR';
const applicationResponse = ({
  httpOk = true,
  body = { ok: true, applicationId: FIXTURE_APPLICATION_ID },
} = {}) => ({
  ok: httpOk,
  json: async () => body,
});
const consentControlledFunnel = ({ recordEvent, recordLead = false } = {}) => {
  const calls = [];
  let consentGranted = false;
  const funnel = measurement.createApplicationFunnel({
    context: () => context,
    trackEvent: (name, params) => {
      if (!consentGranted) return false;
      calls.push(recordEvent ? recordEvent(name, params) : name);
      return true;
    },
    trackLead: recordLead ? () => calls.push(['meta', 'Lead']) : undefined,
  });
  return {
    calls,
    funnel,
    grantConsent() { consentGranted = true; },
  };
};

test('declares the canonical application funnel in order', () => {
  assert.deepEqual(measurement.CANONICAL_APPLICATION_FUNNEL, [
    'application_form_open',
    'application_start',
    'generate_lead',
  ]);
});

test('idempotency keys are KST-dated, high-entropy receipt ids without look-alike characters', () => {
  const crypto = {
    getRandomValues(bytes) {
      bytes.forEach((_value, index) => { bytes[index] = index; });
      return bytes;
    },
  };
  const key = measurement.buildIdempotencyKey({
    now: Date.parse('2026-08-06T23:59:00+09:00'),
    crypto,
  });

  assert.match(key, /^HB-20260806-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/);
  assert.throws(
    () => measurement.buildIdempotencyKey({ crypto: {} }),
    TypeError,
    'a missing cryptographic random source is a caller type error',
  );
});

test('application start and lead each emit once in canonical order', () => {
  const calls = [];
  const funnel = measurement.createApplicationFunnel({
    context: () => context,
    trackEvent: (name, params) => {
      calls.push(['ga', name, params]);
      return true;
    },
    trackLead: () => calls.push(['meta', 'Lead']),
  });

  assert.equal(funnel.complete(), false, 'a lead cannot precede application_start');
  assert.equal(funnel.start({ isTrusted: true }), true);
  assert.equal(funnel.start({ isTrusted: true }), false);
  assert.equal(funnel.complete(), true);
  assert.equal(funnel.complete(), false);
  assert.deepEqual(calls.map((entry) => entry.slice(0, 2)), [
    ['ga', 'application_start'],
    ['ga', 'generate_lead'],
    ['meta', 'Lead'],
  ]);
});

test('application start rejects synthetic interactions', () => {
  const calls = [];
  const funnel = measurement.createApplicationFunnel({
    context: () => context,
    trackEvent: (name) => {
      calls.push(name);
      return true;
    },
  });

  assert.equal(funnel.start({ isTrusted: false }), false);
  assert.equal(funnel.start({}), false);
  assert.equal(funnel.start(), false);
  assert.deepEqual(calls, []);
});

test('analytics delivery is confirmed only by exact boolean true', () => {
  for (const delivered of [1, 'true', {}, [], null, undefined]) {
    const funnel = measurement.createApplicationFunnel({
      trackEvent: () => delivered,
    });
    assert.equal(funnel.start({ isTrusted: true }), false);
  }
});

test('a trusted pre-consent start is delivered once when consent becomes available during completion', () => {
  const harness = consentControlledFunnel({
    recordEvent: (name, params) => ['ga', name, params],
    recordLead: true,
  });
  const { calls, funnel } = harness;

  assert.equal(funnel.start({ isTrusted: true }), false, 'a dropped event is not a delivered start');
  harness.grantConsent();
  assert.equal(funnel.complete(), true, 'completion retries the eligible start after consent');
  assert.equal(funnel.start({ isTrusted: true }), false);
  assert.equal(funnel.complete(), false);
  assert.deepEqual(calls.map((entry) => entry.slice(0, 2)), [
    ['ga', 'application_start'],
    ['ga', 'generate_lead'],
    ['meta', 'Lead'],
  ]);
});

test('a successful pre-consent submission can retry its pending funnel after consent', () => {
  const harness = consentControlledFunnel();
  const { calls, funnel } = harness;

  assert.equal(funnel.start({ isTrusted: true }), false);
  assert.equal(funnel.complete(), false, 'lead completion remains pending while delivery is blocked');
  harness.grantConsent();
  assert.equal(funnel.retry(), true);
  assert.deepEqual(calls, ['application_start', 'generate_lead']);
  assert.equal(funnel.retry(), false);
});

test('application analytics payloads use an allowlist and exclude all form fields', () => {
  const params = measurement.buildApplicationContext({
    ...context,
    name: '[redacted]',
    nationality: '[redacted]',
    contactMethod: '[redacted]',
    contactId: '[redacted]',
    requests: '[redacted]',
    source: '[redacted]',
    sourceOther: '[redacted]',
    slotIso: '[redacted]',
    guests: '[redacted]',
    consent: '[redacted]',
  });

  assert.deepEqual(params, context);
});

test('generate_lead is available only after a successful HTTP and API response', async () => {
  for (const [label, request, expected] of [
    ['success', async () => applicationResponse(), 'success'],
    ['HTTP failure', async () => applicationResponse({ httpOk: false }), 'failure'],
    ['API validation failure', async () => applicationResponse({ body: { ok: false, code: 'VALIDATION' } }), 'failure'],
    ['storage failure', async () => applicationResponse({ body: { ok: false, code: 'STORAGE' } }), 'failure'],
    ['request failure', async () => { throw new Error('network'); }, 'failure'],
    ['invalid JSON', async () => ({ ok: true, json: async () => { throw new Error('invalid'); } }), 'failure'],
  ]) {
    const submitter = measurement.createApplicationSubmitter({ request });
    const result = await submitter.submit({ fixture: label });
    assert.equal(result.status, expected, label);
  }
});

test('duplicate submits share no request and a completed application cannot emit twice', async () => {
  let release;
  let markStarted;
  let requests = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const requestStarted = new Promise((resolve) => { markStarted = resolve; });
  const submitter = measurement.createApplicationSubmitter({
    request: async () => {
      requests += 1;
      markStarted();
      await pending;
      return applicationResponse();
    },
  });

  const first = submitter.submit({ fixture: 'first' });
  assert.equal(submitter.canSubmit(), false);
  assert.deepEqual(await submitter.submit({ fixture: 'duplicate' }), { status: 'duplicate' });
  await requestStarted;
  assert.equal(requests, 1);
  release();
  assert.equal((await first).status, 'success');
  assert.deepEqual(await submitter.submit({ fixture: 'after-success' }), { status: 'duplicate' });
  assert.equal(requests, 1);
});

test('a failed request can be retried without creating a false lead', async () => {
  let requests = 0;
  const submitter = measurement.createApplicationSubmitter({
    request: async () => {
      requests += 1;
      return requests === 1
        ? applicationResponse({ httpOk: false, body: { ok: false, code: 'STORAGE' } })
        : applicationResponse();
    },
  });

  assert.equal((await submitter.submit({ fixture: 'first' })).status, 'failure');
  assert.equal(submitter.canSubmit(), true);
  assert.equal((await submitter.submit({ fixture: 'retry' })).status, 'success');
  assert.equal(requests, 2);
});

test('a lost response retry reuses one idempotency key for the logical submission', async () => {
  const requestHeaders = [];
  let requests = 0;
  let generatedKeys = 0;
  const submitter = measurement.createApplicationSubmitter({
    createIdempotencyKey: () => {
      generatedKeys += 1;
      return FIXTURE_APPLICATION_ID;
    },
    request: async (_url, init) => {
      requests += 1;
      requestHeaders.push(init.headers['idempotency-key']);
      if (requests === 1) {
        return { ok: true, json: async () => { throw new Error('response lost'); } };
      }
      return applicationResponse();
    },
  });

  assert.equal((await submitter.submit({ fixture: 'same application' })).status, 'failure');
  assert.equal((await submitter.submit({ fixture: 'same application' })).status, 'success');
  assert.equal(generatedKeys, 1);
  assert.deepEqual(requestHeaders, [
    FIXTURE_APPLICATION_ID,
    FIXTURE_APPLICATION_ID,
  ]);
});

test('editing fields after an ambiguous response creates a new key', async () => {
  const sent = [];
  const keys = [
    FIXTURE_APPLICATION_ID,
    'HB-20260901-RQPONMLKJHGFEDCB',
  ];
  const submitter = measurement.createApplicationSubmitter({
    createIdempotencyKey: () => keys.shift(),
    normalizePayload: (payload) => Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    ),
    request: async (_url, init) => {
      sent.push({ key: init.headers['idempotency-key'], body: init.body });
      if (sent.length < 3) throw new Error('response lost');
      return applicationResponse({ body: { ok: true, applicationId: sent.at(-1).key } });
    },
  });
  const original = { name: 'Julie', contactId: '+82 10 0000 0000', guests: '1' };
  const reordered = { guests: '1', contactId: ' +82 10 0000 0000 ', name: ' Julie ' };
  const edited = { ...original, contactId: '+82 10 9999 9999' };

  assert.equal((await submitter.submit(original)).status, 'failure');
  assert.equal((await submitter.submit(reordered)).status, 'failure');
  assert.equal((await submitter.submit(edited)).status, 'success');
  assert.deepEqual(sent.map(({ key }) => key), [
    FIXTURE_APPLICATION_ID,
    FIXTURE_APPLICATION_ID,
    'HB-20260901-RQPONMLKJHGFEDCB',
  ]);
  assert.equal(keys.length, 0);
});

test('submitter retains only opaque identity state and leaves browser persistence untouched', async () => {
  const persistenceWrites = [];
  const storage = (name) => ({
    getItem: () => null,
    removeItem: (key) => persistenceWrites.push([name, 'removeItem', key]),
    setItem: (key, value) => persistenceWrites.push([name, 'setItem', key, value]),
  });
  const browserTarget = {
    caches: {
      delete: (key) => persistenceWrites.push(['caches', 'delete', key]),
      open: (key) => persistenceWrites.push(['caches', 'open', key]),
    },
    document: Object.defineProperty({}, 'cookie', {
      set: (value) => persistenceWrites.push(['document', 'cookie', value]),
    }),
    indexedDB: {
      deleteDatabase: (name) => persistenceWrites.push(['indexedDB', 'deleteDatabase', name]),
      open: (name) => persistenceWrites.push(['indexedDB', 'open', name]),
    },
    localStorage: storage('localStorage'),
    sessionStorage: storage('sessionStorage'),
  };
  let moduleInstalled = false;
  const browserWindow = new Proxy(browserTarget, {
    set(target, key, value) {
      if (key === 'HanBuddyApplicationMeasurement' && !moduleInstalled) {
        moduleInstalled = true;
        target[key] = value;
        return true;
      }
      persistenceWrites.push(['window', String(key), value]);
      target[key] = value;
      return true;
    },
  });
  vm.runInNewContext(measurementSource, {
    TextEncoder,
    globalThis: browserWindow,
    window: browserWindow,
  });

  const observed = [];
  const submitter = browserWindow.HanBuddyApplicationMeasurement.createApplicationSubmitter({
    createIdempotencyKey: () => FIXTURE_APPLICATION_ID,
    createPayloadFingerprint: async () => 'a'.repeat(64),
    observeIdentityState: (state) => observed.push(state),
    request: async (_url, init) => {
      assert.match(init.body, /Julie Example|julie-private/,
        'raw values exist only in the transient service request');
      throw new Error('response lost');
    },
  });

  const applicant = {
    name: 'Julie Example',
    contactId: 'julie-private',
    requests: 'private dietary note',
  };
  assert.equal((await submitter.submit(applicant)).status, 'failure');

  assert.deepEqual(
    observed.map((state) => ({ ...state })),
    [
      { state: 'submitting', idempotencyKey: null, payloadFingerprint: null },
      {
        state: 'submitting',
        idempotencyKey: FIXTURE_APPLICATION_ID,
        payloadFingerprint: 'a'.repeat(64),
      },
      {
        state: 'idle',
        idempotencyKey: FIXTURE_APPLICATION_ID,
        payloadFingerprint: 'a'.repeat(64),
      },
    ],
  );
  for (const state of observed) {
    assert.deepEqual(Object.keys(state).sort((left, right) => left.localeCompare(right)), [
      'idempotencyKey',
      'payloadFingerprint',
      'state',
    ]);
    assert.equal(Object.isFrozen(state), true);
    assert.doesNotMatch(JSON.stringify(state), /Julie Example|julie-private|dietary note/);
  }
  assert.deepEqual(persistenceWrites, []);
});

test('payload fingerprints are stable, non-PII digests', async () => {
  const first = await measurement.buildPayloadFingerprint({
    name: 'Julie', contactId: '+82 10 0000 0000', nested: { b: 2, a: 1 },
  });
  const reordered = await measurement.buildPayloadFingerprint({
    nested: { a: 1, b: 2 }, contactId: '+82 10 0000 0000', name: 'Julie',
  });
  const edited = await measurement.buildPayloadFingerprint({
    name: 'Julie', contactId: '+82 10 9999 9999', nested: { a: 1, b: 2 },
  });

  assert.equal(first, reordered);
  assert.notEqual(first, edited);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /Julie|0000/);

  let canonical;
  const inspectingCrypto = {
    subtle: {
      async digest(_algorithm, bytes) {
        canonical = new TextDecoder().decode(bytes);
        return new Uint8Array(32);
      },
    },
  };
  await measurement.buildPayloadFingerprint({
    source: '',
    eventTitle: 'Korean BBQ Night',
    nationality: 'France',
    requests: '',
    contactMethod: 'WhatsApp',
    slotIso: '2026-09-02T19:00',
    language: 'en',
    guests: 1,
    eventId: 'samgyeopsal',
    name: 'Julie',
    contactId: '+82 10 0000 0000',
  }, { crypto: inspectingCrypto });
  assert.equal(
    canonical,
    '{"contactId":"+82 10 0000 0000","contactMethod":"WhatsApp",'
      + '"eventId":"samgyeopsal","eventTitle":"Korean BBQ Night","guests":1,'
      + '"language":"en","name":"Julie","nationality":"France","requests":"",'
      + '"slotIso":"2026-09-02T19:00","source":""}',
    'the normalized application schema has one deterministic key order',
  );
  await assert.rejects(
    measurement.buildPayloadFingerprint({}, { crypto: {} }),
    TypeError,
    'a missing cryptographic digest is a caller type error',
  );
});
