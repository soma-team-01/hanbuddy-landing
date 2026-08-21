// 신청 폼과 랜딩 카드가 같은 날짜를 보게 하는 단일 소스.
// 브라우저(apply 페이지)와 Vercel Function이 함께 읽는다.
(function initEventSlots(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyEventSlots = api;
})(typeof window === 'undefined' ? null : window, () => {
  // 문자열은 KST 벽시계 기준의 집합 시각이다(경기 시작 시각이 아니다).
  // 타임존은 slotEpoch에서 붙이고, 사람이 읽는 라벨은 slotLabel이 만든다.
  //
  // 두 모델이 공존한다.
  // - `slots`: 경기가 있는 날에만 티켓이 존재하는 종목(야구·축구). 리그 일정에
  //   묶여 있어 우리가 날짜를 정할 수 없다. 잔여경기가 편성되면 갱신해야 한다.
  //   집합은 경기 시작 60분 전으로 통일한다. 주말 경기가 14:00에 시작하는 날도
  //   있어서 요일만 보고 집합 시각을 정하면 경기가 끝난 뒤 모이게 된다.
  // - `recurring`: 우리가 예약만 하면 되는 활동(음식·한강). 날짜를 열어두는 데
  //   비용이 들지 않으므로 평일·주말 없이 전부 연다.
  //
  // 현재 채워진 리그 일정은 2026-09-06까지다. KBO가 그 이후 잔여경기를 아직
  // 편성하지 않았다. 편성되면 여기에 날짜를 추가한다.
  const EVENT_SLOTS = Object.freeze([
    {
      id: 'kbo-gocheok',
      title: { en: 'Indoor Dome KBO Baseball Night', ko: '고척돔 실내 야구 직관' },
      price: 60000,
      // 카드에 먼저 보여줄 날짜. 오픈은 전부 열어두되, 사람을 모으고 싶은 날은
      // 운영자가 고른다. slots에 없는 날이나 지난 날은 카드에서 조용히 빠진다.
      featured: ['2026-09-01'],
      // 키움 홈경기일만. 원정 기간에는 열리는 날이 없다.
      slots: [
        '2026-08-12T18:00', '2026-08-13T18:00', '2026-08-21T18:00', '2026-08-22T17:00',
        '2026-08-23T13:00', '2026-08-25T17:30', '2026-08-26T17:30', '2026-08-27T17:30',
        '2026-09-01T17:30', '2026-09-02T17:30', '2026-09-03T17:30', '2026-09-04T17:30',
        '2026-09-05T16:00', '2026-09-06T13:00',
      ],
    },
    {
      id: 'kbo-jamsil',
      title: { en: 'Open-Air KBO Baseball Night at Jamsil', ko: '잠실 야외 야구 직관' },
      price: 60000,
      featured: ['2026-08-30'],
      // 두산과 LG가 함께 쓰는 구장이라 리그 휴식일인 월요일만 비고 거의 매일 열린다.
      slots: [
        '2026-08-12T18:00', '2026-08-13T18:00', '2026-08-14T18:00', '2026-08-15T18:00',
        '2026-08-16T18:00', '2026-08-18T18:00', '2026-08-19T18:00', '2026-08-20T18:00',
        '2026-08-21T18:00', '2026-08-22T18:00', '2026-08-23T18:00', '2026-08-25T17:30',
        '2026-08-26T17:30', '2026-08-27T17:30', '2026-08-28T17:30', '2026-08-29T17:00',
        '2026-08-30T17:00', '2026-09-01T17:30', '2026-09-02T17:30', '2026-09-03T17:30',
        '2026-09-04T17:30', '2026-09-05T16:00', '2026-09-06T16:00',
      ],
    },
    {
      id: 'kleague',
      title: { en: 'K League Football Night', ko: 'K리그 축구 직관' },
      price: 60000,
      // FC서울 홈경기일(서울월드컵경기장)만.
      slots: [
        '2026-08-15T18:30', '2026-08-25T18:30', '2026-09-05T18:00',
        '2026-10-10T13:00', '2026-10-17T13:00', '2026-10-24T13:00',
      ],
    },
    {
      id: 'hanriver',
      title: { en: 'Han River Picnic', ko: '한강 피크닉' },
      price: 20000,
      recurring: { time: '17:00', leadDays: 2, horizonDays: 30 },
    },
    {
      id: 'samgyeopsal',
      title: { en: 'Korean BBQ Night', ko: '삼겹살 나이트' },
      price: 20000,
      recurring: { time: '19:00', leadDays: 2, horizonDays: 30 },
    },
    {
      id: 'chimaek',
      title: { en: 'Chimaek Night', ko: '치맥 나이트' },
      price: 20000,
      recurring: { time: '19:00', leadDays: 2, horizonDays: 30 },
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

  // 고정 슬롯과 상시 오픈이 같은 문자열을 같은 모양으로 읽는다. 슬롯마다 라벨을
  // 손으로 적으면 40개가 넘는 경기일에서 EN/KO가 서로 어긋난다.
  const slotLabel = (iso) => {
    const ymd = iso.slice(0, 10);
    const day = weekdayIndex(ymd);
    const month = Number(ymd.slice(5, 7)) - 1;
    const dayOfMonth = Number(ymd.slice(8, 10));
    const time = iso.slice(11, 16);
    const clock = clockLabel(time);
    // 한국어는 24시간제로 적는다. 12시간제로 쓰면 13:00 경기와 새벽 1시가 모두
    // "1:00 집합"이 되고, 18:00은 "6:00 집합"이라 아침으로 읽힌다.
    return {
      en: `${DAYS_EN[day]}, ${MONTHS_EN[month]} ${dayOfMonth} · Meet at ${clock.hour12} ${clock.suffix}`,
      ko: `${month + 1}월 ${dayOfMonth}일 (${DAYS_KO[day]}) · ${time} 집합`,
    };
  };

  const toSlot = (iso) => ({ iso, label: slotLabel(iso) });

  // 카드용 짧은 라벨. 집합 시각을 일부러 뺀다: 카드는 "언제쯤 열리나"만 답하고,
  // 정확한 집합 시각은 날짜를 고르는 신청 캘린더가 말한다.
  const shortLabel = (iso) => {
    const ymd = iso.slice(0, 10);
    const day = weekdayIndex(ymd);
    const month = Number(ymd.slice(5, 7)) - 1;
    const dayOfMonth = Number(ymd.slice(8, 10));
    return {
      en: `${DAYS_EN[day]}, ${MONTHS_EN[month]} ${dayOfMonth}`,
      ko: `${month + 1}월 ${dayOfMonth}일 (${DAYS_KO[day]})`,
    };
  };

  // 랜딩 카드에 보여줄 날짜. featured(운영자가 밀고 싶은 날)가 먼저 오고,
  // 남는 자리는 가까운 오픈일이 채운다. 당일은 뺀다: 신청은 받을 수 있지만
  // 카드에서 "오늘"을 권했다가 몇 시간 뒤 지나가면 첫 칩부터 거짓말이 된다.
  // 상시 오픈 회차는 빈 배열을 준다. 다음 날짜가 항상 "모레"라 정보가 없고,
  // 고정 일정처럼 읽히면 "아무 날이나 된다"는 장점이 가려진다.
  const highlightDates = (event, count = 3, now = Date.now()) => {
    if (!event || event.recurring || !event.slots) return [];
    const today = kstToday(now);
    // slots가 시간순이라는 건 테스트가 지키는 약속이지 이 함수의 전제가 아니다.
    // 여기서 직접 정렬해야 "가까운 순"이 입력 순서와 무관하게 성립한다.
    const open = event.slots
      .filter((iso) => !isSlotPast(iso, now) && iso.slice(0, 10) > today)
      .sort((a, b) => slotEpoch(a) - slotEpoch(b));
    // featured가 살아 있으면 그날부터 순방향으로만 보여준다(2026-08-22 결정).
    // featured 뒤에 그보다 이른 날짜가 붙으면 시간이 역행해 어색하고, featured
    // 앞의 가까운 날짜는 일부러 감춰 모으고 싶은 날로 시선을 몬다. featured가
    // 전부 지나가면 앵커 없이 가까운 순으로 돌아간다.
    const anchor = (event.featured || [])
      .filter((ymd) => open.some((iso) => iso.slice(0, 10) === ymd))
      .sort()[0];
    const visible = anchor ? open.filter((iso) => iso.slice(0, 10) >= anchor) : open;
    return visible.slice(0, count).map((iso) => ({ iso, label: shortLabel(iso) }));
  };

  // 상시 오픈 회차가 지금 받을 수 있는 날짜 전부. 폼은 이 목록만 보여주므로
  // 리드타임 이내 날짜는 애초에 고를 수가 없다.
  const recurringDates = (event, now = Date.now()) => {
    const rule = event && event.recurring;
    if (!rule) return [];
    const today = kstToday(now);
    const dates = [];
    for (let offset = rule.leadDays; offset <= rule.horizonDays; offset += 1) {
      dates.push(toSlot(`${shiftDays(today, offset)}T${rule.time}`));
    }
    return dates;
  };

  // 고정 슬롯 회차가 지금 고를 수 있는 날짜. 지난 경기는 걸러낸다.
  const fixedDates = (event, now = Date.now()) => (event && event.slots
    ? event.slots.filter((iso) => !isSlotPast(iso, now)).map(toSlot)
    : []);

  // 회차 모델과 무관하게 "지금 고를 수 있는 날짜"를 하나의 창구로 준다.
  // 캘린더는 이 목록만 활성화하므로, 경기 없는 날은 애초에 눌리지 않는다.
  const openDates = (event, now = Date.now()) => (event && event.recurring
    ? recurringDates(event, now)
    : fixedDates(event, now));

  // 지난 경기일을 달고 나가면 호출부가 그걸 그대로 그린다. 목록 단계에서 턴다.
  const openEvents = (now = Date.now()) => EVENT_SLOTS
    .map((event) => (event.recurring
      ? { ...event }
      : { ...event, slots: event.slots.filter((iso) => !isSlotPast(iso, now)) }))
    .filter((event) => openDates(event, now).length > 0);

  const findEvent = (eventId) => EVENT_SLOTS.find((event) => event.id === eventId) || null;

  // 브라우저에서 고른 날짜든 손으로 만든 요청이든 같은 함수를 지난다.
  // 서버(api/apply.js -> validateApplication)가 이걸 다시 부르므로,
  // 폼을 우회해 임의의 slotIso를 보내도 여기서 걸린다.
  const findSlot = (eventId, iso, now = Date.now()) => {
    const event = findEvent(eventId);
    if (!event) return null;
    return openDates(event, now).find((slot) => slot.iso === iso) || null;
  };

  return {
    EVENT_SLOTS,
    slotEpoch,
    isSlotPast,
    isWeekend,
    openEvents,
    findEvent,
    findSlot,
    openDates,
    recurringDates,
    highlightDates,
  };
});
