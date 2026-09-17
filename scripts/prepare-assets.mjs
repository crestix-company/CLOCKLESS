// Owner-provided official-site assets, reused with the permission recorded in the brief.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require(process.env.CLOCKLESS_SHARP_MODULE || 'sharp');
const items = {
  salon: 'pc_mv2.jpg', exterior: 'pc_mv03.jpg',
  consultation:'concept01-1.jpg', cut:'concept02jpg.jpg', color:'concept03-1.jpg',
  education:'top_curriculum.jpg', team:'recruit_top.jpg',
  minegishi:'staff1.jpg', honda:'staff2.jpg', kogure:'staff3.jpg',
  'cafe-counter':'cafe_right_top.jpg', 'cafe-drinks':'top_cafe3.jpg',
  'style-01':'gallery01.jpg', 'style-02':'gallery02.jpg', 'style-03':'gallery04.jpg',
  'style-04':'gallery03.jpg', 'style-05':'style08.jpg', 'style-06':'style07.jpg', 'style-07':'gallery05.jpg',
  lesson:'lesson_img.jpg', 'salon-detail':'info_gallery01.jpg',
};
await mkdir(path.join(root,'source-assets'),{recursive:true});
await Promise.all(Object.entries(items).map(async ([name, file]) => {
  const url = `https://clock-less.com/wp-content/uploads/${file}`;
  const response=await fetch(url);
  if(!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(root,'source-assets',file),bytes);
  const result=await sharp(bytes).rotate().resize({width:name.startsWith('style-')?900:1600,withoutEnlargement:true}).webp({quality:86}).toFile(path.join(root,'dist/assets',`${name}.webp`));
  console.log(name,result.width,result.height,result.size);
}));
const favicon=await fetch('https://clock-less.com/wp-content/uploads/cropped-icon-32x32.png');
if(!favicon.ok) throw new Error('favicon download failed');
await writeFile(path.join(root,'dist/assets/favicon.png'),Buffer.from(await favicon.arrayBuffer()));
