# AdSense 콘텐츠 가치 개선 이력

Google AdSense의 `가치가 없는 콘텐츠` 거절 대응 작업을 누적 기록한다. 최신 기록을 위에 추가하며, 코드 변경과 배포 후 운영 작업을 구분한다.

## 상태 표기

- `완료`: 코드 반영과 검증까지 끝남
- `배포 대기`: 로컬 반영 완료, 운영 사이트 배포 필요
- `관찰 중`: 배포 후 색인·심사 결과를 확인하는 단계
- `예정`: 아직 시작하지 않은 후속 작업

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
