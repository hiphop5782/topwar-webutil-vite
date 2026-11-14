# 개인 랭킹 데이터

## 조사한 파일 추가하기

1. 조사한 JSON 파일을 이 `personal` 폴더에 넣는다.
2. 파일명을 `cq26-all-server-merit-history-YYYY-MM-DD.json` 형식으로 맞춘다. 날짜는 화면에 표시할 기록일이다. 예: `cq26-all-server-merit-history-2026-11-14.json`.
3. 프로젝트 루트(`package.json`이 있는 폴더)에서 터미널을 열고 아래 명령을 복사해서 실행한다.

```powershell
node scripts/compact-ssc2-personal.mjs --prune
```

기존 데이터와 병합하고 중복을 제거하며, `index.json`과 `snapshots/`를 자동 갱신한다. 원본과 내용이 일치하는지 검증한 뒤 넣었던 JSON 파일을 제거하므로, 처리 후 입력 파일이 사라지는 것은 정상이다. `index.json`을 직접 합칠 필요는 없다.

입력 파일도 남기고 싶다면 대신 아래 명령을 실행한다.

```powershell
node scripts/compact-ssc2-personal.mjs
```

파일을 넣기만 해서는 화면에 반영되지 않는다. 변환을 완료한 뒤 평소대로 개발 서버나 빌드를 실행한다. Git에 반영할 때는 변경된 `index.json`과 새 `snapshots/*.json`을 함께 포함한다.

## 저장 구조

`index.json`은 기존 파일명과 문서 메타데이터, 날짜별 측정 파일 참조를 보관한다. `snapshots/`는 측정 데이터를 공백 없이 저장하며, 내용의 SHA-256을 파일명으로 사용해 동일한 측정을 한 번만 저장한다. 닉네임, 서버, 원본 필드와 과거 라운드는 모두 보존한다.

화면의 날짜는 기존 파일명의 날짜를 유지한다. 파일 안의 가장 최신 측정을 선택하던 기존 동작도 유지한다. 따라서 2026-11-10과 2026-11-11은 같은 측정을 참조하지만 각각 선택할 수 있다. 내부 `date`와 `extractedAt`은 수정하지 않는다.

## 화면 날짜 수정

`index.json`의 `sources` 바로 아래에 있는 파일명 키의 날짜를 수정한다. 실제 원본 파일은 없어도 이 이름이 화면의 기록일을 결정한다. 예를 들어 `cq26-all-server-merit-history-2026-11-15.json`을 `cq26-all-server-merit-history-2026-11-14.json`으로 변경하면 랭킹 날짜 선택과 개인 히스토리에 모두 11월 14일로 표시된다. 이 보정은 현재 반영되어 있다.

그 아래 `dates`와 `date`, `updatedAt`, 측정 파일 내부의 `extractedAt`은 원본 수집 정보이므로 화면 날짜를 바꾸려고 함께 수정하지 않는다. `snapshots/`의 긴 파일명도 수정할 필요가 없다. 날짜를 고친 원본을 다시 가져올 때는 보정된 파일명으로 넣는다.

원본 문서는 `sources[기존 파일명].metadata`에 `dates` 객체를 추가하고, `dates`의 각 키에 참조 ID의 측정 JSON을 넣으면 복원할 수 있다.

## 조회 및 검증

- 날짜 목록은 색인만 읽고, 날짜 선택은 해당 측정 파일만 읽는다.
- 개인 히스토리는 기존처럼 각 표시 날짜의 최신 측정을 조회한다. 동일 측정의 로딩은 공유하지만, 아직 개인별 파일로 분리하지는 않았다.
- 개발 서버 실행 후 `node scripts/verify-ssc2-personal-rank.mjs`로 기존 화면 기능을 검증한다. 기본 주소는 `http://127.0.0.1:4173`이며 `SSC2_VERIFY_URL`로 변경할 수 있다.
