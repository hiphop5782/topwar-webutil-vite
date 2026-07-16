import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useTranslation } from "react-i18next";

import { useParamState } from "@src/hooks/useParamState";
import "./TopwarPlayerMoveHistory.css";

const movementJsonModules = import.meta.glob(
    "/src/assets/json/power/movement/*.json",
);

const movementFiles = Object.entries(movementJsonModules)
    .map(([path, loader]) => {
        const match = path.match(
            /(\d{4}-\d{2}-\d{2})\.json$/,
        );

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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SERVER_PATTERN = /^[0-9X]+$/i;
const POWER_INPUT_PATTERN = /^\d+(?:\.\d*)?[KMBT]?$/i;

const POWER_UNIT_MULTIPLIERS = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    T: 1_000_000_000_000,
};

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

    const truncated =
        Math.floor(million * 10) / 10;

    return `${truncated.toFixed(1)}M`;
}

function isValidDateString(value) {
    if (!DATE_PATTERN.test(value)) {
        return false;
    }

    const [year, month, day] = value
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
    );
}

/*
 * useParamState는 validate를 빈 값 삭제보다 먼저 실행하므로
 * 빈 문자열도 허용해야 파라미터 삭제가 가능하다.
 */
function validateDateParam(value) {
    return value === "" || isValidDateString(value);
}

function normalizeServerParam(value) {
    return String(value ?? "")
        .trim()
        .replace(/[^0-9X]/gi, "")
        .toLowerCase();
}

function validateServerParam(value) {
    const normalized = normalizeServerParam(value);

    return (
        normalized === ""
        || SERVER_PATTERN.test(normalized)
    );
}

function parseServerParam(value) {
    return normalizeServerParam(value);
}

/*
 * 서버 검색에서 x는 숫자 한 자리를 의미한다.
 * 22xx -> 2200 ~ 2299
 * 3x23 -> 3023, 3123, ... 3923
 */
function matchesServerPattern(server, pattern) {
    const normalizedPattern = normalizeServerParam(pattern);

    if (normalizedPattern === "") {
        return true;
    }

    const normalizedServer = String(server ?? "");

    if (normalizedServer.length !== normalizedPattern.length) {
        return false;
    }

    return Array.from(normalizedPattern).every(
        (character, index) => (
            character === "x"
            || character === normalizedServer[index]
        ),
    );
}

/*
 * 전투력 검색값
 * - 단위 없음: M으로 처리 (50 -> 50M)
 * - K / M / B / T 지원, 대소문자 구분 없음
 * - 소수 입력 지원 (2.5B 등)
 */
function normalizePowerParam(value) {
    return String(value ?? "")
        .trim()
        .replace(/[\s,]/g, "")
        .toUpperCase();
}

function validatePowerParam(value) {
    const normalized = normalizePowerParam(value);

    return (
        normalized === ""
        || POWER_INPUT_PATTERN.test(normalized)
    );
}

function parsePowerParam(value) {
    const normalized = normalizePowerParam(value);

    return validatePowerParam(normalized)
        ? normalized
        : "";
}

function parsePowerValue(value) {
    const normalized = normalizePowerParam(value);

    if (!POWER_INPUT_PATTERN.test(normalized)) {
        return null;
    }

    const match = normalized.match(
        /^(\d+(?:\.\d*)?)([KMBT]?)$/,
    );

    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2] || "M";
    const power = amount * POWER_UNIT_MULTIPLIERS[unit];

    return Number.isFinite(power) ? power : null;
}

function getDetectedTimestamp(row) {
    const timestamp = new Date(row.detectedAt).getTime();

    return Number.isNaN(timestamp)
        ? Number.NEGATIVE_INFINITY
        : timestamp;
}

function getTodayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
        date.getDate(),
    ).padStart(2, "0");

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

function getLocale(language) {
    if (language?.startsWith("ja")) {
        return "ja-JP";
    }

    if (language?.startsWith("en")) {
        return "en-US";
    }

    return "ko-KR";
}

function formatDetectedTime(value, locale) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString(locale, {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatDateLabel(dateString, locale) {
    if (!isValidDateString(dateString)) {
        return "-";
    }

    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });
}

function getNickname(row) {
    return (
        row.nickname
        || row.to?.nickname
        || row.from?.nickname
        || ""
    );
}

function getFromServer(row) {
    return row.fromServer ?? row.from?.server ?? "";
}

function getToServer(row) {
    return row.toServer ?? row.to?.server ?? "";
}

function getAllianceLabel(player, noneLabel) {
    const tag = player?.allianceTag?.trim();
    const name = player?.allianceName?.trim();

    if (!tag && !name) {
        return noneLabel;
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
    defaultDays = 7,
}) {
    const { t, i18n } = useTranslation("viewer");

    const locale = getLocale(
        i18n.resolvedLanguage ?? i18n.language,
    );

    const today = useMemo(
        () => getTodayString(),
        [],
    );

    const firstAvailableDate =
        movementFiles[0]?.date ?? today;

    const calculatedDefaultBegin = useMemo(
        () => shiftDate(today, -(defaultDays - 1)),
        [today, defaultDays],
    );

    /*
     * 기본 시작일이 보유한 첫 파일보다 이전이라면
     * 실제 첫 데이터 날짜로 제한한다.
     */
    const defaultBeginDate =
        calculatedDefaultBegin < firstAvailableDate
            ? firstAvailableDate
            : calculatedDefaultBegin;

    const parseBeginDate = useCallback(
        (value) => (
            isValidDateString(value)
                ? value
                : defaultBeginDate
        ),
        [defaultBeginDate],
    );

    const parseEndDate = useCallback(
        (value) => (
            isValidDateString(value)
                ? value
                : today
        ),
        [today],
    );

    /*
     * URL query parameter
     *
     * ?in=22xx     // 2200 ~ 2299
     * &out=3x23    // 3023, 3123, ... 3923
     * &nickname=player
     * &min=50       // 단위가 없으면 50M
     * &max=500T
     * &begin=2026-07-01
     * &end=2026-07-14
     */
    const [inServer, setInServer] = useParamState(
        "in",
        "",
        {
            validate: validateServerParam,
            parse: parseServerParam,
        },
    );

    const [outServer, setOutServer] = useParamState(
        "out",
        "",
        {
            validate: validateServerParam,
            parse: parseServerParam,
        },
    );

    const [nicknameKeyword, setNicknameKeyword] =
        useParamState("nickname", "");

    const [minPower, setMinPower] = useParamState(
        "min",
        "",
        {
            validate: validatePowerParam,
            parse: parsePowerParam,
        },
    );

    const [maxPower, setMaxPower] = useParamState(
        "max",
        "",
        {
            validate: validatePowerParam,
            parse: parsePowerParam,
        },
    );

    const [beginDate, setBeginDate] = useParamState(
        "begin",
        defaultBeginDate,
        {
            validate: validateDateParam,
            parse: parseBeginDate,
        },
    );

    const [endDate, setEndDate] = useParamState(
        "end",
        today,
        {
            validate: validateDateParam,
            parse: parseEndDate,
        },
    );

    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAdvancedOpen, setIsAdvancedOpen] =
        useState(false);

    /*
     * URL에 begin > end가 직접 입력된 경우 보정한다.
     */
    useEffect(() => {
        if (beginDate > endDate) {
            setEndDate(beginDate);
        }
    }, [
        beginDate,
        endDate,
        setEndDate,
    ]);

    const selectedFiles = useMemo(() => {
        return movementFiles.filter((file) => {
            return (
                file.date >= beginDate
                && file.date <= endDate
            );
        });
    }, [beginDate, endDate]);

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

                results.sort((a, b) =>
                    b.date.localeCompare(a.date),
                );

                setDailyData(results);
            } catch (loadError) {
                console.error(loadError);

                if (!cancelled) {
                    setDailyData([]);

                    setError(
                        t(
                            "TopwarPlayerMoveHistory.messages.loadError",
                        ),
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
    }, [selectedFiles, t]);

    const filteredDailyData = useMemo(() => {
        const normalizedNickname = nicknameKeyword
            .trim()
            .toLocaleLowerCase();

        const normalizedInServer = inServer.trim();
        const normalizedOutServer = outServer.trim();
        const minPowerValue = parsePowerValue(minPower);
        const maxPowerValue = parsePowerValue(maxPower);

        return dailyData.map((day) => {
            const filteredRows = day.rows
                .filter((row) => {
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

                    /*
                     * in:
                     * 사용자가 이동한 대상 서버
                     */
                    const inServerMatched =
                        matchesServerPattern(
                            toServer,
                            normalizedInServer,
                        );

                    /*
                     * out:
                     * 사용자가 이동하기 전에 있던 서버
                     */
                    const outServerMatched =
                        matchesServerPattern(
                            fromServer,
                            normalizedOutServer,
                        );

                    const power = Number(row.to?.score);
                    const hasValidPower = Number.isFinite(power);

                    const minPowerMatched =
                        minPowerValue === null
                        || (
                            hasValidPower
                            && power >= minPowerValue
                        );

                    const maxPowerMatched =
                        maxPowerValue === null
                        || (
                            hasValidPower
                            && power <= maxPowerValue
                        );

                    return (
                        nicknameMatched
                        && inServerMatched
                        && outServerMatched
                        && minPowerMatched
                        && maxPowerMatched
                    );
                })
                .sort(
                    (a, b) =>
                        getDetectedTimestamp(b)
                        - getDetectedTimestamp(a),
                );

            return {
                ...day,
                filteredRows,
            };
        });
    }, [
        dailyData,
        nicknameKeyword,
        inServer,
        outServer,
        minPower,
        maxPower,
    ]);

    const totalCount = useMemo(() => {
        return dailyData.reduce(
            (sum, day) => sum + day.rows.length,
            0,
        );
    }, [dailyData]);

    const filteredCount = useMemo(() => {
        return filteredDailyData.reduce(
            (sum, day) =>
                sum + day.filteredRows.length,
            0,
        );
    }, [filteredDailyData]);

    const hasAdvancedCondition =
        nicknameKeyword.trim() !== ""
        || inServer.trim() !== ""
        || outServer.trim() !== ""
        || minPower.trim() !== ""
        || maxPower.trim() !== "";

    const advancedFilterCount = [
        nicknameKeyword,
        inServer,
        outServer,
        minPower,
        maxPower,
    ].filter((value) => value.trim() !== "").length;

    const hasCustomCondition =
        hasAdvancedCondition
        || beginDate !== defaultBeginDate
        || endDate !== today;

    /*
     * URL에 상세 검색 파라미터가 있는 경우
     * 현재 적용 중인 조건을 바로 확인할 수 있도록 펼친다.
     */
    useEffect(() => {
        if (hasAdvancedCondition) {
            setIsAdvancedOpen(true);
        }
    }, [hasAdvancedCondition]);

    function handleBeginDateChange(event) {
        const nextBeginDate = event.target.value;

        setBeginDate(nextBeginDate);

        if (
            nextBeginDate !== ""
            && nextBeginDate > endDate
        ) {
            setEndDate(nextBeginDate);
        }
    }

    function handleEndDateChange(event) {
        const nextEndDate = event.target.value;

        setEndDate(nextEndDate);

        if (
            nextEndDate !== ""
            && nextEndDate < beginDate
        ) {
            setBeginDate(nextEndDate);
        }
    }

    function handleInServerChange(event) {
        setInServer(
            normalizeServerParam(event.target.value),
        );
    }

    function handleOutServerChange(event) {
        setOutServer(
            normalizeServerParam(event.target.value),
        );
    }

    function handleMinPowerChange(event) {
        const nextMinPower = normalizePowerParam(
            event.target.value,
        );

        if (validatePowerParam(nextMinPower)) {
            setMinPower(nextMinPower);
        }
    }

    function handleMaxPowerChange(event) {
        const nextMaxPower = normalizePowerParam(
            event.target.value,
        );

        if (validatePowerParam(nextMaxPower)) {
            setMaxPower(nextMaxPower);
        }
    }

    /*
     * 빈 문자열을 전달하면 useParamState가
     * 해당 query parameter를 삭제한다.
     */
    function resetFilters() {
        setInServer("");
        setOutServer("");
        setNicknameKeyword("");
        setMinPower("");
        setMaxPower("");
        setBeginDate("");
        setEndDate("");
    }

    const noneAllianceLabel = t(
        "TopwarPlayerMoveHistory.alliance.none",
    );

    return (
        <section className="topwar-move-history">
            <header className="move-history-header">
                <div className="move-history-title">
                    <span className="move-history-eyebrow">
                        {t(
                            "TopwarPlayerMoveHistory.eyebrow",
                        )}
                    </span>

                    <h2>
                        {t(
                            "TopwarPlayerMoveHistory.title",
                        )}
                    </h2>

                    <p>
                        {t(
                            "TopwarPlayerMoveHistory.description",
                        )}
                    </p>
                </div>

                <div className="move-history-summary">
                    <div className="move-summary-item">
                        <span>
                            {t(
                                "TopwarPlayerMoveHistory.summary.days",
                            )}
                        </span>

                        <strong>
                            {selectedFiles.length}
                        </strong>
                    </div>

                    <div className="move-summary-item">
                        <span>
                            {t(
                                "TopwarPlayerMoveHistory.summary.total",
                            )}
                        </span>

                        <strong>
                            {formatCount(totalCount)}
                        </strong>
                    </div>

                    <div className="move-summary-item is-primary">
                        <span>
                            {t(
                                "TopwarPlayerMoveHistory.summary.results",
                            )}
                        </span>

                        <strong>
                            {formatCount(filteredCount)}
                        </strong>
                    </div>
                </div>
            </header>

            <div className="move-history-filter">
                <div className="move-filter-row move-filter-date-row">
                    <div className="move-filter-dates">
                        <div className="move-filter-field">
                            <label htmlFor="move-begin-date">
                                {t(
                                    "TopwarPlayerMoveHistory.filters.begin",
                                )}
                            </label>

                            <input
                                id="move-begin-date"
                                type="date"
                                value={beginDate}
                                min={firstAvailableDate}
                                max={today}
                                onChange={handleBeginDateChange}
                            />
                        </div>

                        <span className="move-date-separator">
                            ~
                        </span>

                        <div className="move-filter-field">
                            <label htmlFor="move-end-date">
                                {t(
                                    "TopwarPlayerMoveHistory.filters.end",
                                )}
                            </label>

                            <input
                                id="move-end-date"
                                type="date"
                                value={endDate}
                                min={firstAvailableDate}
                                max={today}
                                onChange={handleEndDateChange}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="move-filter-reset"
                        onClick={resetFilters}
                        disabled={!hasCustomCondition}
                    >
                        {t(
                            "TopwarPlayerMoveHistory.filters.reset",
                        )}
                    </button>
                </div>

                <details
                    className="move-filter-advanced"
                    open={isAdvancedOpen}
                    onToggle={(event) =>
                        setIsAdvancedOpen(
                            event.currentTarget.open,
                        )
                    }
                >
                    <summary className="move-filter-advanced-summary">
                        <span>
                            {t(
                                "TopwarPlayerMoveHistory.filters.advanced",
                                {
                                    defaultValue: "상세 옵션",
                                },
                            )}
                        </span>

                        {advancedFilterCount > 0 && (
                            <strong className="move-filter-active-count">
                                {t(
                                    "TopwarPlayerMoveHistory.filters.activeCount",
                                    {
                                        count: advancedFilterCount,
                                        defaultValue:
                                            `${advancedFilterCount}개 적용 중`,
                                    },
                                )}
                            </strong>
                        )}
                    </summary>

                    <div className="move-filter-advanced-content">
                        <div className="move-filter-row move-filter-search-row">
                            <div className="move-filter-field move-nickname-filter">
                                <label htmlFor="move-nickname">
                                    {t(
                                        "TopwarPlayerMoveHistory.filters.nickname",
                                    )}
                                </label>

                                <input
                                    id="move-nickname"
                                    type="search"
                                    value={nicknameKeyword}
                                    placeholder={t(
                                        "TopwarPlayerMoveHistory.filters.nicknamePlaceholder",
                                    )}
                                    autoComplete="off"
                                    onChange={(event) =>
                                        setNicknameKeyword(
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="move-filter-field move-server-filter">
                                <label htmlFor="move-out-server">
                                    {t(
                                        "TopwarPlayerMoveHistory.filters.outServer",
                                    )}
                                </label>

                                <input
                                    id="move-out-server"
                                    type="search"
                                    inputMode="text"
                                    value={outServer}
                                    placeholder={t(
                                        "TopwarPlayerMoveHistory.filters.outServerPlaceholder",
                                    )}
                                    autoComplete="off"
                                    onChange={handleOutServerChange}
                                />
                            </div>

                            <div className="move-filter-field move-server-filter">
                                <label htmlFor="move-in-server">
                                    {t(
                                        "TopwarPlayerMoveHistory.filters.inServer",
                                    )}
                                </label>

                                <input
                                    id="move-in-server"
                                    type="search"
                                    inputMode="text"
                                    value={inServer}
                                    placeholder={t(
                                        "TopwarPlayerMoveHistory.filters.inServerPlaceholder",
                                    )}
                                    autoComplete="off"
                                    onChange={handleInServerChange}
                                />
                            </div>
                        </div>

                        <div className="move-filter-row move-filter-power-row">
                            <div className="move-filter-field move-power-filter">
                                <label htmlFor="move-min-power">
                                    {t(
                                        "TopwarPlayerMoveHistory.filters.minPower",
                                        {
                                            defaultValue: "전투력 하한",
                                        },
                                    )}
                                </label>

                                <input
                                    id="move-min-power"
                                    type="search"
                                    inputMode="decimal"
                                    value={minPower}
                                    placeholder={t(
                                        "TopwarPlayerMoveHistory.filters.minPowerPlaceholder",
                                        {
                                            defaultValue:
                                                "예: 50 또는 50M",
                                        },
                                    )}
                                    autoComplete="off"
                                    onChange={handleMinPowerChange}
                                />
                            </div>

                            <span className="move-power-separator">
                                ~
                            </span>

                            <div className="move-filter-field move-power-filter">
                                <label htmlFor="move-max-power">
                                    {t(
                                        "TopwarPlayerMoveHistory.filters.maxPower",
                                        {
                                            defaultValue: "전투력 상한",
                                        },
                                    )}
                                </label>

                                <input
                                    id="move-max-power"
                                    type="search"
                                    inputMode="decimal"
                                    value={maxPower}
                                    placeholder={t(
                                        "TopwarPlayerMoveHistory.filters.maxPowerPlaceholder",
                                        {
                                            defaultValue:
                                                "예: 100M 또는 500T",
                                        },
                                    )}
                                    autoComplete="off"
                                    onChange={handleMaxPowerChange}
                                />
                            </div>
                        </div>
                    </div>
                </details>
            </div>

            {loading && (
                <div className="move-history-message">
                    <span className="move-loading-spinner" />

                    {t(
                        "TopwarPlayerMoveHistory.messages.loading",
                    )}
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
                        {t(
                            "TopwarPlayerMoveHistory.messages.noFiles",
                        )}
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
                                    {formatDateLabel(
                                        day.date,
                                        locale,
                                    )}
                                </time>

                                <span>
                                    {day.date}.json
                                </span>
                            </div>

                            <div className="move-day-count">
                                {hasCustomCondition ? (
                                    <>
                                        <span>
                                            {t(
                                                "TopwarPlayerMoveHistory.day.searchResult",
                                            )}
                                        </span>

                                        <strong>
                                            {formatCount(
                                                day.filteredRows
                                                    .length,
                                            )}
                                        </strong>

                                        <small>
                                            /{" "}
                                            {formatCount(
                                                day.rows.length,
                                            )}
                                        </small>

                                        <em>
                                            {t(
                                                "TopwarPlayerMoveHistory.day.people",
                                            )}
                                        </em>
                                    </>
                                ) : (
                                    <>
                                        <strong>
                                            {formatCount(
                                                day.rows.length,
                                            )}
                                        </strong>

                                        <em>
                                            {t(
                                                "TopwarPlayerMoveHistory.day.people",
                                            )}
                                        </em>
                                    </>
                                )}
                            </div>
                        </header>

                        {day.filteredRows.length === 0 ? (
                            <div className="move-day-empty">
                                {t(
                                    "TopwarPlayerMoveHistory.messages.noResults",
                                )}
                            </div>
                        ) : (
                            <div className="move-table-wrapper">
                                <table className="move-history-table">
                                    <thead>
                                        <tr>
                                            <th className="move-time-column">
                                                {t(
                                                    "TopwarPlayerMoveHistory.table.detectedAt",
                                                )}
                                            </th>

                                            <th>
                                                {t(
                                                    "TopwarPlayerMoveHistory.table.player",
                                                )}
                                            </th>

                                            <th>
                                                {t(
                                                    "TopwarPlayerMoveHistory.table.serverMove",
                                                )}
                                            </th>

                                            <th>
                                                {t(
                                                    "TopwarPlayerMoveHistory.table.previousAlliance",
                                                )}
                                            </th>

                                            <th>
                                                {t(
                                                    "TopwarPlayerMoveHistory.table.currentAlliance",
                                                )}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {day.filteredRows.map(
                                            (row, index) => {
                                                const nickname =
                                                    getNickname(row)
                                                    || t(
                                                        "TopwarPlayerMoveHistory.player.unknown",
                                                    );

                                                const fromServer =
                                                    getFromServer(row);

                                                const toServer =
                                                    getToServer(row);

                                                const previousAlliance =
                                                    getAllianceLabel(
                                                        row.from,
                                                        noneAllianceLabel,
                                                    );

                                                const currentAlliance =
                                                    getAllianceLabel(
                                                        row.to,
                                                        noneAllianceLabel,
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
                                                                locale,
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
                                                                        {t(
                                                                            "TopwarPlayerMoveHistory.player.cp",
                                                                        )}
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
                                                                        {t(
                                                                            "TopwarPlayerMoveHistory.server.from",
                                                                        )}
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
                                                                        {t(
                                                                            "TopwarPlayerMoveHistory.server.to",
                                                                        )}
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
                                                                        === noneAllianceLabel
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
                                                                        === noneAllianceLabel
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