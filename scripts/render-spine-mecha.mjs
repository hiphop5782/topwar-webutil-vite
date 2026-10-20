import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer";

function decodeDataUrl(text) {
    const comma = text.indexOf(",");
    if (comma < 0 || !text.startsWith("data:")) {
        throw new Error("Expected a data URL text file");
    }
    return Buffer.from(text.slice(comma + 1), "base64");
}

const prefabDataUrlPath = path.resolve(process.argv[2] || "");
const textureDataUrlPath = path.resolve(process.argv[3] || "");
const outputDirectory = path.resolve(
    process.argv[4] || path.join(process.cwd(), "public/images/mechas"),
);

if (!process.argv[2] || !process.argv[3]) {
    throw new Error("Usage: node scripts/render-spine-mecha.mjs <prefab-data-url.txt> <texture-data-url.txt> [output-directory] [skin-name]");
}

const prefabPayload = JSON.parse(decodeDataUrl(
    await readFile(prefabDataUrlPath, "utf8"),
).toString("utf8"));
const textureDataUrl = (await readFile(textureDataUrlPath, "utf8")).trim();

function findNested(value, predicate) {
    if (predicate(value)) return value;
    if (!value || typeof value !== "object") return null;

    for (const child of Object.values(value)) {
        const match = findNested(child, predicate);
        if (match !== null) return match;
    }
    return null;
}

const atlasText = findNested(
    prefabPayload,
    (value) => typeof value === "string"
        && /\.png\r?\nsize:\s*\d+\s*,\s*\d+/i.test(value)
        && /\r?\nformat:\s*RGBA/i.test(value),
);
const skeleton = findNested(
    prefabPayload,
    (value) => value
        && typeof value === "object"
        && Array.isArray(value.bones)
        && Array.isArray(value.slots)
        && value.skins,
);
const mechaId = JSON.stringify(prefabPayload)
    .match(/mecha_(\d+)(?:_[A-Za-z0-9]+)*_main/i)?.[1];

if (typeof atlasText !== "string" || !skeleton?.bones || !skeleton?.slots || !mechaId) {
    throw new Error("The prefab does not contain embedded Spine atlas/skeleton data");
}

await mkdir(outputDirectory, { recursive: true });
const browser = await puppeteer.launch({ headless: true });

try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    const availableSkins = Object.keys(skeleton.skins || {})
        .filter((name) => name !== "default")
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const selectedSkin = process.argv[5] || availableSkins.at(-1);
    if (!availableSkins.includes(selectedSkin)) {
        throw new Error(`Unknown skin ${selectedSkin}; available: ${availableSkins.join(", ")}`);
    }

    for (const skinName of [selectedSkin]) {
        const result = await page.evaluate(async ({ skeletonData, atlas, texture, selectedSkin }) => {
            function parseAtlas(source) {
                const lines = source.split(/\r?\n/);
                const regions = {};
                let index = 0;
                while (index < lines.length && !lines[index].trim()) index += 1;
                index += 1;
                while (index < lines.length && /^[a-z]+\s*:/i.test(lines[index].trim())) {
                    index += 1;
                }
                while (index < lines.length) {
                    const name = lines[index]?.trim();
                    if (!name) { index += 1; continue; }
                    const region = { name };
                    index += 1;
                    while (index < lines.length && /^\s+/.test(lines[index])) {
                        const line = lines[index].trim();
                        const separator = line.indexOf(":");
                        if (separator > 0) {
                            const key = line.slice(0, separator);
                            const value = line.slice(separator + 1).trim();
                            if (key === "xy" || key === "size" || key === "orig" || key === "offset") {
                                region[key] = value.split(",").map(Number);
                            } else if (key === "rotate") {
                                region.rotate = value === "true";
                            }
                        }
                        index += 1;
                    }
                    regions[name] = region;
                }
                return regions;
            }

            function worldBones(bones) {
                const result = new Map();
                for (const bone of bones) {
                    const rotation = ((bone.rotation || 0) + (bone.shearX || 0)) * Math.PI / 180;
                    const rotationY = ((bone.rotation || 0) + 90 + (bone.shearY || 0)) * Math.PI / 180;
                    const localA = Math.cos(rotation) * (bone.scaleX ?? 1);
                    const localC = Math.sin(rotation) * (bone.scaleX ?? 1);
                    const localB = Math.cos(rotationY) * (bone.scaleY ?? 1);
                    const localD = Math.sin(rotationY) * (bone.scaleY ?? 1);
                    const parent = bone.parent ? result.get(bone.parent) : null;
                    if (!parent) {
                        result.set(bone.name, {
                            a: localA, b: localB, c: localC, d: localD,
                            x: bone.x || 0, y: bone.y || 0,
                        });
                    } else {
                        result.set(bone.name, {
                            a: parent.a * localA + parent.b * localC,
                            b: parent.a * localB + parent.b * localD,
                            c: parent.c * localA + parent.d * localC,
                            d: parent.c * localB + parent.d * localD,
                            x: parent.a * (bone.x || 0) + parent.b * (bone.y || 0) + parent.x,
                            y: parent.c * (bone.x || 0) + parent.d * (bone.y || 0) + parent.y,
                        });
                    }
                }
                return result;
            }

            function attachmentFor(slot, attachmentName) {
                const skin = skeletonData.skins?.[selectedSkin]?.[slot.name];
                const defaults = skeletonData.skins?.default?.[slot.name];
                return skin?.[attachmentName] || defaults?.[attachmentName] || null;
            }

            function regionName(attachmentName, attachment) {
                return attachment.path || attachment.name || attachmentName;
            }

            function multiply(left, right) {
                return {
                    a: left.a * right.a + left.b * right.c,
                    b: left.a * right.b + left.b * right.d,
                    c: left.c * right.a + left.d * right.c,
                    d: left.c * right.b + left.d * right.d,
                    x: left.a * right.x + left.b * right.y + left.x,
                    y: left.c * right.x + left.d * right.y + left.y,
                };
            }

            function attachmentMatrix(attachment) {
                const radians = (attachment.rotation || 0) * Math.PI / 180;
                const scaleX = attachment.scaleX ?? 1;
                const scaleY = attachment.scaleY ?? 1;
                return {
                    a: Math.cos(radians) * scaleX,
                    b: -Math.sin(radians) * scaleY,
                    c: Math.sin(radians) * scaleX,
                    d: Math.cos(radians) * scaleY,
                    x: attachment.x || 0,
                    y: attachment.y || 0,
                };
            }

            const regions = parseAtlas(atlas);
            const bones = worldBones(skeletonData.bones);
            const initialAttachments = new Map();
            const animation = skeletonData.animations?.idle2;
            for (const [slotName, timeline] of Object.entries(animation?.slots || {})) {
                const first = timeline.attachment?.find((frame) => (frame.time || 0) === 0);
                if (first?.name) initialAttachments.set(slotName, first.name);
            }

            const renderables = [];
            for (const slot of skeletonData.slots) {
                const slotName = String(slot.name || "");
                if (
                    slot.blend === "additive"
                    || slotName.includes("武器光效")
                    || slotName.includes("影子")
                    || /(?:shadow|effect|glow)/i.test(slotName)
                ) continue;
                const attachmentName = initialAttachments.get(slot.name) || slot.attachment;
                if (!attachmentName) continue;
                const attachment = attachmentFor(slot, attachmentName);
                if (!attachment) continue;
                const attachmentRegionName = regionName(attachmentName, attachment);
                if (/(?:shadow|effect|glow)/i.test(attachmentRegionName)) continue;
                const region = regions[attachmentRegionName];
                const bone = bones.get(slot.bone);
                if (!region?.xy || !region?.size || !bone) continue;
                renderables.push({
                    slot,
                    attachment,
                    region,
                    matrix: multiply(bone, attachmentMatrix(attachment)),
                });
            }

            const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
            for (const item of renderables) {
                const width = item.attachment.width || item.region.orig?.[0] || item.region.size[0];
                const height = item.attachment.height || item.region.orig?.[1] || item.region.size[1];
                for (const [x, y] of [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]) {
                    const worldX = item.matrix.a * x + item.matrix.b * y + item.matrix.x;
                    const worldY = item.matrix.c * x + item.matrix.d * y + item.matrix.y;
                    bounds.minX = Math.min(bounds.minX, worldX);
                    bounds.minY = Math.min(bounds.minY, worldY);
                    bounds.maxX = Math.max(bounds.maxX, worldX);
                    bounds.maxY = Math.max(bounds.maxY, worldY);
                }
            }

            const sourceImage = new Image();
            sourceImage.src = texture;
            await sourceImage.decode();

            function extractRegion(region) {
                if (!region.rotate) {
                    return {
                        image: sourceImage,
                        sx: region.xy[0],
                        sy: region.xy[1],
                        sw: region.size[0],
                        sh: region.size[1],
                    };
                }

                const rotated = document.createElement("canvas");
                rotated.width = region.size[0];
                rotated.height = region.size[1];
                const rotatedContext = rotated.getContext("2d");
                rotatedContext.translate(0, rotated.height);
                rotatedContext.rotate(-Math.PI / 2);
                rotatedContext.drawImage(
                    sourceImage,
                    region.xy[0], region.xy[1], region.size[1], region.size[0],
                    0, 0, region.size[1], region.size[0],
                );
                return {
                    image: rotated,
                    sx: 0,
                    sy: 0,
                    sw: rotated.width,
                    sh: rotated.height,
                };
            }

            const padding = 24;
            const scale = 1.5;
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil((bounds.maxX - bounds.minX) * scale + padding * 2);
            canvas.height = Math.ceil((bounds.maxY - bounds.minY) * scale + padding * 2);
            const context = canvas.getContext("2d");
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.setTransform(scale, 0, 0, -scale, padding - bounds.minX * scale, padding + bounds.maxY * scale);

            for (const item of renderables) {
                const { matrix, region, attachment, slot } = item;
                const width = attachment.width || region.orig?.[0] || region.size[0];
                const height = attachment.height || region.orig?.[1] || region.size[1];
                context.save();
                context.transform(matrix.a, matrix.c, matrix.b, matrix.d, matrix.x, matrix.y);
                context.scale(1, -1);
                if (slot.blend === "additive") context.globalCompositeOperation = "lighter";
                const color = attachment.color || slot.color;
                if (color?.length === 8) context.globalAlpha = parseInt(color.slice(6, 8), 16) / 255;
                const source = extractRegion(region);
                const originalWidth = region.orig?.[0] || region.size[0];
                const originalHeight = region.orig?.[1] || region.size[1];
                const scaleX = width / originalWidth;
                const scaleY = height / originalHeight;
                const drawWidth = region.size[0] * scaleX;
                const drawHeight = region.size[1] * scaleY;
                const drawX = -width / 2 + (region.offset?.[0] || 0) * scaleX;
                const topOffset = originalHeight
                    - (region.offset?.[1] || 0)
                    - region.size[1];
                const drawY = -height / 2 + topOffset * scaleY;
                context.drawImage(
                    source.image,
                    source.sx, source.sy, source.sw, source.sh,
                    drawX, drawY, drawWidth, drawHeight,
                );
                context.restore();
            }

            return {
                data: canvas.toDataURL("image/webp", 0.92).split(",")[1],
                width: canvas.width,
                height: canvas.height,
                regions: renderables.length,
            };
        }, {
            skeletonData: skeleton,
            atlas: atlasText,
            texture: textureDataUrl,
            selectedSkin: skinName,
        });

        const fileName = `${mechaId}.webp`;
        const output = Buffer.from(result.data, "base64");
        await writeFile(path.join(outputDirectory, fileName), output);
        console.log(`${fileName} (${skinName}): ${result.width}x${result.height}, ${result.regions} regions`);
    }
} finally {
    await browser.close();
}
