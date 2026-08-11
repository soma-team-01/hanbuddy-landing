// 활동 제안 폼 검증. 브라우저 검증은 우회할 수 있으므로 서버가 같은 함수로 다시 판정한다.
(function initSuggestValidation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddySuggestValidation = api;
})(typeof window === 'undefined' ? null : window, () => {
  const MAX_LENGTH = { activity: 200, contact: 100 };

  const fail = (field) => ({ ok: false, field });
  const text = (value) => (typeof value === 'string' ? value.trim() : '');

  const validateSuggestion = (payload = {}) => {
    // 봇만 채우는 필드. 성공처럼 보이게 응답하되 저장하지 않는다(호출부에서 처리).
    if (text(payload.website)) return fail('website');

    const activity = text(payload.activity);
    if (!activity || activity.length > MAX_LENGTH.activity) return fail('activity');

    const contact = text(payload.contact);
    if (contact.length > MAX_LENGTH.contact) return fail('contact');

    const language = text(payload.language) === 'ko' ? 'ko' : 'en';

    return {
      ok: true,
      value: {
        activity,
        contact,
        language,
      },
    };
  };

  return { MAX_LENGTH, validateSuggestion };
});
