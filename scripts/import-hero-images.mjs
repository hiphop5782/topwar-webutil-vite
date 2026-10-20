import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer";

const zipPath = path.resolve(process.argv[2] || "");
const outputDirectory = path.resolve(
    process.argv[3] || path.join(process.cwd(), "src/assets/images/heros"),
);

if (!process.argv[2] || !zipPath.toLowerCase().endsWith(".zip")) {
    throw new Error("Usage: node scripts/import-hero-images.mjs <zip-path> [output-directory]");
}

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "topwar-heroes-"));
let browser;

try {
    execFileSync("tar", ["-xf", zipPath, "-C", temporaryDirectory], {
        stdio: "inherit",
    });

    const manifest = JSON.parse(await readFile(
        path.join(temporaryDirectory, "manifest.json"),
        "utf8",
    ));
    const entries = Array.isArray(manifest.entries) ? manifest.entries : [];

    await mkdir(outputDirectory, { recursive: true });
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const index = {};

    for (const entry of entries) {
        const heroId = String(entry.heroNodeId || "").trim();
        if (!/^\d+$/.test(heroId) || !entry.png) continue;

        const png = await readFile(path.join(temporaryDirectory, entry.png));
        const webpBase64 = await page.evaluate(async (base64) => {
            const response = await fetch(`data:image/png;base64,${base64}`);
            const source = await createImageBitmap(await response.blob());
            const canvas = document.createElement("canvas");
            canvas.width = source.width;
            canvas.height = source.height;
            canvas.getContext("2d").drawImage(source, 0, 0);
            source.close();
            return canvas.toDataURL("image/webp", 0.9).split(",")[1];
        }, png.toString("base64"));

        const fileName = `${heroId}.webp`;
        await writeFile(
            path.join(outputDirectory, fileName),
            Buffer.from(webpBase64, "base64"),
        );
        index[heroId] = {
            file: fileName,
            frameName: entry.frameName || null,
            sourceURL: entry.sourceURL || null,
        };
    }

    await writeFile(
        path.join(outputDirectory, "index.json"),
        `${JSON.stringify({ version: 1, count: Object.keys(index).length, heroes: index }, null, 2)}\n`,
        "utf8",
    );
    console.log(`Imported ${Object.keys(index).length} hero images into ${outputDirectory}`);
} finally {
    if (browser) await browser.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
}
