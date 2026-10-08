const encoder = new TextEncoder();
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unbase64 = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
async function equal(a,b) {
  const x=await digest(a),y=await digest(b);let mismatch=0;
  for(let i=0;i<x.length;i++) mismatch |= x[i]^y[i];
  return mismatch===0;
}
function configured(env) {
  return typeof env.ADMIN_USERNAME==='string' && env.ADMIN_USERNAME.length>0 && typeof env.ADMIN_PASSWORD==='string' && env.ADMIN_PASSWORD.length>=16 && typeof env.SESSION_SECRET==='string' && env.SESSION_SECRET.length>=32 && !!env.LOGIN_LIMITER;
}
async function key(env) {
  // Rotating either credential invalidates existing sessions.
  return crypto.subtle.importKey('raw',await digest(JSON.stringify([env.SESSION_SECRET,env.ADMIN_USERNAME,env.ADMIN_PASSWORD])),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function authenticated(request,env) {
  if(!configured(env)) return false;
  try {
    const token=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-office='))?.slice(14);
    if(!token || token.length>2000) return false;
    const [payload,signature,...extra]=token.split('.');
    if(extra.length || !signature) return false;
    if(!await crypto.subtle.verify('HMAC',await key(env),unbase64(signature),encoder.encode(payload))) return false;
    const session=JSON.parse(new TextDecoder().decode(unbase64(payload)));
    const now=Math.floor(Date.now()/1000);
    return session.user===env.ADMIN_USERNAME && session.exp>now && session.exp<=now+3600;
  } catch {return false;}
}
export function sameOrigin(request) {
  return request.headers.get('Origin')===new URL(request.url).origin && request.headers.get('Sec-Fetch-Site')!=='cross-site';
}
export async function login(request,env) {
  if(!configured(env)) return {status:503,error:'دخول الإدارة غير مهيأ بعد. أكمل إعدادات Cloudflare.'};
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  if(!(await env.LOGIN_LIMITER.limit({key:ip})).success) return {status:429,error:'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.'};
  const form=await request.formData();
  const user=String(form.get('username')||''),password=String(form.get('password')||'');
  const userOk=await equal(user,env.ADMIN_USERNAME),passwordOk=await equal(password,env.ADMIN_PASSWORD);
  if(!userOk || !passwordOk) return {status:401,error:'اسم المستخدم أو كلمة المرور غير صحيحة.'};
  const payload=base64(encoder.encode(JSON.stringify({user:env.ADMIN_USERNAME,exp:Math.floor(Date.now()/1000)+3600,nonce:crypto.randomUUID()})));
  const signature=base64(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(payload)));
  return {cookie:`__Host-office=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`};
}
export const logoutCookie='__Host-office=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
