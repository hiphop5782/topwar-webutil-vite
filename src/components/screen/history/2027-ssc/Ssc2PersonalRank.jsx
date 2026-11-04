import {
    forwardRef,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    FaArrowLeft,
    FaCalendarDays,
    FaChartLine,
    FaMagnifyingGlass,
    FaRotateRight,
    FaTriangleExclamation,
} from "react-icons/fa6";
import { TableVirtuoso } from "react-virtuoso";

import { normalizeNicknameForSearch } from "@src/utils/normalizeNicknameForSearch";

import "./Ssc2PersonalRank.css";

const PERSONAL_DATA_MODULES = import.meta.glob(
    "/src/assets/json/ssc2/personal/*.json",
    { import: "default" },
);

const PERSONAL_DATA_SOURCES = Object.entries(PERSONAL_DATA_MODULES)
    .sort(([left], [right]) => right.localeCompare(left));

let allDocumentsPromise = null;
let availableDatesPromise = null;

const VIRTUAL_TABLE_COMPONENTS = {
    Scroller: forwardRef(function PersonalRankScroller(props, ref) {
        return (
            <div
                {...props}
                ref={ref}
                className={`ssc2-personal-scroller ${props.className ?? ""}`}
            />
        );
    }),
    Table: props => <table {...props} className="table table-hover align-middle ssc2-personal-table" />,
    TableHead: forwardRef(function PersonalRankHead(props, ref) {
        return <thead {...props} ref={ref} />;
    }),
    TableBody: forwardRef(function PersonalRankBody(props, ref) {
        return <tbody {...props} ref={ref} />;
    }),
    TableRow: props => <tr {...props} />,
};

function isValidUid(value) {
    return /^\d{8,20}$/.test(String(value ?? ""));
}

function normalizeSearchValue(value) {
    return normalizeNicknameForSearch(value).normalize("NFD");
}

function getDocumentSnapshots(document) {
    return Object.entries(document?.dates ?? {})
        .map(([dateKey, snapshot]) => ({
            ...snapshot,
            date: String(snapshot?.date ?? dateKey),
        }))
        .filter(snapshot => /^\d{4}-\d{2}-\d{2}$/.test(snapshot.date) && Array.isArray(snapshot.rankings))
        .sort((left, right) => right.date.localeCompare(left.date));
}

function getSourceSnapshots(sourcePath, document) {
    const snapshots = getDocumentSnapshots(document);
    const sourceDate = String(sourcePath).match(/(\d{4}-\d{2}-\d{2})(?=\.json$)/)?.[1];

    if (sourceDate && snapshots.length > 0) {
        return [{ ...snapshots[0], date: sourceDate }];
    }

    return snapshots;
}

function normalizeRanking(row, index) {
    const uid = String(row?.uid ?? "").trim();
    const merit = Number(row?.merit);
    const serverId = Number(row?.serverId);

    if (!isValidUid(uid) || !Number.isFinite(merit) || !Number.isFinite(serverId)) return null;

    const nickname = String(row?.nickname ?? "").trim() || "-";
    const sourceRank = Number(row?.rank);

    return {
        uid,
        rank: Number.isFinite(sourceRank) && sourceRank > 0 ? sourceRank : index + 1,
        nickname,
        nicknameSearch: normalizeSearchValue(nickname),
        merit,
        serverId,
        level: row?.level !== null && row?.level !== "" && Number.isFinite(Number(row.level))
            ? Number(row.level)
            : null,
    };
}

function normalizeSnapshot(snapshot) {
    const rankings = (snapshot?.rankings ?? [])
        .map(normalizeRanking)
        .filter(Boolean)
        .sort((left, right) => left.rank - right.rank || right.merit - left.merit);

    return { ...snapshot, rankings };
}

async function loadLatestSnapshot() {
    for (const [sourcePath, loadDocument] of PERSONAL_DATA_SOURCES) {
        const document = await loadDocument();
        const [snapshot] = getSourceSnapshots(sourcePath, document);

        if (!snapshot) continue;

        return normalizeSnapshot(snapshot);
    }

    throw new Error("No personal ranking snapshot is available");
}

async function loadAllDocuments() {
    if (!allDocumentsPromise) {
        allDocumentsPromise = Promise.all(PERSONAL_DATA_SOURCES.map(
            async ([sourcePath, loadDocument]) => ({ sourcePath, document: await loadDocument() }),
        ))
            .catch(error => {
                allDocumentsPromise = null;
                throw error;
            });
    }

    return allDocumentsPromise;
}

async function loadAvailableDates() {
    if (!availableDatesPromise) {
        availableDatesPromise = loadAllDocuments()
            .then(documents => [...new Set(
                documents.flatMap(({ sourcePath, document }) => (
                    getSourceSnapshots(sourcePath, document).map(snapshot => snapshot.date)
                )),
            )].sort((left, right) => right.localeCompare(left)))
            .catch(error => {
                availableDatesPromise = null;
                throw error;
            });
    }

    return availableDatesPromise;
}

async function loadSnapshotByDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;

    const documents = await loadAllDocuments();
    for (const { sourcePath, document } of documents) {
        const snapshot = getSourceSnapshots(sourcePath, document).find(candidate => candidate.date === date);
        if (snapshot) return normalizeSnapshot(snapshot);
    }

    return null;
}

async function loadPlayerHistory(uid) {
    if (!isValidUid(uid)) throw new Error("Invalid player identity");

    const documents = await loadAllDocuments();
    const recordsByDate = new Map();

    documents.forEach(({ sourcePath, document }) => {
        getSourceSnapshots(sourcePath, document).forEach(snapshot => {
            if (recordsByDate.has(snapshot.date)) return;
            const player = snapshot.rankings.find(row => String(row?.uid ?? "") === uid);
            if (!player) return;

            const normalizedPlayer = normalizeRanking(player, 0);
            if (!normalizedPlayer) return;

            recordsByDate.set(snapshot.date, {
                date: snapshot.date,
                round: Number(snapshot.round ?? 0),
                totalRound: Number(snapshot.totalRound ?? 0),
                rank: normalizedPlayer.rank,
                nickname: normalizedPlayer.nickname,
                serverId: normalizedPlayer.serverId,
                merit: normalizedPlayer.merit,
            });
        });
    });

    const chronological = [...recordsByDate.values()]
        .sort((left, right) => left.date.localeCompare(right.date));

    return chronological
        .map((record, index) => ({
            ...record,
            change: index === 0 ? null : record.merit - chronological[index - 1].merit,
        }))
        .reverse();
}

function LoadingRows({ compact = false }) {
    return (
        <div className={`ssc2-personal-loading ${compact ? "is-compact" : ""}`} aria-hidden="true">
            {Array.from({ length: compact ? 4 : 9 }, (_, index) => <span key={index} />)}
        </div>
    );
}

export default function Ssc2PersonalRank() {
    const { t, i18n } = useTranslation("viewer");
    const [activeSnapshot, setActiveSnapshot] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [availableDates, setAvailableDates] = useState([]);
    const [dateCatalogLoading, setDateCatalogLoading] = useState(false);
    const [dateError, setDateError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [nicknameQuery, setNicknameQuery] = useState("");
    const [serverQuery, setServerQuery] = useState("");
    const [minimumMerit, setMinimumMerit] = useState("");
    const [maximumMerit, setMaximumMerit] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerHistory, setPlayerHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(false);
    const dateRequestRef = useRef(0);

    const deferredNicknameQuery = useDeferredValue(nicknameQuery);
    const deferredServerQuery = useDeferredValue(serverQuery);
    const deferredMinimumMerit = useDeferredValue(minimumMerit);
    const deferredMaximumMerit = useDeferredValue(maximumMerit);

    const loadLatest = useCallback(() => {
        let active = true;
        setLoading(true);
        setLoadError(false);
        setDateError(false);

        loadLatestSnapshot()
            .then(snapshot => {
                if (!active) return;
                setActiveSnapshot(snapshot);
                setSelectedDate(snapshot.date);
                setAvailableDates(current => current.length > 0 ? current : [snapshot.date]);
            })
            .catch(() => {
                if (active) setLoadError(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    useEffect(() => loadLatest(), [loadLatest]);

    const prepareDateCatalog = useCallback(() => {
        setDateCatalogLoading(true);
        loadAvailableDates()
            .then(setAvailableDates)
            .catch(() => setDateError(true))
            .finally(() => setDateCatalogLoading(false));
    }, []);

    const changeSnapshotDate = useCallback(event => {
        const nextDate = event.target.value;
        if (!nextDate || nextDate === activeSnapshot?.date) return;

        const requestId = dateRequestRef.current + 1;
        dateRequestRef.current = requestId;
        setSelectedDate(nextDate);
        setDateError(false);
        setLoading(true);

        loadSnapshotByDate(nextDate)
            .then(snapshot => {
                if (dateRequestRef.current !== requestId) return;
                if (!snapshot) {
                    setSelectedDate(activeSnapshot?.date ?? "");
                    setDateError(true);
                    return;
                }
                setActiveSnapshot(snapshot);
            })
            .catch(() => {
                if (dateRequestRef.current !== requestId) return;
                setSelectedDate(activeSnapshot?.date ?? "");
                setDateError(true);
            })
            .finally(() => {
                if (dateRequestRef.current === requestId) setLoading(false);
            });
    }, [activeSnapshot]);

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }),
        [i18n.language],
    );
    const dateFormatter = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }),
        [i18n.language],
    );
    const formatNumber = useCallback(
        value => numberFormatter.format(Number(value ?? 0)),
        [numberFormatter],
    );
    const formatDate = useCallback(value => {
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
    }, [dateFormatter]);

    const filteredPlayers = useMemo(() => {
        const nicknameNeedle = normalizeSearchValue(deferredNicknameQuery);
        const serverNeedle = deferredServerQuery.trim();
        const minimum = deferredMinimumMerit === "" ? null : Number(deferredMinimumMerit);
        const maximum = deferredMaximumMerit === "" ? null : Number(deferredMaximumMerit);

        return (activeSnapshot?.rankings ?? []).filter(player => (
            (!nicknameNeedle || player.nicknameSearch.includes(nicknameNeedle))
            && (!serverNeedle || String(player.serverId) === serverNeedle)
            && (minimum === null || player.merit >= minimum)
            && (maximum === null || player.merit <= maximum)
        ));
    }, [
        deferredMaximumMerit,
        deferredMinimumMerit,
        deferredNicknameQuery,
        deferredServerQuery,
        activeSnapshot,
    ]);

    const resetFilters = useCallback(() => {
        setNicknameQuery("");
        setServerQuery("");
        setMinimumMerit("");
        setMaximumMerit("");
    }, []);

    const openPlayerHistory = useCallback(player => {
        setSelectedPlayer({
            uid: player.uid,
            nickname: player.nickname,
            serverId: player.serverId,
            merit: player.merit,
            rank: player.rank,
        });
        setPlayerHistory([]);
        setHistoryLoading(true);
        setHistoryError(false);

        loadPlayerHistory(player.uid)
            .then(setPlayerHistory)
            .catch(() => setHistoryError(true))
            .finally(() => setHistoryLoading(false));
    }, []);

    const closePlayerHistory = useCallback(() => {
        setSelectedPlayer(null);
        setPlayerHistory([]);
        setHistoryError(false);
    }, []);

    if (selectedPlayer) {
        return (
            <section className="ssc2-personal-rank" aria-labelledby="ssc2-personal-history-title">
                <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={closePlayerHistory}>
                    <FaArrowLeft className="me-2" />{t("Ssc2PersonalRank.backToList")}
                </button>

                <div className="card border-0 shadow-sm mb-3">
                    <div className="card-body d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                        <div>
                            <div className="small text-secondary fw-semibold">{t("Ssc2PersonalRank.historyEyebrow")}</div>
                            <h2 id="ssc2-personal-history-title" className="h4 mb-1">{selectedPlayer.nickname}</h2>
                            <div className="text-secondary">S{selectedPlayer.serverId}</div>
                        </div>
                        <div className="ssc2-personal-current-merit text-md-end">
                            <span>{t("Ssc2PersonalRank.latestMerit")}</span>
                            <strong>{formatNumber(selectedPlayer.merit)}</strong>
                        </div>
                    </div>
                </div>

                {historyLoading && <LoadingRows compact />}
                {!historyLoading && historyError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2">
                        <FaTriangleExclamation />{t("Ssc2PersonalRank.historyLoadError")}
                    </div>
                )}
                {!historyLoading && !historyError && (
                    <div className="card border-0 shadow-sm overflow-hidden">
                        <TableVirtuoso
                            className="ssc2-personal-history-virtuoso"
                            style={{ height: "clamp(18rem, 52vh, 34rem)" }}
                            data={playerHistory}
                            components={VIRTUAL_TABLE_COMPONENTS}
                            computeItemKey={(_, record) => `${record.date}-${record.rank}`}
                            fixedHeaderContent={() => (
                                <tr>
                                    <th>{t("Ssc2PersonalRank.table.date")}</th>
                                    <th>{t("Ssc2PersonalRank.table.round")}</th>
                                    <th>{t("Ssc2PersonalRank.table.nickname")}</th>
                                    <th>{t("Ssc2PersonalRank.table.server")}</th>
                                    <th className="text-end">{t("Ssc2PersonalRank.table.rank")}</th>
                                    <th className="text-end">{t("Ssc2PersonalRank.table.merit")}</th>
                                    <th className="text-end">{t("Ssc2PersonalRank.table.change")}</th>
                                </tr>
                            )}
                            itemContent={(_, record) => (<>
                                <td>{formatDate(record.date)}</td>
                                <td>{record.round > 0 ? `${record.round}/${record.totalRound || "-"}` : "-"}</td>
                                <td className="ssc2-personal-name-cell" title={record.nickname}>{record.nickname}</td>
                                <td>S{record.serverId}</td>
                                <td className="numeric-cell text-end">{formatNumber(record.rank)}</td>
                                <td className="numeric-cell text-end fw-semibold">{formatNumber(record.merit)}</td>
                                <td className={`numeric-cell text-end ${record.change > 0 ? "text-success" : record.change < 0 ? "text-danger" : "text-secondary"}`}>
                                    {record.change === null ? "-" : `${record.change > 0 ? "+" : ""}${formatNumber(record.change)}`}
                                </td>
                            </>)}
                        />
                    </div>
                )}
            </section>
        );
    }

    return (
        <section className="ssc2-personal-rank" aria-labelledby="ssc2-personal-rank-title">
            <header className="ssc2-personal-heading mb-3">
                <div>
                    <h2 id="ssc2-personal-rank-title" className="h4 mb-1">{t("Ssc2PersonalRank.title")}</h2>
                    <p className="text-secondary mb-0">{t("Ssc2PersonalRank.description")}</p>
                </div>
                {activeSnapshot && (
                    <div className="ssc2-personal-snapshot-controls">
                        <label className="ssc2-personal-date-picker" htmlFor="ssc2-personal-date">
                            <span><FaCalendarDays aria-hidden="true" />{t("Ssc2PersonalRank.dateLabel")}</span>
                            <input
                                id="ssc2-personal-date"
                                type="date"
                                className="form-control form-control-sm"
                                value={selectedDate}
                                min={availableDates.at(-1) ?? ""}
                                max={availableDates[0] ?? ""}
                                list="ssc2-personal-available-dates"
                                onFocus={prepareDateCatalog}
                                onClick={prepareDateCatalog}
                                onChange={changeSnapshotDate}
                            />
                            <datalist id="ssc2-personal-available-dates">
                                {availableDates.map(date => <option key={date} value={date} />)}
                            </datalist>
                        </label>
                        <span className="ssc2-personal-round-badge">{t("Ssc2PersonalRank.roundValue", {
                            round: activeSnapshot.round,
                            total: activeSnapshot.totalRound,
                        })}</span>
                        {dateCatalogLoading && (
                            <small className="text-secondary">{t("Ssc2PersonalRank.dateLoading")}</small>
                        )}
                        {dateError && (
                            <small className="text-danger" role="alert">{t("Ssc2PersonalRank.dateUnavailable")}</small>
                        )}
                    </div>
                )}
            </header>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body ssc2-personal-filters">
                    <div className="ssc2-personal-filter-row is-primary">
                        <label>
                            <span>{t("Ssc2PersonalRank.filters.nickname")}</span>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text"><FaMagnifyingGlass /></span>
                                <input
                                    id="ssc2-personal-nickname"
                                    type="search"
                                    className="form-control"
                                    value={nicknameQuery}
                                    placeholder={t("Ssc2PersonalRank.filters.nicknamePlaceholder")}
                                    onChange={event => setNicknameQuery(event.target.value)}
                                />
                            </div>
                        </label>
                        <label>
                            <span>{t("Ssc2PersonalRank.filters.server")}</span>
                            <input
                                id="ssc2-personal-server"
                                type="text"
                                inputMode="numeric"
                                className="form-control form-control-sm"
                                value={serverQuery}
                                placeholder={t("Ssc2PersonalRank.filters.serverPlaceholder")}
                                onChange={event => setServerQuery(event.target.value.replace(/\D/g, ""))}
                            />
                        </label>
                    </div>
                    <div className="ssc2-personal-filter-row is-range">
                        <label>
                            <span>{t("Ssc2PersonalRank.filters.minimum")}</span>
                            <input
                                id="ssc2-personal-minimum"
                                type="text"
                                inputMode="numeric"
                                className="form-control form-control-sm numeric-cell"
                                value={minimumMerit}
                                placeholder={t("Ssc2PersonalRank.filters.minimumPlaceholder")}
                                onChange={event => setMinimumMerit(event.target.value.replace(/\D/g, ""))}
                            />
                        </label>
                        <label>
                            <span>{t("Ssc2PersonalRank.filters.maximum")}</span>
                            <input
                                id="ssc2-personal-maximum"
                                type="text"
                                inputMode="numeric"
                                className="form-control form-control-sm numeric-cell"
                                value={maximumMerit}
                                placeholder={t("Ssc2PersonalRank.filters.maximumPlaceholder")}
                                onChange={event => setMaximumMerit(event.target.value.replace(/\D/g, ""))}
                            />
                        </label>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                            <FaRotateRight className="me-2" />{t("Ssc2PersonalRank.filters.reset")}
                        </button>
                    </div>
                </div>
            </div>

            {loading && <LoadingRows />}
            {!loading && loadError && (
                <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <span><FaTriangleExclamation className="me-2" />{t("Ssc2PersonalRank.loadError")}</span>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadLatest}>
                        {t("Ssc2PersonalRank.retry")}
                    </button>
                </div>
            )}
            {!loading && !loadError && activeSnapshot && (
                <div className="card border-0 shadow-sm overflow-hidden">
                    <div className="card-header bg-transparent ssc2-personal-result-summary">
                        <strong>{t("Ssc2PersonalRank.resultCount", { count: formatNumber(filteredPlayers.length) })}</strong>
                        <span>{t("Ssc2PersonalRank.totalCount", { count: formatNumber(activeSnapshot.rankings.length) })}</span>
                    </div>
                    {filteredPlayers.length === 0 ? (
                        <div className="ssc2-personal-empty">{t("Ssc2PersonalRank.noResults")}</div>
                    ) : (
                        <TableVirtuoso
                            className="ssc2-personal-rank-virtuoso"
                            style={{ height: "clamp(34rem, 74vh, 58rem)" }}
                            data={filteredPlayers}
                            components={VIRTUAL_TABLE_COMPONENTS}
                            computeItemKey={(_, player) => `${player.rank}-${player.serverId}`}
                            fixedHeaderContent={() => (
                                <tr>
                                    <th className="ssc2-personal-col-rank text-end">{t("Ssc2PersonalRank.table.rank")}</th>
                                    <th>{t("Ssc2PersonalRank.table.nickname")}</th>
                                    <th>{t("Ssc2PersonalRank.table.server")}</th>
                                    <th className="text-end">{t("Ssc2PersonalRank.table.merit")}</th>
                                    <th className="ssc2-personal-col-level text-end">{t("Ssc2PersonalRank.table.level")}</th>
                                    <th className="ssc2-personal-col-details text-center">{t("Ssc2PersonalRank.table.details")}</th>
                                </tr>
                            )}
                            itemContent={(_, player) => (<>
                                <td className="numeric-cell text-end fw-semibold">{formatNumber(player.rank)}</td>
                                <td className="ssc2-personal-name-cell" title={player.nickname}>{player.nickname}</td>
                                <td>S{player.serverId}</td>
                                <td className="numeric-cell text-end fw-bold">{formatNumber(player.merit)}</td>
                                <td className="numeric-cell text-end">{player.level ?? "-"}</td>
                                <td className="text-center">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary ssc2-personal-detail-button"
                                        aria-label={t("Ssc2PersonalRank.detailsAria", { nickname: player.nickname })}
                                        title={t("Ssc2PersonalRank.table.details")}
                                        onClick={() => openPlayerHistory(player)}
                                    >
                                        <FaChartLine />
                                    </button>
                                </td>
                            </>)}
                        />
                    )}
                </div>
            )}
        </section>
    );
}
