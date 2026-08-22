// 승인된 게스트 후기와 개별 별점의 단일 소스.
// index.html 캐러셀이 브라우저에서 읽고, 이벤트 상세페이지의 정적 후기 블록은
// tests/event-detail-reviews.test.js가 이 파일과 대조한다.
// 문구는 AGENTS.md "Approved public quotes" 목록의 승인 원문만 쓴다.
(function initGuestReviews(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyReviews = api;
})(typeof window === 'undefined' ? null : window, () => {
  // rating은 설문 시트("HanBuddy 1 Minute Survey") 개별 만족도 점수와 1:1 매칭이다.
  // 2026-08-22 개별 점수를 공개하는 쪽으로 방침을 바꿨다(이전: 집계 평점만 공개).
  // 설문 응답이 없는 인용(카카오톡 메시지 출처)은 rating이 null이고, 별점 없이
  // 싣는 후기는 없기로 했으므로 상세페이지에서는 빠진다. 캐러셀에는 그대로 실린다.
  // activity는 event-slots.js의 이벤트 id와 같은 값을 쓴다.
  // date는 후기가 나온 운영 날짜(설문 제출일이 아니다). 완료 운영 목록은 AGENTS.md.
  // 배열 순서는 오래된 것부터. index 캐러셀과 테스트가 이 순서에 기댄다.
  // 상세페이지는 detailReviews()로 최신 운영부터 보여준다.
  const GUEST_REVIEWS = Object.freeze([
    {
      activity: 'kbo-jamsil',
      date: '2026-06-25',
      rating: 4,
      en: {
        quote: '“If you are looking to experience Korean baseball culture with local Koreans, then this is the program you want to join!”',
        meta: '— Guest at our June baseball night · Jamsil, June 25, 2026',
        tag: '⚾ KBO Baseball Night',
      },
      ko: {
        quote: '“한국 야구 문화를 현지 한국인과 함께 경험하고 싶다면, HanBuddy가 바로 당신이 참여하고 싶은 프로그램입니다!”',
        meta: '— 6월 야구 직관 참가 게스트 · 잠실, 2026년 6월 25일',
        tag: '⚾ KBO 야구 직관',
      },
    },
    {
      activity: 'kbo-jamsil',
      date: '2026-07-26',
      rating: 5,
      en: {
        quote: '“It was fun to watch the game and cheer together!”',
        meta: '— Guest at our July baseball night · Jamsil, July 26, 2026',
        tag: '⚾ KBO Baseball Night',
      },
      ko: {
        quote: '“함께 응원하며 경기를 보는 게 정말 재미있었어요!”',
        meta: '— 7월 야구 직관 참가 게스트 · 잠실, 2026년 7월 26일',
        tag: '⚾ KBO 야구 직관',
      },
    },
    {
      activity: 'kbo-jamsil',
      date: '2026-07-26',
      rating: 5,
      en: {
        quote: '“Great experience to enjoy a baseball game with a local”',
        meta: '— Guest at our July baseball night · Jamsil, July 26, 2026',
        tag: '⚾ KBO Baseball Night',
      },
      ko: {
        quote: '“로컬 버디와 함께 야구 경기를 즐길 수 있어 정말 좋은 경험이었어요”',
        meta: '— 7월 야구 직관 참가 게스트 · 잠실, 2026년 7월 26일',
        tag: '⚾ KBO 야구 직관',
      },
    },
    {
      // 설문이 아니라 카카오톡 메시지 출처라 매칭되는 만족도 점수가 없다.
      activity: 'kbo-jamsil',
      date: '2026-07-26',
      rating: null,
      en: {
        quote: '“I had such a great evening — will definitely be going to another game with HanBuddy!”',
        meta: '— Message from a guest after our July 26 baseball night',
        tag: '⚾ KBO Baseball Night',
      },
      ko: {
        quote: '“정말 즐거운 저녁이었어요 — 다음 경기도 꼭 HanBuddy와 함께할 거예요!”',
        meta: '— 7월 26일 야구 직관 후 게스트가 보낸 메시지',
        tag: '⚾ KBO 야구 직관',
      },
    },
    {
      activity: 'kbo-jamsil',
      date: '2026-07-26',
      rating: 5,
      en: {
        quote: '“They did a fantastic job of explaining what was happening during the game.”',
        meta: '— Guest at our July baseball night · Jamsil, July 26, 2026',
        tag: '⚾ KBO Baseball Night',
      },
      ko: {
        quote: '“경기 중에 무슨 일이 벌어지고 있는지 정말 잘 설명해 줬어요.”',
        meta: '— 7월 야구 직관 참가 게스트 · 잠실, 2026년 7월 26일',
        tag: '⚾ KBO 야구 직관',
      },
    },
    {
      activity: 'kleague',
      date: '2026-08-15',
      rating: 5,
      en: {
        quote: '“The guide was nice and it was like being with friends.”',
        meta: '— Guest at our first football night · Sangam, August 15, 2026',
        tag: '⚽ K League Football Night',
      },
      ko: {
        quote: '“가이드는 친절했고 친구들과 함께 있는 것 같았어요.”',
        meta: '— 첫 축구 직관 참가 게스트 · 상암, 2026년 8월 15일',
        tag: '⚽ K리그 축구 직관',
      },
    },
    {
      activity: 'kleague',
      date: '2026-08-15',
      rating: 5,
      en: {
        quote: '“Super fun experience and our guide was super kind, helpful and made the experience amazing!!”',
        meta: '— Guest at our first football night · Sangam, August 15, 2026',
        tag: '⚽ K League Football Night',
      },
      ko: {
        quote: '“정말 재미있는 경험이었고, 가이드가 무척 친절하고 큰 도움이 되어 최고의 경험이 됐어요!!”',
        meta: '— 첫 축구 직관 참가 게스트 · 상암, 2026년 8월 15일',
        tag: '⚽ K리그 축구 직관',
      },
    },
  ]);

  // 상세페이지에 실을 수 있는 후기: 해당 활동에서 나왔고 별점이 확인된 것만(시간순).
  const ratedReviews = (activityId) =>
    GUEST_REVIEWS.filter((review) => review.activity === activityId && review.rating !== null);

  // 상세페이지 노출 순서: 최신 운영이 먼저. 같은 날짜 안에서는 원래 순서를 뒤집어
  // 전체가 한 방향(최근→과거)으로 읽히게 한다.
  const detailReviews = (activityId) => ratedReviews(activityId)
    .map((review, index) => ({ review, index }))
    .sort((a, b) => (a.review.date === b.review.date ? b.index - a.index : (a.review.date < b.review.date ? 1 : -1)))
    .map(({ review }) => review);

  // 활동별 평균은 소수 첫째 자리 반올림. 랜딩·About의 전역 평점(전체 응답 평균)과는
  // 별개 값이라 서로 맞출 필요가 없다.
  const ratingSummary = (activityId) => {
    const list = ratedReviews(activityId);
    if (!list.length) return null;
    const total = list.reduce((sum, review) => sum + review.rating, 0);
    return { average: Math.round((total / list.length) * 10) / 10, count: list.length };
  };

  const cardsForLocale = (locale) => GUEST_REVIEWS.map((review) => review[locale] ?? review.en);

  return { GUEST_REVIEWS, ratedReviews, detailReviews, ratingSummary, cardsForLocale };
});
