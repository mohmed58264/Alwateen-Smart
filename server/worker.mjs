import {authenticated,login,logoutCookie,sameOrigin} from './auth.mjs';
import {validateCatalog,toWorkbook,fromWorkbook,workbookType} from './catalog.mjs';
import {loginPage,adminPage,adminScript,styles} from './pages.mjs';

const FILE='services.xlsx';
const publicFiles=new Set(['/','/index.html','/assets/css/styles.css','/assets/js/app.js','/assets/images/logo.jpeg','/assets/images/commercial-registration.png']);
const response=(body,status=200,type='text/html; charset=utf-8',extra={})=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...extra}});
const json=(body,status=200)=>response(JSON.stringify(body),status,'application/json; charset=utf-8');
const redirect=(url,cookie)=>response(null,303,'text/plain',{Location:url,...(cookie?{'Set-Cookie':cookie}:{})});
async function boundedBody(request,max){
  if(Number(request.headers.get('Content-Length'))>max)throw Error('حجم الطلب أكبر من المسموح.');
  if(!request.body)return new Uint8Array();const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('حجم الطلب أكبر من المسموح.');}chunks.push(value);}
  const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
}
async function initial(request,env){
  const asset=await env.ASSETS.fetch(new Request(new URL('/data/site-data.js',request.url)));
  if(!asset.ok)throw Error('Missing seed');
  const text=await asset.text();const seed=JSON.parse(text.replace(/^\s*window\.ALWATEEN_DATA\s*=\s*/,'').replace(/;\s*$/,''));
  return {...seed,services:validateCatalog(seed.services,seed)};
}
async function current(env,seed){
  if(!env.CATALOG_FILES)throw Error('Missing storage');
  const object=await env.CATALOG_FILES.get(FILE);
  return object?{services:await fromWorkbook(await object.arrayBuffer(),seed),version:object.etag}:{services:seed.services,version:'initial'};
}
async function handle(request,env){
  const path=new URL(request.url).pathname;
  const method=request.method;
  if(path==='/admin/style.css' && method==='GET')return response(styles,200,'text/css; charset=utf-8');
  if(path==='/admin/login'){
    if(method==='GET')return await authenticated(request,env)?redirect('/admin'):response(loginPage());
    if(method!=='POST')return response('Method not allowed',405);
    if(!sameOrigin(request))return response(loginPage('طلب غير مسموح.'),403);
    const bytes=await boundedBody(request,4096);
    const result=await login(new Request(request.url,{method:'POST',headers:request.headers,body:bytes}),env);
    return result.cookie?redirect('/admin',result.cookie):response(loginPage(result.error),result.status);
  }
  if(path==='/admin' || path.startsWith('/admin/')){
    if(!await authenticated(request,env))return method==='GET' && (path==='/admin'||path==='/admin/')?redirect('/admin/login'):json({error:'يلزم تسجيل الدخول.'},401);
    if(!['GET','HEAD'].includes(method) && !sameOrigin(request))return json({error:'طلب من مصدر غير مسموح.'},403);
    if(path==='/admin/logout' && method==='POST')return redirect('/admin/login',logoutCookie);
    if((path==='/admin'||path==='/admin/') && method==='GET')return response(adminPage);
    if(path==='/admin/app.js' && method==='GET')return response(adminScript,200,'text/javascript; charset=utf-8');
    if(!env.CATALOG_FILES)return json({error:'اربط مساحة ملفات R2 قبل تعديل الخدمات.'},503);
    const seed=await initial(request,env);
    if(path==='/admin/catalog' && method==='GET')return json(await current(env,seed));
    if(path==='/admin/download' && method==='GET')return response(toWorkbook((await current(env,seed)).services),200,workbookType,{'Content-Disposition':'attachment; filename="services.xlsx"'});
    if(!['PUT','POST'].includes(method))return json({error:'المسار غير موجود.'},404);
    if(request.headers.get('X-Requested-With')!=='office-admin')return json({error:'طلب غير صالح.'},403);
    if(path==='/admin/preview' && method==='POST'){
      try{return json({services:await fromWorkbook((await boundedBody(request,512*1024)).buffer,seed)});}catch{return json({error:'ملف Excel غير صالح. استخدم القالب الأصلي، وراجع الأسعار والأقسام والحالات، ولا تستخدم صيغًا حسابية.'},400);}
    }
    if(path==='/admin/catalog' && method==='PUT'){
      let services;
      try{
        if(request.headers.get('Content-Type')!=='application/json')throw Error('نوع الطلب غير صالح.');
        const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,1024*1024)));
        services=validateCatalog(body.services,seed);
      }catch(e){return json({error:e instanceof SyntaxError?'صيغة الطلب غير صالحة.':e.message},400);}
      const match=request.headers.get('If-Match');
      if(!match || (match!=='initial'&&!/^[a-f0-9]{32}$/.test(match)))return json({error:'نسخة الملف غير صالحة. أعد تحميل الإدارة.'},400);
      const saved=await env.CATALOG_FILES.put(FILE,toWorkbook(services),{onlyIf:match==='initial'?{etagDoesNotMatch:'*'}:{etagMatches:match},httpMetadata:{contentType:workbookType}});
      if(!saved)return json({error:'تم تعديل الأسعار من جلسة أخرى. نزّل نسخة من تغييراتك قبل إعادة تحميل الصفحة ومراجعة أحدث الأسعار.'},409);
      return json({services,version:saved.etag});
    }
    return json({error:'المسار غير موجود.'},404);
  }
  if(method!=='GET' && method!=='HEAD')return response('Method not allowed',405);
  if(path==='/data/site-data.js'){
    const seed=await initial(request,env);
    const data=env.CATALOG_FILES?await current(env,seed):{services:seed.services};
    const publicCatalog=data.services.map(c=>({...c,rows:c.rows.filter(r=>r.enabled!==false)}));
    return response(method==='HEAD'?null:`window.ALWATEEN_DATA = ${JSON.stringify({office:seed.office,services:publicCatalog}).replace(/</g,'\\u003c')};`,200,'text/javascript; charset=utf-8');
  }
  if(publicFiles.has(path))return env.ASSETS.fetch(request);
  return response('الصفحة غير موجودة.',404);
}
export default {
  async fetch(request,env){
    let result;
    try{result=await handle(request,env);}catch{result=json({error:'تعذر إكمال الطلب. تحقق من إعدادات التخزين ثم حاول مجددًا.'},503);}
    const headers=new Headers(result.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('X-Frame-Options','DENY');
    headers.set('Strict-Transport-Security','max-age=31536000');
    if(new URL(request.url).pathname.startsWith('/admin')){
      headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
      headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');
    }
    return new Response(result.body,{status:result.status,headers});
  }
};
