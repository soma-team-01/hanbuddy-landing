// 폼 검증. 브라우저 검증은 우회할 수 있으므로 서버가 같은 함수로 다시 판정한다.
(function initApplyValidation(root, factory) {
  const slots = typeof require === 'function'
    ? require('./event-slots.js')
    : root.HanBuddyEventSlots;
  const api = factory(slots);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyApplyValidation = api;
})(typeof window === 'undefined' ? null : window, (slots) => {
  const FIELD_OPTIONS = Object.freeze({
    koreanLevel: ['None', 'Basic', 'Intermediate', 'Fluent'],
    contactMethod: ['WhatsApp', 'LINE', 'KakaoTalk', 'Instagram DM', 'WeChat', 'Other'],
    paymentMethod: ['Korean bank transfer', 'PayPal', 'Card payment link', 'Cash', 'I need help'],
    source: ['Offline promotion', 'Meetup', 'Instagram', 'Friend', 'University community', 'Other'],
  });

  const MAX_LENGTH = { name: 100, nationality: 100, contactId: 200, requests: 1000, sourceOther: 100 };
  const SOURCE_OTHER = 'Other';

  const fail = (field) => ({ ok: false, field });
  const text = (value) => (typeof value === 'string' ? value.trim() : '');

  const validateApplication = (payload = {}, now = Date.now()) => {
    // 봇만 채우는 필드. 성공처럼 보이게 응답하되 저장하지 않는다(호출부에서 처리).
    if (text(payload.website)) return fail('website');

    const event = slots.findEvent(text(payload.eventId));
    if (!event) return fail('eventId');

    // now를 넘겨야 상시 오픈 회차의 리드타임·기간 판정이 호출 시각과 어긋나지 않는다.
    const slot = slots.findSlot(event.id, text(payload.slotIso), now);
    if (!slot || slots.isSlotPast(slot.iso, now)) return fail('slotIso');

    const guests = Number(text(payload.guests));
    if (!Number.isInteger(guests) || guests < 1 || guests > 10) return fail('guests');

    for (const field of ['name', 'nationality', 'contactId']) {
      const value = text(payload[field]);
      if (!value || value.length > MAX_LENGTH[field]) return fail(field);
    }

    for (const field of ['koreanLevel', 'contactMethod', 'paymentMethod']) {
      if (!FIELD_OPTIONS[field].includes(text(payload[field]))) return fail(field);
    }

    const source = text(payload.source);
    if (source && !FIELD_OPTIONS.source.includes(source)) return fail('source');

    // Other를 고르면 무엇이었는지 적어야 한다. 컬럼을 늘리지 않고 한 칸에 합쳐 둔다.
    let storedSource = source;
    if (source === SOURCE_OTHER) {
      const detail = text(payload.sourceOther);
      if (!detail || detail.length > MAX_LENGTH.sourceOther) return fail('sourceOther');
      storedSource = `${SOURCE_OTHER}: ${detail}`;
    }

    const requests = text(payload.requests);
    if (requests.length > MAX_LENGTH.requests) return fail('requests');

    if (payload.consent !== true) return fail('consent');

    const language = text(payload.language) === 'ko' ? 'ko' : 'en';

    return {
      ok: true,
      value: {
        eventId: event.id,
        eventTitle: event.title.en,
        slotIso: slot.iso,
        guests,
        name: text(payload.name),
        nationality: text(payload.nationality),
        koreanLevel: text(payload.koreanLevel),
        contactMethod: text(payload.contactMethod),
        contactId: text(payload.contactId),
        paymentMethod: text(payload.paymentMethod),
        requests,
        source: storedSource,
        language,
      },
    };
  };

  return { FIELD_OPTIONS, MAX_LENGTH, validateApplication };
});
