import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../.sites-runtime/github-pages/', import.meta.url));
const base = '/CLOCKLESS/';
const routes = ['', 'concept', 'staff', 'cafe', 'recruit', 'curriculum', 'lesson', 'shop-info', 'contact'];
let checked = 0;
for (const file of [...routes.map(route => `${route ? route + '/' : ''}index.html`), '404.html']) {
  const html = await readFile(path.join(root, file), 'utf8');
  assert(html.includes('CLOCKLESS Hair Design') && html.includes('<main id="main">'));
  assert(!html.includes('Jekyll') && !html.includes('ビルドコマンド'));
  for (const [, attribute, ref] of html.matchAll(/\b(href|src|action)="([^"]+)"/g)) {
    if (/^(?:https?:|tel:|mailto:|data:|#)/.test(ref)) continue;
    assert(ref.startsWith(base), `${file}: escaped base path ${ref}`);
    if (attribute === 'action') {
      assert(html.includes('data-preview-only="true"') && html.includes('type="submit" disabled'));
      continue;
    }
    const url = new URL(ref.replaceAll('&amp;', '&'), 'https://local.invalid');
    let local = path.join(root, decodeURIComponent(url.pathname.slice(base.length)));
    if ((await stat(local)).isDirectory()) local = path.join(local, 'index.html');
    assert((await stat(local)).size > 0, `empty asset ${ref}`);
    if (url.hash && local.endsWith('.html')) assert((await readFile(local, 'utf8')).includes(`id="${url.hash.slice(1)}"`));
    checked++;
  }
}
await stat(path.join(root, '.nojekyll'));
assert.equal(await stat(path.join(root, 'README.md')).catch(() => null), null);
console.log(`PASS: GitHub Pages, ${routes.length} routes + 404, ${checked} references within ${base}.`);
