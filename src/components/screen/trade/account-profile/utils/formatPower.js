export function formatPower(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (typeof value === "number") {
        return new Intl.NumberFormat("en-US").format(value);
    }

    return String(value);
}

export function formatStatValue(value, suffix = "") {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const text = String(value).trim();

    if (!suffix || text.endsWith(suffix)) {
        return text;
    }

    return `${text}${suffix}`;
}
