import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPlus, FaShareNodes, FaXmark } from "react-icons/fa6";
import PacmanLoader from "react-spinners/PacmanLoader";
import { toast } from "react-toastify";
import { useListParamState } from "@src/hooks/useListParamState"

export default function ServerChooser({
    onChangeServer,
    onSelectServer,
    useParameter = true,
    disabled = false,
    onRemoveServer,
    enableShare = true,
}) {
    const [serverData, setServerData] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const loadData = useCallback(async () => {
        const data = await import("@src/assets/json/power/serverData.json");
        setServerData(data.default);
        setDataLoading(false);
    }, []);
    useEffect(() => { loadData(); }, []);

    const { t } = useTranslation("viewer");

    const [serverParams, setServerParams] = useListParamState("server");
    const [selectedServers, setSelectedServers] = useState([]);

    const selectedServerNumberSet = useMemo(() => {
        return new Set(selectedServers.map(server => Number(server.serverNumber)));
    }, [selectedServers]);

    const serverList = useMemo(() => {
        return serverData
            .map(server => server.serverNumber)
            .filter(serverNumber => !selectedServerNumberSet.has(Number(serverNumber)));
    }, [serverData, selectedServerNumberSet]);

    useEffect(() => {
        if (useParameter !== true) return;
        if (serverData.length === 0) return;

        const wantedSet = new Set(
            serverParams
                .map(value => Number(value))
                .filter(value => Number.isInteger(value))
        );

        const selected = serverData.filter(server =>
            wantedSet.has(Number(server.serverNumber))
        );

        setSelectedServers(prev => {
            const prevKeys = prev.map(server => Number(server.serverNumber)).join(",");
            const nextKeys = selected.map(server => Number(server.serverNumber)).join(",");

            if (prevKeys === nextKeys) {
                return prev;
            }

            return selected;
        });
    }, [useParameter, serverData, serverParams]);
    useEffect(() => {
        if (typeof onChangeServer === "function") {
            onChangeServer(selectedServers);
        }
    }, [selectedServers, onChangeServer]);

    const [serverInput, setServerInput] = useState("");

    const addServer = useCallback(() => {
        const selectedServerNumber = Number(serverInput);

        if (!Number.isInteger(selectedServerNumber)) {
            return;
        }

        if (!serverList.includes(selectedServerNumber)) {
            window.alert(t(`TopwarCompareViewer.label-noserver`));
            return;
        }

        const targetServer = serverData.find(server =>
            Number(server.serverNumber) === selectedServerNumber
        );

        if (!targetServer) {
            window.alert(t(`TopwarCompareViewer.label-noserver`));
            return;
        }

        if (typeof onSelectServer === "function") {
            onSelectServer(selectedServerNumber);
        }

        setSelectedServers(prev => {
            if (prev.some(server => Number(server.serverNumber) === selectedServerNumber)) {
                return prev;
            }

            const next = [...prev, targetServer];

            if (useParameter === true) {
                setServerParams(next.map(server => String(server.serverNumber)));
            }

            return next;
        });

        setServerInput("");
    }, [
        serverInput,
        serverList,
        serverData,
        onSelectServer,
        setServerParams,
        useParameter,
        t
    ]);

    const removeServer = useCallback((targetServer) => {
        setSelectedServers(prev => {
            const next = prev.filter(server =>
                Number(server.serverNumber) !== Number(targetServer.serverNumber)
            );

            if (useParameter === true) {
                setServerParams(next.map(server => String(server.serverNumber)));
            }

            return next;
        });

        if (typeof onRemoveServer === "function") {
            onRemoveServer(targetServer);
        }
    }, [onRemoveServer, setServerParams, useParameter]);

    const inputServer = useCallback(e => {
        const regex = /^[1-9][0-9]*$/;
        const value = e.target.value;
        const isValid = value.length === 0 || regex.test(value);
        if (isValid === false) return;
        setServerInput(value);
    }, []);

    const copyUrlToClipboard = useCallback(() => {
        const text = window.location.href;

        // 최신 브라우저 (clipboard API 지원)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => toast.success(t(`TopwarCompareViewer.label-copy-ok`)))
                .catch(err => toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>" + err));
        } else {
            // fallback (구형 브라우저 대응)
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed"; // iOS 대응
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            try {
                document.execCommand("copy");
                toast.success(t(`TopwarCompareViewer.label-copy-ok`));
            } catch (err) {
                toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>" + err);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }, [selectedServers]);

    if (dataLoading === true) {
        return <PacmanLoader color="#0984e3" />
    }

    return (<>
        <div className="row">
            <div className="col">
                <div className="d-flex align-items-center">
                    <span className="me-2">{t(`TopwarCompareViewer.label-input`)}</span>
                    <input type="text" className="form-control w-auto" placeholder="e.g., 3223" inputMode="numeric"
                        onChange={inputServer} value={serverInput}
                        onKeyUp={e => {
                            if (e.key === "Enter") addServer();
                        }}
                        disabled={disabled} />
                    <button className="btn btn-success ms-2" onClick={addServer} disabled={disabled}>
                        <FaPlus className="fw-bold" />
                    </button>
                </div>
            </div>
        </div>
        <div className="row mt-3">
            <div className="col">
                <div className="d-flex flex-wrap">
                    {selectedServers.map(server => (
                        <button className="btn btn-info me-2 mb-2" key={server.serverNumber} onClick={e => removeServer(server)} disabled={disabled}>
                            {server.serverNumber}
                            <FaXmark className="ms-2" />
                        </button>
                    ))}
                    {enableShare && selectedServers.length > 0 && (
                        <button className="btn btn-primary mb-2" onClick={copyUrlToClipboard} disabled={disabled}>
                            <FaShareNodes className="me-2" />
                            <span>{t(`TopwarCompareViewer.btn-share`)}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </>);
}