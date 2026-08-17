import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import "./CityRewardEvent.css";

const DATA_URL = "https://raw.githubusercontent.com/hiphop5782/topwar-reward-finder/refs/heads/main/data/city-rewards.json";

const POLLING_INTERVAL = 5000;

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

const CityRwardEvent = () => {
  const { t, i18n } = useTranslation("viewer");

  const [locations, setLocations] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [selectedServer, setSelectedServer] = useState("all");
  const [selectedReward, setSelectedReward] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copiedId, setCopiedId] = useState(null);

  const copyTimerRef = useRef(null);

  /**
   * 5초 Polling
   */
  useEffect(() => {
    let stopped = false;
    let timer = null;
    let controller = null;

    const loadRewards = async () => {
      controller = new AbortController();

      try {
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
   * 서버 목록
   */
  const servers = useMemo(() => {
    return [
      ...new Set(
        locations.map((item) => item.serverId)
      ),
    ].sort((a, b) => a - b);
  }, [locations]);

  /**
   * 서버별 데이터 개수
   */
  const serverCounts = useMemo(() => {
    return locations.reduce((result, item) => {
      result[item.serverId] =
        (result[item.serverId] ?? 0) + 1;

      return result;
    }, {});
  }, [locations]);

  /**
   * 상자 종류별 데이터 개수
   */
  const rewardCounts = useMemo(() => {
    return locations.reduce((result, item) => {
      const itemId = item.cityReward?.itemId;

      result[itemId] =
        (result[itemId] ?? 0) + 1;

      return result;
    }, {});
  }, [locations]);

  /**
   * 서버 + 상자 종류 필터
   * 이후 최근 발견순 정렬
   */
  const itemTypes = useMemo(()=>{
    return Object.keys(REWARD_TYPES);
  }, [REWARD_TYPES]);
  const filteredLocations = useMemo(() => {
    return [...locations]
      .filter((item) => {
        if (selectedServer !== "all" && item.serverId !== selectedServer ) {
          return false;
        }
        if (selectedReward !== "all" && item.cityReward?.itemId !== selectedReward) {
          return false;
        }
        return itemTypes.includes(item.cityReward.itemId.toString());
      })
      .sort(
        (a, b) =>
          new Date(b.foundAt).getTime() -
          new Date(a.foundAt).getTime()
      );
  }, [
    locations,
    selectedServer,
    selectedReward,
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

    const id =
      item.cityReward?.instanceId ??
      item.pointId;

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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">
            {t("cityReward.title")}
          </h4>

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

        <span className="badge text-bg-secondary">
          {t(
            "cityReward.resultCount",
            {
              count:
                filteredLocations.length,
            }
          )}
        </span>
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
              ({locations.length})
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
                const id =
                  item.cityReward
                    ?.instanceId ??
                  item.pointId;

                const copied =
                  copiedId === id;

                const rewardItemId =
                  item.cityReward?.itemId;

                return (
                  <tr
                    key={id}
                    role="button"
                    tabIndex={0}
                    className="city-reward-row"
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
                        {formatRelativeTime(item.foundAt)}
                        {" "}
                        ({formatTime(item.foundAt)})
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