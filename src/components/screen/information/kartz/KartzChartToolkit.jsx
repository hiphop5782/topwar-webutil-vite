export function getBaseOptions(titleMain, yTitle, xTitle, beginAtZero=false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: titleMain,
                font: {size : 24}
            },
            legend: {
                labels: {
                    filter: (legendItem, chartData) => {
                        //return legendItem.datasetIndex < 10;
                        return null;
                    }
                }
            },
        },
        scales: {
            y: {
                beginAtZero: beginAtZero,
                title: {
                    display: true,
                    text: yTitle,
                },
            },
            x: {
                title: {
                    display: true,
                    text: xTitle,
                },
            },
        },
    };
}
