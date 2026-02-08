import PlayerListJson from "@src/assets/json/power/playerData.json";
import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "./TopwarData.css";

export default function TopwarPlayerDataViewer() {
    const [searchTerm, setSearchTerm] = useState("");

    // 1. 원본 데이터 정렬 (기존 유지, 렌더링 시 재계산 방지)
    const sortedPlayers = useMemo(() => {
        return [...PlayerListJson].sort((p1, p2) => p2.cp - p1.cp).map((player, index)=>({...player, rank:index+1}));
    }, []);

    // 2. 검색 필터링 로직 추가
    const filteredPlayers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return sortedPlayers;

        return sortedPlayers.filter(player => {
            return player.server.toString() === term;
        }
        );
    }, [searchTerm, sortedPlayers]);

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>{searchTerm.length === 0 ? "서버별" : searchTerm} Top 100 (총 {filteredPlayers.length.toLocaleString()}명)</h3>
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
                        data={filteredPlayers}
                        useWindowScroll
                        itemContent={(index, player) => (
                            <div className="d-flex align-items-center border-bottom bg-white" 
                                 style={{ height: '35px', boxShadow: "0 0 0 0 lightgray" }}>
                                <div style={{ width: 100 }}>
                                    {/* filteredPlayers를 기준으로 index 재계산 */}
                                    <span className="badge text-bg-primary">{player.rank}</span>
                                </div>
                                <div style={{ width: 200 }} className="text-truncate flex-grow-1">
                                    <strong>{player.nickname}</strong>
                                </div>
                                <div style={{ width: 80 }} className="numeric-cell fw-bold">
                                    {(player.cp / 1000000).toFixed(2) + "M"}
                                </div>
                                <div style={{ width: 120 }} className="text-end pe-3 numeric-cell fw-bold">
                                    {player.server}
                                    {player.alliance && `[AAAA]`}
                                </div>
                            </div>
                        )}
                    />
                    {filteredPlayers.length === 0 && (
                        <div className="text-center py-5 text-muted">검색 결과가 없습니다.</div>
                    )}
                </div>
            </div>
        </>
    );
}