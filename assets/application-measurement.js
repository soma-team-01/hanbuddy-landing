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
  const LANGUAGES = new Set(['en', 'ko']);
  const LANDING_VARIANTS = new Set(['local', 'friends', 'none']);

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
    let started = false;
    let completed = false;

    return {
      start({ isTrusted } = {}) {
        if (isTrusted !== true) return false;
        if (started || completed) return false;
        started = true;
        trackEvent('application_start', buildApplicationContext(context()));
        return true;
      },
      complete() {
        if (!started || completed) return false;
        completed = true;
        trackEvent('generate_lead', buildApplicationContext(context()));
        trackLead();
        return true;
      },
    };
  };

  const createApplicationSubmitter = ({ request } = {}) => {
    if (typeof request !== 'function') throw new TypeError('request must be a function');
    let state = 'idle';

    return {
      canSubmit: () => state === 'idle',
      async submit(payload) {
        if (state !== 'idle') return { status: 'duplicate' };
        state = 'submitting';
        try {
          const response = await request('/api/apply', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (response.ok !== true || result?.ok !== true) {
            state = 'idle';
            return { status: 'failure', result };
          }
          state = 'completed';
          return { status: 'success', result };
        } catch (error) {
          state = 'idle';
          return { status: 'failure', error };
        }
      },
    };
  };

  return {
    CANONICAL_APPLICATION_FUNNEL,
    buildApplicationContext,
    createApplicationFunnel,
    createApplicationSubmitter,
  };
});
