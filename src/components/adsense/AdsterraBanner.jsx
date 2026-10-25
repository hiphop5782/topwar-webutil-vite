const ADSTERRA_SCRIPT_BASE_URL = "https://bicea.org/22";

function createAdDocument({ adKey, width, height }) {
    const options = JSON.stringify({
        key: adKey,
        format: "iframe",
        height,
        width,
        params: {},
    });

    return `<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=${width}, initial-scale=1">
        <style>
            html, body {
                width: ${width}px;
                height: ${height}px;
                margin: 0;
                overflow: hidden;
                background: transparent;
            }
        </style>
    </head>
    <body>
        <script>window.atOptions = ${options};</script>
        <script src="${ADSTERRA_SCRIPT_BASE_URL}/${adKey}"></script>
    </body>
</html>`;
}

export default function AdsterraBanner({ adKey, width, height }) {
    return (
        <iframe
            title="Advertisement"
            srcDoc={createAdDocument({ adKey, width, height })}
            width={width}
            height={height}
            scrolling="no"
            loading="lazy"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
                display: "block",
                width,
                height,
                border: 0,
                overflow: "hidden",
            }}
        />
    );
}
