/*
 * 닉네임의 표시 모양을 기준으로 검색하기 위한 정규화 유틸입니다.
 * 원본 닉네임을 변경하지 않고 검색용 문자열을 만들 때만 사용합니다.
 */
const CONFUSABLES = new Map(Object.entries({
    // Cyrillic uppercase
    "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H",
    "І": "I", "Ј": "J", "К": "K", "М": "M", "О": "O",
    "Р": "P", "Ѕ": "S", "Т": "T", "Х": "X", "У": "Y",
    "Ӏ": "I", "Ԍ": "G",

    // Cyrillic lowercase
    "а": "a", "в": "b", "с": "c", "е": "e", "і": "i",
    "ј": "j", "к": "k", "м": "m", "о": "o", "р": "p",
    "ѕ": "s", "т": "t", "х": "x", "у": "y", "ӏ": "l",
    "ԁ": "d", "ԛ": "q", "ԝ": "w",

    // Greek uppercase
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H",
    "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O",
    "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X", "Ϲ": "C",

    // Greek lowercase
    "α": "a", "β": "b", "ε": "e", "ι": "i", "κ": "k",
    "ο": "o", "ρ": "p", "τ": "t", "υ": "y", "χ": "x",
    "ϲ": "c", "ϳ": "j",
}));

// 각 유니코드 10진 숫자 블록에서 숫자 0의 코드 포인트입니다.
// NFKC로 처리되지 않는 다른 문자권의 숫자도 ASCII 0~9로 통일합니다.
const DECIMAL_ZERO_CODE_POINTS = [
    0x0660, 0x06F0, 0x07C0, 0x0966, 0x09E6, 0x0A66,
    0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66,
    0x0DE6, 0x0E50, 0x0ED0, 0x0F20, 0x1040, 0x1090,
    0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90,
    0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0,
    0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0,
    0x104A0, 0x10D30, 0x10D40, 0x11066, 0x110F0, 0x11136,
    0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650, 0x116C0,
    0x11730, 0x118E0, 0x11950, 0x11BF0, 0x11C50, 0x11D50,
    0x11DA0, 0x11F50, 0x16130, 0x16A60, 0x16AC0, 0x16B50,
    0x1CCF0, 0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6,
    0x1E140, 0x1E2F0, 0x1E4F0, 0x1E5F1, 0x1E950, 0x1FBF0,
];

function foldUnicodeDigit(character) {
    const codePoint = character.codePointAt(0);

    for (const zeroCodePoint of DECIMAL_ZERO_CODE_POINTS) {
        const digit = codePoint - zeroCodePoint;

        if (digit >= 0 && digit <= 9) {
            return String(digit);
        }
    }

    return character;
}

function foldLatinDiacritics(value) {
    return Array.from(value, character => {
        const decomposed = character.normalize("NFD");
        const base = decomposed.charAt(0);

        return /^[A-Za-z]$/.test(base)
            ? base
            : character;
    }).join("");
}

export function normalizeNicknameForSearch(value) {
    const normalized = String(value ?? "")
        .normalize("NFKC")
        .replace(/\p{Cf}/gu, "")
        .replace(/\p{Variation_Selector}/gu, "");

    return Array.from(foldLatinDiacritics(normalized), character => {
        const digitFolded = foldUnicodeDigit(character);

        return CONFUSABLES.get(digitFolded) ?? digitFolded;
    })
        .join("")
        .toLocaleLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
