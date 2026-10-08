import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

function environment(){
  const objects=new Map();let revision=0;
  return {ADMIN_PASSWORD:'test-password-12345',ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)},FILES:{
    async get(key){const item=objects.get(key);return item?{etag:item.etag,json:async()=>JSON.parse(item.value)}:null;},
    async put(key,value,options={}){const item=objects.get(key);if(options.onlyIf?.etagMatches&&item?.etag!==options.onlyIf.etagMatches)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&item)return null;const etag=String(++revision);objects.set(key,{value,etag});return{etag};},
    async delete(key){objects.delete(key);}
  }};
}
const request=(path,options={})=>new Request('https://site.example'+path,options);
test('admin assets and writes require login; public page has no auth challenge',async()=>{
  const env=environment();
  assert.equal((await worker.fetch(request('/admin.html'),env)).status,303);
  assert.equal((await worker.fetch(request('/assets/js/admin.js'),env)).status,401);
  assert.equal((await worker.fetch(request('/api/save',{method:'POST'}),env)).status,401);
  assert.equal((await worker.fetch(request('/'),env)).status,200);
});
test('login, persistent save, stale revision, hostile origin and logout',async()=>{
  const env=environment();
  const login=await worker.fetch(request('/login',{method:'POST',headers:{Origin:'https://site.example'},body:new URLSearchParams({username:'admin',password:env.ADMIN_PASSWORD})}),env);
  assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('Secure'));
  const cookieValue=cookie.split(';')[0];
  const first=await worker.fetch(request('/api/state'),env);const data=await first.json();data.services[0].rows[0].price='77';
  const saveOptions={method:'POST',headers:{Origin:'https://site.example',Cookie:cookieValue,'X-Data-Revision':'initial'},body:JSON.stringify(data)};
  const saved=await worker.fetch(request('/api/save',saveOptions),env);assert.equal(saved.status,200);
  assert.equal((await(await worker.fetch(request('/api/state'),env)).json()).services[0].rows[0].price,'77');
  assert.equal((await worker.fetch(request('/api/save',saveOptions),env)).status,409);
  assert.equal((await worker.fetch(request('/api/save',{...saveOptions,headers:{...saveOptions.headers,Origin:'https://other.example'}}),env)).status,403);
  await worker.fetch(request('/logout',{method:'POST',headers:{Cookie:cookieValue,Origin:'https://site.example'}}),env);
  assert.equal((await worker.fetch(request('/api/save',saveOptions),env)).status,401);
});
test('incorrect login is bounded and creates no session',async()=>{
  const env=environment();
  for(let i=0;i<10;i++)assert.equal((await worker.fetch(request('/login',{method:'POST',headers:{Origin:'https://site.example'},body:'username=admin&password=wrong'}),env)).status,303);
  assert.equal((await worker.fetch(request('/login',{method:'POST',headers:{Origin:'https://site.example'},body:'username=admin&password=wrong'}),env)).status,429);
});
