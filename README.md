# HanBuddy Landing (공개 모집/홍보 랜딩)

ZeroOne 팀 HanBuddy의 공개 recruitment/promotion 정적 랜딩페이지. **주 타깃은 외국인 게스트(international guests) 모집**이며, 페이지 전체가 게스트 화법으로 구성된다. 한국인·로컬 buddy 모집은 최종 CTA 섹션의 한 줄 안내(KakaoTalk 오픈채팅 유도)로만 노출한다. 2026-06-25 잠실 KBO Run 1 운영 사실과 승인된 참가자 후기를 홍보용 proof로 보여준다.

- 1차 운영: 2026-06-25 Samsung Lions vs LG Twins, Jamsil Baseball Stadium
- 다음 활동(Run 2) 신청: July 18/19 & 25/26 / 7월 18·19일과 25·26일
- Run 2 프로그램 2종(구글폼 선택지와 동일 표기): "KBO Baseball Game in Seoul with Local Buddy", "Han River Tour with Local Buddy"
- Google Form: 실제 신청 링크 `https://forms.gle/B1fWgX3MjtHUHGNt5`가 `index.html`의 `CONFIG.apply`에 연결되어 있다. 링크가 바뀌면 CTA와 문구를 함께 교체한다.
- 문의/알림 채널: 외국인 게스트의 기본 문의는 Instagram DM https://www.instagram.com/hanbuddy_kr/ 으로 안내하고, KakaoTalk 오픈채팅 https://open.kakao.com/o/sP3n4rFi 을 보조 채널과 한국인 로컬 버디 문의에 사용한다.
- 구조: 정적 `index.html` + 현재 페이지에서 참조하는 공개용 WebP 파생 이미지 4개 (빌드 불필요)
- 현재 디자인 방향: 실서비스 MVP 프론트(hanbuddy-frontend.vercel.app)의 디자인 언어를 미러링한다. 사진 중심 히어로, 필(pill) CTA, 헤어라인 에디토리얼 리스트, MVP 토큰 팔레트. 상세는 `DESIGN.md`.
- 개인정보는 이 페이지/레포에 저장하지 않는다. 신청과 문의는 외부 채널에서 처리한다.
- 참가자 얼굴 사진은 마케팅 사용 동의를 받은 상태지만, 원본 JPG/EXIF는 배포하지 않는다.

## 로컬 미리보기

```bash
cd ~/projects/hanbuddy-landing
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 배포용 폴더 만들기

프로젝트 폴더 전체를 그대로 드래그해서 배포하지 않는다. `.git/`, `.superpowers/`, `.omo/`, 원본 JPG, 로컬 도구 파일이 섞일 수 있다.

```bash
cd ~/projects/hanbuddy-landing
rm -rf /tmp/hanbuddy-landing-deploy
mkdir -p /tmp/hanbuddy-landing-deploy/assets
cp index.html /tmp/hanbuddy-landing-deploy/index.html
cp assets/run1-hero.webp assets/run1-group.webp assets/run1-night.webp assets/run1-opening.webp /tmp/hanbuddy-landing-deploy/assets/
```

배포에는 `/tmp/hanbuddy-landing-deploy` 폴더만 사용한다.
`assets/` 아래 원본 JPG/JPEG 사진은 배포 폴더에 복사하지 않는다.

## 무료 배포 (택 1)

- **Netlify Drop**: https://app.netlify.com/drop 에 `/tmp/hanbuddy-landing-deploy` 폴더 드래그앤드롭
- **Vercel**: `cd /tmp/hanbuddy-landing-deploy && npx vercel` → 안내 따라 배포
- **GitHub Pages**: 배포용 브랜치/저장소에는 `/tmp/hanbuddy-landing-deploy` 안의 파일만 올린 뒤 Pages 지정

## 공개 카피 메모

- 다음 회차 가격, 장소, 정원, 시간, 포함 범위, 결제/환불 조건이 확정되기 전까지 임의로 쓰지 않는다.
- Google Form URL이 바뀌면 `index.html`의 hardcoded CTA anchor, `CONFIG`, Hero/Final CTA 문구를 함께 수정한다.
- Run 1 홍보에는 승인된 WebP 사진, 완료된 운영 사실, 참가자 추천 문구를 사용한다.
- 검증 진행 로그 정본은 `soma-memory/60_execution/mvp-validation-log.md` 또는 현재 `soma-memory` 운영 로그에 남긴다.
- `DESIGN.md`는 HanBuddy MVP Figma-derived landing design system의 현재 SSOT다. 구현 문구와 토큰을 바꿀 때는 `DESIGN.md`와 `index.html`의 inline Tailwind/CSS를 함께 확인한다.
