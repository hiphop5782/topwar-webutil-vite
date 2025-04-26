import { useCallback, useState } from "react";

function RandomSimulator() {
    //item list
    const [sequence, setSequence] = useState(1);
    const [itemList, setItemList] = useState([]);
    const addItemList = useCallback(()=>{
        const newList = [...itemList, {no:sequence, name:"", rate:0, count:0, acc:0}];
        setItemList(newList);
        setSequence(sequence+1);
    }, [itemList]);
    const deleteItemList = useCallback(()=>{
        setItemList(itemList.filter((item,idx)=>idx < itemList.length-1));
    },  [itemList]);

    //count
    const [count, setCount] = useState(1);

    const inputItem = useCallback((e)=>{
        const no = parseInt(e.target.dataset.no);
        const name = e.target.name;
        const value = name === "rate" ? parseInt(e.target.value) : e.target.value;
        setItemList(prev=>prev.map(item=>{
            if(item.no === no) {
                return {...item, [name]:value};
            }
            else {
                return item;
            }
        }));
    }, [itemList]);

    const numberWithCommas = useCallback((x)=>{
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }, []);

    //history
    const [history, setHistory] = useState([]);

    const lot = useCallback(()=>{
        if(itemList.length === 0 || count === 0) {
            window.alert("항목과 횟수를 설정하세요");
            return;
        }

        const totalRate = itemList.reduce((b,c)=>{
            return b+c.rate;
        },0);

        if(totalRate !== 100) {
            window.alert("확률은 100%여야 합니다");
            return;
        }

        if(count > 10000 || count <= 0) {
            window.alert("1~10000번까지만 추첨 가능합니다");
            return;
        }

        //추첨
        let acc = 0;
        const copyList = itemList.map(item=>{
            acc += parseInt(item.rate * 10000);
            return {...item, acc:acc, count:0};
        });
        
        const array = new Uint32Array(count);
        window.self.crypto.getRandomValues(array);
        const result = array.map(n=>n%1000000);

        setHistory([]);
        result.forEach((res,idx)=>{
            for(let i=0; i < copyList.length; i++) {
                const copyItem = copyList[i];
                if(copyItem.acc > res) {
                    copyItem.count++;
                    setHistory(prev=>[...prev, copyItem]);
                    break;
                }
            }

        });

        setItemList(copyList);
    }, [itemList, count]);

    

    return (
        <>
            <div className="row">
                <div className="col">
                    <h1>뽑기 시뮬레이션</h1>
                    <hr></hr>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <h2>
                        추첨 항목 설정&nbsp;&nbsp;
                        <button className="btn btn-primary" onClick={addItemList}>+ 추가</button>
                        &nbsp;&nbsp;
                        <button className="btn btn-danger" onClick={deleteItemList}>- 삭제</button>
                    </h2>
                    <p><small>추가 버튼을 눌러 이름과 확률을 설정하세요<br/>(확률은 다 합쳐서 100%여야 합니다)</small></p>
                </div>
                <div className="col-12">
                    {itemList.map((item,index)=>(
                        <div key={index} className="mt-2 p-2 shadow-sm rounded">
                            <label>항목 이름 <input type="text" name="name" onChange={inputItem} placeholder="(ex) 에픽 만능 조각" data-no={item.no} defaultValue={item.name}/></label>
                            &nbsp;&nbsp;&nbsp;
                            <label>당첨 확률 <input type="number" name="rate" onChange={inputItem} placeholder="% 제외하고 입력" data-no={item.no} defaultValue={item.rate}/> %</label>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </div>
                    ))}
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    <h2>
                        추첨 횟수
                    </h2>
                    <p><small>
                        추첨 횟수는&nbsp;
                        <span className="text-danger">1</span> 번에서&nbsp;
                        <span className="text-danger">10000</span> 번까지 설정할 수 있습니다
                    </small></p>
                </div>
                <div className="col-12 text-end">
                    <input type="number" min="1" defaultValue={count} onChange={e=>setCount(parseInt(e.target.value))} className="text-end"/> 번
                </div>
            </div>
            <div className="row mt-2">
                <div className="col">
                    <button className="btn btn-success w-100" onClick={lot}>추첨하기</button>
                </div>
            </div>
            <div className="row mt-4">
                <div className="col-12">
                    <h2>추첨 결과</h2>
                </div>
                <div className="col-12">
                    {itemList.map((item,index)=>(
                        <div key={index} className="mt-2 p-2 shadow-sm rounded d-flex">
                            <div className="w-50">
                                <span>{item.name}</span>&nbsp;&nbsp;
                                <span className="text-muted">({item.rate}%)</span> 
                            </div>
                            <div className="w-50 text-end">
                                <span className="text-danger"><b>{numberWithCommas(item.count)}</b></span> 번 추첨됨
                            </div>
                        </div>
                    ))}
                </div>
                <div className="col-12 mt-2">
                    {history.map((h,i)=>(
                        <div className="ps-2 pe-2" key={i}>
                            <span className="badge bg-primary me-2" style={{width:55}}>{i+1}</span>
                            <b className="text-danger">{h.name}</b> 항목을 추첨하였습니다!
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default RandomSimulator;