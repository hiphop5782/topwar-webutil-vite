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
    "https://datahub.progamer.info/api/v1/data/thieves";


const POLLING_INTERVAL = 5000;


/*
 * TopWar 월드맵 실제 좌표계.
 * 좌상단 = (0, 0), 우하단 = (815, 950)
 */
const MAP_BOUNDS = Object.freeze({
    minX: 0,
    maxX: 815,
    minY: 0,
    maxY: 950
});


/*
 * 클라이언트 코드에 포함되는 값이므로 강한 보안 수단은 아닙니다.
 * 서버별 접근 코드만 각각 변경해서 사용하세요.
 */
const SERVER_ACCESS_CODES = Object.freeze({
    3223: "3223forever",
    4369: "4369forever"
});



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

    const [accessCode, setAccessCode] =
        useState("");

    const [authorizedServerId, setAuthorizedServerId] =
        useState(null);

    const [accessError, setAccessError] =
        useState(false);


    const locationCardRefs =
        useRef(new Map());


    const targetServer =
        Number(serverId);


    const serverAllowed =
        Number.isInteger(targetServer) &&
        Object.prototype.hasOwnProperty.call(
            SERVER_ACCESS_CODES,
            targetServer
        );


    const accessGranted =
        serverAllowed &&
        authorizedServerId === targetServer;



    useEffect(() => {

        setAccessCode("");
        setAccessError(false);
        setSelectedKey(null);

    }, [serverId]);



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
             * 5초가 지났더라도 이전 요청이 아직 끝나지 않았다면
             * 중복 요청은 보내지 않는다.
             */
            if (requestInProgress) {
                return;
            }


            requestInProgress =
                true;


            try {

                /*
                 * 최초 조회에서만 로딩 화면을 표시한다.
                 * 5초 폴링 갱신 때는 기존 지도/목록을 그대로 유지한다.
                 */
                if (firstRequest) {

                    setLoading(true);
                    setError(null);

                }


                const requestUrl =
                    new URL(THIEF_DATA_URL);


                requestUrl.searchParams.set(
                    "serverId",
                    String(targetServer)
                );


                requestUrl.searchParams.set(
                    "t",
                    String(Date.now())
                );


                const response =
                    await fetch(
                        requestUrl.toString(),
                        {
                            method: "GET",
                            cache: "no-store",
                            headers: {
                                Accept: "application/json"
                            },
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
                    error.name ===
                    "AbortError"
                ) {
                    return;
                }


                console.error(
                    "[ThiefFinder]",
                    error
                );


                /*
                 * 최초 조회 실패만 오류 화면으로 처리한다.
                 * 이후 폴링 중 일시적인 실패는 기존 데이터를 유지한다.
                 */
                if (firstRequest) {

                    setError(error);

                }

            }
            finally {

                if (firstRequest) {

                    setLoading(false);
                    firstRequest = false;

                }


                requestInProgress =
                    false;

            }

        }


        /*
         * 입장 직후 즉시 1회 조회.
         */
        load();


        /*
         * 이후 5초마다 폴링.
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



    const locations =
        useMemo(() => {

            if (
                !Array.isArray(
                    data?.locations
                )
            ) {
                return [];
            }


            if (
                !Number.isFinite(
                    targetServer
                )
            ) {
                return [];
            }


            return data.locations
                .filter(location =>
                    Number(
                        location.serverId
                    ) ===
                    targetServer
                )
                .filter(location =>
                    isValidMapCoordinate(
                        location.x,
                        location.y
                    )
                );

        }, [
            data,
            targetServer
        ]);



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



    const handleAccessSubmit =
        event => {

            event.preventDefault();


            if (!serverAllowed) {
                return;
            }


            const expectedCode =
                SERVER_ACCESS_CODES[targetServer];


            if (
                accessCode === expectedCode
            ) {

                setAuthorizedServerId(
                    targetServer
                );

                setAccessCode("");
                setAccessError(false);

                return;
            }


            setAuthorizedServerId(null);
            setAccessCode("");
            setAccessError(true);

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
     * 허용되지 않은 서버에서는 기능명, 지도, 데이터 로딩 UI를
     * 전혀 렌더링하지 않는다.
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
     * 허용 서버라도 코드 확인 전에는 실제 화면과 데이터 요청을
     * 시작하지 않는다.
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
                                    setAccessError(false);
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



    if (loading) {

        return (
            <div className="thief-finder-loading">
                {t("ThiefFinder.loading")}
            </div>
        );
    }



    if (error) {

        return (
            <div className="alert alert-danger">
                {t("ThiefFinder.loadError")}
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
                        #{serverId}
                        {" "}
                        {t("ThiefFinder.title")}
                    </h1>

                    <p>
                        {t("ThiefFinder.description")}
                    </p>

                </div>


                <div className="thief-finder-summary">

                    <div>

                        <span>
                            {t("ThiefFinder.found")}
                        </span>

                        <strong>
                            {locations.length}
                        </strong>

                    </div>


                    <div>

                        <span>
                            {t("ThiefFinder.updatedAt")}
                        </span>

                        <strong>
                            {formatDateTime(
                                data?.updatedAt
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div className="thief-content-layout">

                <div className="thief-map-scroll">

                    <div className="thief-map-stage">

                        <img
                            src={ServerMapImage}
                            alt={
                                t(
                                    "ThiefFinder.mapAlt",
                                    {
                                        serverId
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
                            #{serverId}
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
                                            selectedKey === key
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
                    {t("ThiefFinder.notice")}
                </span>

                <span>
                    #{serverId}
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
                        timerRef.current = null;

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



function isValidMapCoordinate(
    x,
    y
) {

    const numericX = Number(x);
    const numericY = Number(y);

    return (
        Number.isFinite(numericX) &&
        Number.isFinite(numericY) &&
        numericX >= MAP_BOUNDS.minX &&
        numericX <= MAP_BOUNDS.maxX &&
        numericY >= MAP_BOUNDS.minY &&
        numericY <= MAP_BOUNDS.maxY
    );
}



function convertPosition(
    x,
    y
) {

    const numericX = Number(x);
    const numericY = Number(y);


    /*
     * 게임 좌표와 이미지 좌표 모두 좌상단이 원점이다.
     * 따라서 Y축 반전 없이 그대로 비율 변환한다.
     *
     * x =   0 -> left =   0%
     * x = 815 -> left = 100%
     * y =   0 -> top  =   0%
     * y = 950 -> top  = 100%
     */
    const left =
        (numericX - MAP_BOUNDS.minX) /
        (MAP_BOUNDS.maxX - MAP_BOUNDS.minX) *
        100;

    const top =
        (numericY - MAP_BOUNDS.minY) /
        (MAP_BOUNDS.maxY - MAP_BOUNDS.minY) *
        100;


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

            await navigator.clipboard.writeText(
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
