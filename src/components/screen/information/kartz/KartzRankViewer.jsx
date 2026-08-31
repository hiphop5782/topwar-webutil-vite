import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { TableVirtuoso } from "react-virtuoso";
import DataLoadingPlaceholder from "@src/components/template/DataLoadingPlaceholder";

import "./KartzData.css";
import { useParamState } from "@src/hooks/useParamState";
import {
    listKartzHistoryFiles,
    loadDataFile,
} from "@src/services/topwarDataRepository";

const VirtualScroller = forwardRef(function VirtualScroller({ className = "", ...props }, ref) {
    return <div {...props} ref={ref} className={`kartz-rank-scroller ${className}`} />;
});

function VirtualTable({ className = "", ...props }) {
    return <table {...props} className={`table table-striped table-rank kartz-virtual-table ${className}`} />;
}

const VIRTUAL_TABLE_COMPONENTS = {
    Scroller: VirtualScroller,
    Table: VirtualTable,
};

function rankCellClass(rank, extra = "") {
    const highlight = rank <= 3 ? `kartz-rank-${rank}` : rank <= 10 ? "kartz-rank-top10" : "";
    return `${highlight} ${extra}`.trim();
}

function PlayerRankingTable({ data, t }) {
    if (data.length === 0) {
        return <div className="kartz-rank-empty">{t("KartzRankViewer.no-results")}</div>;
    }

    return (
        <TableVirtuoso
            className="kartz-rank-virtuoso"
            data={data}
            components={VIRTUAL_TABLE_COMPONENTS}
            increaseViewportBy={320}
            computeItemKey={(_, player) => player.uid ?? `${player.server}-${player.rank}`}
            fixedHeaderContent={() => (
                <tr>
                    <th className="kartz-col-rank">{t("KartzRankViewer.table-rank")}</th>
                    <th className="kartz-col-server">{t("KartzRankViewer.table-server")}</th>
                    <th>{t("KartzRankViewer.table-username")}</th>
                    <th className="text-end kartz-col-round">{t("KartzRankViewer.table-round")}</th>
                    <th className="text-end kartz-col-damage">{t("KartzRankViewer.table-damage")}</th>
                </tr>
            )}
            itemContent={(_, player) => {
                const cellClass = rankCellClass(player.rank);
                return (<>
                    <td className={rankCellClass(player.rank, "numeric-cell")}>{player.rank}</td>
                    <td className={rankCellClass(player.rank, "numeric-cell")}>{player.server}</td>
                    <td className={cellClass} title={player.nickname ?? "Unknown"}>
                        <span className="kartz-rank-name">{player.nickname ?? "Unknown"}</span>
                    </td>
                    <td className={rankCellClass(player.rank, "numeric-cell text-end")}>{player.round}</td>
                    <td className={rankCellClass(player.rank, "text-end")}>
                        {player.damage?.length > 0
                            ? <span className="numeric-cell">{player.damage}</span>
                            : <span className="text-danger fw-bold">Clear</span>}
                    </td>
                </>);
            }}
        />
    );
}

function AllianceRankingTable({ data, t }) {
    if (data.length === 0) {
        return <div className="kartz-rank-empty">{t("KartzRankViewer.no-results")}</div>;
    }

    return (
        <TableVirtuoso
            className="kartz-rank-virtuoso"
            data={data}
            components={VIRTUAL_TABLE_COMPONENTS}
            increaseViewportBy={320}
            computeItemKey={(_, alliance) => `${alliance.server}-${alliance.rank}-${alliance.tag ?? alliance.name}`}
            fixedHeaderContent={() => (
                <tr>
                    <th className="kartz-col-rank">{t("KartzRankViewer.table-rank")}</th>
                    <th className="kartz-col-server">{t("KartzRankViewer.table-server")}</th>
                    <th>{t("KartzRankViewer.table-alliance")}</th>
                    <th className="text-end kartz-col-score">{t("KartzRankViewer.table-score")}</th>
                </tr>
            )}
            itemContent={(_, alliance) => {
                const cellClass = rankCellClass(alliance.rank);
                const allianceName = `[${alliance.tag ?? "-"}] ${alliance.name ?? "Unknown"}`;
                return (<>
                    <td className={rankCellClass(alliance.rank, "numeric-cell")}>{alliance.rank}</td>
                    <td className={rankCellClass(alliance.rank, "numeric-cell")}>{alliance.server}</td>
                    <td className={cellClass} title={allianceName}>
                        <span className="kartz-rank-name">{allianceName}</span>
                    </td>
                    <td className={rankCellClass(alliance.rank, "text-end numeric-cell")}>
                        {Number(alliance.score ?? 0).toLocaleString()}
                    </td>
                </>);
            }}
        />
    );
}

export default function KartzRankViewer() {
    const { t } = useTranslation("viewer");
    const [fileNames, setFileNames] = useState([]);
    const [indexLoading, setIndexLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [rankData, setRankData] = useState(null);

    useEffect(() => {
        listKartzHistoryFiles()
            .then(setFileNames)
            .catch((error) => {
                console.error("Kartz index load failed", error);
                setFileNames([]);
            })
            .finally(() => setIndexLoading(false));
    }, []);

    const defaultWhen = useMemo(() => {
        return fileNames?.length > 0 ? fileNames[0].fileName : "";
    }, [fileNames]);

    const [selectedWhen, setSelectedWhen] = useParamState("when", defaultWhen, {
        validate: value => value === "" || /^2[0-9]{3}-(0[1-9]|1[0-2])$/.test(value),
    });
    const [serverInput, setServerInput] = useParamState("server", "", {
        validate: value => /^[0-9]*$/.test(value),
    });
    const [searchInput, setSearchInput] = useParamState("query", "", {
        validate: value => typeof value === "string" && value.length <= 80,
    });

    useEffect(() => {
        if (!selectedWhen && fileNames.length > 0) {
            setSelectedWhen(fileNames[0].fileName);
        }
    }, [fileNames, selectedWhen, setSelectedWhen]);

    const selectedFile = useMemo(() => {
        if (!selectedWhen) return null;
        return fileNames.find(file => file.fileName === selectedWhen) ?? null;
    }, [fileNames, selectedWhen]);

    const handleFileSelect = useCallback(async () => {
        if (!selectedFile) return;
        setLoading(true);

        try {
            setRankData(await loadDataFile(selectedFile.path));
        } catch (error) {
            console.error("Kartz data load failed", error);
            setRankData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedFile]);

    useEffect(() => {
        handleFileSelect();
    }, [handleFileSelect]);

    const userRankData = useMemo(() => rankData?.playerRankList ?? [], [rankData]);
    const allianceRankData = useMemo(() => rankData?.allianceRankList ?? [], [rankData]);
    const normalizedQuery = searchInput.trim().normalize("NFKC").toLocaleLowerCase();
    const selectedServer = serverInput === "" ? null : Number.parseInt(serverInput, 10);

    const filteredUserRankData = useMemo(() => {
        return userRankData.filter(user => {
            if (selectedServer !== null && user.server !== selectedServer) return false;
            if (!normalizedQuery) return true;
            return String(user.nickname ?? "").normalize("NFKC").toLocaleLowerCase().includes(normalizedQuery);
        });
    }, [userRankData, selectedServer, normalizedQuery]);

    const filteredAllianceRankData = useMemo(() => {
        return allianceRankData.filter(alliance => {
            if (selectedServer !== null && alliance.server !== selectedServer) return false;
            if (!normalizedQuery) return true;
            const searchable = `${alliance.tag ?? ""} ${alliance.name ?? ""}`.normalize("NFKC").toLocaleLowerCase();
            return searchable.includes(normalizedQuery);
        });
    }, [allianceRankData, selectedServer, normalizedQuery]);

    const changeServerInput = useCallback((event) => {
        const value = event.target.value;
        if (value === "" || /^[0-9]+$/.test(value)) setServerInput(value);
    }, [setServerInput]);

    if (indexLoading || loading) {
        return <DataLoadingPlaceholder rows={8} cards={2} />;
    }

    return (<>
        <section className="card border-0 shadow-sm kartz-rank-toolbar">
            <div className="card-body">
                <div className="row g-3 align-items-end">
                    <div className="col-sm-6 col-lg-3">
                        <label className="form-label" htmlFor="kartz-season">{t("KartzRankViewer.season")}</label>
                        <select
                            id="kartz-season"
                            className="form-select"
                            value={selectedWhen}
                            onChange={event => setSelectedWhen(event.target.value)}
                        >
                            {fileNames.map(file => (
                                <option key={file.fileName} value={file.fileName}>{file.fileName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-sm-6 col-lg-3">
                        <label className="form-label" htmlFor="kartz-server">{t("KartzRankViewer.server")}</label>
                        <input
                            id="kartz-server"
                            type="text"
                            className="form-control"
                            placeholder="e.g., 3223"
                            value={serverInput}
                            onChange={changeServerInput}
                            inputMode="numeric"
                        />
                    </div>
                    <div className="col-lg-6">
                        <label className="form-label" htmlFor="kartz-query">{t("KartzRankViewer.search")}</label>
                        <div className="input-group">
                            <span className="input-group-text" aria-hidden="true"><FaMagnifyingGlass /></span>
                            <input
                                id="kartz-query"
                                type="search"
                                className="form-control"
                                placeholder={t("KartzRankViewer.search-placeholder")}
                                value={searchInput}
                                onChange={event => setSearchInput(event.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {rankData && (
            <div className="row g-4 mt-1 kartz-rank-grid">
                <div className="col-12 col-xl-6">
                    <section className="card border-0 shadow-sm kartz-rank-panel">
                        <header className="card-header bg-transparent d-flex align-items-center justify-content-between gap-2">
                            <h3 className="h5 mb-0">{t("KartzRankViewer.user-heading")}</h3>
                            <span className="badge text-bg-primary numeric-cell">
                                {t("KartzRankViewer.result-count", { count: filteredUserRankData.length })}
                            </span>
                        </header>
                        <div className="card-body p-0 kartz-rank-list">
                            <PlayerRankingTable data={filteredUserRankData} t={t} />
                        </div>
                    </section>
                </div>

                {allianceRankData.length > 0 && (
                    <div className="col-12 col-xl-6">
                        <section className="card border-0 shadow-sm kartz-rank-panel">
                            <header className="card-header bg-transparent d-flex align-items-center justify-content-between gap-2">
                                <h3 className="h5 mb-0">{t("KartzRankViewer.alliance-heading")}</h3>
                                <span className="badge text-bg-primary numeric-cell">
                                    {t("KartzRankViewer.result-count", { count: filteredAllianceRankData.length })}
                                </span>
                            </header>
                            <div className="card-body p-0 kartz-rank-list">
                                <AllianceRankingTable data={filteredAllianceRankData} t={t} />
                            </div>
                        </section>
                    </div>
                )}
            </div>
        )}
    </>);
}
