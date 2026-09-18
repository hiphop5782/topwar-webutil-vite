# 투표 번역 (Ollama)

AttendanceVoteReader는 `https://ax.progamer.info/api/chat`의 `qwen3:8b`를 사용합니다.
`stream: false`, `think: false`, JSON schema로 화면 문구를 번역합니다.
제목, 선택지, 입력 안내, 버튼, 상태 메시지와 참여자 명단의 라벨을 전송하며,
투표 ID, 비밀번호, 참여자 정보는 전송하지 않습니다. 번역은 현재 화면에만 적용됩니다.

다른 서버/모델은 Vite 빌드 환경변수 `VITE_OLLAMA_URL`, `VITE_OLLAMA_MODEL`로 설정할 수 있습니다.
요청은 120초 후 취소되며 실패하면 기존 화면을 유지하고 재시도를 안내합니다.

## 운영 서버 CORS 설정

확인 당시 `/api/tags`와 실제 영어/일본어 번역 요청은 성공했지만,
`https://www.progamer.info`와 `https://progamer.info` Origin의 OPTIONS 요청은 403이었습니다.
`http://localhost:5656`는 204 및 올바른 Access-Control-Allow-Origin을 반환했습니다.
운영 사이트에서 사용하려면 **Ollama가 실행되는 PC/컨테이너**에 아래 환경변수를 적용하고
Ollama 프로세스를 완전히 재시작해야 합니다.

```text
OLLAMA_ORIGINS=https://www.progamer.info,https://progamer.info,http://localhost:5656,http://127.0.0.1:5656
```

Windows 앱이면 사용자 환경변수에 설정 후 트레이에서 Ollama를 종료하고 다시 실행합니다.
Docker이면 컨테이너 환경변수로 설정하여 재생성합니다. systemd이면 서비스 환경변수에 설정하고 재시작합니다.
실제 접속 주소가 추가되면 해당 Origin(스킴, 호스트, 포트)을 목록에 추가합니다.
이는 Vite 환경변수가 아니라 Ollama 서버 환경변수입니다.

공식 문서: https://docs.ollama.com/faq#how-do-i-allow-additional-web-origins-to-access-ollama

## 확인

1. 운영 Origin을 포함한 `/api/chat` OPTIONS가 2xx와 해당 Access-Control-Allow-Origin을 반환하는지 확인합니다.
2. 투표 화면에서 언어 버튼을 선택하고 제목, 선택지, 내 정보, 버튼, 참여자 명단 라벨을 확인합니다.
3. 번역 후 다른 사용자가 투표하면 번역은 유지되고 투표수/명단만 갱신되는지 확인합니다.
4. 원문 보기, 다른 투표 ID 로드, 서버 오류 시 기존 표시 유지 동작을 확인합니다.
