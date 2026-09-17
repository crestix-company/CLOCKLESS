import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.sites-runtime/github-pages');
const base = '/CLOCKLESS/';
await mkdir(output, { recursive: true });
await cp(path.join(root, 'dist'), output, {
  recursive: true,
  filter: source => !path.basename(source).startsWith('_'),
});
for (const file of await readdir(output, { recursive: true })) {
  if (!file.endsWith('.html')) continue;
  const target = path.join(output, file);
  let html = await readFile(target, 'utf8');
  html = html.replace(/\b(href|src|action)="([^"]+)"/g, (match, attr, value) => {
    if (/^(?:https?:|tel:|mailto:|data:|#)/.test(value)) return match;
    const url = new URL(value, `https://local.invalid/${file}`);
    return `${attr}="${base}${url.pathname.slice(1)}${url.search}${url.hash}"`;
  });
  if (file === 'contact/index.html') {
    html = html.replace('<form id="contact-form"', '<form data-preview-only="true" id="contact-form"');
    html = html.replace('<p class="form-required">', '<p class="notice">この確認用サイトではフォーム送信を受け付けていません。お電話（0270-75-5330）でお問い合わせください。</p><p class="form-required">');
    html = html.replace('<button type="submit"', '<button type="submit" disabled');
  }
  await writeFile(target, html);
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages preview prepared at ${base} (${output}).`);
