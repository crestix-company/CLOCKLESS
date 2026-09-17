const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('#mobile-nav');
function closeMenu(){if(!menuButton)return;menuButton.setAttribute('aria-expanded','false');menuButton.querySelector('.sr-only').textContent='メニューを開く';mobileNav.hidden=true;}
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));menuButton.querySelector('.sr-only').textContent=open?'メニューを開く':'メニューを閉じる';mobileNav.hidden=open;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuButton?.getAttribute('aria-expanded')==='true'){closeMenu();menuButton.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
matchMedia('(min-width:981px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});
  document.querySelectorAll('.value-row,.style-grid,.team-feature,.staff-grid,.learning-steps>article').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
}
const form=document.querySelector('#contact-form');
if(form){
  const status=document.querySelector('#form-status'), submit=form.querySelector('[type=submit]'), review=form.querySelector('.form-review'),edit=document.querySelector('#edit-form');
  const topic=new URLSearchParams(location.search).get('topic');
  if(['recruit','lesson','cafe'].includes(topic))form.elements.topic.value=topic;
  let confirmed=false,sending=false,ready=false,widget,token='',idempotency=crypto.randomUUID();
  const notice=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
  const resetReview=()=>{confirmed=false;review.hidden=true;edit.hidden=true;submit.textContent='入力内容を確認する →';};
  form.addEventListener('input',()=>{if(!sending){resetReview();idempotency=crypto.randomUUID();}});
  edit.addEventListener('click',()=>{resetReview();form.elements.name.focus();});
  async function setup(){
    if(form.dataset.previewOnly==='true')return;
    try{
      const response=await fetch(form.action,{headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('unavailable');
      const config=await response.json();
      if(!config.enabled||!config.siteKey)throw new Error('unavailable');
      const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
      script.onload=()=>{widget=window.turnstile.render('#challenge',{sitekey:config.siteKey,action:'contact',callback:value=>{token=value;ready=true;notice('');},'expired-callback':()=>{token='';ready=false;},'error-callback':()=>{token='';ready=false;notice('認証を読み込めませんでした。再読み込みするか、お電話でご連絡ください。',true);}});};
      script.onerror=()=>notice('認証を読み込めませんでした。再読み込みするか、お電話でご連絡ください。',true);
      document.head.append(script);
    }catch{notice('現在、フォームの送信受付を停止しています。お手数ですが、お電話（0270-75-5330）でお問い合わせください。',true);}
  }
  setup();
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(form.dataset.previewOnly==='true'||sending||!form.reportValidity())return;
    if(!confirmed){
      const labels={topic:'お問い合わせ種別',name:'お名前',kana:'ふりがな',email:'メールアドレス',phone:'電話番号',address:'ご住所',message:'お問い合わせ内容'};
      const dl=review.querySelector('dl');dl.replaceChildren();
      for(const [key,label]of Object.entries(labels)){const value=key==='topic'?form.elements.topic.selectedOptions[0].textContent:form.elements[key].value.trim();if(!value)continue;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);dl.append(row);}
      confirmed=true;review.hidden=false;edit.hidden=false;submit.textContent='この内容で送信する →';review.focus();return;
    }
    if(!ready||!token){notice('現在送信できません。認証の完了後に再度お試しください。解決しない場合は、お電話（0270-75-5330）でご連絡ください。',true);return;}
    sending=true;submit.disabled=true;edit.disabled=true;notice('送信しています…');
    try{
      const payload=Object.fromEntries(new FormData(form));payload.consent=form.elements.consent.checked;payload.token=token;
      const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(!response.ok||result.ok!==true)throw new Error(result.error||'送信できませんでした。');
      form.reset();resetReview();idempotency=crypto.randomUUID();notice('お問い合わせを受け付けました。内容を確認し、ご連絡いたします。ご予約はこの送信では確定しません。');
    }catch(error){notice((error.name==='TimeoutError'?'送信結果を確認できませんでした。同じ内容で再度お試しいただけます。':error.message)+' お急ぎの場合はお電話でご連絡ください。',true);}
    finally{sending=false;submit.disabled=false;edit.disabled=false;token='';ready=false;if(widget!==undefined)window.turnstile.reset(widget);}
  });
}
