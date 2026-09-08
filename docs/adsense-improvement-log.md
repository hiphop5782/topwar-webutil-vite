# AdSense 콘텐츠 가치 개선 이력

Google AdSense의 `가치가 없는 콘텐츠` 거절 대응 작업을 누적 기록한다. 최신 기록을 위에 추가하며, 코드 변경과 배포 후 운영 작업을 구분한다.

## 상태 표기

- `완료`: 코드 반영과 검증까지 끝남
- `배포 대기`: 로컬 반영 완료, 운영 사이트 배포 필요
- `관찰 중`: 배포 후 색인·심사 결과를 확인하는 단계
- `예정`: 아직 시작하지 않은 후속 작업

---

## 2026-09-08 · 최신 서버 현황 분석 글 발행 준비

상태: `배포 대기`

### 목표

GitHub `hiphop5782/topwar-json` main 브랜치의 당일 최신 데이터를 고정된 revision으로 분석해, 서버 활동성·활성 인원·활성 전력·연맹 구조와 재현 가능한 상대 티어를 설명하는 자체 콘텐츠를 추가한다.

### 완료한 변경

- 기존 로컬 데이터 스냅샷을 사용하지 않고 원격 main을 새로 받아 분석했다.
- main 확인 커밋 `5cbeb29f0f157070516fec534da91f522e01dd7c` 안의 `index.json` revision `eb942ee6298bc21eeec7559a4d9cd89e59e9ea85`, generatedAt `2026-09-08T03:16:06.675323Z`를 게시글에 기록했다.
- 통합 플레이어 257,805명을 서버별로 집계했다.
- 7일 로그인 또는 수집 순간 온라인을 활성 기준으로 삼고, 관측 20명 이상인 728개 서버를 상대평가했다. 표본 부족 3개 서버는 티어 산정에서 제외했다.
- 활성 인원, 활성 전력, 활성률, 주요 연맹 수, 연맹 전력 균형, 활성 유저 전력 중앙값을 백분위 점수로 결합하고 S/A/B/C/D 구간·가중치·한계를 공개했다.
- 전체 서버별 결과와 PNG 차트 3개를 게시글 폴더에 추가하고 Markdown 상대경로로 연결했다.
- 프리렌더 HTML의 로컬 Markdown 이미지 URL에서 프리렌더 서버 origin이 남지 않도록 게시글 이미지 경로 생성을 보정했다.

### 변경 파일

- `src/assets/md/2026-09-08-001-Server-Status/readme.md`
- `src/assets/md/2026-09-08-001-Server-Status/tier-distribution.png`
- `src/assets/md/2026-09-08-001-Server-Status/active-players-top20.png`
- `src/assets/md/2026-09-08-001-Server-Status/active-power-top20.png`
- `src/components/screen/post/Post.jsx`
- `docs/adsense-improvement-log.md`

### 검증 결과

- 게시글 경로가 ko/en/ja 전체 프리렌더 대상에 포함되는 것을 확인했다.
- 프로덕션 빌드와 112개 sitemap URL 생성이 성공했다.
- sitemap에서 ko/en/ja 게시글 URL과 각 언어 alternate 링크를 확인했다.
- 프리렌더 HTML에 제목과 고정 revision이 포함되는 것을 확인했다.
- PNG 3개가 빌드 자산으로 생성되는 것을 확인했다.
- 이미지 URL의 프리렌더 origin 제거 수정 후 최종 빌드에서 `/assets/...` 경로를 재검증했다.

### 판단과 보류 사항

- 티어는 실제 경기 결과나 게임사의 공식 분류가 아니라 해당 revision 내부의 활동·전력·연맹 구조 상대평가다.
- 영어·일본어 URL에도 한국어 원문이 노출되는 기존 게시글 구조는 이번 작업 범위에서 변경하지 않았다.

### 다음 작업

- [ ] 변경 사항 운영 사이트 배포
- [ ] 배포 후 게시글 본문과 차트 3개의 HTTP 200 응답 확인
- [ ] Search Console에서 새 게시글 URL 재크롤링 요청
- [ ] 다음 월 동일 공식으로 변화량 비교 글 작성

### 운영 결과

- 배포일: 미기록
- Search Console 재요청일: 미기록
- AdSense 재심사 신청일: 미기록
- AdSense 결과: 미기록
- 비고: 미기록

---

## 2026-09-08 · 1차 콘텐츠 가치 개선

상태: `배포 대기`

### 목표

도구와 검색 결과 중심으로 보일 수 있는 URL을 정리하고, Progamer.info의 핵심 자산인 자체 Top War 데이터에 운영 맥락과 사람이 읽을 수 있는 해석을 추가한다.

### 완료한 변경

- 공개 URL을 `index 유지 / 콘텐츠 보강 / noindex / 삭제 검토`로 분류했다.
- 개인 입력 또는 결과 중심인 다음 화면을 `noindex, follow` 대상으로 지정했다.
  - `/account/*`
  - `/vote/*`
  - `/vip/*`
  - `/emoji/*`
  - `/event/city-reward`
  - `/information/data/player-detail`
  - `/information/data/nickname`
- 위 noindex URL이 sitemap에 포함되지 않도록 제외 규칙을 보강했다.
- 핵심 데이터 화면에 표본 범위, 활동 상태 정의, 전투력 분포 해석, 데이터 기준 시점 안내를 추가했다.
- 데이터 페이지에서 서버 티어 분석, SSC 원자료, 전체 분석 글로 이동하는 내부 링크를 추가했다.
- `/about` 페이지를 한국어·영어·일본어로 추가했다.
  - 사이트 제작 목적
  - 운영자 정보
  - 데이터 수집 방식과 한계
  - 업데이트 주기
  - 계산기·시뮬레이터 제작 목적
  - 편집 및 오류 수정 원칙
- 푸터에서 About / Privacy / Contact / Disclaimer를 모두 연결했다.
- About을 프리렌더와 sitemap 대상에 포함했다.
- 언어별 About URL의 자기 참조 canonical과 ko/en/ja/x-default hreflang 생성을 확인했다.
- 실제 데이터로 제작할 분석 글 후보 10개와 발행 품질 기준을 정리했다.

### 변경 파일

- `src/components/screen/etc/About.jsx`
- `src/components/screen/information/server/TopwarDataViewer.jsx`
- `src/components/screen/information/server/TopwarPlayerDetail.jsx`
- `src/components/screen/emoji/EmojiCreator.jsx`
- `src/components/template/RouteSEO.jsx`
- `src/components/template/Footer.jsx`
- `src/components/MainContentView.jsx`
- `src/config/prerenderRoutes.js`
- `scripts/generate-sitemap.mjs`
- `src/locales/ko/viewer.json`
- `src/locales/ko/seo.json`
- `src/locales/en/viewer.json`
- `src/locales/en/seo.json`
- `src/locales/ja/viewer.json`
- `src/locales/ja/seo.json`
- `docs/adsense-content-audit.md`
- `docs/adsense-improvement-log.md`

### 검증 결과

- 프로덕션 빌드 및 전체 프리렌더 성공
- sitemap 109개 URL 생성 성공
- 지정한 thin-content URL의 sitemap 제외 확인
- 변경한 JavaScript/JSX 파일 대상 ESLint 통과
- ko/en/ja 번역 JSON 파싱 통과
- 전체 프로젝트 lint는 기존 코드에 누적된 오류로 실패했으며 이번 변경에서 추가된 오류는 확인되지 않았다.

### 판단과 보류 사항

- 데이터 분석 글 8~12개를 숫자만 채우기 위해 임의 작성하지 않았다.
- 새 분석 글은 고정된 데이터 스냅샷, 기준일, 표본 범위, 계산 또는 분류 방법, 관측 결과, 해석, 한계를 갖춘 경우에만 발행한다.
- 한국어 Markdown 게시글이 영어·일본어 URL에서도 노출되는 구조는 hreflang의 실제 번역 동등성 측면에서 별도 정리가 필요하다.

### 다음 작업

- [ ] 변경 사항 운영 사이트 배포
- [ ] 배포된 `/about`과 noindex URL의 HTML 직접 검증
- [ ] 새 sitemap 제출 또는 재수집 확인
- [ ] Search Console에서 핵심 URL 재크롤링 요청
- [ ] 기존 thin-content URL의 색인 제외 진행 관찰
- [ ] 게시글 언어별 색인 정책 결정 및 구현
- [ ] 최신 데이터 스냅샷으로 분석 글 1차 묶음 제작
- [ ] 계산기·시뮬레이터별 설명/원리/예제/FAQ 체크리스트 점검
- [ ] 변경 후 일정 기간의 검색 노출과 AdSense 재심사 결과 기록

### 운영 결과

- 배포일: 미기록
- Search Console 재요청일: 미기록
- AdSense 재심사 신청일: 미기록
- AdSense 결과: 미기록
- 비고: 미기록

---

## 새 기록 작성 양식

아래 형식을 복사해 최신 기록을 문서 위쪽에 추가한다.

```md
## YYYY-MM-DD · 작업 제목

상태: `예정 | 배포 대기 | 관찰 중 | 완료`

### 목표

### 완료한 변경

### 변경 파일

### 검증 결과

### 판단과 보류 사항

### 다음 작업

- [ ]

### 운영 결과

- 배포일:
- Search Console 재요청일:
- AdSense 재심사 신청일:
- AdSense 결과:
- 비고:
```
