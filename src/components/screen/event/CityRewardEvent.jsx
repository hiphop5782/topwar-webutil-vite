import { useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import "./CityRewardEvent.css";

const BACKEND_DATA_URL =
  import.meta.env.VITE_CITY_REWARD_API_URL ||
  "https://datahub.progamer.info/api/v1/data/city-rewards";

const FALLBACK_DATA_URL =
  "https://raw.githubusercontent.com/hiphop5782/topwar-reward-finder/refs/heads/main/data/city-rewards.json";

const POLLING_INTERVAL = 5000;
const REWARD_DURATION = 30 * 60 * 1000;
const NEW_HIGHLIGHT_DURATION = 60 * 1000;
const CLOCK_INTERVAL = 1000;

const REWARD_TYPES = {
  260617002: {
    key: "treasure",
    className: "text-bg-warning",
  },
  260617003: {
    key: "armor",
    className: "text-bg-danger",
  },
  260617004: {
    key: "resource",
    className: "text-bg-success",
  },
};
const REWARD_ITEM_IDS = Object.keys(REWARD_TYPES);

function getLocationId(item) {
  return String(
    item.cityReward?.instanceId ??
    item.pointId ??
    [
      item.serverId,
      item.x,
      item.y,
      item.cityReward?.itemId,
      item.cityReward?.endTimeMilli,
    ].join(":")
  );
}

function getRewardCreatedAt(item) {
  const endTime = Number(item.cityReward?.endTimeMilli);

  if (!Number.isFinite(endTime)) return null;

  return endTime - REWARD_DURATION;
}

function getRewardSeenAt(item) {
  const seenAt = Date.parse(
    item.cityRewardSeenAt ??
    item.foundAt ??
    item.cityRewardCreatedAt ??
    ""
  );

  if (Number.isFinite(seenAt)) return seenAt;

  return getRewardCreatedAt(item);
}

async function fetchRewardData(url, signal) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(
    `${url}${separator}t=${Date.now()}`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.locations)) {
    throw new Error("Invalid city reward response");
  }

  return data;
}

const CityRwardEvent = () => {
  const { t, i18n } = useTranslation("viewer");

  const [locations, setLocations] = useState([]);
  const [newLocationSeenAt, setNewLocationSeenAt] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const [selectedServer, setSelectedServer] = useState("all");
  const [selectedReward, setSelectedReward] = useState("all");
  const [sortMode, setSortMode] = useState("remaining");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copiedId, setCopiedId] = useState(null);

  const copyTimerRef = useRef(null);
  const knownLocationIdsRef = useRef(null);

  /**
   * 백엔드를 5초마다 조회하고, 장애 시 기존 GitHub 데이터로 폴백한다.
   */
  useEffect(() => {
    let stopped = false;
    let timer = null;
    let controller = null;

    const loadRewards = async () => {
      controller = new AbortController();

      try {
        let data;

        try {
          data = await fetchRewardData(
            BACKEND_DATA_URL,
            controller.signal
          );
        } catch (backendError) {
          if (backendError.name === "AbortError") {
            throw backendError;
          }

          console.warn(
            "City reward backend fetch failed; using GitHub fallback",
            backendError
          );

          data = await fetchRewardData(
            FALLBACK_DATA_URL,
            controller.signal
          );
        }

        if (stopped) return;

        const nextLocations = data.locations ?? [];
        const observedAt = Date.now();
        const nextLocationIds = new Set(
          nextLocations.map(getLocationId)
        );

        // 첫 응답은 기존 목록으로 등록하고, 이후 추가된 항목만 NEW로 표시한다.
        if (knownLocationIdsRef.current !== null) {
          setNewLocationSeenAt((previous) => {
            const next = {};

            for (const [id, seenAt] of Object.entries(previous)) {
              if (
                nextLocationIds.has(id) &&
                observedAt - seenAt < NEW_HIGHLIGHT_DURATION
              ) {
                next[id] = seenAt;
              }
            }

            for (const id of nextLocationIds) {
              if (!knownLocationIdsRef.current.has(id)) {
                next[id] = observedAt;
              }
            }

            return next;
          });
        }

        knownLocationIdsRef.current = nextLocationIds;

        setLocations(nextLocations);
        setUpdatedAt(data.updatedAt ?? null);
        setError(null);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(
            "City reward data fetch failed",
            e
          );

          if (!stopped) {
            setError("loadFailed");
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
      clearTimeout(copyTimerRef.current);

      controller?.abort();
    };
  }, []);

  /**
   * API 갱신 사이에도 만료 시간이 지나면 즉시 목록에서 제거한다.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, CLOCK_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  /**
   * 종료 시간이 유효하고 아직 유지 시간(30분)이 끝나지 않은 상자 목록
   */
  const activeLocations = useMemo(() => {
    return locations.filter((item) => {
      const endTime = Number(item.cityReward?.endTimeMilli);

      return Number.isFinite(endTime) && endTime > now;
    });
  }, [locations, now]);

  /**
   * 서버 목록
   */
  const servers = useMemo(() => {
    return [
      ...new Set(
        activeLocations.map((item) => item.serverId)
      ),
    ].sort((a, b) => a - b);
  }, [activeLocations]);

  /**
   * 서버별 데이터 개수
   */
  const serverCounts = useMemo(() => {
    return activeLocations.reduce((result, item) => {
      result[item.serverId] =
        (result[item.serverId] ?? 0) + 1;

      return result;
    }, {});
  }, [activeLocations]);

  /**
   * 상자 종류별 데이터 개수
   */
  const rewardCounts = useMemo(() => {
    return activeLocations.reduce((result, item) => {
      const itemId = item.cityReward?.itemId;

      result[itemId] =
        (result[itemId] ?? 0) + 1;

      return result;
    }, {});
  }, [activeLocations]);

  /**
   * 서버 + 상자 종류 필터 후 선택한 기준으로 정렬
   */
  const filteredLocations = useMemo(() => {
    return [...activeLocations]
      .filter((item) => {
        if (selectedServer !== "all" && item.serverId !== selectedServer ) {
          return false;
        }
        if (selectedReward !== "all" && item.cityReward?.itemId !== selectedReward) {
          return false;
        }
        return REWARD_ITEM_IDS.includes(item.cityReward?.itemId?.toString());
      })
      .sort((a, b) => {
        if (sortMode === "discovered") {
          return Number(getRewardSeenAt(b)) -
            Number(getRewardSeenAt(a));
        }

        return Number(b.cityReward.endTimeMilli) -
          Number(a.cityReward.endTimeMilli);
      });
  }, [
    activeLocations,
    selectedServer,
    selectedReward,
    sortMode,
  ]);

  /**
   * 상자 이름
   */
  const getRewardName = (itemId) => {
    const type = REWARD_TYPES[itemId];

    if (!type) {
      return t(
        "cityReward.reward.unknown",
        { itemId }
      );
    }

    return t(
      `cityReward.reward.${type.key}`
    );
  };

  /**
   * 상자 badge 색상
   */
  const getRewardClassName = (itemId) => {
    return (
      REWARD_TYPES[itemId]?.className ??
      "text-bg-secondary"
    );
  };

  /**
   * 좌표 복사
   */
  const copyCoordinate = async (item) => {
    const coordinate =
      `${item.x}:${item.y}`;

    try {
      await navigator.clipboard.writeText(
        coordinate
      );
    } catch {
      const textarea =
        document.createElement("textarea");

      textarea.value = coordinate;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.select();
      document.execCommand("copy");

      textarea.remove();
    }

    const id = getLocationId(item);

    setCopiedId(id);

    clearTimeout(copyTimerRef.current);

    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null);
    }, 1200);
  };

  /**
   * 현재 언어에 맞는 날짜/시간 Locale
   */
  const getLocale = () => {
    const language =
      i18n.resolvedLanguage ??
      i18n.language;

    switch (language) {
      case "ja":
        return "ja-JP";

      case "en":
        return "en-US";

      default:
        return "ko-KR";
    }
  };

  const formatTime = (date) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat(
      getLocale(),
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    ).format(new Date(date));
  };

  const formatRelativeTime = (date) => {
    if (!date) return "-";

    const target = new Date(date).getTime();
    const diff = Math.max(0, Date.now() - target);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const formatter = new Intl.RelativeTimeFormat(
      getLocale(),
      {
        numeric: "always",
      }
    );

    if (seconds < 60) {
      return t("cityReward.time.justNow");
    }

    if (minutes < 60) {
      return formatter.format(-minutes, "minute");
    }

    if (hours < 24) {
      return formatter.format(-hours, "hour");
    }

    return formatter.format(-days, "day");
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-secondary">
        {t("cityReward.loading")}
      </div>
    );
  }

  return (
    <div className="container py-3">

      {/* 제목 */}
      <div className="mb-3">
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <h4 className="mb-0">
              {t("cityReward.title")}
            </h4>

            <span className="badge text-bg-secondary">
              {t("cityReward.resultCount", {
                count: filteredLocations.length,
              })}
            </span>
          </div>

          <div className="small text-secondary mb-1">
            <Trans
              i18nKey="cityReward.supportNotice"
              ns="viewer"
              components={{ strong: <strong /> }}
            />
          </div>

          <small className="text-secondary">
            {t("cityReward.polling")}

            {updatedAt && (
              <>
                {" · "}
                {t("cityReward.lastUpdated")}{" "}
                {formatTime(updatedAt)}
              </>
            )}
          </small>
        </div>
      </div>


      {/* 서버 필터 */}
      <div className="mb-3">
        <div className="small text-secondary mb-2">
          {t("cityReward.filter.server")}
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={
              selectedServer === "all"
                ? "btn btn-primary btn-sm"
                : "btn btn-outline-secondary btn-sm"
            }
            onClick={() =>
              setSelectedServer("all")
            }
          >
            {t("cityReward.filter.all")}
            <span className="ms-1">
              ({activeLocations.length})
            </span>
          </button>

          {servers.map((serverId) => (
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
                ({serverCounts[serverId]})
              </span>
            </button>
          ))}
        </div>
      </div>


      {/* 상자 종류 필터 */}
      <div className="mb-4">
        <div className="small text-secondary mb-2">
          {t("cityReward.filter.reward")}
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={
              selectedReward === "all"
                ? "btn btn-dark btn-sm"
                : "btn btn-outline-secondary btn-sm"
            }
            onClick={() =>
              setSelectedReward("all")
            }
          >
            {t("cityReward.filter.all")}
          </button>

          {Object.entries(
            REWARD_TYPES
          ).map(([itemId, reward]) => {
            const numericItemId =
              Number(itemId);

            const selected =
              selectedReward ===
              numericItemId;

            return (
              <button
                key={itemId}
                type="button"
                className={[
                  "btn",
                  "btn-sm",
                  selected
                    ? reward.className
                    : "btn-outline-secondary",
                ].join(" ")}
                onClick={() =>
                  setSelectedReward(
                    numericItemId
                  )
                }
              >
                {t(
                  `cityReward.reward.${reward.key}`
                )}

                <span className="ms-1">
                  (
                  {rewardCounts[
                    numericItemId
                  ] ?? 0}
                  )
                </span>
              </button>
            );
          })}
        </div>
      </div>


      {/* 정렬 기준 */}
      <div className="mb-4">
        <div className="small text-secondary mb-2">
          {t("cityReward.sort.label")}
        </div>

        <div className="btn-group" role="group">
          <button
            type="button"
            className={
              sortMode === "discovered"
                ? "btn btn-primary btn-sm"
                : "btn btn-outline-secondary btn-sm"
            }
            onClick={() => setSortMode("discovered")}
          >
            {t("cityReward.sort.discovered")}
          </button>

          <button
            type="button"
            className={
              sortMode === "remaining"
                ? "btn btn-primary btn-sm"
                : "btn btn-outline-secondary btn-sm"
            }
            onClick={() => setSortMode("remaining")}
          >
            {t("cityReward.sort.remaining")}
          </button>
        </div>
      </div>


      {/* Polling 오류 */}
      {error && (
        <div
          className="alert alert-warning py-2"
          role="alert"
        >
          {t(
            `cityReward.error.${error}`
          )}{" "}
          {locations.length > 0 &&
            t(
              "cityReward.error.showingCached"
            )}
        </div>
      )}


      {/* 데이터 */}
      <div className="table-responsive">
        <table className="table table-hover align-middle city-reward-table">
          <thead>
            <tr>
              <th>
                {t(
                  "cityReward.column.server"
                )}
              </th>

              <th>
                {t(
                  "cityReward.column.coordinate"
                )}
              </th>

              <th>
                {t(
                  "cityReward.column.nickname"
                )}
              </th>

              <th>
                {t(
                  "cityReward.column.type"
                )}
              </th>

              <th>
                {t(
                  "cityReward.column.foundAt"
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredLocations.map(
              (item) => {
                const id = getLocationId(item);

                const copied =
                  copiedId === id;

                const isNew =
                  newLocationSeenAt[id] != null &&
                  now - newLocationSeenAt[id] <
                    NEW_HIGHLIGHT_DURATION;

                const rewardItemId =
                  item.cityReward?.itemId;

                const rewardSeenAt =
                  getRewardSeenAt(item);

                return (
                  <tr
                    key={id}
                    role="button"
                    tabIndex={0}
                    className={[
                      "city-reward-row",
                      isNew
                        ? "city-reward-row-new"
                        : "",
                    ].filter(Boolean).join(" ")}
                    title={t(
                      "cityReward.copyTitle",
                      {
                        coordinate:
                          `${item.x}:${item.y}`,
                      }
                    )}
                    onClick={() =>
                      copyCoordinate(item)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();

                        copyCoordinate(
                          item
                        );
                      }
                    }}
                  >
                    {/* 서버 */}
                    <td>
                      <span className="badge text-bg-dark">
                        #{item.serverId}
                      </span>

                      {isNew && (
                        <span className="badge text-bg-primary ms-1 city-reward-new-badge">
                          NEW
                        </span>
                      )}
                    </td>

                    {/* 좌표 */}
                    <td>
                      <div className="coordinate-cell">
                        <strong className="coordinate-value">
                          {item.x}:{item.y}
                        </strong>

                        {/*
                          항상 공간을 차지하고
                          visibility만 변경한다.
                          → 복사 시 레이아웃 변화 없음
                        */}
                        <small
                          className={
                            copied
                              ? "copy-status text-success"
                              : "copy-status invisible"
                          }
                        >
                          {t(
                            "cityReward.copied"
                          )}
                        </small>
                      </div>
                    </td>

                    {/* 닉네임 */}
                    <td>
                      {item.username ||
                        "-"}
                    </td>

                    {/* 상자 종류 */}
                    <td>
                      <span
                        className={
                          `badge ${getRewardClassName(
                            rewardItemId
                          )}`
                        }
                      >
                        {getRewardName(
                          rewardItemId
                        )}
                      </span>
                    </td>

                    {/* 발견 시각 */}
                    <td className="text-secondary">
                      <small>
                        {formatRelativeTime(rewardSeenAt)}
                        {" "}
                        ({formatTime(rewardSeenAt)})
                      </small>
                    </td>
                  </tr>
                );
              }
            )}

            {filteredLocations.length ===
              0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-secondary py-5"
                  >
                    {t(
                      "cityReward.empty"
                    )}
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
