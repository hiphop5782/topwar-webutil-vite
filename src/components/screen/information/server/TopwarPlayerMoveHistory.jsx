import { useEffect, useMemo, useState } from "react";
import "./TopwarPlayerMoveHistory.css";

/*
 * /src/assets/json/power/movement
 *
 * 2026-07-13.json
 * 2026-07-14.json
 * ...
 */
const movementJsonModules = import.meta.glob(
    "/src/assets/json/power/movement/*.json",
);

const movementFiles = Object.entries(movementJsonModules)
    .map(([path, loader]) => {
        const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/);

        if (!match) {
            return null;
        }

        return {
            path,
            date: match[1],
            loader,
        };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

const countFormatter = new Intl.NumberFormat("ko-KR");

function formatCount(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    return countFormatter.format(number);
}

/*
 * 100M 미만: 소수점 한 자리
 * 100M 이상: 소수점 없음
 *
 * 97,467,230  -> 97.4M
 * 99,999,999  -> 99.9M
 * 100,087,658 -> 100M
 * 122,911,779 -> 123M
 */
function formatCp(value) {
    const cp = Number(value);

    if (!Number.isFinite(cp)) {
        return "-";
    }

    const million = cp / 1_000_000;

    if (million >= 100) {
        return `${Math.round(million)}M`;
    }

    /*
     * 반올림으로 99.95M가 100.0M이 되는 것을 막기 위해
     * 소수점 한 자리에서 버림 처리한다.
     */
    const truncated = Math.floor(million * 10) / 10;

    return `${truncated.toFixed(1)}M`;
}

function formatDetectedTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatDateLabel(dateString) {
    if (!dateString) {
        return "-";
    }

    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });
}

function getTodayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function shiftDate(dateString, amount) {
    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + amount);

    const shiftedYear = date.getFullYear();
    const shiftedMonth = String(
        date.getMonth() + 1,
    ).padStart(2, "0");

    const shiftedDay = String(
        date.getDate(),
    ).padStart(2, "0");

    return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function getNickname(row) {
    return (
        row.nickname
        || row.to?.nickname
        || row.from?.nickname
        || "닉네임 없음"
    );
}

function getFromServer(row) {
    return row.fromServer ?? row.from?.server ?? "-";
}

function getToServer(row) {
    return row.toServer ?? row.to?.server ?? "-";
}

function getAllianceLabel(player) {
    const tag = player?.allianceTag?.trim();
    const name = player?.allianceName?.trim();

    if (!tag && !name) {
        return "무소속";
    }

    if (tag && name) {
        return `[${tag}] ${name}`;
    }

    if (tag) {
        return `[${tag}]`;
    }

    return name;
}

export default function TopwarPlayerMoveHistory({
    initialStartDate,
    initialEndDate,
    defaultDays = 7,
}) {
    const today = getTodayString();

    const firstAvailableDate =
        movementFiles[0]?.date ?? today;

    const lastAvailableDate =
        movementFiles.at(-1)?.date ?? today;

    const calculatedStartDate = shiftDate(
        lastAvailableDate,
        -(defaultDays - 1),
    );

    const defaultStartDate =
        calculatedStartDate < firstAvailableDate
            ? firstAvailableDate
            : calculatedStartDate;

    const [startDate, setStartDate] = useState(
        initialStartDate ?? defaultStartDate,
    );

    const [endDate, setEndDate] = useState(
        initialEndDate ?? lastAvailableDate,
    );

    const [nicknameKeyword, setNicknameKeyword] =
        useState("");

    const [serverKeyword, setServerKeyword] =
        useState("");

    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const selectedFiles = useMemo(() => {
        return movementFiles.filter((file) => {
            return (
                file.date >= startDate
                && file.date <= endDate
            );
        });
    }, [startDate, endDate]);

    useEffect(() => {
        let cancelled = false;

        async function loadMovementFiles() {
            setLoading(true);
            setError("");

            try {
                const results = await Promise.all(
                    selectedFiles.map(async (file) => {
                        const module = await file.loader();
                        const json = module.default ?? module;

                        return {
                            date: json.date ?? file.date,
                            version: json.version,
                            rows: Array.isArray(json.rows)
                                ? json.rows
                                : [],
                        };
                    }),
                );

                if (cancelled) {
                    return;
                }

                /*
                 * 최신 일자가 위로 오도록 정렬
                 */
                results.sort((a, b) =>
                    b.date.localeCompare(a.date),
                );

                setDailyData(results);
            } catch (loadError) {
                console.error(loadError);

                if (!cancelled) {
                    setDailyData([]);

                    setError(
                        "이동 기록 JSON 파일을 불러오지 못했습니다.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadMovementFiles();

        return () => {
            cancelled = true;
        };
    }, [selectedFiles]);

    const filteredDailyData = useMemo(() => {
        const normalizedNickname = nicknameKeyword
            .trim()
            .toLocaleLowerCase();

        const normalizedServer =
            serverKeyword.trim();

        return dailyData.map((day) => {
            const filteredRows = day.rows.filter((row) => {
                const nickname = getNickname(row)
                    .toLocaleLowerCase();

                const fromServer = String(
                    getFromServer(row),
                );

                const toServer = String(
                    getToServer(row),
                );

                const nicknameMatched =
                    normalizedNickname === ""
                    || nickname.includes(normalizedNickname);

                const serverMatched =
                    normalizedServer === ""
                    || fromServer.includes(normalizedServer)
                    || toServer.includes(normalizedServer);

                return nicknameMatched && serverMatched;
            });

            return {
                ...day,
                filteredRows,
            };
        });
    }, [
        dailyData,
        nicknameKeyword,
        serverKeyword,
    ]);

    const totalCount = useMemo(() => {
        return dailyData.reduce(
            (sum, day) => sum + day.rows.length,
            0,
        );
    }, [dailyData]);

    const filteredCount = useMemo(() => {
        return filteredDailyData.reduce(
            (sum, day) => sum + day.filteredRows.length,
            0,
        );
    }, [filteredDailyData]);

    const hasFilter =
        nicknameKeyword.trim() !== ""
        || serverKeyword.trim() !== "";

    function handleStartDateChange(event) {
        const nextStartDate = event.target.value;

        setStartDate(nextStartDate);

        if (nextStartDate > endDate) {
            setEndDate(nextStartDate);
        }
    }

    function handleEndDateChange(event) {
        const nextEndDate = event.target.value;

        setEndDate(nextEndDate);

        if (nextEndDate < startDate) {
            setStartDate(nextEndDate);
        }
    }

    function resetFilters() {
        setNicknameKeyword("");
        setServerKeyword("");
    }

    return (
        <section className="topwar-move-history">
            <header className="move-history-header">
                <div className="move-history-title">
                    <span className="move-history-eyebrow">
                        PLAYER MOVEMENT
                    </span>

                    <h2>서버 이동 기록</h2>

                    <p>
                        날짜별 플레이어 서버 이전 내역을
                        확인할 수 있습니다.
                    </p>
                </div>

                <div className="move-history-summary">
                    <div className="move-summary-item">
                        <span>조회 일수</span>
                        <strong>
                            {selectedFiles.length}
                        </strong>
                    </div>

                    <div className="move-summary-item">
                        <span>전체 이동</span>
                        <strong>
                            {formatCount(totalCount)}
                        </strong>
                    </div>

                    <div className="move-summary-item is-primary">
                        <span>검색 결과</span>
                        <strong>
                            {formatCount(filteredCount)}
                        </strong>
                    </div>
                </div>
            </header>

            <div className="move-history-filter">
                <div className="move-filter-dates">
                    <div className="move-filter-field">
                        <label htmlFor="move-start-date">
                            시작일
                        </label>

                        <input
                            id="move-start-date"
                            type="date"
                            value={startDate}
                            min={firstAvailableDate}
                            max={lastAvailableDate}
                            onChange={handleStartDateChange}
                        />
                    </div>

                    <span className="move-date-separator">
                        ~
                    </span>

                    <div className="move-filter-field">
                        <label htmlFor="move-end-date">
                            종료일
                        </label>

                        <input
                            id="move-end-date"
                            type="date"
                            value={endDate}
                            min={firstAvailableDate}
                            max={lastAvailableDate}
                            onChange={handleEndDateChange}
                        />
                    </div>
                </div>

                <div className="move-filter-field move-filter-grow">
                    <label htmlFor="move-nickname">
                        닉네임
                    </label>

                    <input
                        id="move-nickname"
                        type="search"
                        value={nicknameKeyword}
                        placeholder="플레이어 닉네임"
                        autoComplete="off"
                        onChange={(event) =>
                            setNicknameKeyword(
                                event.target.value,
                            )
                        }
                    />
                </div>

                <div className="move-filter-field move-server-filter">
                    <label htmlFor="move-server">
                        서버
                    </label>

                    <input
                        id="move-server"
                        type="search"
                        inputMode="numeric"
                        value={serverKeyword}
                        placeholder="예: 3423"
                        autoComplete="off"
                        onChange={(event) =>
                            setServerKeyword(
                                event.target.value.replace(
                                    /\D/g,
                                    "",
                                ),
                            )
                        }
                    />
                </div>

                <button
                    type="button"
                    className="move-filter-reset"
                    onClick={resetFilters}
                    disabled={!hasFilter}
                >
                    초기화
                </button>
            </div>

            {loading && (
                <div className="move-history-message">
                    <span className="move-loading-spinner" />
                    이동 기록을 불러오는 중입니다.
                </div>
            )}

            {!loading && error && (
                <div className="move-history-message is-error">
                    {error}
                </div>
            )}

            {!loading
                && !error
                && selectedFiles.length === 0 && (
                    <div className="move-history-message">
                        선택한 기간에 해당하는 JSON 파일이
                        없습니다.
                    </div>
                )}

            {!loading
                && !error
                && filteredDailyData.map((day) => (
                    <article
                        key={day.date}
                        className="move-day-section"
                    >
                        <header className="move-day-header">
                            <div className="move-day-title">
                                <time dateTime={day.date}>
                                    {formatDateLabel(day.date)}
                                </time>

                                <span>
                                    {day.date}.json
                                </span>
                            </div>

                            <div className="move-day-count">
                                {hasFilter && (
                                    <span>
                                        검색 결과
                                    </span>
                                )}

                                <strong>
                                    {formatCount(
                                        day.filteredRows.length,
                                    )}
                                </strong>

                                {hasFilter && (
                                    <small>
                                        /{" "}
                                        {formatCount(
                                            day.rows.length,
                                        )}
                                    </small>
                                )}

                                <em>명</em>
                            </div>
                        </header>

                        {day.filteredRows.length === 0 ? (
                            <div className="move-day-empty">
                                이 날짜에는 검색 조건에 해당하는
                                이동 기록이 없습니다.
                            </div>
                        ) : (
                            <div className="move-table-wrapper">
                                <table className="move-history-table">
                                    <thead>
                                        <tr>
                                            <th className="move-time-column">
                                                감지 시각
                                            </th>

                                            <th>
                                                플레이어
                                            </th>

                                            <th>
                                                서버 이동
                                            </th>

                                            <th>
                                                이전 연맹
                                            </th>

                                            <th>
                                                이동 후 연맹
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {day.filteredRows.map(
                                            (row, index) => {
                                                const nickname =
                                                    getNickname(row);

                                                const fromServer =
                                                    getFromServer(row);

                                                const toServer =
                                                    getToServer(row);

                                                const previousAlliance =
                                                    getAllianceLabel(
                                                        row.from,
                                                    );

                                                const currentAlliance =
                                                    getAllianceLabel(
                                                        row.to,
                                                    );

                                                return (
                                                    <tr
                                                        key={[
                                                            day.date,
                                                            row.uid,
                                                            row.detectedAt,
                                                            index,
                                                        ].join("-")}
                                                    >
                                                        <td className="move-detected-time">
                                                            {formatDetectedTime(
                                                                row.detectedAt,
                                                            )}
                                                        </td>

                                                        <td>
                                                            <div className="move-player">
                                                                <strong
                                                                    className="move-player-name"
                                                                    title={
                                                                        nickname
                                                                    }
                                                                >
                                                                    {
                                                                        nickname
                                                                    }
                                                                </strong>

                                                                <span className="move-player-cp">
                                                                    <small>
                                                                        CP
                                                                    </small>

                                                                    <strong>
                                                                        {formatCp(
                                                                            row
                                                                                .to
                                                                                ?.score,
                                                                        )}
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="move-server-route">
                                                                <span className="move-server is-from">
                                                                    <small>
                                                                        FROM
                                                                    </small>

                                                                    <strong>
                                                                        S
                                                                        {
                                                                            fromServer
                                                                        }
                                                                    </strong>
                                                                </span>

                                                                <span
                                                                    className="move-arrow"
                                                                    aria-hidden="true"
                                                                >
                                                                    →
                                                                </span>

                                                                <span className="move-server is-to">
                                                                    <small>
                                                                        TO
                                                                    </small>

                                                                    <strong>
                                                                        S
                                                                        {
                                                                            toServer
                                                                        }
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    previousAlliance
                                                                    === "무소속"
                                                                        ? "move-alliance is-empty"
                                                                        : "move-alliance"
                                                                }
                                                                title={
                                                                    previousAlliance
                                                                }
                                                            >
                                                                {
                                                                    previousAlliance
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    currentAlliance
                                                                    === "무소속"
                                                                        ? "move-alliance is-empty"
                                                                        : "move-alliance"
                                                                }
                                                                title={
                                                                    currentAlliance
                                                                }
                                                            >
                                                                {
                                                                    currentAlliance
                                                                }
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                ))}
        </section>
    );
}