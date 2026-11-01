import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const baseUrl = process.env.SSC2_VERIFY_URL ?? "http://127.0.0.1:4173";
const dataDirectory = new URL("../src/assets/json/ssc2/personal/", import.meta.url);
const newestFile = (await readdir(dataDirectory))
    .filter(fileName => fileName.endsWith(".json"))
    .sort()
    .at(-1);

assert.ok(newestFile, "No personal ranking data file found");

const source = JSON.parse(await readFile(new URL(newestFile, dataDirectory), "utf8"));
const latestDate = Object.keys(source.dates ?? {}).sort().at(-1);
const latest = source.dates?.[latestDate];
const players = latest?.rankings ?? [];
const topPlayer = players[0];
const unicodePlayer = players.find(player => player.nickname === "𝐌") ?? topPlayer;

const hangulPartialTarget = players.map(player => {
    const characters = Array.from(String(player.nickname ?? ""));
    if (characters.length < 2 || !characters.every(character => /[가-힣]/.test(character))) return null;

    const query = characters.slice(0, -1).join("");
    const matches = players.filter(candidate => String(candidate.nickname ?? "").includes(query));
    return query && matches.length === 1 ? { player, query } : null;
}).find(Boolean);

assert.ok(topPlayer, "Latest personal ranking is empty");
assert.ok(hangulPartialTarget, "Could not find a unique partial Hangul search fixture");

async function replaceInput(page, selector, value) {
    await page.$eval(selector, (input, nextValue) => {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        valueSetter?.call(input, nextValue);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }, String(value));
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 824, height: 871 });
    page.on("pageerror", error => console.error("PAGE ERROR", error.message));

    await page.goto(`${baseUrl}/ko/history/ssc-2027/users`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".ssc2-personal-rank-virtuoso", { timeout: 60_000 });
    await page.waitForFunction(() => document.querySelectorAll(".ssc2-personal-table tbody tr").length > 0);

    assert.equal(
        await page.$eval("#ssc2-personal-rank-title", element => element.textContent.trim()),
        "개인 누적 랭킹",
    );
    assert.equal(
        await page.evaluate(fileName => document.body.textContent.includes(fileName.replace(/\.json$/i, "")), newestFile),
        false,
        "Source file name rendered in the UI",
    );
    assert.equal(
        await page.evaluate(uid => document.body.textContent.includes(String(uid)), topPlayer.uid),
        false,
        "UID rendered in the ranking UI",
    );
    assert.equal(await page.$$("#ssc2-personal-nickname").then(elements => elements.length), 1);
    assert.equal(await page.$$("#ssc2-personal-server").then(elements => elements.length), 1);
    assert.equal(
        await page.$eval(".ssc2-personal-result-summary", element => element.textContent.includes("14,746")),
        true,
    );

    const renderedRows = await page.$$(".ssc2-personal-rank-virtuoso tbody tr").then(rows => rows.length);
    assert.ok(renderedRows > 0 && renderedRows < players.length, "Personal ranking was not virtualized");
    assert.ok(
        await page.$eval(".ssc2-personal-rank-virtuoso tbody tr", row => row.getBoundingClientRect().height <= 40),
        "Personal ranking rows are not compact",
    );

    await replaceInput(page, "#ssc2-personal-nickname", "m");
    await replaceInput(page, "#ssc2-personal-server", unicodePlayer.serverId);
    await page.waitForFunction(nickname => document.body.textContent.includes(nickname), {}, unicodePlayer.nickname);

    await replaceInput(page, "#ssc2-personal-nickname", hangulPartialTarget.query);
    await replaceInput(page, "#ssc2-personal-server", "");
    await page.waitForFunction(nickname => document.body.textContent.includes(nickname), {}, hangulPartialTarget.player.nickname);

    await replaceInput(page, "#ssc2-personal-nickname", "");
    await replaceInput(page, "#ssc2-personal-minimum", topPlayer.merit);
    await replaceInput(page, "#ssc2-personal-maximum", topPlayer.merit);
    await page.waitForFunction(nickname => {
        const rows = document.querySelectorAll(".ssc2-personal-rank-virtuoso tbody tr");
        return rows.length === 1 && rows[0].textContent.includes(nickname);
    }, {}, topPlayer.nickname);

    await page.evaluate(() => {
        [...document.querySelectorAll(".ssc2-personal-filters button")]
            .find(button => button.textContent.includes("검색 초기화"))?.click();
    });
    await page.waitForFunction(() => document.querySelector("#ssc2-personal-minimum")?.value === "");

    await page.click(".ssc2-personal-rank-virtuoso tbody tr .ssc2-personal-detail-button");
    await page.waitForSelector("#ssc2-personal-history-title");
    await page.waitForSelector(".ssc2-personal-history-virtuoso tbody tr", { timeout: 60_000 });
    assert.equal(
        await page.evaluate(uid => document.body.textContent.includes(String(uid)), topPlayer.uid),
        false,
        "UID rendered in the history UI",
    );
    assert.equal(
        await page.$eval(
            ".ssc2-personal-history-virtuoso tbody tr",
            (row, date) => row.textContent.includes(date),
            latestDate,
        ),
        false,
        "Raw ISO date unexpectedly rendered instead of a localized date",
    );

    await page.evaluate(() => {
        [...document.querySelectorAll("button")]
            .find(button => button.textContent.includes("이전 목록으로"))?.click();
    });
    await page.waitForSelector(".ssc2-personal-rank-virtuoso");
    assert.equal(await page.$eval("#ssc2-personal-minimum", input => input.value), "");

    for (const locale of [
        { code: "en", title: "Personal Cumulative Rankings" },
        { code: "ja", title: "個人累積ランキング" },
    ]) {
        await page.goto(`${baseUrl}/${locale.code}/history/ssc-2027/users`, { waitUntil: "networkidle0" });
        await page.waitForSelector(".ssc2-personal-rank-virtuoso", { timeout: 60_000 });
        assert.equal(
            await page.$eval("#ssc2-personal-rank-title", element => element.textContent.trim()),
            locale.title,
        );
    }

    console.log("SSC2 personal rank browser verification passed");
} finally {
    await browser.close();
}
