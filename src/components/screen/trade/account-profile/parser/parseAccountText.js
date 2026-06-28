const FORMATION_TYPES = [
    { type: "navy", pattern: /\b(navy|해군)\b/i },
    { type: "army", pattern: /\b(army|육군)\b/i },
    { type: "air-force", pattern: /\b(air\s*force|air|공군)\b/i },
];

const STAT_KEYS = {
    tp: ["tp", "troop power"],
    ms: ["ms", "march size"],
    hp: ["hp"],
    atk: ["atk", "attack"],
    dmgPlus: ["dmg+", "dmg plus", "damage+", "damage plus"],
    dmgMinus: ["dmg-", "dmg minus", "damage-", "damage minus"],
    def: ["def", "defense"],
};

function normalizeId(value, index) {
    return `${String(value || "formation")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${index}`;
}

function detectFormationType(name) {
    const found = FORMATION_TYPES.find(({ pattern }) => pattern.test(name || ""));
    return found?.type || "navy";
}

function readPlayerValue(lines, labels) {
    const found = lines.find((line) => {
        const [key] = line.split(/[:=]/);
        return labels.some((label) => key?.trim().toLowerCase() === label);
    });

    if (!found) {
        return null;
    }

    return found.split(/[:=]/).slice(1).join(":").trim() || null;
}

function parseHeroLine(line) {
    const heroMatch = line.match(/^(heroes?|영웅)\s*[:=]\s*(.+)$/i);

    if (!heroMatch) {
        return null;
    }

    return heroMatch[2]
        .split(/[,/|]+/)
        .map((hero) => hero.trim())
        .filter(Boolean)
        .slice(0, 3);
}

function readStat(line) {
    const match = line.match(/^([a-zA-Z가-힣+\-\s]+)\s*[:=]\s*(.+)$/);

    if (!match) {
        return null;
    }

    const label = match[1].trim().toLowerCase();
    const value = match[2].trim();
    const statKey = Object.entries(STAT_KEYS).find(([, aliases]) =>
        aliases.includes(label)
    )?.[0];

    if (!statKey) {
        return null;
    }

    return [statKey, value];
}

function isFormationHeading(line) {
    return FORMATION_TYPES.some(({ pattern }) => pattern.test(line));
}

function parseFormationBlock(block, index) {
    const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const heading = lines[0] || `Formation ${index + 1}`;
    const heroes = [];
    const stats = {
        tp: null,
        ms: null,
        hp: null,
        atk: null,
        dmgPlus: null,
        dmgMinus: null,
        def: null,
    };

    lines.slice(1).forEach((line) => {
        const parsedHeroes = parseHeroLine(line);

        if (parsedHeroes) {
            heroes.splice(0, heroes.length, ...parsedHeroes);
            return;
        }

        const parsedStat = readStat(line);

        if (parsedStat) {
            const [key, value] = parsedStat;
            stats[key] = value;
        }
    });

    return {
        id: normalizeId(heading, index),
        name: heading,
        type: detectFormationType(heading),
        heroes: Array.from({ length: 3 }, (_, heroIndex) => heroes[heroIndex] || null),
        stats,
    };
}

export function parseAccountText(text) {
    const source = String(text || "").replace(/\r\n/g, "\n");
    const lines = source
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const blocks = [];
    let currentBlock = [];

    lines.forEach((line) => {
        if (isFormationHeading(line)) {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock.join("\n"));
            }

            currentBlock = [line];
            return;
        }

        if (currentBlock.length > 0) {
            currentBlock.push(line);
        }
    });

    if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
    }

    return {
        player: {
            nickname: readPlayerValue(lines, ["nickname", "name", "닉네임"]) || "Unknown Player",
            server: readPlayerValue(lines, ["server", "서버"]),
            power: readPlayerValue(lines, ["power", "cp", "전투력"]),
            vip: readPlayerValue(lines, ["vip"]),
        },
        collections: [
            {
                label: "Parsed formations",
                value: blocks.length,
            },
        ],
        formations: blocks.map(parseFormationBlock),
    };
}
