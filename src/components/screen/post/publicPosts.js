import fm from 'front-matter';

// Exclude drafts at bundling time, not just from the visible post list.
const modules = import.meta.glob([
    '/src/assets/md/*/readme.md',
    '!/src/assets/md/9999-99-99*/readme.md',
], { eager: true, query: '?raw', import: 'default' });

export const publicPosts = Object.keys(modules).sort().map(path => {
    const { attributes, body } = fm(modules[path]);
    return { folder: path.split('/').at(-2), attributes, body };
});
