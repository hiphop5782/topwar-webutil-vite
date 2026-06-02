import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";


const jsonModules = import.meta.glob('@src/assets/json/realpower/*.json');

export default function TopwarRealPowerViewer() {

    const fileNames = useMemo(() => {
        return Object.keys(jsonModules).map(path => {
            const fileName = path.split('/').pop().replace(".json", "");
            return { path, fileName };
        })
        //.sort((a,b)=>b.fileName.localeCompare(a.fileName));
        sort((a, b) => parseInt(a.fileName) - parseInt(b.fileName));
    }, []);

    const [selectedServer, setSelectedServer] = useState(() => {
        return fileNames?.length > 0 ? fileNames[0].path : null
    });

    const [json, setJson] = useState(null);

    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (selectedServer === null) return;
        handleFileSelect();
    }, [selectedServer]);
    const handleFileSelect = useCallback(async () => {
        setLoading(true);
        try {
            const module = await jsonModules[selectedServer]();
            setJson(module.default);
        }
        catch (error) {
            console.error("데이터 로드 실패", error);
        }
        finally {
            setLoading(false);
        }
    }, [selectedServer]);

    const formatPower = useCallback((value, options = {}) => {
        if (value == null) return null;

        const n = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(n)) return String(value);

        const suffixes = options.suffixes ?? ["","K","M","BB","T","aa","bb","cc","dd","ee","ff","gg","hh"];

        let num = Math.abs(n);
        let group = 0;

        while (num >= 1000 && group < suffixes.length - 1) {
            num /= 1000;
            group++;
        }

        const sign = n < 0 ? "-" : "";

        let text;
        if (num >= 100) text = num.toFixed(0);
        else if (num >= 10) text = num.toFixed(1);
        else text = num.toFixed(2);

        text = text.replace(/\.?0+$/, "");

        return sign + text + suffixes[group];
    }, []);

    return (<>
        <h1>리얼 파워 뷰어</h1>

        <label className="d-flex">
            <span className="d-flex align-items-center">서버</span>
            <select className="form-select w-auto ms-4" onChange={e => setSelectedServer(e.target.value)}>
                <option value="">선택하세요</option>
                {fileNames.map((file, index) => (
                    <option key={index} value={file.path}>{file.fileName}</option>
                ))}
            </select>
        </label>

        {json !== null && (<>
            <hr />
            <h3>{json.serverId} 서버 요약 정보</h3>
            <dl className="d-flex mt-4">
                <dt className="w-25 text-primary">조사 시각</dt>
                <dd className="w-75">{dayjs(json.exportedAt).format()}</dd>
            </dl>
            <dl className="d-flex">
                <dt className="w-25 text-primary">플레이어</dt>
                <dd className="w-75">
                    {json.summary.allianceMemberMergedPlayers} / {json.summary.players}
                    (활성/전체)
                </dd>
            </dl>
            <dl className="d-flex">
                <dt className="w-25 text-primary">동맹</dt>
                <dd className="w-75">
                    ? / {json.summary.alliances}
                    (활성/전체)
                </dd>
            </dl>
            <dl className="d-flex align-items-start">
                <dt className="w-25 text-primary">액티브 점수</dt>
                <dd className="w-75">
                    <div className="fs-4">{json.summary.activity.activeTotalCount}</div>
                    <div className="text-muted">
                        = core&nbsp;
                        <span className="text-danger">{json.summary.activity.coreCount}</span>
                        &nbsp;+&nbsp;active&nbsp;
                        <span className="text-danger">{json.summary.activity.activeCount}</span>
                        &nbsp;+&nbsp;watch&nbsp;
                        <span className="text-danger">{json.summary.activity.watchCount}</span>
                        &nbsp;+&nbsp;low&nbsp;
                        <span className="text-danger">{json.summary.activity.lowCount}</span>
                    </div>
                </dd>
            </dl>
            <hr />

            <h3>동맹 목록</h3>

            {json.alliances.filter((alliance, index) => {
                if (alliance.allianceLevel < 3) return false;
                if (!alliance.allianceLeader) return false;
                if (!alliance.allianceName) return false;
                if (index >= 5) return false;
                return true;
            }).map((alliance, index) => (
                <div className="py-2 mb-3" key={index}>
                    <div className="shadow rounded p-4">
                        <h4>[{alliance.allianceTag}] {alliance.allianceName ?? <s className="text-muted">Unknown(Search Error)</s>}</h4>
                        <div className="d-flex mt-4">
                            <dt className="w-25 text-primary">Leader</dt>
                            <dd className="w-75">{alliance.allianceLeader}</dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">Power</dt>
                            <dd className="w-75">
                                {formatPower(alliance.activitySummary.corePowerSum)}
                                &nbsp;/&nbsp;
                                {formatPower(alliance.activitySummary.activePowerSum)}
                                &nbsp;/&nbsp;
                                {formatPower(alliance.activitySummary.totalPower)}
                            </dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">User</dt>
                            <dd className="w-75">
                                {alliance.activitySummary.coreCount}
                                &nbsp;/&nbsp;
                                {alliance.activitySummary.coreCount + alliance.activitySummary.activeCount}
                                &nbsp;/&nbsp;
                                {alliance.activitySummary.coreCount + alliance.activitySummary.activeCount + alliance.activitySummary.lowCount}
                                &nbsp;/&nbsp;
                                {alliance.activitySummary.collectedMapMemberCount}
                            </dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">Top20 User%</dt>
                            <dd className="w-75">{alliance.activitySummary.top20PowerCount}%</dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">80% count</dt>
                            <dd className="w-75">{alliance.activitySummary.cumulative80PowerCount}</dd>
                        </div>
                    </div>
                </div>
            ))}

            <hr />

            <h3>플레이어 목록</h3>
        </>)}
    </>);
}