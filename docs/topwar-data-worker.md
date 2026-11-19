# TopWar 비공개 GitHub 데이터 연결

React → Cloudflare Worker → GitHub Contents API. Spring Boot와 Vite proxy는 사용하지 않는다. 로그인은 요구하지 않는다. GitHub PAT는 Worker Secret에만 보관한다.

## api.progamer.info 연결 현황 (2026-11-19)

최신 Worker 재배포 후 실제 index와 데이터 21종(서버 목록, 홈 통계, 전투력, 전체·서버 이동/닉네임 이력, 3223 실제 전투력, 사자춤, 카르츠, 방어일정 등)의 200 응답과 비허용 Origin의 403을 확인했다. 아래 기존 404 설명은 수정 전 배포 상태다. 운영 FE의 Worker 기본 주소는 이제 `https://api.progamer.info/data/topwar-json`이며 Actions가 기존 ENV_PRODUCTION Secret을 사용해도 빌드 단계에서 이 주소를 전달한다. Repository Variable로 다른 Worker 주소를 지정할 수 있다.

실제 배포된 기존 Worker에서 `/data/topwar-json/servers/servers-object.json`, `/api/realpower/3223`은 200을 확인했다. `/data/topwar-json/index.json`은 허용 목록 누락으로 404다. 기존 코드는 쿼리를 모두 거부하므로 FE가 쓰는 revision도 지원하지 않는다. 먼저 이 프로젝트의 worker.js로 Worker를 다시 배포해야 한다.

새 코드는 `/data/topwar-json/` 경로와 기존 `/api/servers`, `/api/servers/compact`, `/api/servers/popular`, `/api/realpower/{id}`, `/health`를 지원한다. topwar-thief와 topwar-reward-finder의 `/data/{repo}/data/*.json` 경로도 유지한다. 해당 저장소에도 PAT Contents 읽기 권한이 있어야 한다. 첨부된 운영 코드의 sysout 도메인들과 localhost:5656 허용을 유지하며 datahub를 추가했다.

topwar-json의 모든 FE 조회 종류(power, realpower, overall, cross-pvp, generated 검색 shard, servers, liondance, kartz, allianceDefense)를 허용한다. chunks 폴더와 .part/.txt/.chunk, 숫자 접미사가 붙은 분할 파일도 원문으로 반환한다. 기존 Worker의 15MB 제한과 각 조각의 JSON.parse 검사는 제거했다. 분할 조각은 완전한 JSON이 아닐 수 있고 전체 데이터는 15MB보다 클 수 있기 때문이다. GitHub Contents API 자체의 파일 크기 제한은 여전히 적용된다. HEAD 응답은 본문 없이 반환한다.

재배포 후 `https://www.progamer.info`에서 `https://api.progamer.info/data/topwar-json/index.json`을 호출해 git: revision과 datasets를 확인한다. 정상 확인 후 FE GitHub Repository Variable `VITE_TOPWAR_DATA_WORKER_URL`을 `https://api.progamer.info/data/topwar-json`으로 설정하고 FE를 배포한다. 기존 Worker 상태에서는 이 변수를 활성화하면 안 된다.

## 생성한 Worker에 적용

1. GitHub에서 fine-grained PAT를 생성한다. 저장소는 `hiphop5782/topwar-json`만, Contents는 Read-only로 선택한다. 만료일을 기록한다.
2. Cloudflare → Workers & Pages → 생성한 Worker → Settings → Variables and Secrets에서 `GITHUB_TOKEN`을 **Secret**으로 등록한다. 토큰을 FE 환경변수·소스·채팅에 넣지 않는다.
3. Edit code에서 `workers/topwar-data/worker.js` 전체 내용을 붙여넣고 Deploy한다. 기본 허용 Origin은 `https://www.progamer.info`, `https://datahub.progamer.info`다. 로컬 개발 Origin은 허용하지 않는다.
4. 선택적으로 Settings → Domains & Routes → Add → Custom Domain에서 비어 있는 `json.progamer.info`를 연결한다. 기존 reward/datahub 도메인을 교체하지 않는다. workers.dev 주소로도 사용할 수 있다.
5. 기존 Cloudflare WAF 규칙이 datahub/reward 호스트만 대상으로 한다면 새 Worker 호스트에는 적용되지 않는다. 이 코드 자체가 두 허용 Origin을 검사한다. Worker 앞에서 응답을 바로 반환하는 별도 Cache Everything/Workers Cache 설정은 켜지 않는다.

CLI를 쓸 경우 `wrangler.jsonc`의 name을 실제 생성한 Worker 이름으로 바꾼 후 실행한다. 생성한 이름과 다르면 다른 Worker가 만들어질 수 있다.

```powershell
npx wrangler@4 login
npx wrangler@4 secret put GITHUB_TOKEN --config workers/topwar-data/wrangler.jsonc
npx wrangler@4 deploy --config workers/topwar-data/wrangler.jsonc
```

## 연결 검사와 FE 전환

`https://www.progamer.info`의 개발자도구 콘솔에서 아래 URL을 실제 Worker 주소로 바꿔 실행한다. 주소창에서 직접 열면 Origin이 없어 403이 정상이다.

```javascript
fetch("https://실제-Worker-주소/index.json").then(async response => console.log(response.status, await response.json()));
```

200 응답에 `revision: "git:<40자리 SHA>"`가 있어야 한다. 이어서 `/servers/servers-object.json`, `/_history/servers-7d.json`을 확인한다. 과거 기록이 없으면 후자는 `null`이다.

GitHub FE 저장소 → Settings → Secrets and variables → Actions → **Variables**에 다음 Repository variable을 추가한다.

```dotenv
VITE_TOPWAR_DATA_WORKER_URL=https://실제-Worker-주소
```

`Deploy to GitHub Pages`를 실행한다. 배포 작업이 이 Variable 또는 기본 api.progamer.info 주소를 빌드 환경에 전달한다. 기존 `ENV_PRODUCTION` Secret 전체를 수정할 필요는 없다. PAT를 이 Variable에 넣지 않는다. 개발 설정도 같은 Worker 주소를 사용하며, 운영 Worker에서 기존에 허용한 `http://localhost:5656` 개발 서버를 사용할 수 있다. 다른 포트나 127.0.0.1 Origin은 별도 허용하지 않았다.

배포 후 서버 목록·검색·실제 전투력·전체 데이터·홈의 7일 증감을 확인하고 Network에서 topwar-json 데이터 요청이 Worker로 가는지 확인한다. 분할 데이터도 확인한다. 그 후 저장소를 비공개로 전환하고 같은 검사를 반복한다. 도시보상과 topwar-vote 조회는 별도 경로여서 이번 전환 대상이 아니다.

## 동작과 캐시

- Worker 주소가 비어 있으면 기존 `VITE_TOPWAR_DATA_BASE_URL`을 사용한다. Worker 모드에서 실패했다고 raw로 자동 우회하지 않는다.
- 접근 허용 폴더: power, realpower, overall, cross-pvp, generated, servers, liondance, kartz, allianceDefense. 루트 파일은 index.json, servers.json만 허용한다. 폴더 아래 .json/.part/.txt 데이터 파일을 허용하므로 이 폴더에는 공개 제공할 데이터만 둔다. 실제 분할 manifest가 다른 폴더/확장자를 쓰면 해당 경로를 확인하고 허용 목록을 조정해야 한다. 폴더 목록 조회와 소스 파일 조회는 허용하지 않는다.
- main 커밋 조회는 60초 캐시한다. index 응답의 revision을 `git:<커밋 SHA>`로 바꿔 모든 데이터·분할 조각을 같은 커밋으로 고정한다. 원래 revision은 sourceRevision에 남긴다.
- 커밋별 파일은 24시간 캐시한다. main 변경은 60초 캐시 만료 후 확인한다. 이미 열린 화면의 FE 메모리 캐시는 기존 동작대로 유지되므로 새 목록을 보려면 새로고침한다.
- 7일 전 서버 목록은 1시간 캐시한다. 임의 커밋 검색 API는 노출하지 않는다.
- timestamp/임의 쿼리로 캐시를 우회하지 못하게 한다. 오류는 캐시하지 않고 외부 응답에는 토큰·GitHub 오류 원문을 보내지 않는다.
- Cache API는 지역별이다. 동시 캐시 미스나 여러 지역에서는 GitHub API 호출이 발생한다. 캐시는 GitHub 호출량을 줄이지만 Worker 요청 한도는 그대로 적용된다. GitHub API 제한·파일 크기 제한도 적용된다.

## 요청 제한 (선택)

기본 배포에서는 요청 제한을 강제하지 않는다. 홈 화면은 여러 서버 파일을 한 번에 조회하며, 낮은 IP 제한은 정상 이용자와 공유 IP 이용자를 막을 수 있다. 사용량을 확인한 후 `DATA_RATE_LIMITER` 바인딩을 추가하면 코드가 429와 Retry-After: 60을 반환한다. 예를 들어 Wrangler 설정에 아래를 추가하되 600은 예시이며 실제 정상 조회량에 맞춰 조정한다.

```json
"ratelimits": [{ "name": "DATA_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 600, "period": 60 } }]
```

namespace_id는 계정의 다른 제한과 겹치지 않는 값을 선택한다. 지역별 근사 제한이며 전 세계 합산 제한은 아니다. Origin은 위조 가능하다. 저장소 비공개와 토큰 보호를 제공하지만 공개 응답의 수집 자체를 완전히 막지는 않는다.

## 되돌리기

- FE 연결: `VITE_TOPWAR_DATA_WORKER_URL` Repository variable을 `off`로 지정하고 Pages를 다시 배포한다. 비우거나 삭제하면 운영 기본 Worker 주소가 적용된다. 로컬 운영 빌드에서는 `.env.production.local`에 `VITE_TOPWAR_DATA_WORKER_URL=off`를 지정한다. 재빌드·배포 시간이 필요하며 런타임 즉시 전환은 아니다.
- 저장소 비공개 이후에는 raw 복귀만으로 복구되지 않는다. 비공개를 유지하려면 Cloudflare Worker의 이전 정상 Deployment로 rollback한다. GitHub를 다시 공개하는 것은 별도 결정이다.
- Worker 이전 버전 rollback은 Secret/바인딩 변경을 자동으로 되돌리지 않을 수 있으므로 GITHUB_TOKEN과 설정도 확인한다. 전환 전에 정상 배포 버전을 기록한다.

## 검증

```powershell
node scripts/verify-topwar-worker.mjs
```

이 검사는 GitHub/Cache를 모의 처리한다. 실제 Cloudflare 배포·PAT 권한·DNS·실제 데이터 경로는 위 배포 후 검사로 확인해야 한다.

현재 운영 Worker를 실제로 검사하려면 `node scripts/verify-topwar-worker-live.mjs`를 실행한다. index에 기재된 각 데이터 종류의 대표 파일, 닉네임/UID 검색 shard, 7일 전 통계와 비허용 Origin 차단을 검사한다. 분할 manifest 응답이면 모든 조각을 같은 커밋으로 내려받아 합친 JSON과 바이트 수를 검사한다. 모든 서버·모든 과거 날짜를 전수 조회하는 검사는 아니다.

공식 참고: [GitHub Contents API](https://docs.github.com/en/rest/repos/contents), [Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
