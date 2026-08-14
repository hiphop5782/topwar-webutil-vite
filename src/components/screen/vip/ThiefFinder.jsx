import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import {
    useTranslation
} from "react-i18next";

import ServerMapImage
    from "@src/assets/images/map/servermap.png";

import "./ThiefFinder.css";


const THIEF_DATA_URL =
    //"https://raw.githubusercontent.com/hiphop5782/topwar-thief/main/data/thieves.json";
    "https://thief.progamer.info/data/thieves.json";


const POLLING_INTERVAL = 5000;


/*
 * servermap.png의 실제 좌표계
 */
const MAP_MAX_X = 1200;
const MAP_MAX_Y = 1200;


/*
 * 게임 좌표 Y축과 이미지 Y축 방향이 반대면 true
 */
const INVERT_Y = true;


/*
 * 서버별 일반 접근 코드
 *
 * 클라이언트 코드에 포함되므로
 * 강한 보안 수단으로 사용할 수는 없습니다.
 */
const SERVER_ACCESS_CODES = Object.freeze({
    3223: "3223forever",
    4369: "4369forever"
});


/*
 * 모든 서버를 조회할 수 있는 MASTER 코드
 */
const MASTER_ACCESS_CODE =
    "kid3223";


export default function ThiefFinder() {

    const {
        serverId
    } = useParams();


    const {
        t,
        i18n
    } = useTranslation("viewer");


    const [data, setData] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    const [selectedKey, setSelectedKey] =
        useState(null);


    /*
     * 로그인 입력값
     */
    const [accessCode, setAccessCode] =
        useState("");


    /*
     * 일반 서버 코드로 인증한 서버
     */
    const [
        authorizedServerId,
        setAuthorizedServerId
    ] = useState(null);


    /*
     * MASTER 인증 여부
     */
    const [
        masterAuthorized,
        setMasterAuthorized
    ] = useState(false);


    /*
     * MASTER 모드에서 현재 선택한 서버
     */
    const [
        selectedServerId,
        setSelectedServerId
    ] = useState(null);


    const [accessError, setAccessError] =
        useState(false);


    const locationCardRefs =
        useRef(new Map());


    const targetServer =
        Number(serverId);


    /*
     * URL로 직접 접근 가능한 서버인지 확인
     *
     * 일반 접근 페이지 자체는 기존처럼
     * SERVER_ACCESS_CODES에 등록된 서버만 허용
     */
    const serverAllowed =
        Number.isInteger(targetServer) &&
        Object.prototype.hasOwnProperty.call(
            SERVER_ACCESS_CODES,
            targetServer
        );


    /*
     * 일반 인증 또는 MASTER 인증
     */
    const accessGranted =
        serverAllowed &&
        (
            masterAuthorized ||
            authorizedServerId === targetServer
        );


    /*
     * URL 서버가 바뀌면 인증 상태 초기화
     */
    useEffect(() => {

        setAccessCode("");
        setAccessError(false);

        setSelectedKey(null);

        setAuthorizedServerId(null);

        setMasterAuthorized(false);

        setSelectedServerId(null);

        setData(null);

        setLoading(true);

        setError(null);

    }, [
        serverId
    ]);


    /*
     * 데이터 조회
     */
    useEffect(() => {

        if (
            !serverAllowed ||
            !accessGranted
        ) {
            return;
        }


        const controller =
            new AbortController();


        let firstRequest =
            true;

        let requestInProgress =
            false;


        async function load() {

            /*
             * 이전 요청이 아직 진행 중이면
             * 다음 폴링 요청을 중복 실행하지 않는다.
             */
            if (requestInProgress) {
                return;
            }


            requestInProgress =
                true;


            try {

                /*
                 * 최초 조회에서만 로딩 표시
                 */
                if (firstRequest) {

                    setLoading(true);
                    setError(null);

                }


                const response =
                    await fetch(
                        `${THIEF_DATA_URL}?t=${Date.now()}`,
                        {
                            cache: "no-store",
                            signal: controller.signal
                        }
                    );


                if (!response.ok) {

                    if (response.status === 404) {

                        setData({
                            version: 1,
                            updatedAt: null,
                            count: 0,
                            locations: []
                        });

                        setError(null);

                        return;
                    }


                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }


                const json =
                    await response.json();


                setData(json);

                setError(null);

            }
            catch (error) {

                if (
                    error.name === "AbortError"
                ) {
                    return;
                }


                console.error(
                    "[ThiefFinder]",
                    error
                );


                /*
                 * 최초 요청 실패만 오류 화면 표시
                 */
                if (firstRequest) {

                    setError(error);

                }

            }
            finally {

                if (firstRequest) {

                    setLoading(false);

                    firstRequest =
                        false;

                }


                requestInProgress =
                    false;

            }

        }


        /*
         * 입장 직후 즉시 조회
         */
        load();


        /*
         * 이후 5초 폴링
         */
        const intervalId =
            window.setInterval(
                load,
                POLLING_INTERVAL
            );


        return () => {

            window.clearInterval(
                intervalId
            );

            controller.abort();

        };

    }, [
        serverAllowed,
        accessGranted,
        targetServer
    ]);


    /*
     * 전체 위치 데이터 정리
     *
     * MASTER 모드에서는 여기에서
     * 서버 목록을 추출한다.
     */
    const allLocations =
        useMemo(() => {

            if (
                !Array.isArray(
                    data?.locations
                )
            ) {
                return [];
            }


            return data.locations
                .filter(location => {

                    const locationServerId =
                        Number(
                            location.serverId
                        );

                    const x =
                        Number(
                            location.x
                        );

                    const y =
                        Number(
                            location.y
                        );


                    return (
                        Number.isInteger(
                            locationServerId
                        ) &&
                        Number.isFinite(x) &&
                        Number.isFinite(y)
                    );

                });

        }, [
            data
        ]);


    /*
     * 도둑이 존재하는 서버 목록
     *
     * [
     *   {
     *      serverId: 3223,
     *      count: 3
     *   },
     *   ...
     * ]
     */
    const availableServers =
        useMemo(() => {

            const serverMap =
                new Map();


            allLocations.forEach(
                location => {

                    const locationServerId =
                        Number(
                            location.serverId
                        );


                    serverMap.set(
                        locationServerId,
                        (
                            serverMap.get(
                                locationServerId
                            ) ?? 0
                        ) + 1
                    );

                }
            );


            return Array
                .from(
                    serverMap.entries()
                )
                .map(
                    ([
                        serverId,
                        count
                    ]) => ({
                        serverId,
                        count
                    })
                )
                .sort(
                    (a, b) =>
                        a.serverId -
                        b.serverId
                );

        }, [
            allLocations
        ]);


    /*
     * MASTER 입장 후 최초 서버 결정
     *
     * 현재 URL 서버에 도둑이 있으면
     * 해당 서버를 우선 선택.
     *
     * 없으면 첫 번째 도둑 서버를 선택.
     */
    useEffect(() => {

        if (!masterAuthorized) {
            return;
        }


        if (!availableServers.length) {

            setSelectedServerId(
                targetServer
            );

            return;
        }


        const availableServerIds =
            availableServers.map(
                server =>
                    server.serverId
            );


        setSelectedServerId(
            currentServerId => {

                /*
                 * 기존 선택 서버가 아직 존재하면 유지
                 */
                if (
                    availableServerIds.includes(
                        currentServerId
                    )
                ) {
                    return currentServerId;
                }


                /*
                 * URL 서버에 도둑이 있으면 우선 선택
                 */
                if (
                    availableServerIds.includes(
                        targetServer
                    )
                ) {
                    return targetServer;
                }


                /*
                 * 아니면 첫 번째 서버
                 */
                return (
                    availableServerIds[0]
                );

            }
        );

    }, [
        masterAuthorized,
        availableServers,
        targetServer
    ]);


    /*
     * 실제 화면에 표시할 서버
     */
    const activeServerId =
        masterAuthorized
            ? (
                selectedServerId ??
                targetServer
            )
            : targetServer;


    /*
     * 현재 선택 서버의 위치만 필터링
     */
    const locations =
        useMemo(() => {

            if (
                !Number.isFinite(
                    activeServerId
                )
            ) {
                return [];
            }


            return allLocations
                .filter(
                    location =>
                        Number(
                            location.serverId
                        ) ===
                        activeServerId
                );

        }, [
            allLocations,
            activeServerId
        ]);


    /*
     * 언어별 날짜 형식
     */
    const locale =
        useMemo(() => {

            const language =
                i18n.resolvedLanguage
                    ?.split("-")[0]
                ?? "en";


            switch (language) {

                case "ko":
                    return "ko-KR";

                case "ja":
                    return "ja-JP";

                default:
                    return "en-US";

            }

        }, [
            i18n.resolvedLanguage
        ]);


    const formatDateTime =
        value => {

            if (!value) {
                return "-";
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return "-";
            }


            return new Intl.DateTimeFormat(
                locale,
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ).format(date);

        };


    /*
     * 비밀번호 확인
     */
    const handleAccessSubmit =
        event => {

            event.preventDefault();


            if (!serverAllowed) {
                return;
            }


            /*
             * MASTER 코드
             */
            if (
                accessCode ===
                MASTER_ACCESS_CODE
            ) {

                setMasterAuthorized(
                    true
                );

                setAuthorizedServerId(
                    null
                );

                setSelectedServerId(
                    targetServer
                );

                setAccessCode("");

                setAccessError(
                    false
                );

                return;
            }


            /*
             * 일반 서버 코드
             */
            const expectedCode =
                SERVER_ACCESS_CODES[
                    targetServer
                ];


            if (
                accessCode ===
                expectedCode
            ) {

                setAuthorizedServerId(
                    targetServer
                );

                setMasterAuthorized(
                    false
                );

                setSelectedServerId(
                    null
                );

                setAccessCode("");

                setAccessError(
                    false
                );

                return;
            }


            /*
             * 인증 실패
             */
            setAuthorizedServerId(
                null
            );

            setMasterAuthorized(
                false
            );

            setSelectedServerId(
                null
            );

            setAccessCode("");

            setAccessError(
                true
            );

        };


    /*
     * MASTER 서버 변경
     */
    const handleServerChange =
        nextServerId => {

            if (!masterAuthorized) {
                return;
            }


            setSelectedServerId(
                nextServerId
            );

            setSelectedKey(
                null
            );

        };


    const selectLocation =
        (
            location,
            index,
            scrollCard = false
        ) => {

            const key =
                createLocationKey(
                    location,
                    index
                );


            setSelectedKey(
                key
            );


            if (scrollCard) {

                window.requestAnimationFrame(
                    () => {

                        locationCardRefs.current
                            .get(key)
                            ?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest"
                            });

                    }
                );

            }

        };


    /*
     * 지도 마커 클릭
     */
    const handleMarkerClick =
        async (
            location,
            index
        ) => {

            await copyCoordinate(
                location
            );


            selectLocation(
                location,
                index,
                true
            );

        };


    /*
     * 허용되지 않은 URL 서버
     */
    if (!serverAllowed) {

        return (
            <div className="protected-access-page">

                <div className="protected-access-message">

                    <strong>
                        {t(
                            "ThiefFinder.access.deniedTitle"
                        )}
                    </strong>

                    <span>
                        {t(
                            "ThiefFinder.access.deniedMessage"
                        )}
                    </span>

                </div>

            </div>
        );

    }


    /*
     * 인증 전
     */
    if (!accessGranted) {

        return (
            <div className="protected-access-page">

                <form
                    className="protected-access-card"
                    onSubmit={handleAccessSubmit}
                >

                    <h1>
                        {t(
                            "ThiefFinder.access.title"
                        )}
                    </h1>

                    <p>
                        {t(
                            "ThiefFinder.access.description"
                        )}
                    </p>


                    <div className="protected-access-form">

                        <input
                            type="password"
                            value={accessCode}
                            onChange={event => {

                                setAccessCode(
                                    event.target.value
                                );

                                if (accessError) {

                                    setAccessError(
                                        false
                                    );

                                }

                            }}
                            placeholder={t(
                                "ThiefFinder.access.codePlaceholder"
                            )}
                            autoComplete="off"
                            autoFocus
                        />


                        <button
                            type="submit"
                            disabled={!accessCode}
                        >
                            {t(
                                "ThiefFinder.access.submit"
                            )}
                        </button>

                    </div>


                    {accessError && (

                        <div className="protected-access-error">

                            {t(
                                "ThiefFinder.access.invalidCode"
                            )}

                        </div>

                    )}

                </form>

            </div>
        );

    }


    /*
     * 최초 데이터 로딩
     */
    if (loading) {

        return (
            <div className="thief-finder-loading">
                {t(
                    "ThiefFinder.loading"
                )}
            </div>
        );

    }


    /*
     * 최초 데이터 로딩 실패
     */
    if (error) {

        return (
            <div className="alert alert-danger">
                {t(
                    "ThiefFinder.loadError"
                )}
            </div>
        );

    }


    return (
        <div className="thief-finder">

            <div className="thief-finder-header">

                <div>

                    <div className="thief-finder-eyebrow">
                        TOPWAR THIEF FINDER
                    </div>

                    <h1>

                        #{activeServerId}
                        {" "}

                        {t(
                            "ThiefFinder.title"
                        )}

                    </h1>

                    <p>
                        {t(
                            "ThiefFinder.description"
                        )}
                    </p>

                </div>


                <div className="thief-finder-summary">

                    <div>

                        <span>
                            {t(
                                "ThiefFinder.found"
                            )}
                        </span>

                        <strong>
                            {locations.length}
                        </strong>

                    </div>


                    <div>

                        <span>
                            {t(
                                "ThiefFinder.updatedAt"
                            )}
                        </span>

                        <strong>
                            {formatDateTime(
                                data?.updatedAt
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/*
             * MASTER 서버 선택 영역
             *
             * 실제 도둑이 존재하는 서버만 표시
             */}
            {masterAuthorized && (

                <div
                    className="
                        thief-master-server-selector
                        mb-3
                    "
                >

                    <div
                        className="
                            d-flex
                            align-items-center
                            flex-wrap
                            gap-2
                        "
                    >

                        <strong
                            className="
                                me-1
                                text-danger
                            "
                        >
                            MASTER
                        </strong>


                        {availableServers.map(
                            server => (

                                <button
                                    key={
                                        server.serverId
                                    }
                                    type="button"
                                    className={
                                        `btn btn-sm ${
                                            activeServerId ===
                                            server.serverId
                                                ? "btn-primary"
                                                : "btn-outline-primary"
                                        }`
                                    }
                                    onClick={() =>
                                        handleServerChange(
                                            server.serverId
                                        )
                                    }
                                >

                                    #{server.serverId}

                                    {" "}

                                    <span
                                        className="
                                            opacity-75
                                        "
                                    >
                                        ({server.count})
                                    </span>

                                </button>

                            )
                        )}


                        {!availableServers.length && (

                            <span
                                className="
                                    text-muted
                                    small
                                "
                            >
                                도둑이 발견된 서버가 없습니다.
                            </span>

                        )}

                    </div>

                </div>

            )}


            <div className="thief-content-layout">

                <div className="thief-map-scroll">

                    <div className="thief-map-stage">

                        <img
                            src={ServerMapImage}
                            alt={
                                t(
                                    "ThiefFinder.mapAlt",
                                    {
                                        serverId:
                                            activeServerId
                                    }
                                )
                            }
                            className="thief-map-image"
                            draggable={false}
                        />


                        <div className="thief-map-overlay">

                            {locations.map(
                                (
                                    location,
                                    index
                                ) => {

                                    const position =
                                        convertPosition(
                                            location.x,
                                            location.y
                                        );


                                    const key =
                                        createLocationKey(
                                            location,
                                            index
                                        );


                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            className={
                                                `thief-marker ${
                                                    selectedKey === key
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                            style={{
                                                left:
                                                    `${position.left}%`,
                                                top:
                                                    `${position.top}%`
                                            }}
                                            title={
                                                `${location.x}:${location.y}`
                                            }
                                            onClick={() =>
                                                handleMarkerClick(
                                                    location,
                                                    index
                                                )
                                            }
                                        >

                                            <span className="thief-marker-dot">

                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >

                                                    <path
                                                        d="
                                                            M12 2
                                                            C7.6 2 4 5.6 4 10
                                                            C4 15.5 12 22 12 22
                                                            C12 22 20 15.5 20 10
                                                            C20 5.6 16.4 2 12 2Z
                                                        "
                                                    />

                                                    <circle
                                                        cx="12"
                                                        cy="10"
                                                        r="3.2"
                                                    />

                                                </svg>

                                            </span>

                                        </button>
                                    );

                                }
                            )}


                            {!locations.length && (

                                <div className="thief-map-empty">

                                    <strong>
                                        {t(
                                            "ThiefFinder.empty.title"
                                        )}
                                    </strong>

                                    <span>
                                        {t(
                                            "ThiefFinder.empty.description"
                                        )}
                                    </span>

                                </div>

                            )}

                        </div>

                    </div>

                </div>


                <aside className="thief-location-panel">

                    <div className="thief-location-panel-header">

                        <div>

                            <span>
                                {t(
                                    "ThiefFinder.found"
                                )}
                            </span>

                            <strong>
                                {locations.length}
                            </strong>

                        </div>

                        <small>
                            #{activeServerId}
                        </small>

                    </div>


                    <div className="thief-location-list">

                        {locations.map(
                            (
                                location,
                                index
                            ) => {

                                const key =
                                    createLocationKey(
                                        location,
                                        index
                                    );


                                return (
                                    <LocationCard
                                        key={key}
                                        refCallback={element => {

                                            if (element) {

                                                locationCardRefs.current
                                                    .set(
                                                        key,
                                                        element
                                                    );

                                            }
                                            else {

                                                locationCardRefs.current
                                                    .delete(
                                                        key
                                                    );

                                            }

                                        }}
                                        location={location}
                                        active={
                                            selectedKey ===
                                            key
                                        }
                                        formatDateTime={
                                            formatDateTime
                                        }
                                        t={t}
                                        onSelect={() =>
                                            selectLocation(
                                                location,
                                                index,
                                                false
                                            )
                                        }
                                    />
                                );

                            }
                        )}


                        {!locations.length && (

                            <div className="thief-location-list-empty">

                                {t(
                                    "ThiefFinder.empty.title"
                                )}

                            </div>

                        )}

                    </div>

                </aside>

            </div>


            <div className="thief-finder-footer">

                <span>
                    {t(
                        "ThiefFinder.notice"
                    )}
                </span>

                <span>

                    #{activeServerId}

                    {" · "}

                    {locations.length}

                    {" "}

                    {t(
                        "ThiefFinder.locationCount"
                    )}

                </span>

            </div>

        </div>
    );

}


function LocationCard({
    refCallback,
    location,
    active,
    formatDateTime,
    t,
    onSelect
}) {

    const [copied, setCopied] =
        useState(false);


    const timerRef =
        useRef(null);


    useEffect(() => {

        return () => {

            if (
                timerRef.current
            ) {

                window.clearTimeout(
                    timerRef.current
                );

            }

        };

    }, []);


    const handleCopy =
        async event => {

            event.stopPropagation();


            if (copied) {
                return;
            }


            const success =
                await copyCoordinate(
                    location
                );


            if (!success) {
                return;
            }


            setCopied(true);


            timerRef.current =
                window.setTimeout(
                    () => {

                        setCopied(false);

                        timerRef.current =
                            null;

                    },
                    2000
                );

        };


    const handleKeyDown =
        event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                onSelect();

            }

        };


    return (
        <div
            ref={refCallback}
            className={
                `thief-location-card ${
                    active
                        ? "active"
                        : ""
                }`
            }
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
        >

            <div className="thief-location-card-top">

                <strong className="thief-location-coordinate">
                    {location.x}:{location.y}
                </strong>


                <button
                    type="button"
                    className={
                        `thief-location-copy ${
                            copied
                                ? "copied"
                                : ""
                        }`
                    }
                    disabled={copied}
                    onClick={handleCopy}
                >
                    {
                        copied
                            ? t(
                                "ThiefFinder.copyCompleted"
                            )
                            : t(
                                "ThiefFinder.copy"
                            )
                    }
                </button>

            </div>


            <div className="thief-location-card-info">

                <div>

                    <span>
                        {t(
                            "ThiefFinder.server"
                        )}
                    </span>

                    <strong>
                        #{location.serverId}
                    </strong>

                </div>


                {location.id != null && (

                    <div>

                        <span>
                            ID
                        </span>

                        <strong>
                            {location.id}
                        </strong>

                    </div>

                )}


                <div>

                    <span>
                        {t(
                            "ThiefFinder.foundAt"
                        )}
                    </span>

                    <strong>
                        {formatDateTime(
                            location.foundAt
                        )}
                    </strong>

                </div>

            </div>

        </div>
    );

}


function convertPosition(
    x,
    y
) {

    const numericX =
        Number(x);

    const numericY =
        Number(y);


    const left =
        numericX /
        MAP_MAX_X *
        100;


    const rawTop =
        numericY /
        MAP_MAX_Y *
        100;


    const top =
        INVERT_Y
            ? 100 - rawTop
            : rawTop;


    return {

        left:
            Math.max(
                0,
                Math.min(
                    100,
                    left
                )
            ),

        top:
            Math.max(
                0,
                Math.min(
                    100,
                    top
                )
            )

    };

}


function createLocationKey(
    location,
    index
) {

    if (
        location.id != null
    ) {

        return (
            `${location.serverId}:` +
            `${location.id}`
        );

    }


    return (
        `${location.serverId}:` +
        `${location.x}:` +
        `${location.y}:` +
        `${index}`
    );

}


async function copyCoordinate(
    location
) {

    const text =
        `${location.x}:${location.y}`;


    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard
                .writeText(
                    text
                );

            return true;

        }


        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            text;

        textarea.setAttribute(
            "readonly",
            ""
        );

        textarea.style.position =
            "fixed";

        textarea.style.left =
            "-9999px";

        textarea.style.top =
            "-9999px";


        document.body.appendChild(
            textarea
        );


        textarea.focus();

        textarea.select();


        const copied =
            document.execCommand(
                "copy"
            );


        textarea.remove();


        return copied;

    }
    catch (error) {

        console.error(
            "[ThiefFinder] clipboard copy failed",
            error
        );


        return false;

    }

}