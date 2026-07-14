import { useEffect, useMemo, useState } from "react";
import "./TopwarPlayerMoveHistory.css";

/*
 * Vite가 빌드 시점에 해당 폴더의 JSON 파일을 모두 검색한다.
 *
 * 예:
 * /src/assets/json/power/movement/2026-07-13.json
 * /src/assets/json/power/movement/2026-07-14.json
 */
const movementJsonModules = import.meta.glob(
    "/src/assets/json/power/movement/*.json",
);

/*
 * 파일 경로에서 날짜를 추출해 정렬한다.
 */
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

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    return numberFormatter.format(number);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
        day: "2-digit",
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

    const [year, month, day] = dateString.split("-").map(Number);
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
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + amount);

    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getDate()).padStart(2, "0");

    return `${nextYear}-${nextMonth}-${nextDay}`;
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

function getScoreDifference(row) {
    const fromScore = Number(row.from?.score);
    const toScore = Number(row.to?.score);

    if (!Number.isFinite(fromScore) || !Number.isFinite(toScore)) {
        return null;
    }

    return toScore - fromScore;
}

function ScoreDifference({ value }) {
    if (value === null) {
        return null;
    }

    if (value === 0) {
        return (
            <span className="move-score-difference is-same">
                변동 없음
            </span>
        );
    }

    const className = value > 0 ? "is-up" : "is-down";
    const sign = value > 0 ? "+" : "";

    return (
        <span className={`move-score-difference ${className}`}>
            {sign}
            {formatNumber(value)}
        </span>
    );
}

export default function TopwarPlayerMoveHistory({
    initialStartDate,
    initialEndDate,
    defaultDays = 7,
}) {
    const firstAvailableDate =
        movementFiles[0]?.date ?? getTodayString();

    const lastAvailableDate =
        movementFiles.at(-1)?.date ?? getTodayString();

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

    const [nicknameKeyword, setNicknameKeyword] = useState("");
    const [serverKeyword, setServerKeyword] = useState("");

    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /*
     * 선택된 기간에 포함되는 JSON 파일만 추린다.
     */
    const selectedFiles = useMemo(() => {
        return movementFiles.filter(
            (file) => file.date >= startDate && file.date <= endDate,
        );
    }, [startDate, endDate]);

    /*
     * 기간이 바뀌면 해당 날짜의 JSON 파일을 읽는다.
     */
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
                 * 최신 날짜부터 보이도록 내림차순 정렬
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

    /*
     * 닉네임과 서버 번호 필터링
     */
    const filteredDailyData = useMemo(() => {
        const normalizedNickname = nicknameKeyword
            .trim()
            .toLocaleLowerCase();

        const normalizedServer = serverKeyword.trim();

        return dailyData.map((day) => {
            const filteredRows = day.rows.filter((row) => {
                const nickname = getNickname(row)
                    .toLocaleLowerCase();

                const fromServer = String(getFromServer(row));
                const toServer = String(getToServer(row));

                const nicknameMatched =
                    !normalizedNickname
                    || nickname.includes(normalizedNickname);

                const serverMatched =
                    !normalizedServer
                    || fromServer.includes(normalizedServer)
                    || toServer.includes(normalizedServer);

                return nicknameMatched && serverMatched;
            });

            return {
                ...day,
                filteredRows,
            };
        });
    }, [dailyData, nicknameKeyword, serverKeyword]);

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

    const handleStartDateChange = (event) => {
        const nextStartDate = event.target.value;

        setStartDate(nextStartDate);

        if (nextStartDate > endDate) {
            setEndDate(nextStartDate);
        }
    };

    const handleEndDateChange = (event) => {
        const nextEndDate = event.target.value;

        setEndDate(nextEndDate);

        if (nextEndDate < startDate) {
            setStartDate(nextEndDate);
        }
    };

    const resetFilters = () => {
        setNicknameKeyword("");
        setServerKeyword("");
    };

    return (
        <section className="topwar-move-history">
            <header className="move-history-header">
                <div>
                    <h2>플레이어 서버 이동 기록</h2>

                    <p>
                        날짜별 Top War 플레이어 서버 이동 내역입니다.
                    </p>
                </div>

                <div className="move-history-summary">
                    <div>
                        <span>파일</span>
                        <strong>{selectedFiles.length}</strong>
                    </div>

                    <div>
                        <span>전체 이동</span>
                        <strong>{formatNumber(totalCount)}</strong>
                    </div>

                    <div>
                        <span>검색 결과</span>
                        <strong>{formatNumber(filteredCount)}</strong>
                    </div>
                </div>
            </header>

            <div className="move-history-filter">
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

                <div className="move-filter-field move-filter-grow">
                    <label htmlFor="move-nickname">
                        닉네임
                    </label>

                    <input
                        id="move-nickname"
                        type="search"
                        value={nicknameKeyword}
                        placeholder="닉네임 검색"
                        onChange={(event) =>
                            setNicknameKeyword(event.target.value)
                        }
                    />
                </div>

                <div className="move-filter-field">
                    <label htmlFor="move-server">
                        서버 번호
                    </label>

                    <input
                        id="move-server"
                        type="search"
                        inputMode="numeric"
                        value={serverKeyword}
                        placeholder="예: 3423"
                        onChange={(event) =>
                            setServerKeyword(
                                event.target.value.replace(/\D/g, ""),
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
                    필터 초기화
                </button>
            </div>

            {loading && (
                <div className="move-history-message">
                    이동 기록을 불러오는 중입니다.
                </div>
            )}

            {!loading && error && (
                <div className="move-history-message is-error">
                    {error}
                </div>
            )}

            {!loading && !error && selectedFiles.length === 0 && (
                <div className="move-history-message">
                    선택한 기간에 해당하는 JSON 파일이 없습니다.
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
                            <div>
                                <h3>{formatDateLabel(day.date)}</h3>

                                <span className="move-day-filename">
                                    {day.date}.json
                                </span>
                            </div>

                            <div className="move-day-count">
                                {hasFilter ? (
                                    <>
                                        <strong>
                                            {formatNumber(
                                                day.filteredRows.length,
                                            )}
                                        </strong>
                                        <span>
                                            {" / "}
                                            {formatNumber(day.rows.length)}
                                            명
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <strong>
                                            {formatNumber(day.rows.length)}
                                        </strong>
                                        <span>명</span>
                                    </>
                                )}
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
                                            <th>감지 시각</th>
                                            <th>플레이어</th>
                                            <th>서버 이동</th>
                                            <th>이전 연맹</th>
                                            <th>이동 후 연맹</th>
                                            <th className="move-align-right">
                                                전투력
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

                                                const scoreDifference =
                                                    getScoreDifference(row);

                                                return (
                                                    <tr
                                                        key={[
                                                            day.date,
                                                            row.uid,
                                                            row.detectedAt,
                                                            index,
                                                        ].join("-")}
                                                    >
                                                        <td>
                                                            {formatDateTime(
                                                                row.detectedAt,
                                                            )}
                                                        </td>

                                                        <td>
                                                            <strong className="move-player-name">
                                                                {nickname}
                                                            </strong>

                                                            <span className="move-player-uid">
                                                                UID{" "}
                                                                {row.uid
                                                                    ?? "-"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="move-server-route">
                                                                <span className="move-server is-from">
                                                                    S
                                                                    {
                                                                        fromServer
                                                                    }
                                                                </span>

                                                                <span className="move-arrow">
                                                                    →
                                                                </span>

                                                                <span className="move-server is-to">
                                                                    S
                                                                    {
                                                                        toServer
                                                                    }
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className="move-alliance"
                                                                title={getAllianceLabel(
                                                                    row.from,
                                                                )}
                                                            >
                                                                {getAllianceLabel(
                                                                    row.from,
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className="move-alliance"
                                                                title={getAllianceLabel(
                                                                    row.to,
                                                                )}
                                                            >
                                                                {getAllianceLabel(
                                                                    row.to,
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td className="move-align-right">
                                                            <div className="move-score">
                                                                <strong>
                                                                    {formatNumber(
                                                                        row.to
                                                                            ?.score,
                                                                    )}
                                                                </strong>

                                                                <ScoreDifference
                                                                    value={
                                                                        scoreDifference
                                                                    }
                                                                />
                                                            </div>
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