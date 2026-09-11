// Shared public business details for every footer.
(() => {
  const markup = `
      <div class="border-t border-line-soft pt-5">
        <p><span lang="ko">상호</span>: <span lang="ko">제로원</span> · <span lang="ko">대표자</span>: <span lang="ko">김민형</span></p>
        <p><span lang="ko">사업자등록번호</span>: 597-05-03957</p>
        <p><span lang="ko">사업장 주소</span>: <span lang="ko">서울특별시 동대문구 전농로34길 15-4 404호</span></p>
        <p><span lang="ko">문의</span>: <a href="mailto:contact@hanbuddy.kr" class="focusable rounded underline underline-offset-4 hover:text-primary-strong">contact@hanbuddy.kr</a></p>
      </div>
  `;
  document.querySelectorAll('[data-business-info]').forEach((container) => {
    container.lang = 'ko';
    container.innerHTML = markup;
  });
})();
