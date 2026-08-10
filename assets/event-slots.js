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
      price: 20000,
      slots: [
        { iso: '2026-08-15T17:00', label: { en: 'Sat, Aug 15 · Meet at 5:00 PM', ko: '8월 15일 (토) · 5:00 집합' } },
        { iso: '2026-08-16T17:00', label: { en: 'Sun, Aug 16 · Meet at 5:00 PM', ko: '8월 16일 (일) · 5:00 집합' } },
        { iso: '2026-08-22T17:00', label: { en: 'Sat, Aug 22 · Meet at 5:00 PM', ko: '8월 22일 (토) · 5:00 집합' } },
        { iso: '2026-08-23T17:00', label: { en: 'Sun, Aug 23 · Meet at 5:00 PM', ko: '8월 23일 (일) · 5:00 집합' } },
      ],
    },
    // 상시 오픈 회차는 `slots` 대신 `recurring`을 갖는다. 야구·축구·한강은 티켓과
    // 자리를 미리 잡아야 해서 날짜마다 재고가 생기지만, 음식은 식당 예약만 하면
    // 되므로 열어두는 데 비용이 들지 않는다. 두 모델은 계속 공존한다.
    {
      id: 'samgyeopsal',
      title: { en: 'Korean BBQ Night', ko: '삼겹살 나이트' },
      price: 20000,
      recurring: { weekdays: true, time: '19:00', leadDays: 2, horizonDays: 30 },
    },
    {
      id: 'chimaek',
      title: { en: 'Chimaek Night', ko: '치맥 나이트' },
      price: 20000,
      recurring: { weekdays: true, time: '19:00', leadDays: 2, horizonDays: 30 },
    },
  ]);

  // 방문자 기기의 시간대와 무관하게 같은 결과를 내야 하므로 KST를 명시해 파싱한다.
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const slotEpoch = (iso) => Date.parse(`${iso}:00+09:00`);
  const isSlotPast = (iso, now = Date.now()) => slotEpoch(iso) <= now;

  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

  // 오늘이 며칠인지는 KST 달력 기준이다. 방문자가 어느 시간대에 있든,
  // 서버가 UTC로 돌든 같은 날짜가 나와야 한다.
  const kstToday = (now) => new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);

  // 날짜 문자열끼리의 계산은 UTC 자정으로 고정해서 한다. 로컬 타임존이 끼면
  // 서머타임이나 오프셋 때문에 날짜가 하루씩 밀린다.
  const ymdToUtc = (ymd) => Date.UTC(
    Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)),
  );
  const shiftDays = (ymd, days) => new Date(ymdToUtc(ymd) + days * DAY_MS).toISOString().slice(0, 10);
  const weekdayIndex = (ymd) => new Date(ymdToUtc(ymd)).getUTCDay();
  const isWeekend = (ymd) => weekdayIndex(ymd) === 0 || weekdayIndex(ymd) === 6;

  // 라벨은 고정 표를 쓴다. toLocaleDateString은 실행 환경의 로케일 데이터에
  // 따라 달라져서 브라우저와 함수가 다른 문자열을 만들 수 있다.
  const clockLabel = (time) => {
    const hour24 = Number(time.slice(0, 2));
    const minute = time.slice(3, 5);
    const hour12 = ((hour24 + 11) % 12) + 1;
    return { hour12: `${hour12}:${minute}`, suffix: hour24 < 12 ? 'AM' : 'PM' };
  };

  const recurringLabel = (ymd, time) => {
    const day = weekdayIndex(ymd);
    const month = Number(ymd.slice(5, 7)) - 1;
    const dayOfMonth = Number(ymd.slice(8, 10));
    const clock = clockLabel(time);
    return {
      en: `${DAYS_EN[day]}, ${MONTHS_EN[month]} ${dayOfMonth} · Meet at ${clock.hour12} ${clock.suffix}`,
      ko: `${month + 1}월 ${dayOfMonth}일 (${DAYS_KO[day]}) · ${clock.hour12} 집합`,
    };
  };

  // 상시 오픈 회차가 지금 받을 수 있는 날짜 전부. 폼은 이 목록만 보여주므로
  // 주말과 리드타임 이내 날짜는 애초에 고를 수가 없다.
  const recurringDates = (event, now = Date.now()) => {
    const rule = event && event.recurring;
    if (!rule) return [];
    const today = kstToday(now);
    const dates = [];
    for (let offset = rule.leadDays; offset <= rule.horizonDays; offset += 1) {
      const ymd = shiftDays(today, offset);
      if (rule.weekdays && isWeekend(ymd)) continue;
      dates.push({ iso: `${ymd}T${rule.time}`, label: recurringLabel(ymd, rule.time) });
    }
    return dates;
  };

  const openEvents = (now = Date.now()) => EVENT_SLOTS
    .map((event) => (event.recurring
      ? { ...event }
      : { ...event, slots: event.slots.filter((slot) => !isSlotPast(slot.iso, now)) }))
    .filter((event) => (event.recurring
      ? recurringDates(event, now).length > 0
      : event.slots.length > 0));

  const findEvent = (eventId) => EVENT_SLOTS.find((event) => event.id === eventId) || null;

  // 브라우저에서 고른 날짜든 손으로 만든 요청이든 같은 함수를 지난다.
  // 서버(api/apply.js -> validateApplication)가 이걸 다시 부르므로,
  // 폼을 우회해 임의의 slotIso를 보내도 여기서 걸린다.
  const findSlot = (eventId, iso, now = Date.now()) => {
    const event = findEvent(eventId);
    if (!event) return null;
    if (event.recurring) {
      return recurringDates(event, now).find((slot) => slot.iso === iso) || null;
    }
    return event.slots.find((slot) => slot.iso === iso) || null;
  };

  return {
    EVENT_SLOTS, slotEpoch, isSlotPast, openEvents, findEvent, findSlot, recurringDates,
  };
});
