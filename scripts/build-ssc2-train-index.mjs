import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPlayerNicknameSearchKeys } from "../src/utils/playerSearchIndex.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const trainDirectory = path.resolve(__dirname, "../src/assets/json/ssc2/train");
const sourcePattern = /^CQ26-S\d+-.*\.json$/;

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parsePlayerInfo(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function getDisplayName(player) {
    const uid = String(player.uid ?? "");
    const info = parsePlayerInfo(player.playerInfo);
    const candidates = [
        player.username,
        info.username,
        info.nickname,
        info.name,
    ];

    const safeName = candidates.find(candidate => {
        const value = String(candidate ?? "").trim();
        return value && (!uid || !value.includes(uid));
    });

    return safeName ? String(safeName).trim() : "익명 사용자";
}

function sum(values) {
    return values.reduce((total, value) => total + value, 0);
}

function median(values) {
    if (values.length === 0) return 0;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0
        ? Math.round((values[middle - 1] + values[middle]) / 2)
        : values[middle];
}

const fileNames = (await readdir(trainDirectory))
    .filter(fileName => sourcePattern.test(fileName))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));

const servers = [];
const players = [];
let captureStart = null;
let captureEnd = null;

for (const fileName of fileNames) {
    const data = JSON.parse(await readFile(path.join(trainDirectory, fileName), "utf8"));
    const server = number(data.serverKey);
    const capturedAt = new Date(data.capturedAt).toISOString();
    const sortedPowers = (data.players ?? [])
        .map(player => number(player.power))
        .sort((left, right) => right - left);
    const totalPower = sum(sortedPowers);
    const mismatchCount = (data.players ?? [])
        .filter(player => number(player.serverId) !== server)
        .length;

    if (!captureStart || capturedAt < captureStart) captureStart = capturedAt;
    if (!captureEnd || capturedAt > captureEnd) captureEnd = capturedAt;

    servers.push({
        server,
        fileName,
        capturedAt,
        endTime: String(data.train?.endTime ?? ""),
        percent: number(data.train?.percent),
        lootNum: number(data.train?.lootNum),
        playerCount: sortedPowers.length,
        totalPower,
        averagePower: sortedPowers.length ? Math.round(totalPower / sortedPowers.length) : 0,
        medianPower: median([...sortedPowers].sort((left, right) => left - right)),
        maxPower: sortedPowers[0] ?? 0,
        top5Power: sum(sortedPowers.slice(0, 5)),
        top10Power: sum(sortedPowers.slice(0, 10)),
        top30Power: sum(sortedPowers.slice(0, 30)),
        top50Power: sum(sortedPowers.slice(0, 50)),
        mismatchCount,
    });

    for (const player of data.players ?? []) {
        const name = getDisplayName(player);
        const searchKeys = getPlayerNicknameSearchKeys(name);

        players.push({
            u: String(player.uid ?? ""),
            n: name,
            s: server,
            rs: number(player.serverId),
            r: number(player.rank),
            p: number(player.power),
            h: number(player.firstHeroId),
            a: number(player.armyType),
            ...searchKeys,
        });
    }
}

const generatedAt = new Date().toISOString();
const index = {
    schemaVersion: 1,
    generatedAt,
    serverCount: servers.length,
    totalPlayers: players.length,
    captureStart,
    captureEnd,
    servers,
};

const searchIndex = {
    schemaVersion: 1,
    generatedAt,
    count: players.length,
    players,
};

await Promise.all([
    writeFile(path.join(trainDirectory, "index.json"), `${JSON.stringify(index)}\n`, "utf8"),
    writeFile(path.join(trainDirectory, "player-search-index.json"), `${JSON.stringify(searchIndex)}\n`, "utf8"),
]);

console.log(`SSC2 train index: ${servers.length} servers, ${players.length} players`);
