import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useTranslation } from "react-i18next";

import { useParamState } from "@src/hooks/useParamState";
import DataLoadingPlaceholder from "@src/components/template/DataLoadingPlaceholder";
import {
    listHistoryFiles,
    loadDataFile,
} from "@src/services/topwarDataRepository";
import "./TopwarPlayerNicknameHistory.css";

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

function formatCp(value) {
    const cp = Number(value);

    if (!Number.isFinite(cp)) {
        return "-";
    }

    const million = cp / 1_000_000;

    if (million >= 100) {
        return `${Math.round(million)}M`;
    }

    const truncated = Math.floor(million * 10) / 10;

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

function getLocale(language) {
    if (language?.startsWith("ja")) {
        return "ja-JP";
    }

    if (language?.startsWith("en")) {
        return "en-US";
    }

    return "ko-KR";
}

function getDetectedTimestamp(row) {
    const timestamp = new Date(row.detectedAt).getTime();

    return Number.isNaN(timestamp)
        ? Number.NEGATIVE_INFINITY
        : timestamp;
}

function formatDateTime(value, locale) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(locale, {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatDateOnly(value, locale) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(locale, {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}


/*
 * 닉네임 검색용 시각적 정규화
 *
 * 1) NFKC: 𝐀, Ａ, 𝖠 같은 compatibility 문자를 일반 문자로 환원
 * 2) 라틴 문자의 발음 구별 기호 제거: é -> e, ö -> o
 * 3) zero-width / variation selector 제거
 * 4) 게임 닉네임에서 자주 쓰이는 Greek/Cyrillic homoglyph를 ASCII로 접기
 *
 * 완전한 Unicode confusable 판정이 필요한 경우에는
 * Unicode UTS #39 confusables.txt 기반 skeleton 구현으로 교체할 수 있다.
 */
const NICKNAME_CONFUSABLES = new Map(
    Object.entries({
        // Cyrillic uppercase
        "А": "A", "В": "B", "С": "C", "Е": "E",
        "Н": "H", "І": "I", "Ј": "J", "К": "K",
        "М": "M", "О": "O", "Р": "P", "Ѕ": "S",
        "Т": "T", "Х": "X", "У": "Y",

        // Cyrillic lowercase
        "а": "a", "в": "b", "с": "c", "е": "e",
        "і": "i", "ј": "j", "к": "k", "м": "m",
        "о": "o", "р": "p", "ѕ": "s", "т": "t",
        "х": "x", "у": "y",

        // Greek uppercase
        "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z",
        "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M",
        "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T",
        "Υ": "Y", "Χ": "X",

        // Greek lowercase - visually close Latin forms only
        "α": "a", "β": "b", "ε": "e", "ι": "i",
        "κ": "k", "ο": "o", "ρ": "p", "τ": "t",
        "υ": "y", "χ": "x",
    }),
);

function foldLatinDiacritics(value) {
    return Array.from(value).map((character) => {
        const decomposed = character.normalize("NFD");
        const base = decomposed.charAt(0);

        if (/^[A-Za-z]$/.test(base)) {
            return base;
        }

        return character;
    }).join("");
}

function normalizeNicknameForSearch(value) {
    const compatibilityNormalized = String(value ?? "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
        .replace(/[\uFE00-\uFE0F]/g, "");

    const latinFolded = foldLatinDiacritics(
        compatibilityNormalized,
    );

    return Array.from(latinFolded)
        .map((character) => (
            NICKNAME_CONFUSABLES.get(character)
            ?? character
        ))
        .join("")
        .toLocaleLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function getFromNickname(row) {
    return String(
        row.fromNickname
        ?? row.from?.nickname
        ?? "",
    );
}

function getToNickname(row) {
    return String(
        row.toNickname
        ?? row.to?.nickname
        ?? "",
    );
}

function getRowServer(row) {
    return (
        row.server
        ?? row.toServer
        ?? row.to?.server
        ?? row.fromServer
        ?? row.from?.server
        ?? ""
    );
}

function getRowPower(row) {
    const toPower = Number(row.to?.score);

    if (Number.isFinite(toPower)) {
        return toPower;
    }

    const fromPower = Number(row.from?.score);

    return Number.isFinite(fromPower)
        ? fromPower
        : null;
}

function buildPlayerHistories(dailyData) {
    const historyMap = new Map();

    dailyData.forEach((day) => {
        day.rows.forEach((row, index) => {
            const uid = String(row.uid ?? "").trim();

            if (!uid) {
                return;
            }

            const history = historyMap.get(uid) ?? [];

            history.push({
                ...row,
                __date: day.date,
                __index: index,
            });

            historyMap.set(uid, history);
        });
    });

    return Array.from(historyMap.entries()).map(
        ([uid, rows]) => {
            const sortedRows = [...rows].sort((a, b) => {
                const timestampDiff =
                    getDetectedTimestamp(a)
                    - getDetectedTimestamp(b);

                if (timestampDiff !== 0) {
                    return timestampDiff;
                }

                const dateDiff = String(a.__date).localeCompare(
                    String(b.__date),
                );

                if (dateDiff !== 0) {
                    return dateDiff;
                }

                return a.__index - b.__index;
            });

            const firstRow = sortedRows[0];
            const lastRow = sortedRows[sortedRows.length - 1];

            const firstNickname =
                getFromNickname(firstRow)
                || getToNickname(firstRow);

            const lastNickname =
                getToNickname(lastRow)
                || getFromNickname(lastRow);

            const nicknames = Array.from(
                new Set(
                    sortedRows.flatMap((row) => [
                        getFromNickname(row),
                        getToNickname(row),
                    ]).filter(Boolean),
                ),
            );

            const servers = Array.from(
                new Set(
                    sortedRows
                        .map(getRowServer)
                        .filter((server) => server !== "")
                        .map(String),
                ),
            );

            return {
                uid,
                rows: sortedRows,
                firstNickname,
                lastNickname,
                nicknames,
                servers,
                latestServer: getRowServer(lastRow),
                latestPower: getRowPower(lastRow),
                firstDetectedAt: firstRow?.detectedAt,
                lastDetectedAt: lastRow?.detectedAt,
            };
        },
    );
}

export default function TopwarPlayerNicknameHistory({
    defaultDays = 7,
}) {
    const { t, i18n } = useTranslation("viewer");
    const [nicknameFiles, setNicknameFiles] = useState([]);
    const [indexLoading, setIndexLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        listHistoryFiles("nickname")
            .then((files) => {
                if (mounted) setNicknameFiles(files);
            })
            .catch((error) => {
                console.error(error);
                if (mounted) setNicknameFiles([]);
            })
            .finally(() => {
                if (mounted) setIndexLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const locale = getLocale(
        i18n.resolvedLanguage ?? i18n.language,
    );

    const today = useMemo(
        () => getTodayString(),
        [],
    );

    const firstAvailableDate =
        nicknameFiles[0]?.date ?? today;

    const lastAvailableDate =
        nicknameFiles[nicknameFiles.length - 1]?.date ?? today;

    const calculatedDefaultBegin = useMemo(
        () => shiftDate(today, -(defaultDays - 1)),
        [today, defaultDays],
    );

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
     * ?server=22xx
     * &nickname=player
     * &min=50       // 단위가 없으면 50M
     * &max=500T
     * &begin=2026-08-01
     * &end=2026-08-13
     *
     * UID는 내부 그룹 키로만 사용하며 URL/UI 검색 조건에 포함하지 않는다.
     */
    const [server, setServer] = useParamState(
        "server",
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

    const hasCustomDateRange =
        beginDate !== defaultBeginDate
        || endDate !== today;

    /*
     * 닉네임만 입력한 경우에는 기본 7일 제한을 무시하고
     * 보유 중인 전체 날짜 파일에서 동일 플레이어를 추적한다.
     *
     * 서버/전투력/기간 조건 중 하나라도 추가되면
     * 일반 기간 검색 모드로 돌아간다.
     */
    const isNicknameOnlySearch =
        nicknameKeyword.trim() !== ""
        && server.trim() === ""
        && minPower.trim() === ""
        && maxPower.trim() === ""
        && !hasCustomDateRange;

    useEffect(() => {
        if (beginDate > endDate) {
            setEndDate(beginDate);
        }
    }, [beginDate, endDate, setEndDate]);

    const selectedFiles = useMemo(() => {
        if (isNicknameOnlySearch) {
            return nicknameFiles;
        }

        return nicknameFiles.filter((file) => (
            file.date >= beginDate
            && file.date <= endDate
        ));
    }, [
        nicknameFiles,
        isNicknameOnlySearch,
        beginDate,
        endDate,
    ]);

    useEffect(() => {
        let cancelled = false;

        async function loadNicknameFiles() {
            setLoading(true);
            setError("");

            try {
                const results = await Promise.all(
                    selectedFiles.map(async (file) => {
                        const json = await loadDataFile(file.path);

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
                    a.date.localeCompare(b.date),
                );

                setDailyData(results);
            } catch (loadError) {
                console.error(loadError);

                if (!cancelled) {
                    setDailyData([]);
                    setError(
                        t(
                            "TopwarPlayerNicknameHistory.messages.loadError",
                            {
                                defaultValue:
                                    "닉네임 변경 데이터를 불러오지 못했습니다.",
                            },
                        ),
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadNicknameFiles();

        return () => {
            cancelled = true;
        };
    }, [selectedFiles, t]);

    const playerHistories = useMemo(
        () => buildPlayerHistories(dailyData),
        [dailyData],
    );

    const filteredHistories = useMemo(() => {
        const normalizedNickname =
            normalizeNicknameForSearch(nicknameKeyword);

        const normalizedServer = server.trim();
        const minPowerValue = parsePowerValue(minPower);
        const maxPowerValue = parsePowerValue(maxPower);

        return playerHistories
            .filter((history) => {
                const nicknameMatched =
                    normalizedNickname === ""
                    || history.nicknames.some((nickname) =>
                        normalizeNicknameForSearch(nickname)
                            .includes(normalizedNickname),
                    );

                const serverMatched =
                    normalizedServer === ""
                    || history.servers.some((value) =>
                        matchesServerPattern(
                            value,
                            normalizedServer,
                        ),
                    );

                const power = history.latestPower;
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
                    && serverMatched
                    && minPowerMatched
                    && maxPowerMatched
                );
            })
            .sort((a, b) =>
                getDetectedTimestamp({
                    detectedAt: b.lastDetectedAt,
                })
                - getDetectedTimestamp({
                    detectedAt: a.lastDetectedAt,
                }),
            );
    }, [
        playerHistories,
        nicknameKeyword,
        server,
        minPower,
        maxPower,
    ]);

    const totalChangeCount = useMemo(() => {
        return dailyData.reduce(
            (sum, day) => sum + day.rows.length,
            0,
        );
    }, [dailyData]);

    const hasAdvancedCondition =
        nicknameKeyword.trim() !== ""
        || server.trim() !== ""
        || minPower.trim() !== ""
        || maxPower.trim() !== "";

    const advancedFilterCount = [
        nicknameKeyword,
        server,
        minPower,
        maxPower,
    ].filter((value) => value.trim() !== "").length;

    const hasCustomCondition =
        hasAdvancedCondition
        || hasCustomDateRange;

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

    function handleServerChange(event) {
        setServer(
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

    function resetFilters() {
        setServer("");
        setNicknameKeyword("");
        setMinPower("");
        setMaxPower("");
        setBeginDate("");
        setEndDate("");
    }

    return (
        <section className="topwar-nickname-history">
            <header className="nickname-history-header">
                <div className="nickname-history-title">
                    <span className="nickname-history-eyebrow">
                        {t(
                            "TopwarPlayerNicknameHistory.eyebrow",
                            { defaultValue: "PLAYER DATA" },
                        )}
                    </span>

                    <h2>
                        {t(
                            "TopwarPlayerNicknameHistory.title",
                            { defaultValue: "닉네임 변경 현황" },
                        )}
                    </h2>

                    <p>
                        {t(
                            "TopwarPlayerNicknameHistory.description",
                            {
                                defaultValue:
                                    "기간별 플레이어 닉네임 변경 이력을 확인합니다.",
                            },
                        )}
                    </p>
                </div>

                <div className="nickname-history-summary">
                    <div className="nickname-summary-item">
                        <span>
                            {t(
                                "TopwarPlayerNicknameHistory.summary.days",
                                { defaultValue: "조회 일수" },
                            )}
                        </span>
                        <strong>{selectedFiles.length}</strong>
                    </div>

                    <div className="nickname-summary-item">
                        <span>
                            {t(
                                "TopwarPlayerNicknameHistory.summary.changes",
                                { defaultValue: "변경 건수" },
                            )}
                        </span>
                        <strong>
                            {formatCount(totalChangeCount)}
                        </strong>
                    </div>

                    <div className="nickname-summary-item is-primary">
                        <span>
                            {t(
                                "TopwarPlayerNicknameHistory.summary.results",
                                { defaultValue: "검색 결과" },
                            )}
                        </span>
                        <strong>
                            {formatCount(filteredHistories.length)}
                        </strong>
                    </div>
                </div>
            </header>

            <div className="nickname-history-filter">
                <div className="nickname-filter-row nickname-filter-date-row">
                    <div className="nickname-filter-dates">
                        <div className="nickname-filter-field">
                            <label htmlFor="nickname-begin-date">
                                {t(
                                    "TopwarPlayerNicknameHistory.filters.begin",
                                    { defaultValue: "시작일" },
                                )}
                            </label>
                            <input
                                id="nickname-begin-date"
                                type="date"
                                value={beginDate}
                                min={firstAvailableDate}
                                max={today}
                                onChange={handleBeginDateChange}
                            />
                        </div>

                        <span className="nickname-date-separator">
                            ~
                        </span>

                        <div className="nickname-filter-field">
                            <label htmlFor="nickname-end-date">
                                {t(
                                    "TopwarPlayerNicknameHistory.filters.end",
                                    { defaultValue: "종료일" },
                                )}
                            </label>
                            <input
                                id="nickname-end-date"
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
                        className="nickname-filter-reset"
                        onClick={resetFilters}
                        disabled={!hasCustomCondition}
                    >
                        {t(
                            "TopwarPlayerNicknameHistory.filters.reset",
                            { defaultValue: "초기화" },
                        )}
                    </button>
                </div>

                <details
                    className="nickname-filter-advanced"
                    open={isAdvancedOpen}
                    onToggle={(event) =>
                        setIsAdvancedOpen(
                            event.currentTarget.open,
                        )
                    }
                >
                    <summary className="nickname-filter-advanced-summary">
                        <span>
                            {t(
                                "TopwarPlayerNicknameHistory.filters.advanced",
                                { defaultValue: "상세 옵션" },
                            )}
                        </span>

                        {advancedFilterCount > 0 && (
                            <strong className="nickname-filter-active-count">
                                {t(
                                    "TopwarPlayerNicknameHistory.filters.activeCount",
                                    {
                                        count: advancedFilterCount,
                                        defaultValue:
                                            `${advancedFilterCount}개 적용 중`,
                                    },
                                )}
                            </strong>
                        )}
                    </summary>

                    <div className="nickname-filter-advanced-content">
                        <div className="nickname-filter-row nickname-filter-search-row">
                            <div className="nickname-filter-field nickname-name-filter">
                                <label htmlFor="nickname-keyword">
                                    {t(
                                        "TopwarPlayerNicknameHistory.filters.nickname",
                                        { defaultValue: "닉네임" },
                                    )}
                                </label>
                                <input
                                    id="nickname-keyword"
                                    type="search"
                                    value={nicknameKeyword}
                                    placeholder={t(
                                        "TopwarPlayerNicknameHistory.filters.nicknamePlaceholder",
                                        {
                                            defaultValue:
                                                "변경 전·후 닉네임 · 유사 유니코드 검색",
                                        },
                                    )}
                                    autoComplete="off"
                                    onChange={(event) =>
                                        setNicknameKeyword(
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="nickname-filter-field nickname-server-filter">
                                <label htmlFor="nickname-server">
                                    {t(
                                        "TopwarPlayerNicknameHistory.filters.server",
                                        { defaultValue: "서버" },
                                    )}
                                </label>
                                <input
                                    id="nickname-server"
                                    type="search"
                                    inputMode="text"
                                    value={server}
                                    placeholder={t(
                                        "TopwarPlayerNicknameHistory.filters.serverPlaceholder",
                                        { defaultValue: "예: 3223, 22xx" },
                                    )}
                                    autoComplete="off"
                                    onChange={handleServerChange}
                                />
                            </div>
                        </div>

                        <div className="nickname-filter-row nickname-filter-power-row">
                            <div className="nickname-filter-field nickname-power-filter">
                                <label htmlFor="nickname-min-power">
                                    {t(
                                        "TopwarPlayerNicknameHistory.filters.minPower",
                                        { defaultValue: "전투력 하한" },
                                    )}
                                </label>
                                <input
                                    id="nickname-min-power"
                                    type="search"
                                    inputMode="decimal"
                                    value={minPower}
                                    placeholder={t(
                                        "TopwarPlayerNicknameHistory.filters.minPowerPlaceholder",
                                        { defaultValue: "예: 50 또는 50M" },
                                    )}
                                    autoComplete="off"
                                    onChange={handleMinPowerChange}
                                />
                            </div>

                            <span className="nickname-power-separator">
                                ~
                            </span>

                            <div className="nickname-filter-field nickname-power-filter">
                                <label htmlFor="nickname-max-power">
                                    {t(
                                        "TopwarPlayerNicknameHistory.filters.maxPower",
                                        { defaultValue: "전투력 상한" },
                                    )}
                                </label>
                                <input
                                    id="nickname-max-power"
                                    type="search"
                                    inputMode="decimal"
                                    value={maxPower}
                                    placeholder={t(
                                        "TopwarPlayerNicknameHistory.filters.maxPowerPlaceholder",
                                        { defaultValue: "예: 100M 또는 500T" },
                                    )}
                                    autoComplete="off"
                                    onChange={handleMaxPowerChange}
                                />
                            </div>
                        </div>
                    </div>
                </details>
            </div>

            {isNicknameOnlySearch && (
                <div className="nickname-search-mode">
                    <strong>
                        {t(
                            "TopwarPlayerNicknameHistory.searchMode.fullHistory",
                            { defaultValue: "전체 기간 추적" },
                        )}
                    </strong>
                    <span>
                        {t(
                            "TopwarPlayerNicknameHistory.searchMode.fullHistoryDescription",
                            {
                                begin: firstAvailableDate,
                                end: lastAvailableDate,
                                defaultValue:
                                    `닉네임 단독 검색이므로 ${firstAvailableDate} ~ ${lastAvailableDate} 전체 데이터에서 변경 이력을 추적합니다.`,
                            },
                        )}
                    </span>
                </div>
            )}

            {(indexLoading || loading) && (
                <DataLoadingPlaceholder rows={8} cards={2} />
            )}

            {!indexLoading && !loading && error && (
                <div className="nickname-history-message is-error">
                    {error}
                </div>
            )}

            {!loading
                && !error
                && selectedFiles.length === 0 && (
                    <div className="nickname-history-message">
                        {t(
                            "TopwarPlayerNicknameHistory.messages.noFiles",
                            { defaultValue: "선택한 기간의 데이터가 없습니다." },
                        )}
                    </div>
                )}

            {!loading
                && !error
                && selectedFiles.length > 0
                && filteredHistories.length === 0 && (
                    <div className="nickname-history-message">
                        {t(
                            "TopwarPlayerNicknameHistory.messages.noResults",
                            { defaultValue: "검색 조건에 맞는 결과가 없습니다." },
                        )}
                    </div>
                )}

            {!loading
                && !error
                && filteredHistories.length > 0 && (
                    <div className="nickname-history-list">
                        {filteredHistories.map((history) => (
                            <details
                                key={history.uid}
                                className="nickname-history-item"
                            >
                                <summary className="nickname-history-item-summary">
                                    <div className="nickname-history-player">
                                        <div className="nickname-history-summary-route">
                                            <div className="nickname-history-summary-name is-first">
                                                <span className="nickname-history-label">
                                                    {t(
                                                        "TopwarPlayerNicknameHistory.result.firstNickname",
                                                        { defaultValue: "최초" },
                                                    )}
                                                </span>

                                                <strong
                                                    title={history.firstNickname}
                                                >
                                                    {history.firstNickname
                                                        || t(
                                                            "TopwarPlayerNicknameHistory.result.unknown",
                                                            { defaultValue: "알 수 없음" },
                                                        )}
                                                </strong>
                                            </div>

                                            <span
                                                className="nickname-history-summary-arrow"
                                                aria-hidden="true"
                                            >
                                                →
                                            </span>

                                            <div className="nickname-history-summary-name is-last">
                                                <span className="nickname-history-label">
                                                    {t(
                                                        "TopwarPlayerNicknameHistory.result.lastNickname",
                                                        { defaultValue: "최종" },
                                                    )}
                                                </span>

                                                <strong
                                                    title={history.lastNickname}
                                                >
                                                    {history.lastNickname
                                                        || t(
                                                            "TopwarPlayerNicknameHistory.result.unknown",
                                                            { defaultValue: "알 수 없음" },
                                                        )}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="nickname-history-meta">
                                        <span className="nickname-history-server">
                                            S{history.latestServer || "-"}
                                        </span>

                                        <span className="nickname-history-cp">
                                            <small>CP</small>
                                            <strong>
                                                {formatCp(
                                                    history.latestPower,
                                                )}
                                            </strong>
                                        </span>

                                        <span className="nickname-history-change-count">
                                            {t(
                                                "TopwarPlayerNicknameHistory.result.changeCount",
                                                {
                                                    count: history.rows.length,
                                                    defaultValue:
                                                        `${history.rows.length}회 변경`,
                                                },
                                            )}
                                        </span>

                                        <time
                                            className="nickname-history-last-date"
                                            dateTime={history.lastDetectedAt}
                                        >
                                            {formatDateOnly(
                                                history.lastDetectedAt,
                                                locale,
                                            )}
                                        </time>

                                        <span
                                            className="nickname-history-chevron"
                                            aria-hidden="true"
                                        >
                                            ▾
                                        </span>
                                    </div>
                                </summary>

                                <div className="nickname-history-detail">
                                    <div className="nickname-history-detail-head">
                                        <strong>
                                            {t(
                                                "TopwarPlayerNicknameHistory.result.history",
                                                { defaultValue: "닉네임 변경 이력" },
                                            )}
                                        </strong>
                                        <span>
                                            {formatDateTime(
                                                history.firstDetectedAt,
                                                locale,
                                            )}
                                            {" ~ "}
                                            {formatDateTime(
                                                history.lastDetectedAt,
                                                locale,
                                            )}
                                        </span>
                                    </div>

                                    <div className="nickname-history-timeline">
                                        {history.rows.map((row, index) => {
                                            const fromNickname =
                                                getFromNickname(row)
                                                || t(
                                                    "TopwarPlayerNicknameHistory.result.unknown",
                                                    { defaultValue: "알 수 없음" },
                                                );

                                            const toNickname =
                                                getToNickname(row)
                                                || t(
                                                    "TopwarPlayerNicknameHistory.result.unknown",
                                                    { defaultValue: "알 수 없음" },
                                                );

                                            return (
                                                <div
                                                    key={[
                                                        row.detectedAt,
                                                        row.__date,
                                                        index,
                                                    ].join("-")}
                                                    className="nickname-history-event"
                                                >
                                                    <div className="nickname-history-event-time">
                                                        <time dateTime={row.detectedAt}>
                                                            {formatDateTime(
                                                                row.detectedAt,
                                                                locale,
                                                            )}
                                                        </time>
                                                        <span>
                                                            S{getRowServer(row) || "-"}
                                                        </span>
                                                    </div>

                                                    <div className="nickname-history-route">
                                                        <span
                                                            className="nickname-history-name is-from"
                                                            title={fromNickname}
                                                        >
                                                            {fromNickname}
                                                        </span>

                                                        <span
                                                            className="nickname-history-arrow"
                                                            aria-hidden="true"
                                                        >
                                                            →
                                                        </span>

                                                        <span
                                                            className="nickname-history-name is-to"
                                                            title={toNickname}
                                                        >
                                                            {toNickname}
                                                        </span>
                                                    </div>

                                                    <div className="nickname-history-event-power">
                                                        <small>CP</small>
                                                        <strong>
                                                            {formatCp(
                                                                getRowPower(row),
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
        </section>
    );
}
