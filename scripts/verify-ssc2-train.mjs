import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const baseUrl = process.env.SSC2_VERIFY_URL ?? "http://127.0.0.1:4173";
const source = JSON.parse(await readFile(
    new URL("../src/assets/json/ssc2/train/CQ26-S1677-2026-10-28T14-02-01-033Z.json", import.meta.url),
    "utf8",
));
const mismatchPlayer = source.players.find(player => Number(player.serverId) === 1852);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 824, height: 871 });
    const dataRequests = [];
    page.on("pageerror", error => console.error("PAGE ERROR", error.message));
    page.on("request", request => {
        const url = request.url();
        if (/CQ26-S|player-search-index/i.test(url)) dataRequests.push(url);
    });

    await page.goto(`${baseUrl}/ko/history/ssc-2027/train`, { waitUntil: "networkidle0" });
    await page.waitForSelector('[role="dialog"]');
    assert.equal(dataRequests.length, 0, "Data chunks loaded before the access answer");

    await page.type("#ssc2-access-answer", "100원");
    await page.click('.ssc2-access-dialog button[type="submit"]');
    await page.waitForSelector(".ssc2-access-dialog .is-invalid");

    await page.$eval("#ssc2-access-answer", input => { input.value = ""; });
    await page.type("#ssc2-access-answer", "500원");
    await page.click('.ssc2-access-dialog button[type="submit"]');
    await page.waitForSelector(".ssc2-train-analyzer");
    await page.waitForFunction(() => document.body.textContent.includes("전체 서버 랭킹"));
    await page.waitForFunction(() => {
        const renderedRows = document.querySelectorAll(".ssc2-virtual-table tbody tr").length;
        return renderedRows > 0 && renderedRows < 142;
    });
    await page.waitForFunction(() => {
        const frame = document.querySelector(".ssc2-virtual-frame");
        const renderedRows = frame?.querySelectorAll("tbody tr").length ?? 0;
        return (frame?.getBoundingClientRect().height ?? 0) >= 500
            && renderedRows > 0
            && renderedRows < 142;
    });
    assert.equal(
        await page.evaluate(() => document.body.textContent.includes("조사 시각")),
        false,
        "Capture time rendered in the UI",
    );
    assert.equal(
        await page.$eval(".ssc2-virtual-frame", element => element.textContent.includes("진행률")),
        false,
    );
    assert.equal(
        await page.$eval(".ssc2-virtual-frame", element => element.textContent.includes("약탈 수")),
        false,
    );
    assert.match(
        await page.$eval(".ssc2-virtual-frame tbody tr td:nth-child(3)", element => element.textContent.trim()),
        /^\d[\d,]*\.\d[MT]$/,
        "Total power was not rendered with an M/T unit",
    );
    assert.equal(
        await page.$eval(".ssc2-overview-virtuoso tbody tr .ssc2-total-power-column", element => {
            const style = getComputedStyle(element);
            return style.textAlign === "right" && style.fontVariantNumeric.includes("tabular-nums");
        }),
        true,
        "Total power values were not right-aligned with tabular digits",
    );
    assert.match(
        await page.$eval(".ssc2-virtual-frame tbody tr td:nth-child(4)", element => element.textContent.trim()),
        /^\d+$/,
        "Player count column was not rendered in the merged ranking",
    );
    assert.equal(await page.$$(".ssc2-overview-virtuoso thead th").then(headers => headers.length), 5);
    assert.equal(await page.$$(".ssc2-rank-badge.is-top-1").then(badges => badges.length), 1);
    assert.equal(
        await page.$$eval(
            ".ssc2-overview-virtuoso tbody tr:nth-child(-n+3) td:nth-child(-n+2)",
            cells => cells.length === 6 && cells.every(cell => {
                const channels = getComputedStyle(cell).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
                return channels.length === 3 || channels[3] === 1;
            }),
        ),
        true,
        "Top-three sticky cells used a translucent background",
    );
    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-ranking-metrics button")]
            .find(button => button.textContent.includes("TOP 5"))?.click();
    });
    await page.waitForFunction(() => document.querySelector(".ssc2-overview-virtuoso thead")?.textContent.includes("TOP 5"));
    assert.equal(await page.$$(".ssc2-overview-virtuoso thead th").then(headers => headers.length), 6);
    assert.equal(await page.$$(".ssc2-view-tabs button").then(buttons => buttons.length), 4);

    const searchedRanking = await page.$$eval(".ssc2-overview-virtuoso tbody tr", rows => {
        const row = rows.find(candidate => (
            Number(candidate.children[0]?.textContent.trim()) > 1
            && candidate.children[1]?.textContent.trim().replace(/^S/, "").length === 4
        ));
        return row ? {
            rank: row.children[0].textContent.trim(),
            server: row.children[1].textContent.trim().replace(/^S/, ""),
        } : null;
    });
    assert.ok(searchedRanking, "Could not find a server for overview rank search verification");
    await page.type(".ssc2-search-control input", searchedRanking.server);
    await page.waitForFunction(server => (
        document.querySelector(".ssc2-overview-virtuoso tbody tr td:nth-child(2)")?.textContent.trim() === `S${server}`
    ), {}, searchedRanking.server);
    assert.equal(
        await page.$eval(".ssc2-overview-virtuoso tbody tr td:first-child", element => element.textContent.trim()),
        searchedRanking.rank,
        "Filtering the overview reset the server's rank",
    );

    const detailTargetServer = await page.$eval(
        ".ssc2-overview-virtuoso tbody tr",
        row => row.children[1].textContent.trim().replace(/^S/, ""),
    );
    await page.click(".ssc2-overview-virtuoso tbody tr button");
    await page.waitForFunction(server => {
        const params = new URLSearchParams(window.location.search);
        return params.get("view") === "server"
            && params.get("server") === server
            && document.body.textContent.includes(`S${server} · 서버 요약정보`);
    }, {}, detailTargetServer);
    assert.equal(await page.$eval("#ssc2-server-input", input => input.value), detailTargetServer);
    await page.waitForFunction(server => (
        document.querySelector(".ssc2-player-virtuoso tbody tr")
        && document.body.textContent.includes(`S${server} · 전력 목록`)
    ), {}, detailTargetServer);

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-view-tabs button")]
            .find(button => button.textContent.includes("서버간 비교"))?.click();
    });
    await page.waitForSelector("#ssc2-compare-input");
    assert.equal(await page.$$("#ssc2-compare-select").then(elements => elements.length), 0);
    await page.type("#ssc2-compare-input", "1677");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".ssc2-table");
    await page.waitForFunction(() => document.querySelector(".ssc2-table")?.textContent.includes("S1677"));
    await page.type("#ssc2-compare-input", "73");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".ssc2-table tbody tr").length === 2);
    await page.waitForSelector(".ssc2-distribution-chart canvas");
    assert.equal(
        await page.$eval(".ssc2-distribution-chart canvas", canvas => canvas.width > 0 && canvas.height > 0),
        true,
        "Power distribution line chart did not render",
    );
    assert.equal(await page.$eval(".ssc2-table", element => element.textContent.includes("TOP 5")), true);
    assert.equal(await page.$eval(".ssc2-table", element => element.textContent.includes("평균 전투력")), false);
    assert.equal(
        await page.$eval(
            '[aria-labelledby="ssc2-distribution-title"] .btn-group button.btn-primary',
            button => button.textContent.trim(),
        ),
        "전체",
        "The comparison chart did not default to the full roster",
    );
    assert.deepEqual(
        await page.$$eval(
            '[aria-labelledby="ssc2-distribution-title"] .btn-group button',
            buttons => buttons.map(button => button.textContent.trim()),
        ),
        ["TOP 1", "TOP 5", "TOP 10", "TOP 30", "TOP 50", "전체"],
    );
    for (const range of ["TOP 1", "TOP 5"]) {
        await page.evaluate(label => {
            [...document.querySelectorAll('[aria-labelledby="ssc2-distribution-title"] .btn-group button')]
                .find(button => button.textContent.trim() === label)?.click();
        }, range);
        await page.waitForFunction(label => (
            document.querySelector('[aria-labelledby="ssc2-distribution-title"] .btn-group button.btn-primary')
                ?.textContent.trim() === label
            && document.querySelector(".ssc2-distribution-chart")?.dataset.yAxisMode === "focused"
            && Number(document.querySelector(".ssc2-distribution-chart")?.dataset.yAxisMin) > 0
        ), {}, range);
    }
    assert.equal(
        await page.evaluate(() => document.body.textContent.includes("전체 모드는 0부터 표시")),
        true,
        "Compressed low-power rank guidance was not rendered",
    );
    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-table thead button")]
            .find(button => button.textContent.includes("TOP 5"))?.click();
    });
    await page.waitForFunction(() => document.querySelector("#ssc2-bar-title")?.textContent.includes("TOP 5"));
    assert.equal(
        await page.evaluate(() => (
            document.querySelector(".ssc2-table tbody tr td")?.textContent.trim()
            === document.querySelector(".ssc2-power-row strong")?.textContent.trim()
        )),
        true,
        "Comparison table and bars were not sorted together",
    );
    await page.evaluate(() => {
        [...document.querySelectorAll('[aria-labelledby="ssc2-distribution-title"] .btn-group button')]
            .find(button => button.textContent.trim() === "TOP 10")?.click();
    });
    assert.equal(
        await page.$eval(
            '[aria-labelledby="ssc2-distribution-title"] .btn-group button.btn-primary',
            button => button.textContent.trim(),
        ),
        "TOP 10",
    );

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-view-tabs button")]
            .find(button => button.textContent.includes("서버별 목록"))?.click();
    });
    await page.waitForSelector("#ssc2-server-input");
    assert.equal(await page.$$("#ssc2-server-select").then(elements => elements.length), 0);
    await page.click("#ssc2-server-input");
    await page.type("#ssc2-server-input", "16");
    await page.waitForSelector("#ssc2-server-input-options");
    assert.equal(
        await page.evaluate(() => {
            const input = document.querySelector("#ssc2-server-input");
            const menu = document.querySelector("#ssc2-server-input-options");
            const inputGroup = input?.closest(".input-group");
            if (!inputGroup || !menu) return false;
            const inputRect = inputGroup.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            return Math.abs(inputRect.width - menuRect.width) <= 1
                && menuRect.top >= inputRect.bottom;
        }),
        true,
        "Server autocomplete menu did not match the input width and position",
    );
    await page.type("#ssc2-server-input", "77");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#ssc2-server-input")?.value === "1677");
    await page.waitForSelector("#ssc2-server-player-query");
    await page.type("#ssc2-server-player-query", "Unholy", { delay: 80 });
    await page.waitForFunction(() => document.body.textContent.includes("Unholy"));
    assert.match(
        await page.$eval(".ssc2-player-virtuoso tbody tr td:nth-child(6)", element => element.textContent.trim()),
        /^\d[\d,.]*M$/,
        "Player power was not rendered with an M unit",
    );
    assert.equal(await page.$$(".ssc2-player-virtuoso .ssc2-hero-thumbnail img").then(rows => rows.length), 1);
    assert.equal(
        await page.$eval(".ssc2-player-virtuoso .ssc2-branch-badge", element => element.textContent.includes("육군")),
        true,
        "Army branch label was not rendered",
    );
    assert.equal(
        await page.evaluate(uid => document.body.textContent.includes(uid), String(mismatchPlayer.uid)),
        false,
        "UID rendered in the server UI",
    );

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-view-tabs button")]
            .find(button => button.textContent.includes("통합 검색"))?.click();
    });
    await page.waitForSelector("#ssc2-integrated-search");
    await page.waitForFunction(() => document.body.textContent.includes("검색어를 입력하면"));
    await page.type("#ssc2-integrated-search", "Unholy", { delay: 80 });
    await page.waitForFunction(
        () => document.body.textContent.includes("검색 결과") && document.body.textContent.includes("Unholy"),
        { timeout: 30_000 },
    );
    assert.equal(
        await page.evaluate(uid => document.body.textContent.includes(uid), String(mismatchPlayer.uid)),
        false,
        "UID rendered in search results",
    );

    await page.goto(`${baseUrl}/ko/history/ssc-2027/train?view=server`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#ssc2-server-input");
    assert.equal(
        await page.$eval("#ssc2-server-input", input => input.value),
        "",
        "The server list selected a default server",
    );
    assert.equal(await page.$$(".ssc2-player-virtuoso").then(elements => elements.length), 0);
    assert.equal(
        await page.evaluate(() => document.body.textContent.includes("서버 요약정보")),
        false,
        "Server information rendered before a server was selected",
    );

    for (const locale of [
        {
            code: "en",
            accessTitle: "Curious..?",
            pageTitle: "Seal Stone Battlefield (2027)",
            analyzerTitle: "Truck Power Analysis",
            overviewTab: "Overall Rankings",
            menuLabel: "Seal Stone Battlefield (2027)",
        },
        {
            code: "ja",
            accessTitle: "気になるなら…？",
            pageTitle: "封印石戦場（2027）",
            analyzerTitle: "トラック戦力分析",
            overviewTab: "総合ランキング",
            menuLabel: "封印石戦場（2027）",
        },
    ]) {
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/${locale.code}/history/ssc-2027/train`, { waitUntil: "networkidle0" });
        await page.waitForSelector(".ssc2-access-dialog");
        assert.equal(
            await page.$eval("#ssc2-access-title", element => element.textContent.trim()),
            locale.accessTitle,
        );
        await page.type("#ssc2-access-answer", "500원");
        await page.click('.ssc2-access-dialog button[type="submit"]');
        await page.waitForSelector(".ssc2-train-analyzer");
        assert.equal(await page.$eval("h1", element => element.textContent.trim()), locale.pageTitle);
        assert.equal(
            await page.$eval(".ssc2-hero h2", element => element.textContent.trim()),
            locale.analyzerTitle,
        );
        assert.equal(
            await page.$eval(".ssc2-view-tabs button", element => element.textContent.trim()),
            locale.overviewTab,
        );
        assert.equal(
            await page.$$eval(
                "a",
                (elements, expectedLabel) => elements.some(element => (
                    element.textContent.trim() === expectedLabel
                    && element.getAttribute("href")?.includes("/history/ssc-2027/train")
                )),
                locale.menuLabel,
            ),
            true,
        );
    }

    console.log("SSC2 browser verification passed");
} finally {
    await browser.close();
}
