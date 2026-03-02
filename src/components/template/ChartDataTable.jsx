import { memo } from "react";

const ChartDataTable = memo(({ data })=>{
    if (!data) return null;

    const { labels, datasets } = data;

    return (
        <div className="table-responsive mt-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="table table-sm table-bordered table-hover text-center align-middle">
                <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                        <th>회차</th>
                        {datasets.map((ds, i) => (
                            <th key={i} style={{ 
                                color: ds.label === "전체 평균" ? "#333" : ds.borderColor,
                                minWidth: "80px" 
                            }}>
                                {ds.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {labels.map((label, rowIndex) => (
                        <tr key={rowIndex}>
                            <td className="fw-bold bg-light">{label}</td>
                            {datasets.map((ds, colIndex) => {
                                const value = ds.data[rowIndex];
                                return (
                                    <td key={colIndex} className={ds.order === 0 ? "table-primary-light" : ""}>
                                        {typeof value === 'number' 
                                            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                                            : (value || 0)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default ChartDataTable;