# HanBuddy Landing (KBO Run 1 모집)

ZeroOne 팀 HanBuddy의 첫 검증(2026-06-25 잠실 KBO 직관) 외국인 모집용 정적 랜딩페이지.

- 경기: 2026-06-25 Samsung Lions vs LG Twins, Jamsil Baseball Stadium
- 현재 모집: 외국인 3명 추가 모집
- CTA/문의 채널: https://open.kakao.com/o/gDBFqEyi
- 구조: 정적 `index.html` + `assets/kbo-stadium-hero.webp` (빌드 불필요)
- 개인정보는 이 페이지/레포에 저장하지 않는다. 신청과 문의는 외부 채널에서 처리한다.

## 로컬 미리보기

```bash
cd ~/projects/hanbuddy-landing
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 배포용 폴더 만들기

프로젝트 폴더 전체를 그대로 드래그해서 배포하지 않는다. `.git/`, `.superpowers/`, `.omo/` 같은 로컬 도구 파일이 섞일 수 있다.

```bash
cd ~/projects/hanbuddy-landing
rm -rf /tmp/hanbuddy-landing-deploy
mkdir -p /tmp/hanbuddy-landing-deploy
cp index.html /tmp/hanbuddy-landing-deploy/index.html
cp -R assets /tmp/hanbuddy-landing-deploy/assets
```

배포에는 `/tmp/hanbuddy-landing-deploy` 폴더만 사용한다.

## 무료 배포 (택 1)

- **Netlify Drop**: https://app.netlify.com/drop 에 `/tmp/hanbuddy-landing-deploy` 폴더 드래그앤드롭 → 즉시 URL 발급
- **Vercel**: `npx vercel` (이 폴더에서) → 안내 따라 배포
- **GitHub Pages**: 이 저장소를 GitHub에 올리고 Settings → Pages에서 main 브랜치 / root 지정

배포 후 짧은 링크(Bitly 등)로 줄여 커뮤니티·Meta 채널 모집 문안에 사용한다.

## 메모

- 가격/날짜/포함 범위 변경 시 `index.html`의 Hero·"The first run" 섹션 숫자를 함께 수정한다.
- 검증 진행 로그 정본은 `soma-memory/60_execution/mvp-validation-log.md`에 남긴다.
