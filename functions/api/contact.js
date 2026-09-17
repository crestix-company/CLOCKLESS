const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const topics={general:'サロンについて',recruit:'採用・サロン見学について',lesson:'カット講習について',cafe:'カフェについて',other:'その他'};
const emailPattern=/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;
const enabled=env=>Boolean(env.RESEND_API_KEY&&env.CONTACT_TO&&env.CONTACT_FROM&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY);
export async function onRequestGet({env}){return json({enabled:enabled(env),siteKey:enabled(env)?env.TURNSTILE_SITE_KEY:null});}
export async function onRequestPost({request,env}){
  const origin=new URL(request.url).origin;
  if(request.headers.get('Origin')!==origin)return json({error:'送信元を確認できませんでした。ページを開き直してください。'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'送信形式が正しくありません。'},415);
  if(Number(request.headers.get('Content-Length')||0)>24000)return json({error:'入力内容が長すぎます。'},413);
  const reader=request.body?.getReader();if(!reader)return json({error:'入力内容がありません。'},400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24000){await reader.cancel();return json({error:'入力内容が長すぎます。'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'入力内容を確認できませんでした。'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'入力内容をご確認ください。'},400);
  if(data.website)return json({error:'送信内容を確認できませんでした。'},400);
  const max={name:80,kana:100,email:254,phone:30,address:300,message:4000,topic:20,token:2048};
  for(const [field,len]of Object.entries(max)){if(data[field]!=null&&(typeof data[field]!=='string'||data[field].length>len))return json({error:'入力内容の形式・文字数をご確認ください。'},400);}
  const name=data.name?.trim(),email=data.email?.trim(),message=data.message?.trim();
  if(!name||!emailPattern.test(email||'')||!message||message.length<10||data.consent!==true||!topics[data.topic])return json({error:'必須項目とメールアドレスをご確認ください。'},400);
  if(/[\r\n]/.test(name))return json({error:'お名前をご確認ください。'},400);
  if(!enabled(env))return json({error:'現在、フォームの送信受付を停止しています。お電話でお問い合わせください。'},503);
  if(!data.token)return json({error:'認証を完了してから再度お試しください。'},400);
  const key=request.headers.get('Idempotency-Key');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key||''))return json({error:'ページを再読み込みしてお試しください。'},400);
  try{
    const verified=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.token,remoteip:request.headers.get('CF-Connecting-IP')}),signal:AbortSignal.timeout(8000)});
    if(!verified.ok)return json({error:'認証を確認できませんでした。再度お試しください。'},502);
    const result=await verified.json();
    if(!result.success||result.hostname!==new URL(request.url).hostname||result.action!=='contact')return json({error:'認証に失敗しました。認証後、再度お試しください。'},400);
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`clockless-contact-${key}`},body:JSON.stringify({from:env.CONTACT_FROM,to:[env.CONTACT_TO],reply_to:email,subject:`【CLOCKLESS】${topics[data.topic]}`,text:`お問い合わせ種別：${topics[data.topic]}\nお名前：${name}\nふりがな：${data.kana||'未記入'}\nメール：${email}\n電話：${data.phone||'未記入'}\n住所：${data.address||'未記入'}\n\nお問い合わせ内容：\n${message}\n\n個人情報の取り扱いへの同意：あり`}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)return json({error:'送信を完了できませんでした。同じ内容で再度お試しください。'},502);
    const sent=await response.json();
    if(!sent.id)return json({error:'送信結果を確認できませんでした。再度お試しください。'},502);
    return json({ok:true});
  }catch{return json({error:'送信結果を確認できませんでした。同じ内容で再度お試しください。'},502);}
}
export async function onRequest(context){if(context.request.method==='GET')return onRequestGet(context);if(context.request.method==='POST')return onRequestPost(context);return json({error:'Method not allowed'},405);}
