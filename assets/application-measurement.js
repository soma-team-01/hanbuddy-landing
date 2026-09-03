// 신청 퍼널의 측정과 중복 제출 방지는 브라우저와 Node 테스트가 같은 코드를 쓴다.
// 폼 값은 이 모듈의 allowlist를 통과할 수 없다.
(function initApplicationMeasurement(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyApplicationMeasurement = api;
})(typeof window === 'undefined' ? null : window, () => {
  const CANONICAL_APPLICATION_FUNNEL = Object.freeze([
    'application_form_open',
    'application_start',
    'generate_lead',
  ]);

  const CONTENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const IDEMPOTENCY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const LANGUAGES = new Set(['en', 'ko']);
  const LANDING_VARIANTS = new Set(['local', 'friends', 'none']);
  // Tracking adapters confirm delivery only with the exact boolean true. Truthy
  // return values must stay retryable because they do not prove consented delivery.
  const deliveryConfirmed = (result) => Object.is(result, true);

  const buildApplicationContext = (source = {}) => {
    const context = {
      page_type: 'application',
    };
    if (source.content_type === 'experience') context.content_type = source.content_type;
    if (CONTENT_ID_PATTERN.test(source.content_id || '')) context.content_id = source.content_id;
    if (LANGUAGES.has(source.content_language)) context.content_language = source.content_language;
    if (LANDING_VARIANTS.has(source.landing_variant)) context.landing_variant = source.landing_variant;
    if (typeof source.prefilled === 'boolean') context.prefilled = source.prefilled;
    return context;
  };

  const createApplicationFunnel = ({
    context = () => ({}),
    trackEvent = () => {},
    trackLead = () => {},
  } = {}) => {
    let startEligible = false;
    let started = false;
    let completionPending = false;
    let completed = false;

    const deliverStart = () => {
      if (!startEligible || started || completed) return false;
      const delivered = trackEvent('application_start', buildApplicationContext(context()));
      if (!deliveryConfirmed(delivered)) return false;
      started = true;
      return true;
    };

    const deliverCompletion = () => {
      if (!completionPending || !started || completed) return false;
      const delivered = trackEvent('generate_lead', buildApplicationContext(context()));
      if (!deliveryConfirmed(delivered)) return false;
      completed = true;
      completionPending = false;
      trackLead();
      return true;
    };

    const retry = () => {
      const startDelivered = deliverStart();
      const completionDelivered = deliverCompletion();
      return startDelivered || completionDelivered;
    };

    return {
      start({ isTrusted } = {}) {
        if (isTrusted !== true) return false;
        startEligible = true;
        return deliverStart();
      },
      complete() {
        if (!startEligible || completed) return false;
        completionPending = true;
        retry();
        return completed;
      },
      retry,
    };
  };

  const buildIdempotencyKey = ({ now = Date.now(), crypto = globalThis.crypto } = {}) => {
    if (typeof crypto?.getRandomValues !== 'function') {
      throw new TypeError('secure randomness unavailable');
    }
    const ymd = new Date(now + (9 * 60 * 60 * 1000))
      .toISOString().slice(0, 10).replaceAll('-', '');
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let suffix = '';
    for (const byte of bytes) suffix += IDEMPOTENCY_ALPHABET[byte % IDEMPOTENCY_ALPHABET.length];
    return `HB-${ymd}-${suffix}`;
  };

  const stableValue = (value) => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
      const result = {};
      for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right, 'en'))) {
        if (value[key] !== undefined) result[key] = stableValue(value[key]);
      }
      return result;
    }
    return value;
  };

  const buildPayloadFingerprint = async (payload, { crypto = globalThis.crypto } = {}) => {
    if (typeof crypto?.subtle?.digest !== 'function') {
      throw new TypeError('secure digest unavailable');
    }
    const canonical = JSON.stringify(stableValue(payload));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  const createSubmissionIdentityState = (observeIdentityState) => {
    let state = 'idle';
    let idempotencyKey = null;
    let payloadFingerprint = null;
    const notify = typeof observeIdentityState === 'function'
      ? observeIdentityState
      : () => {};
    const emitSnapshot = () => notify(Object.freeze({
      state,
      idempotencyKey,
      payloadFingerprint,
    }));

    return {
      canSubmit: () => state === 'idle',
      begin() {
        if (state !== 'idle') return false;
        state = 'submitting';
        emitSnapshot();
        return true;
      },
      identify(nextFingerprint, createIdempotencyKey) {
        if (payloadFingerprint !== nextFingerprint) {
          idempotencyKey = createIdempotencyKey();
          payloadFingerprint = nextFingerprint;
        }
        emitSnapshot();
        return idempotencyKey;
      },
      fail() {
        state = 'idle';
        emitSnapshot();
      },
      complete() {
        state = 'completed';
        emitSnapshot();
      },
    };
  };

  const createApplicationSubmitter = ({
    request,
    createIdempotencyKey = buildIdempotencyKey,
    createPayloadFingerprint = buildPayloadFingerprint,
    normalizePayload = (payload) => payload,
    observeIdentityState,
  } = {}) => {
    if (typeof request !== 'function') throw new TypeError('request must be a function');
    const identity = createSubmissionIdentityState(observeIdentityState);

    return {
      canSubmit: identity.canSubmit,
      async submit(payload) {
        if (!identity.begin()) return { status: 'duplicate' };
        try {
          const nextFingerprint = await createPayloadFingerprint(normalizePayload(payload));
          const idempotencyKey = identity.identify(nextFingerprint, createIdempotencyKey);
          const response = await request('/api/apply', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'idempotency-key': idempotencyKey,
            },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (response.ok !== true || result?.ok !== true) {
            identity.fail();
            return { status: 'failure', result };
          }
          identity.complete();
          return { status: 'success', result };
        } catch (error) {
          identity.fail();
          return { status: 'failure', error };
        }
      },
    };
  };

  return {
    CANONICAL_APPLICATION_FUNNEL,
    buildApplicationContext,
    buildIdempotencyKey,
    buildPayloadFingerprint,
    createApplicationFunnel,
    createApplicationSubmitter,
  };
});
