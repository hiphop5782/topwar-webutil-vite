import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';
import { prerenderRoutes } from '../src/config/prerenderRoutes.js';
const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const rawOrigin = env.VITE_PUBLIC_URL || 'https://www.progamer.info';
const origin = new URL(rawOrigin.startsWith('//') ? 'https:' + rawOrigin : rawOrigin).origin;
await copyFile('dist/ko/index.html', 'dist/index.html');
for (const route of prerenderRoutes.filter(route => route !== '/')) {
    const target = '/ko' + route + '/';
    const directory = path.join('dist', route);
    await mkdir(directory, { recursive: true });
    const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
        '<title>페이지 이동 | Progamer.info</title><link rel="canonical" href="' + origin + target + '">' +
        '<meta http-equiv="refresh" content="0;url=' + target + '">' +
        '<script>location.replace(' + JSON.stringify(target) + '+location.search+location.hash)</script>' +
        '</head><body><a href="' + target + '">페이지로 이동</a></body></html>';
    await writeFile(path.join(directory, 'index.html'), html);
}
console.log('Root canonical and language-less legacy aliases generated.');
