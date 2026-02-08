import AllianceListData from "@src/assets/json/power/allianceData.json";
import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "./TopwarData.css";

export default function TopwarAllianceDataViewer() {
    const [searchTerm, setSearchTerm] = useState("");

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
                <h3>{searchTerm.length === 0 ? "서버별" : searchTerm} Top 10 (총 {filteredAlliance.length.toLocaleString()}개)</h3>
                {/* 검색 입력창 추가 */}
                <div style={{ width: '250px' }}>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="서버 검색" 
                        value={searchTerm}
                        onChange={(e) => {
                            const regex = /[0-9]*/;
                            if(!regex.test(e.target.value)) return;
                            setSearchTerm(e.target.value);
                        }}
                    />
                </div>
            </div>

            <div className="row mt-2">
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
                                <div style={{ width: 75 }}>
                                    {/* filteredAlliance를 기준으로 index 재계산 */}
                                    <span className="badge text-bg-primary">{alliance.rank}</span>
                                </div>
                                <div className="text-truncate flex-grow-1">
                                    <strong>[{alliance.tag}] {alliance.name}</strong>
                                </div>
                                <div style={{ width: 150 }} className="text-end pe-3 numeric-cell">
                                    {alliance.score.toLocaleString()}
                                </div>
                                <div style={{ width: 75 }} className="text-end pe-3 numeric-cell">
                                    0000
                                </div>
                            </div>
                        )}
                    />
                    {filteredAlliance.length === 0 && (
                        <div className="text-center py-5 text-muted">검색 결과가 없습니다.</div>
                    )}
                </div>
            </div>
        </>
    );
}