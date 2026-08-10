// 신청 폼과 랜딩 카드가 같은 날짜를 보게 하는 단일 소스.
// 브라우저(apply 페이지)와 Vercel Function이 함께 읽는다.
(function initEventSlots(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyEventSlots = api;
})(typeof window === 'undefined' ? null : window, () => {
  // iso는 KST 벽시계 시각이다. 타임존은 slotEpoch에서 붙인다.
  // label은 집합 시간임을 드러낸다(경기 시작 시각이 아니다).
  const EVENT_SLOTS = Object.freeze([
    {
      id: 'kbo-gocheok',
      title: { en: 'Indoor Dome KBO Baseball Night', ko: '고척돔 실내 야구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-12T17:30', label: { en: 'Wed, Aug 12 · Meet at 5:30 PM', ko: '8월 12일 (수) · 5:30 집합' } },
        { iso: '2026-08-21T17:30', label: { en: 'Fri, Aug 21 · Meet at 5:30 PM', ko: '8월 21일 (금) · 5:30 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
      ],
    },
    {
      id: 'kbo-jamsil',
      title: { en: 'Open-Air KBO Baseball Night at Jamsil', ko: '잠실 야외 야구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-15T17:00', label: { en: 'Sat, Aug 15 · Meet at 5:00 PM', ko: '8월 15일 (토) · 5:00 집합' } },
        { iso: '2026-08-16T17:00', label: { en: 'Sun, Aug 16 · Meet at 5:00 PM', ko: '8월 16일 (일) · 5:00 집합' } },
        { iso: '2026-08-21T17:30', label: { en: 'Fri, Aug 21 · Meet at 5:30 PM', ko: '8월 21일 (금) · 5:30 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
      ],
    },
    {
      id: 'kleague',
      title: { en: 'K League Football Night', ko: 'K리그 축구 직관' },
      price: 60000,
      slots: [
        { iso: '2026-08-15T18:30', label: { en: 'Sat, Aug 15 · Meet at 6:30 PM', ko: '8월 15일 (토) · 6:30 집합' } },
      ],
    },
    {
      id: 'hanriver',
      title: { en: 'Han River Picnic', ko: '한강 피크닉' },
      price: 25000,
      slots: [
        { iso: '2026-08-15T17:00', label: { en: 'Sat, Aug 15 · Meet at 5:00 PM', ko: '8월 15일 (토) · 5:00 집합' } },
        { iso: '2026-08-16T17:00', label: { en: 'Sun, Aug 16 · Meet at 5:00 PM', ko: '8월 16일 (일) · 5:00 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
        { iso: '2026-08-23T17:00', label: { en: 'Sun, Aug 23 · Meet at 5:00 PM', ko: '8월 23일 (일) · 5:00 집합' } },
      ],
    },
  ]);

  // 방문자 기기의 시간대와 무관하게 같은 결과를 내야 하므로 KST를 명시해 파싱한다.
  const slotEpoch = (iso) => Date.parse(`${iso}:00+09:00`);
  const isSlotPast = (iso, now = Date.now()) => slotEpoch(iso) <= now;

  const openEvents = (now = Date.now()) => EVENT_SLOTS
    .map((event) => ({ ...event, slots: event.slots.filter((slot) => !isSlotPast(slot.iso, now)) }))
    .filter((event) => event.slots.length > 0);

  const findEvent = (eventId) => EVENT_SLOTS.find((event) => event.id === eventId) || null;

  const findSlot = (eventId, iso) => {
    const event = findEvent(eventId);
    if (!event) return null;
    return event.slots.find((slot) => slot.iso === iso) || null;
  };

  return { EVENT_SLOTS, slotEpoch, isSlotPast, openEvents, findEvent, findSlot };
});
