import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {onRequest} from '../functions/api/contact.js';
const root=path.resolve(process.env.SITE_DIR||fileURLToPath(new URL('../dist/',import.meta.url)));
const base=process.env.BASE_PATH||'/';
const port=Number(process.env.PORT||3005);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://localhost:${port}`);
    if(url.pathname==='/api/contact'){
      const data=[];let size=0;for await(const c of req){size+=c.length;if(size>24000){res.writeHead(413);return res.end('Payload too large');}data.push(c);}
      const response=await onRequest({request:new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(data)}:{})}),env:{}});
      res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()));
    }
    if(!url.pathname.startsWith(base)){res.writeHead(404);return res.end('Not found');}
    let local=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length))||'.');
    if(!local.startsWith(root+path.sep)&&local!==root){res.writeHead(403);return res.end('Forbidden');}
    try{if((await stat(local)).isDirectory())local=path.join(local,'index.html');}catch{local=path.join(root,'404.html');res.statusCode=404;}
    const bytes=await readFile(local);res.setHeader('Content-Type',types[path.extname(local)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);
  }catch{res.writeHead(500);res.end('Unable to serve page');}
}).listen(port,'127.0.0.1',()=>console.log(`CLOCKLESS local preview: http://localhost:${port}${base}`));
