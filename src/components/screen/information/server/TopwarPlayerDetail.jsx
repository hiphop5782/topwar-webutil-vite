import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useCanonicalUrl } from "@src/hooks/useCanonicalUrl";
import { useParamState } from "@src/hooks/useParamState";
import {
    loadPlayerNicknameShard,
    loadPlayerSearchManifest,
    loadPlayerUidShard,
} from "@src/services/topwarDataRepository";
import {
    filterPlayerSearchRecords,
    getNicknameShardForQuery,
    getPlayerSearchQuery,
    getPlayerSearchShard,
} from "@src/utils/playerSearchIndex";
import { Helmet } from "react-helmet-async";
import {
    FaArrowRightArrowLeft,
    FaClockRotateLeft,
    FaMagnifyingGlass,
    FaServer,
    FaShieldHalved,
    FaSignal,
    FaUser,
    FaUserPen,
} from "react-icons/fa6";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import "flag-icons/sass/flag-icons.scss";
import "./TopwarPlayerDetail.css";

const SEARCH_LIMIT = 20;

function formatCompactPower(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";

    const format = (divisor, suffix) => {
        const compact = Number((number / divisor).toFixed(2));
        return `${compact.toLocaleString()}${suffix}`;
    };

    if (Math.abs(number) >= 1_000_000) return format(1_000_000, "M");
    if (Math.abs(number) >= 1_000) return format(1_000, "K");
    return number.toLocaleString();
}

function formatDate(value) {
    if (value == null || value === "") return "-";
    const numeric = Number(value);
    const date = Number.isFinite(numeric)
        ? new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000)
        : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatRelativeTime(value) {
    if (value == null || value === "") return "-";
    const numeric = Number(value);
    const date = Number.isFinite(numeric)
        ? new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000)
        : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    const future = seconds < 0;
    const elapsed = Math.abs(seconds);
    let label;

    if (elapsed < 60) label = "방금";
    else if (elapsed < 3600) label = `${Math.floor(elapsed / 60)}분`;
    else if (elapsed < 86400) label = `${Math.floor(elapsed / 3600)}시간`;
    else if (elapsed < 2_592_000) label = `${Math.floor(elapsed / 86400)}일`;
    else if (elapsed < 31_536_000) label = `${Math.floor(elapsed / 2_592_000)}개월`;
    else label = `${Math.floor(elapsed / 31_536_000)}년`;

    if (label === "방금") return "방금 전";
    return future ? `${label} 후` : `${label} 전`;
}

function displayValue(value) {
    if (value == null || value === "") return "-";
    if (typeof value === "boolean") return value ? "예" : "아니요";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function getCountryCode(countryFlag) {
    const code = CountryFlagJson[countryFlag];
    return typeof code === "string" ? code.toLowerCase() : null;
}

function InfoItem({ label, value, accent = false }) {
    return (
        <div className={`player-detail-info-item${accent ? " is-accent" : ""}`}>
            <span>{label}</span>
            <strong>{displayValue(value)}</strong>
        </div>
    );
}

export default function TopwarPlayerDetail() {
    const canonicalUrl = useCanonicalUrl();
    const [nicknameParam, setNicknameParam] = useParamState("nickname", "");
    const [nickname, setNickname] = useState(nicknameParam);
    const [debouncedNickname, setDebouncedNickname] = useState(nicknameParam);
    const [suggestions, setSuggestions] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [searchState, setSearchState] = useState("idle");
    const [searchError, setSearchError] = useState("");
    const [selectedUid, setSelectedUid] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailState, setDetailState] = useState("idle");
    const detailRequestId = useRef(0);

    useEffect(() => {
        loadPlayerSearchManifest().catch((error) => {
            console.warn("Player search manifest preload failed", error);
        });
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedNickname(nickname);
            if (nickname !== nicknameParam) setNicknameParam(nickname);
        }, 250);
        return () => window.clearTimeout(timeoutId);
    }, [nickname, nicknameParam, setNicknameParam]);

    useEffect(() => {
        let cancelled = false;
        const query = getPlayerSearchQuery(debouncedNickname);

        if (!query.key || selectedUid) {
            setSuggestions([]);
            setActiveIndex(-1);
            setSearchState("idle");
            return () => {
                cancelled = true;
            };
        }

        setSearchState("loading");
        setSearchError("");

        loadPlayerNicknameShard(getNicknameShardForQuery(query))
            .then((records) => {
                if (cancelled) return;
                const nextSuggestions = filterPlayerSearchRecords(
                    Array.isArray(records) ? records : [],
                    query,
                    SEARCH_LIMIT,
                );
                setSuggestions(nextSuggestions);
                setActiveIndex(nextSuggestions.length ? 0 : -1);
                setSearchState("success");
            })
            .catch((error) => {
                console.error("Player nickname search failed", error);
                if (!cancelled) {
                    setSuggestions([]);
                    setActiveIndex(-1);
                    setSearchState("error");
                    setSearchError("검색 인덱스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedNickname, selectedUid]);

    const selectSuggestion = useCallback((suggestion) => {
        const uid = String(suggestion.u);
        const requestId = detailRequestId.current + 1;
        detailRequestId.current = requestId;

        setNickname(suggestion.n);
        setDebouncedNickname(suggestion.n);
        setNicknameParam(suggestion.n);
        setSelectedUid(uid);
        setSuggestions([]);
        setActiveIndex(-1);
        setDetail(null);
        setDetailState("loading");

        loadPlayerUidShard(getPlayerSearchShard(uid))
            .then((records) => {
                if (detailRequestId.current !== requestId) return;
                const nextDetail = records?.[uid] ?? null;
                setDetail(nextDetail);
                setDetailState(nextDetail ? "success" : "not-found");
            })
            .catch((error) => {
                console.error("Player detail load failed", error);
                if (detailRequestId.current === requestId) {
                    setDetail(null);
                    setDetailState("error");
                }
            });
    }, [setNicknameParam]);

    const handleInputChange = useCallback((event) => {
        detailRequestId.current += 1;
        setNickname(event.target.value);
        setSelectedUid(null);
        setDetail(null);
        setDetailState("idle");
    }, []);

    const handleKeyDown = useCallback((event) => {
        if (!suggestions.length) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % suggestions.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => index <= 0 ? suggestions.length - 1 : index - 1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            const suggestion = suggestions[Math.max(activeIndex, 0)];
            if (suggestion) selectSuggestion(suggestion);
        } else if (event.key === "Escape") {
            setSuggestions([]);
            setActiveIndex(-1);
        }
    }, [activeIndex, selectSuggestion, suggestions]);

    const player = detail?.player ?? null;
    const nicknameHistory = useMemo(
        () => [...(detail?.nicknameHistory ?? [])].reverse(),
        [detail],
    );
    const movementHistory = useMemo(
        () => [...(detail?.movementHistory ?? [])].reverse(),
        [detail],
    );
    const countryCode = getCountryCode(player?.countryFlag);
    const seoTitle = "TopWar 플레이어 검색 · 닉네임·서버 이동 통합 조회 | Topwar Helper";
    const seoDescription = "TopWar 닉네임을 한글 자모·초성, 영문 대소문자와 유사 Unicode 문자로 검색하고 플레이어 정보, 전투력, 동맹, 닉네임 변경 및 서버 이동 기록을 확인하세요.";
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                name: "TopWar 플레이어 통합 조회",
                url: canonicalUrl,
                description: seoDescription,
                applicationCategory: "GameApplication",
                operatingSystem: "Any",
                isAccessibleForFree: true,
                potentialAction: {
                    "@type": "SearchAction",
                    target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${canonicalUrl}?nickname={nickname}`,
                    },
                    "query-input": "required name=nickname",
                },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Topwar Helper", item: new URL("/", canonicalUrl).href },
                    { "@type": "ListItem", position: 2, name: "데이터 조회", item: new URL("../", canonicalUrl).href },
                    { "@type": "ListItem", position: 3, name: "플레이어 통합 조회", item: canonicalUrl },
                ],
            },
        ],
    };

    return (
        <article className="topwar-player-detail">
            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDescription} />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <meta name="keywords" content="TopWar, Top War, 탑워, 플레이어 검색, 닉네임 검색, 서버 이동, 닉네임 변경, 전투력" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="Topwar Helper" />
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDescription} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:locale" content="ko_KR" />
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={seoTitle} />
                <meta name="twitter:description" content={seoDescription} />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>

            <header className="player-detail-hero">
                <span><FaMagnifyingGlass /> PLAYER LOOKUP</span>
                <h1>플레이어 통합 조회</h1>
                <p>닉네임을 입력하고 플레이어를 선택하면 현재 정보와 모든 변경 이력을 확인할 수 있습니다.</p>
            </header>

            <section className="player-detail-search" aria-labelledby="player-detail-search-title">
                <div className="player-detail-search-heading">
                    <div>
                        <span>SEARCH</span>
                        <h2 id="player-detail-search-title">닉네임 검색</h2>
                    </div>
                    <small>한글 자모·초성, 대소문자, 유사 Unicode 문자와 숫자를 구분하지 않고 검색합니다.</small>
                </div>

                <div className="player-detail-combobox">
                    <FaMagnifyingGlass aria-hidden="true" />
                    <input
                        type="search"
                        value={nickname}
                        placeholder="플레이어 닉네임 입력"
                        autoComplete="off"
                        role="combobox"
                        aria-label="플레이어 닉네임"
                        aria-autocomplete="list"
                        aria-expanded={suggestions.length > 0}
                        aria-controls="player-detail-suggestions"
                        aria-activedescendant={activeIndex >= 0 ? `player-detail-suggestion-${activeIndex}` : undefined}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                    {searchState === "loading" && <span className="player-detail-searching">검색 중…</span>}
                </div>

                {suggestions.length > 0 && (
                    <div id="player-detail-suggestions" className="player-detail-suggestions" role="listbox">
                        {suggestions.map((suggestion, index) => (
                            <button
                                id={`player-detail-suggestion-${index}`}
                                key={suggestion.u}
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                className={index === activeIndex ? "active" : ""}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectSuggestion(suggestion)}
                            >
                                <span className="player-detail-suggestion-avatar"><FaUser /></span>
                                <span className="player-detail-suggestion-main">
                                    <strong>{suggestion.n}</strong>
                                    {suggestion.x && suggestion.m && <em>이전 닉네임 일치: {suggestion.m}</em>}
                                </span>
                                <span className="player-detail-suggestion-meta">
                                    <strong>S{suggestion.s ?? "-"}</strong>
                                    <small>전투력 {formatCompactPower(suggestion.p)}</small>
                                    <small>{suggestion.t ? `[${suggestion.t}] ` : ""}{suggestion.a || "동맹 없음"}</small>
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {searchState === "success" && debouncedNickname && suggestions.length === 0 && !selectedUid && (
                    <p className="player-detail-message">일치하는 플레이어가 없습니다.</p>
                )}
                {searchError && <p className="player-detail-message is-error">{searchError}</p>}
            </section>

            {detailState === "loading" && <div className="player-detail-loading">플레이어 정보를 불러오는 중입니다…</div>}
            {(detailState === "error" || detailState === "not-found") && (
                <div className="player-detail-loading is-error">선택한 플레이어 정보를 불러오지 못했습니다.</div>
            )}

            {player && (
                <div className="player-detail-results">
                    <section className="player-detail-profile">
                        <div className="player-detail-profile-avatar">
                            {countryCode ? <span className={`fi fi-${countryCode}`} /> : <FaUser />}
                        </div>
                        <div className="player-detail-profile-main">
                            <h2>{player.nickname || "이름 없음"}</h2>
                            <p>{player.allianceTag ? `[${player.allianceTag}] ` : ""}{player.allianceName || "소속 동맹 없음"}</p>
                        </div>
                        <div className={`player-detail-online ${player.online || player.isOnline ? "is-online" : ""}`}>
                            <FaSignal /> {player.online || player.isOnline ? "온라인" : "오프라인"}
                        </div>
                    </section>

                    <section className="player-detail-summary-grid">
                        <LanguageRouterLink
                            className="player-detail-server-link"
                            to={`/information/data?server=${encodeURIComponent(player.server ?? "")}`}
                            aria-label={`S${player.server ?? "-"} 서버 인원 명단 보기`}
                        >
                            <InfoItem label="서버 · 인원 명단 보기" value={`S${player.server ?? "-"}`} accent />
                        </LanguageRouterLink>
                        <InfoItem label="레벨" value={player.level} />
                        <InfoItem label="전투력" value={formatCompactPower(player.cp ?? player.score)} />
                        <InfoItem label="최근 로그인" value={formatRelativeTime(player.lastLogin)} />
                        <InfoItem label="언어" value={player.lang} />
                    </section>

                    <footer className="player-detail-footnote">
                        <FaClockRotateLeft /> 표시 정보는 마지막 데이터 수집 시점을 기준으로 동일 플레이어의 기록을 결합합니다.
                    </footer>

                    <div className="player-detail-history-grid">
                        <section className="player-detail-panel">
                            <header><FaUserPen /><div><span>NAME HISTORY</span><h3>닉네임 변경</h3></div><strong>{nicknameHistory.length}</strong></header>
                            {nicknameHistory.length ? (
                                <div className="player-detail-timeline">
                                    {nicknameHistory.map((event, index) => (
                                        <div key={`${event.at}-${index}`} className="player-detail-timeline-row">
                                            <time>{formatDate(event.at)}</time>
                                            <div><strong>{event.from || "-"}</strong><FaArrowRightArrowLeft /><strong>{event.to || "-"}</strong></div>
                                            <small>S{event.server ?? "-"}</small>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="player-detail-empty">확인된 닉네임 변경 기록이 없습니다.</p>}
                        </section>

                        <section className="player-detail-panel">
                            <header><FaServer /><div><span>SERVER HISTORY</span><h3>서버 이동</h3></div><strong>{movementHistory.length}</strong></header>
                            {movementHistory.length ? (
                                <div className="player-detail-timeline">
                                    {movementHistory.map((event, index) => (
                                        <div key={`${event.at}-${index}`} className="player-detail-timeline-row">
                                            <time>{formatDate(event.at)}</time>
                                            <div><strong>S{event.fromServer ?? "-"}</strong><FaArrowRightArrowLeft /><strong>S{event.toServer ?? "-"}</strong></div>
                                            <small>{event.nickname || "-"}</small>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="player-detail-empty">확인된 서버 이동 기록이 없습니다.</p>}
                        </section>
                    </div>

                </div>
            )}

            {!player && detailState === "idle" && (
                <section className="player-detail-placeholder">
                    <FaShieldHalved />
                    <h2>플레이어를 선택해 주세요</h2>
                    <p>자동완성 목록에서 한 명을 선택하면 해당 플레이어의 정보를 정확하게 조회합니다.</p>
                </section>
            )}
        </article>
    );
}
