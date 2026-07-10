/**
 * GitHub Pages SPA: любой путь /share/... отдаёт index.html
 * (иначе 404 File not found).
 */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const index = resolve(dist, 'index.html');
const notFound = resolve(dist, '404.html');

if (!existsSync(index)) {
  console.error('copy-404: dist/index.html not found — run vite build first');
  process.exit(1);
}

copyFileSync(index, notFound);
console.log('copy-404: dist/404.html ready for GitHub Pages SPA routing');
