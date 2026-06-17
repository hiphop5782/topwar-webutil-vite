import { useCallback, useMemo, useState } from "react";

import "./ValuePackCalculator.css";

const ValuePackCalculator = ()=>{

    const [skillShardList, setSkillShardList] = useState([
        {no:1, price:7000, count:40, buy:false, double:false},
        {no:2, price:12800, count:70, buy:false, double:false},
        {no:3, price:28500, count:128, buy:false, double:false},
        {no:4, price:70500, count:328, buy:false, double:false},
        {no:5, price:141000, count:648, buy:false, double:false},
        {no:6, price:141000, count:648, buy:false, double:false},
        {no:7, price:141000, count:648, buy:false, double:false},
        {no:8, price:141000, count:648, buy:false, double:false},
        {no:9, price:141000, count:648, buy:false, double:false},
    ]);

    const changeSkillBuy = useCallback((data, e)=>{
        setSkillShardList(prev=>prev.map(item=> {
            let buy = item.no <= data.no;
            const double = buy ? item.double : false;
            return {
                ...item,
                buy: buy,
                double: double
            }
        }));
    }, [skillShardList]);
    const changeSkillDouble = useCallback((data, e)=>{
        setSkillShardList(prev=>prev.map(item=>{
            const double = item.no === data.no ? e.target.checked : item.double;
            const buy = item.buy || item.no <= data.no;
            return {
                ...item,
                buy: buy,
                double: double
            }
        }));
    }, [skillShardList]);

    const skillShardSummary = useMemo(()=>{
        return skillShardList.reduce((p, n)=>{
            if(n.buy) {
                p.price += n.price;
                p.count += n.double ? n.count * 2 : n.count;
            }
            
            return {...p};
        }, {price:0, count:0});
    }, [skillShardList]);

    return(<>
        <h1>특별 패키지 상점</h1>
        <hr />
        <div className="row mt-4">
            <div className="col-12"><h2>스킬 조각</h2></div>
            <div className="col-12">
                <table className="table">
                    <thead class="text-center">
                        <tr class="table-primary">
                            <th>가격</th>
                            <th>개수</th>
                            <th>개당가격</th>
                            <th>구매</th>
                            <th>2배쿠폰</th>
                        </tr>
                    </thead>
                    <tbody class="text-center">
                        {skillShardList.map(data=>(
                        <tr key={data.no}>
                            <td>{data.price.toLocaleString()}</td>
                            <td>{data.count.toLocaleString()}</td>
                            <td>{(data.price / data.count).toFixed(2).toLocaleString()}</td>
                            <td><input type="checkbox" checked={data.buy} onChange={e=>changeSkillBuy(data, e)}/></td>
                            <td><input type="checkbox" checked={data.double} onChange={e=>changeSkillDouble(data, e)}/></td>
                        </tr>
                        ))}
                    </tbody>
                    <tfoot className="text-center">
                        <tr className="table-secondary">
                            <td>{skillShardSummary.price.toLocaleString()}</td>
                            <td>{skillShardSummary.count.toLocaleString()}</td>
                            <td>{(skillShardSummary.price / skillShardSummary.count).toFixed(2).toLocaleString()}</td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </>)
};

export default ValuePackCalculator;