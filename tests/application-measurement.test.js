const assert = require('node:assert/strict');
const test = require('node:test');

const measurement = require('../assets/application-measurement.js');

const context = {
  page_type: 'application',
  content_type: 'experience',
  content_id: 'kbo-gocheok',
  content_language: 'en',
  landing_variant: 'local',
  prefilled: true,
};

test('declares the canonical application funnel in order', () => {
  assert.deepEqual(measurement.CANONICAL_APPLICATION_FUNNEL, [
    'application_form_open',
    'application_start',
    'generate_lead',
  ]);
});

test('application start and lead each emit once in canonical order', () => {
  const calls = [];
  const funnel = measurement.createApplicationFunnel({
    context: () => context,
    trackEvent: (name, params) => calls.push(['ga', name, params]),
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
    trackEvent: (name) => calls.push(name),
  });

  assert.equal(funnel.start({ isTrusted: false }), false);
  assert.equal(funnel.start({}), false);
  assert.equal(funnel.start(), false);
  assert.deepEqual(calls, []);
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
    ['success', async () => ({ ok: true, json: async () => ({ ok: true, applicationId: 'fixture-id' }) }), 'success'],
    ['HTTP failure', async () => ({ ok: false, json: async () => ({ ok: true, applicationId: 'fixture-id' }) }), 'failure'],
    ['API validation failure', async () => ({ ok: true, json: async () => ({ ok: false, code: 'VALIDATION' }) }), 'failure'],
    ['storage failure', async () => ({ ok: true, json: async () => ({ ok: false, code: 'STORAGE' }) }), 'failure'],
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
  let requests = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const submitter = measurement.createApplicationSubmitter({
    request: async () => {
      requests += 1;
      await pending;
      return { ok: true, json: async () => ({ ok: true, applicationId: 'fixture-id' }) };
    },
  });

  const first = submitter.submit({ fixture: 'first' });
  assert.equal(submitter.canSubmit(), false);
  assert.deepEqual(await submitter.submit({ fixture: 'duplicate' }), { status: 'duplicate' });
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
        ? { ok: false, json: async () => ({ ok: false, code: 'STORAGE' }) }
        : { ok: true, json: async () => ({ ok: true, applicationId: 'fixture-id' }) };
    },
  });

  assert.equal((await submitter.submit({ fixture: 'first' })).status, 'failure');
  assert.equal(submitter.canSubmit(), true);
  assert.equal((await submitter.submit({ fixture: 'retry' })).status, 'success');
  assert.equal(requests, 2);
});
