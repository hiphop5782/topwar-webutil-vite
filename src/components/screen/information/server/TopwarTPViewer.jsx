import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaMagnifyingGlass, FaRotateRight } from "react-icons/fa6";
import { Virtuoso } from "react-virtuoso";

import CompositionSearchInput from "@src/components/template/CompositionSearchInput";
import DataLoadingPlaceholder from "@src/components/template/DataLoadingPlaceholder";
import { useParamState } from "@src/hooks/useParamState";
import { normalizeOverallSearch as normalize } from "@src/utils/normalizeOverallSearch";
import {
    listOverallHistoryFiles,
    loadCrossPvpTop100,
    loadDataFile,
} from "@src/services/topwarDataRepository";

import "./TopwarTPViewer.css";

const number = (value, locale) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString(locale) : "-";
};

const date = (value, locale) => {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed)
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(parsed)
        : "-";
};

const formatCompactStat = (value, locale) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    const fixedUnits = ["", "K", "M", "B", "T"];
    const absolute = Math.abs(parsed);
    if (absolute < 1_000) return number(parsed, locale);

    let scaled = absolute;
    let unitIndex = 0;
    while (scaled >= 1_000) {
        scaled /= 1_000;
        unitIndex += 1;
    }

    let suffix;
    if (unitIndex < fixedUnits.length) {
        suffix = fixedUnits[unitIndex];
    } else {
        const alphabetIndex = unitIndex - fixedUnits.length;
        const letter = String.fromCharCode(97 + Math.min(alphabetIndex, 25));
        suffix = `${letter}${letter}`;
    }

    return `${parsed < 0 ? "-" : ""}${scaled.toLocaleString(locale, {
        maximumFractionDigits: 1,
    })}${suffix}`;
};

const identity = (item) => String(item?.uid ?? "");
const SLOT_ORDER = [1, 2, 3, 11, 12, 13, 21, 22, 23];

function PortraitPlaceholder({ label, code, kind }) {
    return (
        <div className={`tp-viewer__portrait tp-viewer__portrait--${kind}`} title={label || String(code)}>
            <span>{label || code || "-"}</span>
        </div>
    );
}

function Formation({ formation, t, locale }) {
    const heroes = Array.isArray(formation?.heroes) ? formation.heroes : [];
    const army = Array.isArray(formation?.army) ? formation.army : [];
    const slots = Array.isArray(formation?.slots) ? formation.slots : [];
    const slotsByPosition = new Map(slots.map((slot) => [Number(slot.position), slot]));

    return (
        <section className="tp-viewer__formation">
            <div className="tp-viewer__formation-head">
                <div>
                    <span className="tp-viewer__label">{t("formation")}</span>
                    <strong>#{formation?.formationId ?? "-"}</strong>
                </div>
                <div>
                    <span className="tp-viewer__label">{t("totalArmy")}</span>
                    <strong>{number(formation?.totalArmy, locale)}</strong>
                </div>
            </div>

            <div className="tp-viewer__showcase">
                <div>
                    <h3>{t("mecha")}</h3>
                    <PortraitPlaceholder label={formation?.mecha} code={formation?.mechaId} kind="mecha" />
                </div>
                <div className="tp-viewer__heroes">
                    <h3>{t("heroes")}</h3>
                    <div className="tp-viewer__portrait-row">
                        {heroes.map((hero, index) => (
                            <div key={`${hero.id}-${index}`}>
                                <PortraitPlaceholder label={hero.name} code={hero.id} kind="hero" />
                                <div className="tp-viewer__hero-meta">
                                    <small>Lv.{hero.level ?? "-"} · ★{hero.star ?? "-"}</small>
                                    <strong className={`tp-viewer__awaken${Number(hero.awakenLevel) > 0 ? " is-awakened" : ""}`}>
                                        {t("awakenLevel")} +{hero.awakenLevel ?? 0}
                                    </strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="tp-viewer__army-summary">
                {army.map((unit, index) => (
                    <div key={`${unit.armyId}-${index}`} className="tp-viewer__army-item" title={unit.name || String(unit.armyId)} aria-label={`${unit.name || unit.armyId} ×${unit.count}`}>
                        <span className="tp-viewer__army-image" aria-hidden="true" />
                        <strong>×{number(unit.count, locale)}</strong>
                    </div>
                ))}
            </div>

            {slots.length > 0 && (
                <div className="tp-viewer__formation-grid" aria-label={t("formationLayout")}>
                    {SLOT_ORDER.map((position) => {
                        const slot = slotsByPosition.get(position);
                        return (
                            <div
                                className={`tp-viewer__formation-cell${slot ? "" : " is-empty"}`}
                                key={position}
                                title={slot?.name || (slot?.armyId ? String(slot.armyId) : undefined)}
                            >
                                <span className="tp-viewer__slot-position">{position}</span>
                                {slot ? <>
                                    <span className="tp-viewer__slot-main">
                                        <span className="tp-viewer__slot-unit" aria-hidden="true" />
                                        <strong className="tp-viewer__slot-count">×{number(slot.count, locale)}</strong>
                                    </span>
                                    <small className="tp-viewer__slot-hp">{formatCompactStat(slot.hp, locale)}</small>
                                </> : <span className="tp-viewer__slot-empty">—</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function TopwarTPViewer() {
    const { t, i18n } = useTranslation("viewer", { keyPrefix: "TopwarTPViewer" });
    const locale = i18n.resolvedLanguage?.startsWith("ja") ? "ja-JP" : i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "ko-KR";
    const [document, setDocument] = useState(null);
    const [nicknameHistory, setNicknameHistory] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useParamState("nickname");
    const [server, setServer] = useParamState("server");
    const deferredQuery = useDeferredValue(query);
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        let cancelled = false;
        loadCrossPvpTop100().then((data) => {
            if (!cancelled) setDocument(data);
        }).catch((loadError) => {
            console.error("병력 정보 로드 실패", loadError);
            if (!cancelled) setError(loadError);
        }).finally(() => { if (!cancelled) setLoading(false); });

        listOverallHistoryFiles("nickname").then(async (files) => {
                const results = await Promise.allSettled(files.map((file) => loadDataFile(file.path)));
                const map = new Map();
                results.forEach((result) => {
                    if (result.status !== "fulfilled") return;
                    (result.value?.rows ?? []).forEach((row) => {
                        const uid = String(row.uid ?? "");
                        if (!uid) return;
                        const names = map.get(uid) ?? new Set();
                        if (row.fromNickname) names.add(row.fromNickname);
                        if (row.toNickname) names.add(row.toNickname);
                        map.set(uid, names);
                    });
                });
                return map;
            }).then((history) => { if (!cancelled) setNicknameHistory(history); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const allPlayers = useMemo(() => {
        const rawByUid = new Map((document?.results ?? []).map((item) => [identity(item), item]));
        const source = Array.isArray(document?.mappedResults) && document.mappedResults.length
            ? document.mappedResults.map((mapped) => {
                const raw = rawByUid.get(identity(mapped));
                const rawFormations = new Map((raw?.formations ?? []).map((formation) => [String(formation.formationId), formation]));
                return {
                    ...raw,
                    ...mapped,
                    formations: (mapped.formations ?? raw?.formations ?? []).map((formation) => ({
                        ...rawFormations.get(String(formation.formationId)),
                        ...formation,
                    })),
                };
            })
            : document?.results ?? [];
        return source.map((player) => ({
            ...player,
            nicknameSearchText: [
                player.username,
                ...(nicknameHistory.get(identity(player)) ?? []),
            ].map(normalize).join("\u0000"),
        })).sort((left, right) =>
            Number(right.rankingPower ?? 0) - Number(left.rankingPower ?? 0)
            || identity(left).localeCompare(identity(right)),
        );
    }, [document, nicknameHistory]);

    const players = useMemo(() => {
        const keyword = normalize(deferredQuery);
        const serverNumber = server === "" ? null : Number(server);
        return allPlayers.filter((player) => {
            if (serverNumber != null && Number(player.serverId) !== serverNumber) return false;
            return !keyword || player.nicknameSearchText.includes(keyword);
        });
    }, [allPlayers, deferredQuery, server]);

    const toggle = (uid) => setExpanded((current) => {
        const next = new Set(current);
        if (next.has(uid)) next.delete(uid); else next.add(uid);
        return next;
    });

    if (loading) return <section className="tp-viewer"><h1>{t("title")}</h1><p className="text-muted">{t("loading")}</p><DataLoadingPlaceholder /></section>;
    if (error || !document) return <section className="tp-viewer"><h1>{t("title")}</h1><div className="alert alert-danger">{t("loadError")}<br/><small>{error?.message}</small></div></section>;

    return (
        <section className="tp-viewer">
            <header className="tp-viewer__header">
                <div><p className="tp-viewer__eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p className="text-muted mb-0">{t("description")}</p></div>
                <div className="tp-viewer__updated"><span>{t("collectedAt")}</span><strong>{date(document.collectedAt || document.receivedAt, locale)}</strong></div>
            </header>

            <div className="tp-viewer__filters">
                <label><span>{t("nickname")}</span><div className="input-group"><span className="input-group-text"><FaMagnifyingGlass /></span><CompositionSearchInput className="form-control" value={query} onValueChange={setQuery} placeholder={t("nicknamePlaceholder")} /></div></label>
                <label><span>{t("server")}</span><input className="form-control" type="number" min="1" inputMode="numeric" value={server} onChange={(event) => setServer(event.target.value)} placeholder={t("serverPlaceholder")} /></label>
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setQuery(""); setServer(""); }}><FaRotateRight /> {t("reset")}</button>
            </div>

            <p className="tp-viewer__result-count">{t("resultCount", { count: players.length })}</p>
            {players.length > 0 && <Virtuoso
                className="tp-viewer__list"
                style={{ height: "min(72vh, 900px)" }}
                data={players}
                computeItemKey={(_, player) => identity(player) || player.rank}
                itemContent={(_, player) => {
                    const uid = identity(player);
                    const isOpen = expanded.has(uid);
                    return <article className="tp-viewer__player" key={uid || player.rank}>
                        <button type="button" className="tp-viewer__player-head" onClick={() => toggle(uid)} aria-expanded={isOpen}>
                            <span className="tp-viewer__identity"><strong>{player.username || uid}</strong><small>s{player.serverId}</small></span>
                            <span><small>{t("combatPower")}</small><strong>{player.TP || number(player.rankingPower, locale)}</strong></span>
                            <span><small>{t("totalArmy")}</small><strong>{number(player.totalArmy, locale)}</strong></span>
                            <FaChevronDown className={isOpen ? "is-open" : ""} />
                        </button>
                        {isOpen && <div className="tp-viewer__details">{(player.formations ?? []).map((formation, index) => <Formation key={`${formation.formationId}-${index}`} formation={formation} t={t} locale={locale} />)}</div>}
                    </article>;
                }}
            />}
            {players.length === 0 && <div className="alert alert-light text-center">{t("noResults")}</div>}
        </section>
    );
}
