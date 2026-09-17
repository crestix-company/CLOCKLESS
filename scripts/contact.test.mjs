import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/contact.js';
const valid={name:'動作確認',kana:'どうさかくにん',email:'test@example.com',phone:'',address:'',message:'これは送信しない単体検証データです。',topic:'general',consent:true,website:'',token:'test-token'};
const env={RESEND_API_KEY:'local-test',CONTACT_TO:'owner@example.com',CONTACT_FROM:'Website <no-reply@example.com>',TURNSTILE_SECRET_KEY:'local-test',TURNSTILE_SITE_KEY:'local-test'};
const request=(data=valid,headers={})=>new Request('https://clockless.example/api/contact',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://clockless.example','Idempotency-Key':'ab86f8a8-71a1-4810-8a31-d9f9bf55e39f',...headers},body:JSON.stringify(data)});
test('contact configuration does not expose secrets',async()=>{assert.deepEqual(await(await onRequestGet({env:{}})).json(),{enabled:false,siteKey:null});const data=await(await onRequestGet({env})).json();assert.deepEqual(Object.keys(data),['enabled','siteKey']);});
test('unconfigured contact never reports success',async()=>{const r=await onRequestPost({request:request(),env:{}});assert.equal(r.status,503);assert.notEqual((await r.json()).ok,true);});
test('rejects foreign origins, missing consent, invalid email and oversized content',async()=>{for(const [body,headers,status]of [[valid,{Origin:'https://evil.example'},403],[{...valid,consent:false},{},400],[{...valid,email:'bad'},{},400],[{...valid,message:'x'.repeat(4001)},{},400],[{...valid,website:'bot'},{},400]]){assert.equal((await onRequestPost({request:request(body,headers),env})).status,status);}});
test('validates Turnstile hostname/action and handles provider failures without fake success',async()=>{
  const realFetch=globalThis.fetch;let mails=0;
  try{
    for(const state of ['wrong-host','wrong-action','provider-fails','ok']){
      globalThis.fetch=async(url,options)=>{
        if(String(url).includes('siteverify'))return Response.json({success:true,hostname:state==='wrong-host'?'other.example':'clockless.example',action:state==='wrong-action'?'login':'contact'});
        assert.equal(url,'https://api.resend.com/emails');mails++;const payload=JSON.parse(options.body);assert.equal(payload.reply_to,'test@example.com');assert.equal(payload.to[0],env.CONTACT_TO);assert(!options.body.includes('<script>'));
        return state==='provider-fails'?Response.json({error:'test'},{status:500}):Response.json({id:'mock-mail-id'});
      };
      const r=await onRequestPost({request:request(),env});assert.equal(r.status,state==='ok'?200:state==='provider-fails'?502:400);assert.equal((await r.json()).ok,state==='ok'?true:undefined);
    }
    assert.equal(mails,2);
  }finally{globalThis.fetch=realFetch;}
});
