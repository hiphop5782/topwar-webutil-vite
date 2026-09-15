# progamer.info 구조 진단 및 코드 수정 보고서

진단일: 2026-09-15 · 대상: C:/Users/user1/vscode-workspace/topwar-webutil-vite

## 요약

거절 원인을 단정할 수는 없다. AdSense 계정의 심사 상세 사유와 Search Console URL 검사 결과는 이 작업에 제공되지 않았다. 이번 변경은 사이트의 독립 원문을 대표 진입점으로 정리하고, 대량 조회·작업 화면과 중복 주소의 검색 신호를 분리하는 작업이다. 글 수·글자 수를 승인 기준으로 가정하지 않았다. 코드 수정과 로컬 검증이며 배포·심사 재신청은 수행하지 않았다.

## 변경 전 확인한 근거

1. **실제 서비스 응답:** sitemap.xml은 115개 loc를 포함했다. /ko/information/data/와 /ko/information/data/servers/?q=3223은 HTTP 200 + index, follow였다. /ko/information/data/server/?server=3223은 정상 기능인데 최초 응답이 HTTP 404이고 SPA 복귀 스크립트만 있었다. 없는 /ko/not-a-real-page-audit-20260915/도 같은 스크립트로 루트로 우회했다. 원본 응답 요약은 live-audit.json에 보존했다.
2. **대표 주소 불일치:** 루트 HTML은 canonical을 /로 지정하지만 앱은 /ko로 이동한다. /ko/는 별도 canonical을 출력했다. 수정 후 최초 HTML과 실행 후 모두 /ko/로 통합한다.
3. **노출 정책 분산:** RouteSEO의 noindex와 SEO.jsx의 기본값 false가 다른 컴포넌트에서 동시에 사용된다. 제목만 설정하는 하위 SEO도 index 태그를 출력할 수 있었다. 기본값을 생략 상태로 바꿔 제목 설정이 노출 정책을 덮지 않게 했다. 기존 명시적 noindex는 보존한다.
4. **번역되지 않은 본문 복제:** publicPosts.js는 언어와 무관하게 같은 readme.md 16개를 불러오는데 RouteSEO는 모든 경로에 세 언어의 self canonical과 hreflang을 일괄 선언했다. 한국어 글/목록 및 한국어 고정 직업 도구는 한국어 URL을 대표로 지정한다. 이는 동일 본문 통합 선택이며, 템플릿만 번역된 페이지의 hreflang 자체가 무조건 정책 위반이라는 뜻은 아니다.
5. **렌더링 공백:** LanguageRouter의 데이터 완료 대기는 홈과 서버 목록에만 있었다. 다른 원격 집계 화면은 언어 준비 직후 prerender-ready를 보낸다. 설명 텍스트를 추가한다고 데이터 렌더가 보장되지 않는다. 이번에는 이 조회 화면들을 sitemap에서 제외하고 static noindex HTML을 제공한다. 독립적인 정적 분석은 /post/로 연결한다.
6. **원문 발견 경로:** Home.jsx는 관측 KPI와 데이터 조회 링크 중심, /post/ 메뉴는 여러 도구 뒤에 있었다. 기존 데이터 안내 하단에 일부 글 링크가 이미 있었지만 주요 동선은 아니었다. 첫 메뉴, 홈 CTA, 주제별 허브, 데이터/도구 상단과 글 하단의 상호 연결로 개선했다.
7. **robots.txt:** 운영 응답에는 Cloudflare가 관리하는 crawler별 추가 규칙이 붙는다. 관측된 robots는 일반 검색 크롤링을 허용했다. 이번 코드 변경은 Cloudflare 설정을 변경하지 않는다. noindex를 읽어야 하므로 해당 URL을 robots로 차단하지 않았다.
8. **CI 환경:** 설치된 Puppeteer 25.2.0의 engines.node는 >=22.12.0인데 배포 workflow는 Node 20이었다. 로컬 검증 환경과 같은 Node 24로 수정했다.

## 판단 기준과 URL 전수 목록

KEEP = 고유 콘텐츠/필수 정보 유지. IMPROVE = 기존 콘텐츠를 보존하며 근거·관련 자료·정보 구조 개선. NOINDEX = 사용자 기능은 유지하되 검색 진입점에서 제외. MERGE = 동일 콘텐츠의 대표 주소 또는 탐색 경로 통합. DELETE = 실체 없는 라우트 선언 제거 및 없는 URL을 정상 404로 처리. 사용자 데이터나 게시물을 물리적으로 삭제하지 않았다.

아래 경로는 모든 ko/en/ja 변형과 임의 query/hash 변형을 포함하는 유형별 전수 목록이다. beforeIndex는 변경 전 RouteSEO 선언 기준이며, 하위 Helmet과의 실제 최종 값 충돌 가능성은 위 진단을 따른다. 고정 라우트는 변경 후 모두 프리렌더한다. 각 항목의 canonical/hreflang은 url-audit.json에 함께 기록했다.

| URL 유형 | 분류 | 판단 | 변경 전 index / 프리렌더 | 변경 후 index / sitemap | 근거 |
|---|---|---|---|---|---|
| `/{ko|en|ja}/information/appearance/` | 데이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 검색·분류 카탈로그. 원격 데이터 로딩 완료를 기다리지 않는 프리렌더로 현재는 정적 핵심 콘텐츠 미보장. |
| `/{ko|en|ja}/` | 콘텐츠 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 통계 중심 홈 → 원문 분석 CTA·주제별 자료·수집 방법 진입점. 관측 통계는 보조 자료. |
| `/{ko|en|ja}/post/` | 콘텐츠 | IMPROVE | index / 있음 | index, follow / ko만 | 날짜순 목록 → 네 가지 주제의 분석·근거 데이터·도구 허브. |
| `/{ko|en|ja}/information/job/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / ko만 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/information/kartz-statistics/` | 데이터 | NOINDEX | index / 없음 | noindex, follow / 제외 | 몬스터 데이터·랭킹·서버 이력의 가변 조회 화면. 카르츠 버프 원문과 연결. |
| `/{ko|en|ja}/information/el/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/information/el/darkforce/` | 계산기·시뮬레이터 | IMPROVE | index / 없음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/information/el/score/` | 계산기·시뮬레이터 | IMPROVE | index / 없음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/information/data/` | 검색결과 | NOINDEX | index / 있음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/servers/` | 검색결과 | NOINDEX | index / 있음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/server/` | 검색결과 | NOINDEX | index / 없음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/alliance/` | 검색결과 | NOINDEX | index / 없음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/move/` | 검색결과 | NOINDEX | index / 없음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/nickname/` | 검색결과 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/player-detail/` | 검색결과 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/realpower/` | 데이터 | NOINDEX | index / 없음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/data/overall/` | 데이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 서버/플레이어/연맹 검색·조회·가변 집계. 고정 관측 시점의 원문 분석을 검색 진입점으로 두고 기능은 유지. |
| `/{ko|en|ja}/information/kartz/` | 데이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 몬스터 데이터·랭킹·서버 이력의 가변 조회 화면. 카르츠 버프 원문과 연결. |
| `/{ko|en|ja}/information/kartz/rank/` | 데이터 | NOINDEX | index / 없음 | noindex, follow / 제외 | 몬스터 데이터·랭킹·서버 이력의 가변 조회 화면. 카르츠 버프 원문과 연결. |
| `/{ko|en|ja}/information/kartz/server/` | 데이터 | NOINDEX | index / 없음 | noindex, follow / 제외 | 몬스터 데이터·랭킹·서버 이력의 가변 조회 화면. 카르츠 버프 원문과 연결. |
| `/{ko|en|ja}/calculator/vital/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/calculator/skill/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/calculator/value-pack/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/calculator/cost/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/simulator/formation-perk/` | 계산기·시뮬레이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 캔버스 그래프와 입력 중심, 본문도 한국어 고정. 그래프 밖 결과·방법을 정적으로 제공하기 전 검색 제외. |
| `/{ko|en|ja}/simulator/titan-research/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/simulator/titan-refine/` | 계산기·시뮬레이터 | IMPROVE | index / 있음 | index, follow / 3개 언어 | 계산 기능과 기존 사용법·가정/FAQ를 유지하고 관련 분석·자료 연결. 입력 변형은 기본 URL로 canonical 통합. |
| `/{ko|en|ja}/developer/` | 시스템 | NOINDEX | index / 있음 | noindex, follow / 제외 | 운영자 소개는 사용자에게 유지. 사이트 수집 방법과 신뢰 정보의 주 진입점은 /about/. |
| `/{ko|en|ja}/about/` | 시스템 | KEEP | index / 있음 | index, follow / 3개 언어 | 운영·연락·개인정보·면책 정보를 찾을 수 있는 고정 페이지 유지. |
| `/{ko|en|ja}/emoji/create/` | 시스템 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/emoji/list/` | 시스템 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/account/viewer/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/account/profile/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/account/creator/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/vote/create/` | 시스템 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/history/ssc-2026/` | 데이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 라운드/서버/시즌 필터 중심 집계. 당시 해석은 날짜를 가진 분석 원문에서 제공. |
| `/{ko|en|ja}/history/ssc-2026/users/` | 데이터 | NOINDEX | index / 없음 | noindex, follow / 제외 | 라운드/서버/시즌 필터 중심 집계. 당시 해석은 날짜를 가진 분석 원문에서 제공. |
| `/{ko|en|ja}/history/liondance/` | 데이터 | NOINDEX | index / 있음 | noindex, follow / 제외 | 라운드/서버/시즌 필터 중심 집계. 당시 해석은 날짜를 가진 분석 원문에서 제공. |
| `/{ko|en|ja}/event/city-reward/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/privacy/` | 시스템 | KEEP | index / 있음 | index, follow / 3개 언어 | 운영·연락·개인정보·면책 정보를 찾을 수 있는 고정 페이지 유지. |
| `/{ko|en|ja}/contact/` | 시스템 | KEEP | index / 있음 | index, follow / 3개 언어 | 운영·연락·개인정보·면책 정보를 찾을 수 있는 고정 페이지 유지. |
| `/{ko|en|ja}/disclaimer/` | 시스템 | KEEP | index / 있음 | index, follow / 3개 언어 | 운영·연락·개인정보·면책 정보를 찾을 수 있는 고정 페이지 유지. |
| `/{ko|en|ja}/vote/cast/` | 시스템 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/vote/manage/` | 시스템 | NOINDEX | noindex / 있음 | noindex, follow / 제외 | 개인 입력·작업·관리·결과 화면. 검색 진입 콘텐츠로 사용하지 않고 직접 이용은 보존. |
| `/{ko|en|ja}/vote/cast/:voteId/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 사용자별 작업·결과. GitHub Pages 404→SPA bridge를 이 세 종류에만 제한. 동적 무한 URL 프리렌더 안 함. |
| `/{ko|en|ja}/vote/manage/:voteId/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 사용자별 작업·결과. GitHub Pages 404→SPA bridge를 이 세 종류에만 제한. 동적 무한 URL 프리렌더 안 함. |
| `/{ko|en|ja}/vip/:serverId/` | 시스템 | NOINDEX | noindex / 없음 | noindex, follow / 제외 | 사용자별 작업·결과. GitHub Pages 404→SPA bridge를 이 세 종류에만 제한. 동적 무한 URL 프리렌더 안 함. |

### 게시물 16개

모든 공개 원문을 유지하고 한국어 URL만 sitemap에 포함한다. 영·일 UI로 같은 글을 열 수 있지만 canonical은 한국어 원문이며 중복 hreflang은 제거한다. 홈과 내부 링크는 한국어 원문으로 직접 연결하고 외국어 UI에서는 Korean original/韓国語原文을 표시한다.

| 원문 | 판단 | 근거·처리 |
|---|---|---|
| [메카(Heavy Trooper)](https://www.progamer.info/ko/post/2026-03-04-001-Heavy-Trooper/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [메카 칩](https://www.progamer.info/ko/post/2026-03-06-001-HT-Chips/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [전투 순서와 공격속도 중요성](https://www.progamer.info/ko/post/2026-03-06-002-Attack-speed/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [월드보스 공격 설정](https://www.progamer.info/ko/post/2026-05-09-001-World-Boss/) | IMPROVE | 원본 이미지 설명 자료 유지, 장비/전장 묶음과 관련 도구 연결. 이미지 내용의 접근성·본문 설명은 후속 편집 과제. |
| [폭풍의 눈 공략](https://www.progamer.info/ko/post/2026-05-10-001-Storm-eye-battle/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [2026년 6월 서버 티어와 EL 예측](https://www.progamer.info/ko/post/2026-06-30-001-Server-Tier/) | IMPROVE | 관측 날짜·표본·추정 기준을 유지. 서버 조사 묶음과 현재 조회값의 차이를 드러냄. |
| [데미지 계산 공식과 효율성](https://www.progamer.info/ko/post/2026-07-02-001-Damage/) | IMPROVE | 개별 실험/초기 추정 기록 보존. 후속 종합 실측 문서를 상단 안내로 연결. |
| [공격력 수치에 따른 데미지 변화 분석](https://www.progamer.info/ko/post/2026-07-02-002-Damage2/) | IMPROVE | 개별 실험/초기 추정 기록 보존. 후속 종합 실측 문서를 상단 안내로 연결. |
| [데미지 증가 수치에 따른 피해량 변화 분석](https://www.progamer.info/ko/post/2026-07-02-003-Damage3/) | IMPROVE | 개별 실험/초기 추정 기록 보존. 후속 종합 실측 문서를 상단 안내로 연결. |
| [Top War 전투 공식 실측 분석 총정리](https://www.progamer.info/ko/post/2026-07-04-001-Damage3/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [거인의 협곡(Titan Canyon)](https://www.progamer.info/ko/post/2026-08-18-001-Titan-Canyon/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |
| [칩 전문화(Chip Specialization)](https://www.progamer.info/ko/post/2026-08-20-001-Chip-Specialization/) | IMPROVE | 원본 이미지 설명 자료 유지, 장비/전장 묶음과 관련 도구 연결. 이미지 내용의 접근성·본문 설명은 후속 편집 과제. |
| [타이탄 재련(Titan Refine)](https://www.progamer.info/ko/post/2026-08-20-002-Titan-Refine/) | IMPROVE | 원본 이미지 설명 자료 유지, 장비/전장 묶음과 관련 도구 연결. 이미지 내용의 접근성·본문 설명은 후속 편집 과제. |
| [서버전(SvS) 알아보기](https://www.progamer.info/ko/post/2026-08-20-003-SvS/) | IMPROVE | 원본 이미지 설명 자료 유지, 장비/전장 묶음과 관련 도구 연결. 이미지 내용의 접근성·본문 설명은 후속 편집 과제. |
| [서버별 현황 분석 (2026/09) , AI 사용](https://www.progamer.info/ko/post/2026-09-08-001-Server-Status/) | IMPROVE | 관측 날짜·표본·추정 기준을 유지. 서버 조사 묶음과 현재 조회값의 차이를 드러냄. |
| [카르츠 다이아 등급 몬스터를 잡기 위한 버프 전략](https://www.progamer.info/ko/post/2026-09-10-001-Kartz-Diamond-Buffs/) | KEEP | 독립 주제와 원문 근거를 보존하고 관련 자료를 연결. |

### MERGE와 DELETE

- **MERGE:** /와 /ko/ → /ko/ 대표 주소. /en/post/*, /ja/post/* 및 목록 → /ko/post/* 원문 canonical. 본문이 같은 직업 도구의 /en/information/job/, /ja/information/job/ → /ko/information/job/. 301 서버 설정은 변경하지 않았고 canonical 및 내부링크로 통합했다.
- **MERGE:** 언어 없는 기존 고정 주소와 게시물 주소는 한국어 대상으로 정적 이동 문서를 생성한다. JS 실행 시 query/hash를 보존한다. GitHub Pages에서 코드만으로 HTTP 301을 새로 설정한 것은 아니다.
- **DELETE:** 실제 라우터에 없는 simulator/random, slot, luckybox, lotto의 SEO 선언 제거. 실제 주소 요청은 404로 남긴다. 기존의 미등록 information/ssc, information/kartz/user, 임시 9999-99-99 글과 그 밖의 알 수 없는 주소도 404/noindex를 유지한다.
- 7월 2일 개별 전투 실험은 고유한 기록이 있으므로 삭제·강제 redirect하지 않았다. 후속 종합 실측으로 안내를 통합했다.

## 쿼리·필터·canonical·hreflang

- 서버/사용자/닉네임/랭킹/시즌/기간/전력/view/q/query/boss/league 등의 가변 데이터 조회는 경로 단위로 noindex, follow이다. 새로운 검색 파라미터를 추가해도 같은 경로 정책을 따른다. sitemap에는 어떤 query URL도 넣지 않는다.
- 설명이 있는 계산기의 입력 상태(selected, startDate, startTime, endDate, endTime, fixedAt, viewAt, servers, buildings 등)는 별도 콘텐츠로 간주하지 않고 기본 경로 canonical로 통합한다. 도구 자체를 일괄 저가치로 가정하지 않았다.
- 콘텐츠·시스템의 상태 query는 noindex. utm_*, gclid, fbclid, msclkid는 추적용 중복이므로 기본 canonical로 처리한다. hash는 별도 페이지로 만들지 않는다.
- noindex 페이지는 hreflang을 출력하지 않는다. 실제 번역된 검색 진입 페이지에만 ko/en/ja와 x-default=/ko/...를 선언한다. canonical은 운영 origin, trailing slash, query/hash 제거를 공유한다.
- 정적 호스팅은 query에 따라 다른 최초 HTML 헤더를 내보낼 수 없다. 콘텐츠 검색 query의 noindex는 JS 실행 후 적용된다. 주요 대량 데이터 페이지는 query 없는 HTML부터 noindex이므로 이 한계에 의존하지 않는다.
- noindex는 검색 제외 지시이며 크롤링 비용을 즉시 없애는 도구도 AdSense 심사 면제도 아니다. 대량 URL 감소 효과와 canonical 선택은 배포 후 Search Console에서 확인해야 한다.

## 정보 구조 변경

홈 → 서버 조사/전투 실측/성장 장비/전장 공략 → 원문 분석 → 원천 자료·현재 데이터·계산 도구 → 관련 분석으로 돌아오는 경로를 구성했다. 한국어 원문 16개를 모두 묶음에 연결한다. 기존 자료를 배치·연결한 것이며 승인용 잡문을 새로 작성하지 않았다.

9월 서버 분석에는 이미 공개된 commit의 저장소 링크와 현재 데이터 조회 링크를 넣고, 현재 값과 당시 분석의 재현 기준이 다름을 명시했다. AI 활용 고지와 비공식 추정이라는 한계는 보존했다. 7월 초기 추정/실험 기록에는 후속 종합 실측을 상단 연결했다.

홈의 현재 데이터 로딩 실패 시 근거 없는 0으로 대시보드를 채우는 대신 상태를 알리고 독립적인 분석 콘텐츠를 유지한다. 오류를 최신 정상 관측으로 표시하지 않는다.

## 검증과 남은 운영 확인

검증 결과와 변경 파일 목록은 최종 실행 후 아래에 추가한다. 로컬 검증은 Googlebot 실제 수집이나 AdSense 재심사 결과를 대신하지 않는다.

배포 후 확인할 항목:

1. Search Console URL 검사에서 홈, 한국어 분석 원문, 영어 원문 별칭, 데이터 검색의 최초/렌더 HTML·선택 canonical·robots를 확인한다.
2. /ko/information/data/server/?server=3223 직접 요청이 200이 되는지, 없는 글은 404/noindex로 남는지 확인한다. Cloudflare가 상태/robots를 바꿀 수 있으므로 로컬 결과만으로 운영 반영을 단정하지 않는다.
3. sitemap.xml을 재제출하고 noindex URL과 번역 없는 중복 원문이 빠졌는지 확인한다. 색인 제외 반영은 재크롤링을 기다린다.
4. 대량 데이터 화면의 검색 유입 감소를 감안하고 원문별 유입과 내부 이동을 확인한다. 일괄 noindex가 모든 사이트의 정답이라는 주장이 아니다.
5. 소스에서 GoogleAdsVertical 사용은 주석 처리되어 있지만 GTM 컨테이너 설정은 별도다. Google 광고가 실제 어느 화면에 삽입되는지는 운영 설정을 확인해야 한다. noindex만으로 그 화면이 광고 정책을 충족한다고 판단하지 않는다.
6. 이미지 중심 공략은 원본 이미지의 핵심 조건·선택 기준을 접근 가능한 본문으로 정리하는 후속 편집이 도움이 된다. 글자 수 목표로 채우지 않는다. 새 설명은 작성자의 실측·해석 검증을 거쳐야 한다.

## 공식 근거

- [Publisher content가 없거나 낮은 가치인 화면의 Google 광고 정책](https://support.google.com/publisherpolicies/answer/11112688?hl=en): 사이트가 유용한 도구라는 사실이나 글 수만으로 승인 여부를 확정할 수 없다.
- [robots meta 규칙](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): noindex를 처리하려면 크롤러가 페이지에 접근할 수 있어야 한다.
- [중복 URL canonical 통합](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): 동일 원문은 canonical로 통합하며 canonical은 보장된 강제 지시가 아니다.
- [언어별 페이지와 hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions): 본문 번역 여부, 상호 참조, 실제 변형 URL을 구분한다.
- [필터 탐색 URL의 크롤링 관리](https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav): 필터 조합이 불필요한 대량 URL을 만들 수 있다.

## 최종 검증 결과

- `npm run build`: 성공. 언어별 정적 HTML 180개(고정 경로 44개 + 원문 16개 × 3개 언어), 언어 없는 기존 주소의 이동 문서 59개, 루트와 404 별도 생성.
- `npm run verify:search`: 성공. 라우터 JSX 선언 52개(중첩 index 선언 포함)와 정책 대조, 180개 최초 HTML의 robots/canonical/hreflang 확인, sitemap 60개와 HTML/XML 언어 링크 일치, query·SPA 이동·실제 404·동적 작업 URL·기존 언어 없는 URL 검사 통과.
- `npm run verify:content`: 성공. 한국어·영어·일본어 공개 글 본문/이미지/이전·다음 탐색, 임시 글 제외, 존재하지 않는 글의 noindex와 복귀 확인. 기존 검사 서버는 SPA fallback 200을 사용하며 실제 404 검증은 새 verify:search가 별도로 수행한다.
- 변경된 검색/라우팅/홈/분석 컴포넌트와 생성·검증 스크립트 15개에 대한 ESLint 통과. 전체 저장소 lint 통과를 주장하지 않는다. `git diff --check` 통과.
- 데스크톱 1440px 및 모바일 390px 화면 확인. 스크린샷 검사는 외부 API/광고 요청을 차단한 상태이므로 통계 미수신 안내가 표시될 수 있다. 프리렌더 빌드는 정상 네트워크 요청을 사용하는 별도 실행이다.
- 실제 운영 사이트 배포와 Search Console 재수집, AdSense 재심사는 수행하지 않았다. 검증 결과는 로컬 코드·산출물 기준이다.

## 변경 파일

아래 파일은 요청한 프로젝트 안에서 실제 수정 또는 추가했다. 진단 문서는 프로젝트 `docs/adsense-structure-audit-2026-09-15.md`에도 저장한다.

| 파일 (프로젝트 기준 상대 경로) | 변경 목적 |
|---|---|
| `.github/workflows/deploy.yml` | 자동 검사와 빌드 실행 환경 |
| `index.html` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `package-lock.json` | 자동 검사와 빌드 실행 환경 |
| `package.json` | 자동 검사와 빌드 실행 환경 |
| `public/404.html` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `public/robots.txt` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `scripts/copy-default-page.mjs` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `scripts/generate-sitemap.mjs` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `scripts/verify-public-content.mjs` | 자동 검사와 빌드 실행 환경 |
| `scripts/verify-search.mjs` | 자동 검사와 빌드 실행 환경 |
| `src/assets/md/2026-09-08-001-Server-Status/readme.md` | 분석 재현 근거와 현재 데이터 연결 |
| `src/components/LanguageRouter.jsx` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `src/components/MainContentView.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/Menu.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/screen/Home.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/screen/post/Post.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/screen/post/PostList.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/screen/post/ResearchHub.css` | 원문 중심 정보 구조와 내부링크 |
| `src/components/screen/post/ResearchHub.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/template/LanguageRouterLink.jsx` | 원문 중심 정보 구조와 내부링크 |
| `src/components/template/RouteSEO.jsx` | 검색 노출·대표 주소·언어 정책 |
| `src/components/template/SEO.jsx` | 검색 노출·대표 주소·언어 정책 |
| `src/config/prerenderRoutes.js` | 프리렌더·사이트맵·정적 진입·오류 처리 |
| `src/config/researchCollections.js` | 원문 중심 정보 구조와 내부링크 |
| `src/config/routePolicy.js` | 검색 노출·대표 주소·언어 정책 |
| `src/hooks/useCanonicalUrl.js` | 검색 노출·대표 주소·언어 정책 |
| `src/locales/en/menu.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/en/seo.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/en/viewer.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ja/menu.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ja/seo.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ja/viewer.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ko/menu.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ko/seo.json` | 홈 소개·탐색 문구 번역 |
| `src/locales/ko/viewer.json` | 홈 소개·탐색 문구 번역 |
