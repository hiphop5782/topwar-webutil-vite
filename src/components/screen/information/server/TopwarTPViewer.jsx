import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaMagnifyingGlass, FaRotateRight, FaTriangleExclamation } from "react-icons/fa6";
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

const createImageMap = (modules) => Object.fromEntries(
    Object.entries(modules).flatMap(([filePath, source]) => {
        const fileName = filePath.split("/").pop();
        const id = fileName?.replace(/\.webp$/i, "");
        return id ? [[id, source]] : [];
    }),
);

const HERO_IMAGES = createImageMap(import.meta.glob(
    "../../../../assets/images/heros/*.webp",
    { eager: true, import: "default" },
));

const HT_IMAGES = createImageMap(import.meta.glob(
    "../../../../assets/images/ht/*.webp",
    { eager: true, import: "default" },
));

const UNIT_IMAGES = createImageMap(import.meta.glob(
    "../../../../assets/images/units/*.webp",
    { eager: true, import: "default" },
));

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

const compactDate = (value, locale) => {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed)
        ? new Intl.DateTimeFormat(locale, {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(parsed)
        : "-";
};

const relativeDate = (value, locale, now) => {
    const parsed = Date.parse(value ?? "");
    if (!Number.isFinite(parsed)) return null;
    const difference = parsed - now;
    const absolute = Math.abs(difference);
    const units = [
        ["year", 365 * 24 * 60 * 60 * 1_000],
        ["month", 30 * 24 * 60 * 60 * 1_000],
        ["day", 24 * 60 * 60 * 1_000],
        ["hour", 60 * 60 * 1_000],
        ["minute", 60 * 1_000],
        ["second", 1_000],
    ];
    const [unit, duration] = units.find(([, threshold]) => absolute >= threshold) ?? units.at(-1);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        Math.round(difference / duration),
        unit,
    );
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

const formatMillions = (value, locale) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";
    return `${(parsed / 1_000_000).toLocaleString(locale, {
        maximumFractionDigits: 1,
    })}M`;
};

const identity = (item) => String(item?.uid ?? "");
const SLOT_ORDER = [1, 2, 3, 11, 12, 13, 21, 22, 23];
const BRANCH_ORDER = ["army", "navy", "air"];
const BRANCH_META = {
    army: { icon: "◆", translationKey: "branchArmy" },
    navy: { icon: "⚓", translationKey: "branchNavy" },
    air: { icon: "✈", translationKey: "branchAir" },
    balanced: { icon: "★", translationKey: "branchBalanced" },
    mixed: { icon: "◈", translationKey: "branchMixed" },
    unknown: { icon: "?", translationKey: "branchUnknown" },
};

const detectBranch = (value) => {
    const text = String(value ?? "").normalize("NFKC").toLocaleLowerCase();
    if (!text) return null;
    if (/(?:육군|陸軍|陆军|\barmy\b|\bland\b)/u.test(text)) return "army";
    if (/(?:해군|海軍|海军|\bnavy\b|\bnaval\b)/u.test(text)) return "navy";
    if (/(?:공군|空軍|空军|\bair(?:\s*force)?\b)/u.test(text)) return "air";
    return null;
};

const detectBaseUnitBranch = (armyId) => {
    const id = String(armyId ?? "").trim();
    if (/^1\d{4,}$/u.test(id)) return "army";
    if (/^2\d{4,}$/u.test(id)) return "navy";
    if (/^3\d{4,}$/u.test(id)) return "air";
    return null;
};

const getFormationBranch = (formation) => {
    const units = [
        ...(Array.isArray(formation?.army) ? formation.army : []),
        ...(Array.isArray(formation?.slots) ? formation.slots : []),
    ];
    const branches = new Set();

    units.forEach((unit) => {
        const branch = detectBranch(
            unit?.branch
            || unit?.armyType
            || unit?.unitType
            || unit?.name,
        ) || detectBaseUnitBranch(unit?.armyId);
        if (branch) branches.add(branch);
    });

    if (branches.size === 0) return "unknown";
    if (branches.size > 1) return "mixed";
    return branches.values().next().value;
};

const finiteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const mergeFormations = (rawFormations, mappedFormations) => {
    const rawById = new Map(
        (Array.isArray(rawFormations) ? rawFormations : [])
            .map((formation) => [String(formation?.formationId ?? ""), formation]),
    );
    const mapped = Array.isArray(mappedFormations) ? mappedFormations : [];
    if (mapped.length === 0) return Array.isArray(rawFormations) ? rawFormations : [];
    return mapped.map((formation) => ({
        ...rawById.get(String(formation?.formationId ?? "")),
        ...formation,
    }));
};

const mergeBranchRecords = (rawBranches, mappedBranches) => {
    const hasRaw = rawBranches && typeof rawBranches === "object" && !Array.isArray(rawBranches);
    const hasMapped = mappedBranches && typeof mappedBranches === "object" && !Array.isArray(mappedBranches);
    if (!hasRaw && !hasMapped) return undefined;

    return Object.fromEntries(BRANCH_ORDER.map((branch) => {
        const raw = hasRaw ? rawBranches[branch] : null;
        const mapped = hasMapped ? mappedBranches[branch] : null;
        if (!raw && !mapped) return [branch, null];
        return [branch, {
            ...(raw ?? {}),
            ...(mapped ?? {}),
            formations: mergeFormations(raw?.formations, mapped?.formations),
        }];
    }));
};

const normalizeBranchRecord = (record, fallbackCollectedAt) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const formations = Array.isArray(record.formations) ? record.formations : [];
    const totalArmy = finiteNumber(
        record.totalArmy
        ?? (formations.length === 1 ? formations[0]?.totalArmy : null),
    );
    const collectedAt = record.collectedAt || fallbackCollectedAt || null;
    if (totalArmy == null && formations.length === 0 && !record.collectedAt) return null;
    return { ...record, totalArmy, collectedAt, formations };
};

const buildBranchSnapshots = (player) => {
    const hasBranchSchema = player?.branches
        && typeof player.branches === "object"
        && !Array.isArray(player.branches);
    const fallbackCollectedAt = player?.collectedAt || player?.receivedAt || null;

    if (hasBranchSchema) {
        return Object.fromEntries(BRANCH_ORDER.map((branch) => [
            branch,
            normalizeBranchRecord(player.branches[branch], fallbackCollectedAt),
        ]));
    }

    const grouped = Object.fromEntries(BRANCH_ORDER.map((branch) => [branch, []]));
    (Array.isArray(player?.formations) ? player.formations : []).forEach((formation) => {
        const branch = getFormationBranch(formation);
        if (grouped[branch]) grouped[branch].push(formation);
    });

    return Object.fromEntries(BRANCH_ORDER.map((branch) => {
        const formations = grouped[branch];
        if (formations.length === 0) return [branch, null];
        return [branch, normalizeBranchRecord({ formations }, fallbackCollectedAt)];
    }));
};

const getDominantBranch = (snapshots) => {
    const powers = BRANCH_ORDER
        .map((branch) => ({ branch, power: finiteNumber(snapshots?.[branch]?.totalArmy) }))
        .filter(({ power }) => power != null && power > 0);
    if (powers.length === 0) return "unknown";

    if (powers.length === BRANCH_ORDER.length) {
        const values = powers.map(({ power }) => power);
        const maximum = Math.max(...values);
        const minimum = Math.min(...values);
        if (maximum > 0 && (maximum - minimum) / maximum <= 0.1) return "balanced";
    }

    return powers.sort((left, right) => right.power - left.power)[0].branch;
};

const getStrongestSnapshot = (snapshots) => BRANCH_ORDER
    .map((branch) => snapshots?.[branch])
    .filter(Boolean)
    .sort((left, right) => (
        (finiteNumber(right.totalArmy) ?? -1) - (finiteNumber(left.totalArmy) ?? -1)
    ))[0] ?? null;

const getLatestSnapshotTime = (snapshots, fallback) => BRANCH_ORDER
    .map((branch) => snapshots?.[branch]?.collectedAt)
    .filter(Boolean)
    .sort((left, right) => (Date.parse(right) || 0) - (Date.parse(left) || 0))[0] ?? fallback;

const isMechaArmyUnit = (unit) => /^5\d{4,}$/u.test(
    String(unit?.armyId ?? "").trim(),
);

function PortraitPlaceholder({ label, code, kind }) {
    return (
        <div className={`tp-viewer__portrait tp-viewer__portrait--${kind}`} title={label || String(code)}>
            <span>{label || code || "-"}</span>
        </div>
    );
}

function UnitImage({ unit, className, mechaSource }) {
    const unitId = String(unit?.armyId ?? "").trim();
    const isMecha = isMechaArmyUnit(unit) && Boolean(mechaSource);
    const source = isMecha ? mechaSource : UNIT_IMAGES[unitId];

    return (
        <span
            className={`${className}${source ? " has-image" : ""}${isMecha ? " is-mecha" : ""}`}
            aria-hidden="true"
        >
            {source && (
                <img
                    src={source}
                    alt=""
                    loading="lazy"
                    decoding="async"
                />
            )}
        </span>
    );
}

function HeroPortrait({ hero }) {
    const [failed, setFailed] = useState(false);
    const heroId = String(hero?.id ?? "").trim();
    const label = hero?.name || heroId;
    const source = HERO_IMAGES[heroId];

    if (!heroId || !source || failed) {
        return <PortraitPlaceholder label={hero?.name} code={heroId} kind="hero" />;
    }

    return (
        <div className="tp-viewer__portrait tp-viewer__portrait--hero">
            <img
                src={source}
                alt={label}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
            />
        </div>
    );
}

function HeroThumbnail({ hero }) {
    const [failed, setFailed] = useState(false);
    const heroId = String(hero?.id ?? "").trim();
    const label = hero?.name || heroId || "-";
    const source = HERO_IMAGES[heroId];

    return (
        <span className="tp-viewer__hero-thumbnail" title={label}>
            {source && !failed
                ? <img
                    src={source}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                />
                : <span>{label}</span>}
        </span>
    );
}

function MechaPortrait({ formation }) {
    const [failed, setFailed] = useState(false);
    const mechaId = String(formation?.mechaId ?? "").trim();
    const label = formation?.mecha || mechaId;
    const source = HT_IMAGES[mechaId];

    if (!mechaId || !source || failed) {
        return <PortraitPlaceholder label={formation?.mecha} code={mechaId} kind="mecha" />;
    }

    return (
        <div className="tp-viewer__portrait tp-viewer__portrait--mecha">
            <img
                src={source}
                alt={label}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
            />
        </div>
    );
}

function Formation({ formation, t, locale, branchOverride }) {
    const heroes = Array.isArray(formation?.heroes) ? formation.heroes : [];
    const army = Array.isArray(formation?.army) ? formation.army : [];
    const slots = Array.isArray(formation?.slots) ? formation.slots : [];
    const slotsByPosition = new Map(slots.map((slot) => [Number(slot.position), slot]));
    const branch = branchOverride || getFormationBranch(formation);
    const mechaSource = HT_IMAGES[String(formation?.mechaId ?? "").trim()];

    return (
        <section className={`tp-viewer__formation tp-viewer__formation--${branch}`}>
            <div className="tp-viewer__showcase">
                <div>
                    <h3>{t("mecha")}</h3>
                    <MechaPortrait formation={formation} />
                </div>
                <div className="tp-viewer__heroes">
                    <h3>{t("heroes")}</h3>
                    <div className="tp-viewer__portrait-row">
                        {heroes.map((hero, index) => (
                            <div key={`${hero.id}-${index}`}>
                                <HeroPortrait hero={hero} />
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
                        <UnitImage unit={unit} className="tp-viewer__army-image" mechaSource={mechaSource} />
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
                                        <UnitImage unit={slot} className="tp-viewer__slot-unit" mechaSource={mechaSource} />
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

function BranchRecord({ branch, snapshot, rankingPower, t, locale, now }) {
    const [expanded, setExpanded] = useState(false);
    const branchMeta = BRANCH_META[branch];
    const relativeCollectedAt = relativeDate(snapshot?.collectedAt, locale, now);
    const heroes = snapshot?.formations
        ?.flatMap((formation) => Array.isArray(formation?.heroes) ? formation.heroes : [])
        .filter((hero, index, all) => all.findIndex((candidate) => (
            String(candidate?.id ?? candidate?.name ?? "") === String(hero?.id ?? hero?.name ?? "")
        )) === index)
        .slice(0, 3) ?? [];

    return (
        <section className={`tp-viewer__branch-record tp-viewer__branch-record--${branch}`}>
            <button
                type="button"
                className="tp-viewer__branch-record-head"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
                disabled={!snapshot}
            >
                <span className="tp-viewer__branch-record-name">
                    <span aria-hidden="true">{branchMeta.icon}</span>
                    <strong>{t(branchMeta.translationKey)}</strong>
                </span>
                {snapshot ? <>
                    <span className="tp-viewer__branch-stat">
                        <small>{t("combatPower")}</small>
                        <strong>{formatMillions(rankingPower, locale)}</strong>
                    </span>
                    <span className="tp-viewer__branch-stat">
                        <small>{t("totalArmy")}</small>
                        <strong>{number(snapshot.totalArmy, locale)}</strong>
                    </span>
                    {heroes.length > 0 && (
                        <span className="tp-viewer__branch-heroes">
                            {heroes.map((hero, index) => (
                                <HeroThumbnail key={`${hero?.id ?? hero?.name}-${index}`} hero={hero} />
                            ))}
                        </span>
                    )}
                    <FaChevronDown className={expanded ? "is-open" : ""} aria-hidden="true" />
                </> : <span className="tp-viewer__branch-no-data">{t("noBranchData")}</span>}
            </button>
            {snapshot && expanded && (
                <div className="tp-viewer__branch-record-body">
                    <div className="tp-viewer__branch-observed">
                        <span>{t("collectedAt")}</span>
                        {relativeCollectedAt
                            ? <time dateTime={snapshot.collectedAt} title={date(snapshot.collectedAt, locale)}>
                                <strong>{relativeCollectedAt}</strong>
                                <span>({date(snapshot.collectedAt, locale)})</span>
                            </time>
                            : <strong>{t("noBranchData")}</strong>}
                    </div>
                    {snapshot.formations.length > 0
                        ? snapshot.formations.map((formation, index) => (
                            <Formation
                                key={`${formation.formationId}-${index}`}
                                formation={formation}
                                t={t}
                                locale={locale}
                                branchOverride={branch}
                            />
                        ))
                        : <div className="tp-viewer__branch-empty">{t("noFormationData")}</div>}
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
    const [relativeNow, setRelativeNow] = useState(() => Date.now());

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

    useEffect(() => {
        const intervalId = window.setInterval(() => setRelativeNow(Date.now()), 60_000);
        return () => window.clearInterval(intervalId);
    }, []);

    const allPlayers = useMemo(() => {
        const rawByUid = new Map((document?.results ?? []).map((item) => [identity(item), item]));
        const source = Array.isArray(document?.mappedResults) && document.mappedResults.length
            ? document.mappedResults.map((mapped) => {
                const raw = rawByUid.get(identity(mapped));
                return {
                    ...raw,
                    ...mapped,
                    formations: mergeFormations(raw?.formations, mapped?.formations),
                    branches: mergeBranchRecords(raw?.branches, mapped?.branches),
                };
            })
            : document?.results ?? [];
        return source.map((player) => {
            const branchSnapshots = buildBranchSnapshots(player);
            const strongestSnapshot = getStrongestSnapshot(branchSnapshots);
            return {
                ...player,
                branchSnapshots,
                displayBranch: getDominantBranch(branchSnapshots),
                displayTotalArmy: strongestSnapshot?.totalArmy ?? player.totalArmy,
                displayCollectedAt: getLatestSnapshotTime(
                    branchSnapshots,
                    player.collectedAt || player.receivedAt,
                ),
                nicknameSearchText: [
                    player.username,
                    ...(nicknameHistory.get(identity(player)) ?? []),
                ].map(normalize).join("\u0000"),
            };
        }).sort((left, right) =>
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

    const observedAt = document.collectedAt || document.receivedAt || document.updatedAt;

    return (
        <section className="tp-viewer">
            <header className="tp-viewer__header">
                <div><p className="tp-viewer__eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p className="text-muted mb-0">{t("description")}</p></div>
            </header>

            <aside className="tp-viewer__snapshot-alert" role="note" aria-label={t("snapshotNoticeTitle")}>
                <FaTriangleExclamation className="tp-viewer__snapshot-icon" aria-hidden="true" />
                <div className="tp-viewer__snapshot-copy">
                    <strong>{t("snapshotNoticeTitle")}</strong>
                    <p>{t("snapshotNotice")}</p>
                </div>
                <div className="tp-viewer__snapshot-time">
                    <span>{t("collectedAt")}</span>
                    <time dateTime={observedAt || undefined}>{date(observedAt, locale)}</time>
                </div>
            </aside>

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
                    const playerBranch = player.displayBranch;
                    const playerObservedAt = player.displayCollectedAt || observedAt;
                    return <article className={`tp-viewer__player tp-viewer__player--${playerBranch}`} key={uid || player.rank}>
                        <button type="button" className="tp-viewer__player-head" onClick={() => toggle(uid)} aria-expanded={isOpen}>
                            <span className="tp-viewer__identity"><strong>{player.username || uid}</strong></span>
                            <span className="tp-viewer__head-server"><small>{t("serverShort")}</small><strong>{player.serverId}</strong></span>
                            <span className="tp-viewer__head-stat tp-viewer__head-power"><small>{t("combatPower")}</small><strong>{player.TP || formatMillions(player.rankingPower, locale)}</strong></span>
                            <span className="tp-viewer__head-stat tp-viewer__head-army"><small>{t("totalArmy")}</small><strong>{number(player.displayTotalArmy, locale)}</strong></span>
                            <span className="tp-viewer__head-time" title={`${t("collectedAt")}: ${date(playerObservedAt, locale)}`}>
                                <small>{t("collectedAtShort")}</small>
                                <time dateTime={playerObservedAt || undefined}>{compactDate(playerObservedAt, locale)}</time>
                            </span>
                            <FaChevronDown className={isOpen ? "is-open" : ""} />
                        </button>
                        {isOpen && <div className="tp-viewer__details">
                            {BRANCH_ORDER.map((branch) => (
                                <BranchRecord
                                    key={branch}
                                    branch={branch}
                                    snapshot={player.branchSnapshots[branch]}
                                    rankingPower={player.rankingPower}
                                    t={t}
                                    locale={locale}
                                    now={relativeNow}
                                />
                            ))}
                        </div>}
                    </article>;
                }}
            />}
            {players.length === 0 && <div className="alert alert-light text-center">{t("noResults")}</div>}
        </section>
    );
}
