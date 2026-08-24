// 구글 검색 광고 소구점 A/B(2026-08-24)의 랜딩 쪽 절반.
// 광고그룹마다 다른 소구점으로 사람을 데려오는데 랜딩 히어로가 하나면, 메시지가
// 어긋나는 arm이 자기 소구점 탓이 아니라 랜딩 탓에 전환을 잃는다. 그래서 페이지를
// `/a` `/c`로 쪼개는 대신(신청 폼·분석·테스트가 두 벌이 되고 SEO도 중복된다)
// 쿼리 파라미터 하나로 히어로 카피만 갈아끼운다.
//
// 두 가지 일만 한다.
//   1) 주소의 `?v=` 값을 화이트리스트로 판정한다
//   2) 그 값을 사이트 안 링크에 실어 `/apply/`까지 끊기지 않게 나른다
// 카피 자체는 각 페이지 CONTENT_MAP에 남는다. 이 파일은 로직만 갖는다.
(function initLandingVariant(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.HanBuddyVariant = api;
    // 스크립트를 붙인 것이 곧 참여 선언이다. 페이지마다 호출 한 줄을 복사해 두면
    // 새 페이지에서 조용히 빠지고, 거기를 거쳐 온 신청은 arm 미상으로 샌다.
    api.tagWhenReady(root.document);
  }
})(typeof window === 'undefined' ? null : window, () => {
  const PARAM = 'v';
  const VARIANTS = Object.freeze(['local', 'friends']);

  // 화이트리스트 밖은 전부 null이고, null은 "파라미터가 없었던 것과 같다"는
  // 뜻이다. 오타든 장난이든 기본 화면이 뜬다. 값을 그대로 통과시키면 광고 URL에
  // 무엇을 붙이든 GA 파라미터가 되어 리포트가 오염되고, 히어로에 임의 문자열을
  // 그릴 길이 열린다.
  const resolve = (search) => {
    let values = [];
    try {
      values = new URLSearchParams(typeof search === 'string' ? search : '').getAll(PARAM);
    } catch {
      return null;
    }
    // `?v=local&v=friends`처럼 값이 두 번 오면 어느 arm인지 정할 수 없다.
    // 먼저 온 값을 골라 주면 리포트에는 한 arm이 찍히는데 화면은 그 값으로
    // 그려졌는지조차 확신할 수 없다. 애매하면 기본 화면으로 떨어뜨린다.
    if (values.length !== 1) return null;
    return VARIANTS.includes(values[0]) ? values[0] : null;
  };

  const current = () => (typeof window === 'undefined' ? null : resolve(window.location.search));

  // 사이트 안 링크(`/`로 시작)에만 붙인다. 인스타·카카오·왓츠앱에 우리 실험
  // 파라미터를 실어 보낼 이유가 없고, 외부 도메인에 붙이면 남의 URL을 건드리는
  // 셈이다. 앵커(`#events`)도 그대로 둔다.
  const withVariant = (url, variant) => {
    if (typeof url !== 'string' || !url.startsWith('/')) return url;
    if (!VARIANTS.includes(variant)) return url;
    const [path, hash] = url.split('#');
    const [base, query] = path.split('?');
    const params = new URLSearchParams(query || '');
    params.set(PARAM, variant);
    return `${base}?${params}${hash ? `#${hash}` : ''}`;
  };

  // 렌더가 끝난 뒤 한 번 부르면 그 화면의 내부 링크가 모두 값을 물고 간다.
  // 링크를 만드는 자리마다 손으로 붙이면(카드·공지·네비·CTA) 새 링크가 생길
  // 때마다 조용히 빠진다. params.set이라 여러 번 불러도 같은 결과다.
  const propagateLinks = (scope) => {
    const variant = current();
    if (!variant || !scope) return;
    scope.querySelectorAll('a[href^="/"]').forEach((anchor) => {
      anchor.setAttribute('href', withVariant(anchor.getAttribute('href'), variant));
    });
  };

  // 스크립트는 head에서 실행되므로 대개 DOM이 아직 없다. 랜딩처럼 렌더가 끝난
  // 뒤에 링크가 생기는 페이지는 그 자리에서 propagateLinks를 한 번 더 부른다.
  const tagWhenReady = (doc) => {
    if (!doc) return;
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', () => propagateLinks(doc));
      return;
    }
    propagateLinks(doc);
  };

  return { PARAM, VARIANTS, resolve, current, withVariant, propagateLinks, tagWhenReady };
});
