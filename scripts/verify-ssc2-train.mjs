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
    await page.waitForFunction(() => (
        document.body.textContent.includes("서버 요약정보")
        && document.body.textContent.includes("전력 목록")
    ));
    await page.waitForFunction(() => {
        const renderedRows = document.querySelectorAll(".ssc2-virtual-table tbody tr").length;
        return renderedRows > 0 && renderedRows < 142;
    });

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-view-tabs button")]
            .find(button => button.textContent.includes("전체 랭킹"))?.click();
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
        /^\d+$/,
        "Player count column was not rendered in the merged ranking",
    );
    assert.match(
        await page.$eval(".ssc2-virtual-frame tbody tr td:nth-child(4)", element => element.textContent.trim()),
        /[만억조]/,
        "Total power was not rendered with a Korean upper unit",
    );
    assert.equal(await page.$$(".ssc2-view-tabs button").then(buttons => buttons.length), 4);

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

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-view-tabs button")]
            .find(button => button.textContent.includes("서버별 목록"))?.click();
    });
    await page.waitForSelector("#ssc2-server-select");
    await page.select("#ssc2-server-select", "1677");
    await page.waitForSelector("#ssc2-server-player-query");
    await page.type("#ssc2-server-player-query", "Unholy", { delay: 80 });
    await page.waitForFunction(() => document.body.textContent.includes("Unholy"));
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

    console.log("SSC2 browser verification passed");
} finally {
    await browser.close();
}
