const assets = import.meta.glob([
    '/src/assets/md/**/*.{png,jpg,jpeg,webp,gif,svg,csv,json,pdf}',
    '!/src/assets/md/9999-99-99*/**',
], { eager: true, query: '?url', import: 'default' });

export function postAssetUrl(folder, source) {
    if (!source?.startsWith('./')) return source;
    const suffixIndex = source.search(/[?#]/);
    const file = suffixIndex < 0 ? source : source.slice(0, suffixIndex);
    const suffix = suffixIndex < 0 ? '' : source.slice(suffixIndex);
    const url = assets[`/src/assets/md/${folder}/${decodeURI(file.slice(2))}`];
    return url ? url + suffix : undefined;
}
