import AllianceListData from "@src/assets/json/power/allianceData.json";
import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "./TopwarData.css";
import { useTranslation } from "react-i18next";

export default function TopwarAllianceDataViewer() {
    const [searchTerm, setSearchTerm] = useState("");
    const { t } = useTranslation("viewer");

    // 1. 원본 데이터 정렬 (기존 유지, 렌더링 시 재계산 방지)
    const sortedAlliances = useMemo(() => {
        return [...AllianceListData].sort((p1, p2) => p2.score - p1.score).map((alliance, index)=>({...alliance, rank:index+1}));
    }, []);

    // 2. 검색 필터링 로직 추가
    const filteredAlliance = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return sortedAlliances;

        return sortedAlliances.filter(alliance => {
            return alliance.server.toString() === term;
        }
        );
    }, [searchTerm, sortedAlliances]);

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>{t(`TopwarAllianceDataViewer.label-title`)}</h3>
                {/* 검색 입력창 추가 */}
                <div style={{ width: '250px' }}>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder={t(`TopwarAllianceDataViewer.search-placeholder`)}
                        value={searchTerm}
                        onChange={(e) => {
                            const regex = /[0-9]*/;
                            if(!regex.test(e.target.value)) return;
                            setSearchTerm(e.target.value);
                        }}
                    />
                </div>
            </div>

            <div className="row mt-4">
                <div className="col fw-bold text-primary">
                    <div className="d-flex align-items-center border-bottom bg-white">
                        <div style={{ width: 70 }}>
                            {t(`TopwarAllianceDataViewer.data-rank`)}
                        </div>
                        <div style={{ width: 70 }} className="text-start">
                            {t(`TopwarAllianceDataViewer.data-server`)}
                        </div>
                        <div className="text-truncate flex-grow-1">
                            {t(`TopwarAllianceDataViewer.data-name`)}
                        </div>
                        <div style={{ width: 150 }} className="text-center">
                            {t(`TopwarAllianceDataViewer.data-score`)}
                        </div>
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <Virtuoso
                        // useWindowScroll 사용 시 style의 height는 초기 렌더링 높이 역할을 하거나 
                        // 제거해도 무방하지만, 영역 확보를 위해 유지합니다.
                        style={{ height: '600px', border: 'none', outline: 'none' }}
                        data={filteredAlliance}
                        useWindowScroll
                        itemContent={(index, alliance) => (
                            <div className="d-flex align-items-center border-bottom bg-white" 
                                 style={{ height: '35px', boxShadow: "0 0 0 0 lightgray" }}>
                                <div style={{ width: 70 }}>
                                    {/* filteredAlliance를 기준으로 index 재계산 */}
                                    <span className="badge text-bg-primary">{alliance.rank}</span>
                                </div>
                                <div style={{ width: 75 }} className="text-start fw-bold">
                                    {alliance.server}
                                </div>
                                <div className="text-truncate flex-grow-1">
                                    <strong>[{alliance.tag}] {alliance.name}</strong>
                                </div>
                                <div style={{ width: 150 }} className="text-end pe-3 numeric-cell fw-bold">
                                    {alliance.score.toLocaleString()}
                                </div>
                            </div>
                        )}
                    />
                    {filteredAlliance.length === 0 && (
                        <div className="text-center py-5 text-muted">{t(`TopwarAllianceDataViewer.no-result`)}</div>
                    )}
                </div>
            </div>
        </>
    );
}