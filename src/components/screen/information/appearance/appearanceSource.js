import { relativePath } from './appearanceData';

const files = import.meta.glob('/src/assets/apperance/**/*.{json,png,jpg,jpeg,webp,gif,svg}', {
    query: '?url', import: 'default', eager: true,
});

export function createAppearanceSource(baseUrl) {
    const bundled = !baseUrl && Boolean(files['/src/assets/apperance/index.json']);
    const root = (baseUrl || `${import.meta.env.BASE_URL}assets/apperance`).replace(/\/$/, '');
    const url = path => bundled ? files[`/src/assets/apperance/${path}`] : `${root}/${path}`;
    return {
        async read(path, signal) {
            const location = url(path);
            if (!location) throw new Error(`Missing data: ${path}`);
            const response = await fetch(location, { signal });
            if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
            return response.json();
        },
        image(dataPath, path) {
            try { return url(relativePath(dataPath, path)) || null; }
            catch { return null; }
        },
    };
}
