import services from '../data/services.json' with {type:'json'};
import office from '../data/office.json' with {type:'json'};

const STATE_KEY = 'site/state.json';
const TTL = 8 * 60 * 60;
const encoder = new TextEncoder();
function response(body,status=200,extra={}) {
  return new Response(body,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin',...extra}});
}
const redirect=(location,headers={})=>response('',303,{Location:location,...headers});
const json=value=>response(JSON.stringify(value),200,{'Content-Type':'application/json; charset=utf-8'});
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function token(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function cookieToken(request){return(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('alwateen_session='))?.slice(17);}
function cookie(request,value,maxAge){return `alwateen_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
async function authenticated(request,env){
  const value=cookieToken(request);if(!value||!/^[a-f0-9]{64}$/.test(value)||!env.ADMIN_PASSWORD)return false;
  const object=await env.FILES.get('sessions/'+await hash(value)+'.json');if(!object)return false;
  const session=await object.json();return session.expires>Date.now() && equal(session.version,await hash(env.ADMIN_PASSWORD));
}
async function readState(env){const object=await env.FILES.get(STATE_KEY);return object?{state:await object.json(),etag:object.etag}:{state:{services,office},etag:null};}
function validPrice(value){if(typeof value!=='string'||!/^\d+(\.\d{1,2})?(–\d+(\.\d{1,2})?)?$/.test(value))return false;const numbers=value.split('–').map(Number);return numbers.every(Number.isFinite)&&(numbers.length===1||numbers[1]>=numbers[0]);}
function validate(payload){
  if(!payload||!Array.isArray(payload.services)||!payload.services.length||payload.services.length>100||!payload.office||typeof payload.office!=='object')throw Error('بيانات غير صالحة');
  const categoryIds=new Set(),rowIds=new Set();let total=0;
  for(const category of payload.services){
    if(!category||typeof category.id!=='string'||!category.id||categoryIds.has(category.id)||typeof category.title!=='string'||category.title.length>200||typeof category.icon!=='string'||typeof category.group!=='string'||!Array.isArray(category.rows))throw Error('قسم غير صالح');
    categoryIds.add(category.id);
    for(const row of category.rows){
      if(!row||typeof row.id!=='string'||!row.id||rowIds.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>180||!validPrice(row.price)||(row.enabled!==undefined&&typeof row.enabled!=='boolean'))throw Error('خدمة أو سعر غير صالح');
      rowIds.add(row.id);if(++total>10000)throw Error('عدد الخدمات كبير');
    }
  }
  for(const key of ['name','phone','iban','email','address','addressShort'])if(typeof payload.office[key]!=='string'||payload.office[key].length>500)throw Error('بيانات المكتب غير صالحة');
  if(payload.office.unifiedNumber!==undefined&&!/^\d{10}$/.test(payload.office.unifiedNumber))throw Error('رقم موحد غير صالح');
}
async function limitedBody(request,max){
  const reader=request.body?.getReader();if(!reader)return '';
  const chunks=[];let length=0;
  while(true){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw Error('حجم البيانات كبير');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
async function serveAsset(request,env,path){
  const url=new URL(request.url);url.pathname=path;
  const asset=await env.ASSETS.fetch(new Request(url,request));
  const result=new Response(asset.body,asset);result.headers.set('X-Content-Type-Options','nosniff');result.headers.set('X-Frame-Options','SAMEORIGIN');
  if(['/admin.html','/login.html','/assets/js/admin.js'].includes(path))result.headers.set('Cache-Control','no-store');
  return result;
}
export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url),path=url.pathname;
      const protectedPath=['/admin','/admin/','/admin.html','/assets/js/admin.js','/api/save'].includes(path);
      if(!env.FILES)return response('لم يتم ربط مخزن R2 بالمشروع.',503);
      if(protectedPath&&!await authenticated(request,env))return path.startsWith('/api/')||path.startsWith('/assets/')?response('سجّل الدخول للإدارة.',401):redirect('/login');
      if(['/login','/logout','/api/save'].includes(path)&&request.method==='POST'){
        if(request.headers.get('Origin')!==url.origin)return response('Origin rejected',403);
        if(path==='/logout'){
          const value=cookieToken(request);if(value&&/^[a-f0-9]{64}$/.test(value))await env.FILES.delete('sessions/'+await hash(value)+'.json');
          return redirect('/login',{'Set-Cookie':cookie(request,'',0)});
        }
        if(path==='/login'){
          if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<12)return response('يجب إعداد سر ADMIN_PASSWORD بكلمة مرور من 12 حرفًا على الأقل.',503);
          const ip=request.headers.get('CF-Connecting-IP')||'local';
          const key='login-attempts/'+await hash(ip)+'.json';
          const object=await env.FILES.get(key),entry=object?await object.json():null,now=Date.now();
          if(entry&&entry.until>now&&entry.count>=10)return response('محاولات كثيرة. حاول بعد خمس دقائق.',429,{'Retry-After':'300'});
          const form=new URLSearchParams(await limitedBody(request,4096));const password=form.get('password')||'';
          const ok=password.length<=256&&form.get('username')==='admin'&&equal(await hash(password),await hash(env.ADMIN_PASSWORD));
          if(!ok){await env.FILES.put(key,JSON.stringify({count:entry&&entry.until>now?entry.count+1:1,until:entry&&entry.until>now?entry.until:now+300000}));return redirect('/login?error=1');}
          await env.FILES.delete(key);const value=token();await env.FILES.put('sessions/'+await hash(value)+'.json',JSON.stringify({expires:now+TTL*1000,version:await hash(env.ADMIN_PASSWORD)}));
          return redirect('/admin',{'Set-Cookie':cookie(request,value,TTL)});
        }
        const payload=JSON.parse(await limitedBody(request,2_000_000));validate(payload);
        const current=await readState(env);
        if(request.headers.get('X-Data-Revision')!==(current.etag||'initial'))return response('تم تحديث البيانات من نافذة أخرى. حدّث صفحة الإدارة قبل الحفظ.',409);
        const saved=await env.FILES.put(STATE_KEY,JSON.stringify(payload),{httpMetadata:{contentType:'application/json'},onlyIf:current.etag?{etagMatches:current.etag}:{etagDoesNotMatch:'*'}});
        if(!saved)return response('تم تحديث البيانات من نافذة أخرى. حدّث صفحة الإدارة.',409);
        return response(JSON.stringify({saved:true}),200,{'Content-Type':'application/json','X-Data-Revision':saved.etag});
      }
      if(request.method!=='GET'&&request.method!=='HEAD')return response('Method not allowed',405);
      if(path==='/api/state'){const current=await readState(env);const result=json(current.state);result.headers.set('X-Data-Revision',current.etag||'initial');return result;}
      if(path==='/data/services.json'||path==='/data/office.json'){const current=await readState(env);return json(path.endsWith('services.json')?current.state.services:current.state.office);}
      if(path==='/admin'||path==='/admin/')return serveAsset(request,env,'/admin.html');
      if(path==='/login')return serveAsset(request,env,'/login.html');
      if(path==='/'||path==='/index.html')return serveAsset(request,env,'/index.html');
      if(path==='/admin.html'||path==='/login.html'||path.startsWith('/assets/'))return serveAsset(request,env,path);
      return response('Not found',404);
    }catch(error){console.error(error);return response(error instanceof SyntaxError?'بيانات غير صالحة':error.message,400);}
  }
};
