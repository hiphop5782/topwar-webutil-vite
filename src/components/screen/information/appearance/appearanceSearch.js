const HANGUL_INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const HANGUL_VOWELS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const HANGUL_FINALS = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const COMPOUND_JAMO = {
    ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ',
    ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
    ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
};

function decompose(text) {
    let value = '';
    const positions = [];
    let offset = 0;
    for (const character of text) {
        for (const jamo of character.normalize('NFD').toLowerCase()) {
            const code = jamo.codePointAt(0);
            const compatible = (code >= 0x1100 && code <= 0x1112 ? HANGUL_INITIALS[code - 0x1100]
                : code >= 0x1161 && code <= 0x1175 ? HANGUL_VOWELS[code - 0x1161]
                    : code >= 0x11A8 && code <= 0x11C2 ? HANGUL_FINALS[code - 0x11A8] : jamo);
            const part = COMPOUND_JAMO[compatible] || compatible;
            value += part;
            for (let i = 0; i < part.length; i++) positions.push({ start: offset, end: offset + character.length });
        }
        offset += character.length;
    }
    return { value, positions };
}

// Keep original character offsets so partially typed syllables highlight whole letters.
export function createAppearanceSearch(query) {
    const search = query.trim();
    if (!search) return null;
    const decomposedQuery = decompose(search).value;
    const initialPattern = Array.from(search, character => {
        const initial = HANGUL_INITIALS.indexOf(character);
        if (initial !== -1) {
            const start = 0xAC00 + initial * 21 * 28;
            const end = start + 21 * 28 - 1;
            return `[${character}${String.fromCharCode(start)}-${String.fromCharCode(end)}]`;
        }
        return character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');

    const initials = new RegExp(initialPattern, 'i');
    return {
        test(text) {
            return decompose(text).value.includes(decomposedQuery) || initials.test(text);
        },
        findMatches(text) {
            const { value, positions } = decompose(text);
            const ranges = [];
            let index = value.indexOf(decomposedQuery);
            while (index !== -1) {
                ranges.push({ start: positions[index].start, end: positions[index + decomposedQuery.length - 1].end });
                index = value.indexOf(decomposedQuery, index + 1);
            }
            for (const match of text.matchAll(new RegExp(initialPattern, 'gi'))) {
                ranges.push({ start: match.index, end: match.index + match[0].length });
            }
            const merged = [];
            for (const range of ranges.sort((a, b) => a.start - b.start || a.end - b.end)) {
                const previous = merged[merged.length - 1];
                if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
                else merged.push({ ...range });
            }
            return merged;
        },
    };
}
