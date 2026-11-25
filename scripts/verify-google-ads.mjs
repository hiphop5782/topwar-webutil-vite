import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import puppeteer from "puppeteer";

const html = await readFile("index.html", "utf8");
assert.ok(!html.includes("pagead2.googlesyndication.com"), "HTML must not load AdSense outside the production guard");
const main = await readFile("src/components/MainContentView.jsx", "utf8");
assert.ok(!/!isBelowSideAdWidth && <GoogleAds/.test(main), "Resizing must not remount side ads");

async function bundle(production) {
    const result = await build({
        stdin: { contents: `import React from "react"; import { createRoot } from "react-dom/client"; import GoogleAds from "./src/components/adsense/GoogleAds.jsx";
            const root = createRoot(document.getElementById("root"));
            window.renderAds = (path = "/ko/", city = false) => root.render(<React.StrictMode><div className="side"><GoogleAds key={"left" + path} vertical /></div><GoogleAds key={"top" + path} /><div className="side"><GoogleAds key={"right" + path} vertical /></div>{city && <GoogleAds />}</React.StrictMode>);
            window.renderAds();`, resolveDir: process.cwd(), loader: "jsx" },
        bundle: true, write: false, jsx: "automatic", define: { "import.meta.env.PROD": String(production), "process.env.NODE_ENV": '"development"' },
    });
    return result.outputFiles[0].text;
}

const production = await bundle(true);
const development = await bundle(false);
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
    async function open({ code = production, host = "ads-test.example", building = false, width = 1280 } = {}) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 900 });
        await page.setRequestInterception(true);
        const scripts = [];
        page.on("request", request => {
            if (request.url().includes("pagead2.googlesyndication.com")) {
                scripts.push(request.url());
                return request.respond({ status: 200, contentType: "application/javascript", body: "/* mocked: no real ad traffic */" });
            }
            return request.respond({ status: 200, contentType: "text/html", body: '<style>.side{width:160px}@media(max-width:991px){.side{display:none}}</style><div id="root"></div>' });
        });
        await page.evaluateOnNewDocument(building => {
            window.__PRERENDER_INJECTED = { building };
            window.adRequests = [];
            window.adsbygoogle = { push() {
                const element = [...document.querySelectorAll("ins.adsbygoogle")].find(element => !element.hasAttribute("data-adsbygoogle-status"));
                if (!element || element.getBoundingClientRect().width <= 0) throw new Error("Duplicate or hidden ad request");
                element.setAttribute("data-adsbygoogle-status", "done");
                window.adRequests.push(element.dataset.adSlot);
            } };
        }, building);
        await page.goto(`https://${host}/`);
        await page.addScriptTag({ content: code });
        await page.waitForFunction(() => document.getElementById("root").children.length > 0);
        return { page, scripts };
    }

    for (const settings of [{ code: development }, { host: "localhost" }, { host: "127.0.0.1" }, { host: "[::1]" }, { building: true }]) {
        const { page, scripts } = await open(settings);
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(await page.evaluate(() => window.adRequests.length), 0);
        assert.equal(await page.$$eval("ins.adsbygoogle", nodes => nodes.length), 0);
        assert.equal(scripts.length, 0);
        await page.close();
    }

    const { page, scripts } = await open({ width: 600 });
    await page.waitForFunction(() => window.adRequests.length === 1);
    assert.equal(await page.$$eval("ins.adsbygoogle", nodes => nodes.length), 1, "Hidden side slots must not leave uninitialized ins elements ahead of the visible slot");
    await page.setViewport({ width: 1280, height: 900 });
    await page.waitForFunction(() => window.adRequests.length === 3);
    await page.setViewport({ width: 600, height: 900 });
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluate(() => window.renderAds());
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await page.evaluate(() => window.adRequests.length), 3, "StrictMode, rerenders and repeated resize must not duplicate requests");
    await page.evaluate(() => window.renderAds("/ko/event/city-reward/", true));
    await page.waitForFunction(() => window.adRequests.length === 7);
    await page.evaluate(() => window.renderAds("/ko/event/city-reward/", true));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await page.evaluate(() => window.adRequests.length), 7, "Polling and same-path renders must not refresh ads");
    assert.equal(scripts.length, 1, "All slots and navigation must share one script");
    assert.deepEqual(await page.evaluate(() => window.adRequests.slice(0, 3).sort()), ["2847454256", "4296267290", "4296267290"]);
    assert.equal(await page.$$eval("ins.adsbygoogle", nodes => nodes.every(node => node.dataset.adClient === "ca-pub-3737135009848849")), true);
    await page.close();
    console.log("PASS: development/local preview/prerender make zero ad requests; StrictMode/resize/rerender do not duplicate requests; navigation initializes new slots; script loads once. All ad traffic was mocked.");
} finally {
    await browser.close();
}
