import { readFile, stat, readdir } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const routes=['','concept','staff','cafe','recruit','curriculum','lesson','shop-info','contact'];
let checked=0;
for(const route of routes){
  const file=path.join(root,route,'index.html');const html=await readFile(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${route}: one h1`);
  assert(html.includes('lang="ja"')&&html.includes('name="description"'),`${route}: metadata`);
  assert(!html.includes('541-0056')&&!html.includes('895円')&&!html.includes('AI生成'),`${route}: stale content`);
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const ref=match[1].replaceAll('&amp;','&');
    if(/^(?:https?:|tel:|mailto:|data:|#)/.test(ref))continue;
    const url=new URL(ref,`https://local.invalid/${route?route+'/':''}`);let local=path.join(root,decodeURIComponent(url.pathname));
    const s=await stat(local).catch(()=>null);assert(s,`${route}: missing ${ref}`);
    if(s.isDirectory())local=path.join(local,'index.html');await stat(local);checked++;
    if(url.hash&&local.endsWith('.html')){const text=await readFile(local,'utf8');assert(text.includes(`id="${url.hash.slice(1)}"`),`${ref}: missing anchor`);}
  }
  for(const image of html.matchAll(/<img\b[^>]*>/g))assert(image[0].includes('alt="')&&image[0].includes('width="')&&image[0].includes('height="'),`${route}: image metadata`);
}
await stat(path.join(root,'404.html'));
const entry=await readFile(path.join(root,'_redirects'),'utf8');assert(!/pages\.dev|github\.io/.test(entry));
console.log(`PASS: ${routes.length} routes, ${checked} local references, metadata, images, stale content and redirect checks.`);
