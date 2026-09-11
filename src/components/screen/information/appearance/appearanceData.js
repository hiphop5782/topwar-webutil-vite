export const categoryIds = ['castle', 'army-line', 'city-effect', 'castle-halo'];

export function appearanceHighlights(item, category) {
    const raw = item.raw || {};
    // The catalog groups premium bases/marches at order 1000+, including ID 0 defaults.
    const premium = Number(item.id) !== 0 && (
        (['castle', 'army-line'].includes(category) && Number(raw.order) >= 1000)
        || (category === 'city-effect' && Number(raw.ultimate_skin_frame) === 1)
    );
    return { premium, hasSkill: category === 'castle' && Number(raw.city_skill_id) > 0 };
}

// Resolve only local descendants; reject traversal, schemes and encoded separators.
export function relativePath(baseFile, path) {
    if (typeof path !== 'string' || !path) throw new Error('Invalid relative path');
    const parts = path.replace(/^\.\//, '').split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || /[%\\:?#]/.test(part))) {
        throw new Error('Invalid relative path');
    }
    return baseFile.slice(0, baseFile.lastIndexOf('/') + 1) + parts.join('/');
}

export function normalizeItems(data) {
    const items = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(items)) throw new Error('Expected an items array');
    return items.filter(item => item && typeof item === 'object' && ['string', 'number'].includes(typeof item.id));
}

export function buffText(buff) {
    if (buff == null) return '';
    if (typeof buff === 'string') {
        // Encoded buff IDs and raw values are not human-readable effects.
        return /^\s*\d+\s*,/.test(buff) ? '' : buff.trim();
    }
    if (typeof buff !== 'object') return String(buff);
    if (typeof buff.text === 'string' && buff.text.trim()) return buff.text.trim();
    const name = typeof buff.name === 'string' ? buff.name.trim() : '';
    const value = ['string', 'number'].includes(typeof buff.value) ? String(buff.value).trim() : '';
    return name ? [name, value].filter(Boolean).join(' ') : '';
}

export function buffLines(value) {
    return (Array.isArray(value) ? value : value == null ? [] : [value]).map(buffText).filter(Boolean);
}

export function effectState(item, field) {
    const value = item[field];
    const entries = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
    const lines = buffLines(entries);
    const rawField = field === 'equipBuff' ? 'equip_buff' : 'own_buff';
    const rawValue = item.raw?.[rawField];
    const confirmedEmpty = entries.length === 0 && (rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0));
    return {
        lines,
        missing: lines.length < entries.length || (!lines.length && !confirmedEmpty),
        empty: confirmedEmpty,
    };
}
