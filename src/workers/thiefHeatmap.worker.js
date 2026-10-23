const HEATMAP_DATA_URL =
    "https://raw.githubusercontent.com/hiphop5782/topwar-thief/refs/heads/main/data/heatmap.json";

const MAP_BOUNDS = Object.freeze({
    maxX: 815,
    maxY: 950,
});


self.onmessage = async event => {
    if (event.data?.type !== "load") return;

    try {
        const response = await fetch(HEATMAP_DATA_URL, {
            method: "GET",
            cache: "default",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data?.locations)) {
            throw new Error("Invalid heatmap payload");
        }

        const points = new Float32Array(data.locations.length * 3);
        let offset = 0;

        for (const location of data.locations) {
            const x = Number(location?.x);
            const y = Number(location?.y);
            const count = Number(location?.count);

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(count) ||
                x < 0 || x > MAP_BOUNDS.maxX ||
                y < 0 || y > MAP_BOUNDS.maxY ||
                count <= 0
            ) {
                continue;
            }

            points[offset] = x / MAP_BOUNDS.maxX * 2 - 1;
            points[offset + 1] = 1 - y / MAP_BOUNDS.maxY * 2;
            points[offset + 2] = Math.log2(count);
            offset += 3;
        }

        const transferablePoints =
            offset === points.length
                ? points
                : points.slice(0, offset);

        self.postMessage(
            {
                type: "loaded",
                points: transferablePoints.buffer,
                totalEvents: toNonNegativeInteger(data.totalEvents),
                coordinateCount: offset / 3,
            },
            [transferablePoints.buffer]
        );
    } catch {
        self.postMessage({ type: "error" });
    }
};


function toNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0
        ? Math.round(number)
        : 0;
}
