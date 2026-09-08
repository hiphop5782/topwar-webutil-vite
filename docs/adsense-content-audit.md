# AdSense 콘텐츠 가치 기준 URL 감사

> 날짜별 실행 내역과 배포·심사 상태는 `docs/adsense-improvement-log.md`에서 누적 관리한다.

기능의 유용성이 아니라 검색 방문자에게 독립적으로 읽을 만한 publisher content가 있는지를 기준으로 분류한다. 언어 접두사(`/ko`, `/en`, `/ja`)에는 같은 결정을 적용한다.

## Index 유지

- `/`: 자체 서버·플레이어 통계와 최신 변화 요약
- `/post`, `/post/:folder`: 편집된 공략·분석 콘텐츠
- `/information/base`, `/information/job`, `/information/el`: 게임 규칙과 표 기반 정보
- `/information/data`, `/information/data/server`, `/information/data/alliance`, `/information/data/move`, `/information/data/realpower`, `/information/data/overall`: 자체 데이터와 비교·해석이 가능한 핵심 화면
- `/information/kartz/*`, `/information/kartz-statistics`, `/history/*`: 자체 누적 데이터
- `/calculator/*`, 핵심 게임 시뮬레이터: 설명이 있는 게임 전용 도구
- `/about`, `/developer`, `/privacy`, `/contact`, `/disclaimer`: 운영 주체와 정책

## 콘텐츠 보강

- 핵심 데이터 화면 공통: 표본 범위, 활동 정의, 기준 시점, 평균/중앙값 해석과 관련 분석 링크를 추가했다.
- 계산기·시뮬레이터: 입력 정의, 계산 원리, 실제 예제 1개, FAQ 2~3개가 모두 있는지 화면별로 재검토한다.
- 분석 글은 실제 스냅샷과 산출 근거를 재현할 수 있을 때만 발행하며, 같은 통계를 제목만 바꿔 나누지 않는다.

## Noindex

- `/account/*`, `/vote/*`, `/vip/*`: 개인 입력·공유·관리 결과
- `/emoji/*`: 핵심 주제와 거리가 있는 범용 유틸리티
- `/event/city-reward`: 일회성 행동 중심 도구
- `/information/data/player-detail`, `/information/data/nickname`: 검색어에 따라 비거나 개인 결과가 달라지는 조회 화면
- 존재하지 않는 경로와 404

위 URL은 계속 사용할 수 있고 링크를 따라갈 수 있도록 `noindex, follow`로 두며 사이트맵에서도 제외한다.

## 삭제 검토

현재 즉시 삭제할 공개 경로는 없다. 장기간 데이터가 빈 시즌/이벤트, 메뉴에서 제거된 미사용 경로, 임시 VIP 경로는 트래픽과 외부 링크를 확인한 뒤 410 또는 가까운 상위 정보 페이지로 정리한다.

## 다국어 원칙

- 각 언어 URL은 자기 자신을 canonical로 사용한다.
- 같은 내용의 번역이 실제로 존재하는 경우에만 ko/en/ja hreflang 묶음을 유지한다.
- 게시글 본문이 한 언어만 제공되면 번역 전까지 다른 언어 URL을 색인하지 않거나 hreflang 대상에서 제외한다.

## 데이터 기반 글 발행 후보

1. 24시간·7일·30일 활동률의 차이와 해석
2. 평균 전투력과 중앙값이 다르게 말하는 것
3. 상위 10%·5%·1% 전투력 경계의 변화
4. 활발·보통·조용한 서버 분류 방법과 한계
5. 서버 이동 전후 활동 인원 변화
6. 신규 서버와 구서버의 전투력 분포 비교
7. 상위 플레이어가 특정 서버에 집중되는 정도
8. SSC 성과와 관측 서버 전력의 관계
9. 연맹 가입률과 서버 활동성의 관계
10. 데이터 누락·갱신 지연이 순위에 미치는 영향

각 글은 기준일, 원자료 범위, 계산식/분류 기준, 결과, 해석, 한계, 원자료 링크를 포함한 뒤 발행한다.
