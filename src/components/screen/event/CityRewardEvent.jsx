import { useEffect, useMemo, useRef, useState } from "react";

const DATA_URL = "//reward.progamer.info/data/city-rewards.json";
const POLLING_INTERVAL = 5000;

const REWARD_NAMES = {
  260617002: "보물상자",
  260617003: "기갑상자",
  260617004: "자원상자",
};

const CityRwardEvent = () => {
  const [locations, setLocations] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selectedServer, setSelectedServer] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const copyTimerRef = useRef(null);

  // 5초 Polling
  useEffect(() => {
    let stopped = false;
    let timer = null;
    let controller = null;

    const loadRewards = async () => {
      controller = new AbortController();

      try {
        // 정적 JSON 캐시 방지
        const response = await fetch(
          `${DATA_URL}?t=${Date.now()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (stopped) return;

        setLocations(data.locations ?? []);
        setUpdatedAt(data.updatedAt ?? null);
        setError(null);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("도시 보상 데이터 조회 실패", e);

          if (!stopped) {
            setError("데이터를 불러오지 못했습니다.");
          }
        }
      } finally {
        if (!stopped) {
          setLoading(false);

          timer = setTimeout(
            loadRewards,
            POLLING_INTERVAL
          );
        }
      }
    };

    loadRewards();

    return () => {
      stopped = true;

      clearTimeout(timer);
      controller?.abort();
    };
  }, []);

  // 존재하는 서버 목록
  const servers = useMemo(() => {
    return [
      ...new Set(
        locations.map((item) => item.serverId)
      ),
    ].sort((a, b) => a - b);
  }, [locations]);

  // 최근 발견 데이터가 위로 오도록 정렬 + 서버 필터
  const filteredLocations = useMemo(() => {
    return [...locations]
      .filter(
        (item) =>
          selectedServer === "all" ||
          item.serverId === selectedServer
      )
      .sort(
        (a, b) =>
          new Date(b.foundAt).getTime() -
          new Date(a.foundAt).getTime()
      );
  }, [locations, selectedServer]);

  const getRewardName = (itemId) => {
    return REWARD_NAMES[itemId] ?? `기타(${itemId})`;
  };

  const copyCoordinate = async (item) => {
    const coordinate = `${item.x}:${item.y}`;

    try {
      await navigator.clipboard.writeText(coordinate);
    } catch {
      // Clipboard API가 동작하지 않는 HTTP 환경 등에 대한 fallback
      const textarea = document.createElement("textarea");

      textarea.value = coordinate;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.select();
      document.execCommand("copy");

      textarea.remove();
    }

    const id = item.cityReward?.instanceId ?? item.pointId;

    setCopiedId(id);

    clearTimeout(copyTimerRef.current);

    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null);
    }, 1200);
  };

  const formatTime = (date) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-secondary">
        도시 보상 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="container py-3">
      {/* 제목 */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">
            도시 보상
          </h4>

          <small className="text-secondary">
            5초마다 자동 갱신
            {updatedAt && (
              <>
                {" · "}
                마지막 갱신 {formatTime(updatedAt)}
              </>
            )}
          </small>
        </div>

        <span className="badge text-bg-secondary">
          {filteredLocations.length}개
        </span>
      </div>

      {/* 서버 필터 */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className={
            selectedServer === "all"
              ? "btn btn-primary btn-sm"
              : "btn btn-outline-secondary btn-sm"
          }
          onClick={() => setSelectedServer("all")}
        >
          전체
          <span className="ms-1">
            ({locations.length})
          </span>
        </button>

        {servers.map((serverId) => {
          const count = locations.filter(
            (item) => item.serverId === serverId
          ).length;

          return (
            <button
              key={serverId}
              type="button"
              className={
                selectedServer === serverId
                  ? "btn btn-primary btn-sm"
                  : "btn btn-outline-secondary btn-sm"
              }
              onClick={() =>
                setSelectedServer(serverId)
              }
            >
              #{serverId}
              <span className="ms-1">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 오류가 발생해도 기존 데이터는 유지 */}
      {error && (
        <div
          className="alert alert-warning py-2"
          role="alert"
        >
          {error}
          {" "}
          기존 데이터를 표시하고 있습니다.
        </div>
      )}

      {/* 데이터 */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>서버</th>
              <th>좌표</th>
              <th>닉네임</th>
              <th>종류</th>
              <th>발견</th>
            </tr>
          </thead>

          <tbody>
            {filteredLocations.map((item) => {
              const id =
                item.cityReward?.instanceId ??
                item.pointId;

              const copied = copiedId === id;

              return (
                <tr
                  key={id}
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: "pointer",
                  }}
                  title={`${item.x}:${item.y} 복사`}
                  onClick={() =>
                    copyCoordinate(item)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {
                      e.preventDefault();
                      copyCoordinate(item);
                    }
                  }}
                >
                  <td>
                    <span className="badge text-bg-dark">
                      #{item.serverId}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {item.x}:{item.y}
                    </strong>

                    {copied && (
                      <small className="text-success ms-2">
                        복사됨
                      </small>
                    )}
                  </td>

                  <td>
                    {item.username || "-"}
                  </td>

                  <td>
                    {getRewardName(
                      item.cityReward?.itemId
                    )}
                  </td>

                  <td className="text-secondary">
                    <small>
                      {formatTime(item.foundAt)}
                    </small>
                  </td>
                </tr>
              );
            })}

            {filteredLocations.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-secondary py-5"
                >
                  현재 발견된 보상이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CityRwardEvent;