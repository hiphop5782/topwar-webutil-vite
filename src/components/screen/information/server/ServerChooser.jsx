import ServerDataJson from "@src/assets/json/power/serverData.json"

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPlus, FaShareNodes, FaXmark } from "react-icons/fa6";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

export default function ServerChooser({onChangeServer}) {
    const {t} = useTranslation("viewer");
    
    const [params, setParams] = useSearchParams();
    const [serverList, setServerList] = useState(()=>{
        return ServerDataJson.map(server=>server.serverNumber);
    });

    const [selectedServers, setSelectedServers] = useState([]);

    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (params !== null && selectedServers.length === 0) {
            const value = params.get("server");
            if(value !== null) {
                const decoded = decodeURIComponent(value);
                decoded.split(",").forEach(addServerByParameter);
            }
        }
        setLoading(true);
    }, []);
    useEffect(() => {
        if (loading == false) return;
        if (selectedServers.length === 0) {
            setParams({});
        }
        else {
            setParams({ server: selectedServers.map(server => server.serverNumber).join(",") });
        }
    }, [selectedServers, loading]);
    useEffect(()=>{
        if(onChangeServer !== undefined && typeof onChangeServer === "function") {
            onChangeServer(selectedServers);
        }
    }, [selectedServers]);

    const [serverInput, setServerInput] = useState("");

    const addServerByParameter = useCallback(async (target) => {
        if(!target) return;

        const datalist = ServerDataJson.filter(server=>server.serverNumber === parseInt(target));
        setSelectedServers(prev => [...prev, datalist[0]]);
        setServerList(prev => prev.filter(server => server !== target));
    }, []);
    const addServer = useCallback(async () => {
        const selectedServer = parseInt(serverInput);
        if (serverList.includes(selectedServer) === false) {
            window.alert(t(`TopwarCompareViewer.label-noserver`));
            return;
        }

        const datalist = ServerDataJson.filter(server=>server.serverNumber === selectedServer);
        setSelectedServers(prev => [...prev, datalist[0]]);
        setServerList(prev => prev.filter(server => server !== selectedServer));
        setServerInput("");
    }, [serverInput]);

    const removeServer = useCallback(targetServer => {
        setSelectedServers(prev => prev.filter(server => server.serverNumber !== targetServer.serverNumber));
        setServerList(prev => [...prev, targetServer.serverNumber].sort());
    }, []);

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
                .catch(err => toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>"+err));
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
                toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>" +err);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }, [selectedServers]);

    return (<>
        <div className="row">
            <div className="col">
                <div className="d-flex align-items-center">
                    <span className="me-2">{t(`TopwarCompareViewer.label-input`)}</span>
                    <input type="text" className="form-control w-auto" placeholder="e.g., 3223"
                        onChange={inputServer} value={serverInput}
                        onKeyUp={e => {
                            if (e.key === "Enter") addServer();
                        }} />
                    <button className="btn btn-success ms-2" onClick={addServer}>
                        <FaPlus className="fw-bold" />
                    </button>
                </div>
            </div>
        </div>
        <div className="row mt-3">
            <div className="col">
                <div className="d-flex flex-wrap">
                    {selectedServers.map(server => (
                        <button className="btn btn-info me-2 mb-2" key={server.serverNumber} onClick={e => removeServer(server)}>
                            {server.serverNumber}
                            <FaXmark className="ms-2" />
                        </button>
                    ))}
                    {selectedServers.length > 0 && (
                        <button className="btn btn-primary mb-2" onClick={copyUrlToClipboard}>
                            <FaShareNodes className="me-2"/>
                            <span>{t(`TopwarCompareViewer.btn-share`)}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </>);
}