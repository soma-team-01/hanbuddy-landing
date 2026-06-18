# HanBuddy Landing (KBO Run 1 모집 v0)

ZeroOne 팀 HanBuddy의 첫 검증(2026-06-25 잠실 KBO 직관) 외국인 모집용 정적 랜딩페이지.

- 단일 파일: `index.html` (Tailwind Play CDN + Google Fonts, 빌드 불필요)
- 언어: 영문 우선 + 한국인 버디 모집 섹션만 한글
- 개인정보는 이 페이지/레포에 저장하지 않는다. 신청은 외부 폼(Google Form / Tally)으로만 수집한다.

## 1. 링크 설정 (배포 전 필수)

`index.html` 맨 아래 `CONFIG`의 세 값을 실제 링크로 교체한다.

```js
const CONFIG = {
  apply:   'https://...',  // 외국인 참가 신청 폼
  contact: 'https://...',  // 문의 채널 (오픈채팅/이메일 등)
  buddy:   'https://...',  // 한국인 버디 신청 폼
};
```

미설정 상태로 두면 버튼 클릭 시 "링크가 아직 설정되지 않았어요" 안내가 떠서 빈 링크 배포를 막는다.

## 2. 로컬 미리보기

```bash
cd ~/projects/hanbuddy-landing
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 3. 무료 배포 (택 1)

- **Netlify Drop**: https://app.netlify.com/drop 에 폴더 드래그앤드롭 → 즉시 URL 발급
- **Vercel**: `npx vercel` (이 폴더에서) → 안내 따라 배포
- **GitHub Pages**: 이 저장소를 GitHub에 올리고 Settings → Pages에서 main 브랜치 / root 지정

배포 후 짧은 링크(Bitly 등)로 줄여 커뮤니티·Meta 채널 모집 문안에 사용한다.

## 메모

- 가격/날짜/포함 범위 변경 시 `index.html`의 Hero·"The first run" 섹션 숫자를 함께 수정한다.
- 검증 진행 로그 정본은 `soma-memory/60_execution/mvp-validation-log.md`에 남긴다.
