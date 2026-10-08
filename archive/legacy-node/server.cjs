const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {authorize,login,logout} = require('./server/admin-auth.cjs');
const root = __dirname;
const port = Number(process.env.PORT || 4180);
let saveQueue = Promise.resolve();
const routes = new Map([
  ['/', ['public/index.html', 'text/html']], ['/index.html', ['public/index.html', 'text/html']],
  ['/login', ['public/login.html', 'text/html']],
  ['/admin', ['public/admin.html', 'text/html']], ['/admin.html', ['public/admin.html', 'text/html']],
  ['/assets/js/admin.js', ['public/assets/js/admin.js', 'text/javascript']],
  ['/assets/css/styles.css', ['public/assets/css/styles.css', 'text/css']],
  ['/assets/js/app.js', ['public/assets/js/app.js', 'text/javascript']],
  ['/assets/images/logo.jpeg', ['public/assets/images/logo.jpeg', 'image/jpeg']],
  ['/assets/images/commercial-registration.png', ['public/assets/images/commercial-registration.png', 'image/png']],
  ['/data/services.json', ['data/services.json', 'application/json']],
  ['/data/office.json', ['data/office.json', 'application/json']]
]);
function validPrice(price) {
  if(typeof price !== 'string' || !/^\d+(\.\d{1,2})?(–\d+(\.\d{1,2})?)?$/.test(price)) return false;
  const values = price.split('–').map(Number);
  return values.every(Number.isFinite) && (values.length === 1 || values[1] >= values[0]);
}
function validate(payload) {
  if(!payload || !Array.isArray(payload.services) || !payload.services.length || !payload.office || typeof payload.office !== 'object') throw Error('بيانات غير صالحة');
  const ids = new Set();
  for(const category of payload.services) {
    if(!category || typeof category.id !== 'string' || typeof category.title !== 'string' || !Array.isArray(category.rows)) throw Error('قسم غير صالح');
    for(const row of category.rows) {
      if(row.enabled !== undefined && typeof row.enabled !== 'boolean') throw Error('حالة الخدمة غير صالحة');
      if(!row || typeof row.id !== 'string' || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 180 || !validPrice(row.price)) throw Error('خدمة أو سعر غير صالح');
      ids.add(row.id);
    }
  }
  for(const key of ['name','phone','iban','email','address','addressShort']) if(typeof payload.office[key] !== 'string' || payload.office[key].length > 500) throw Error('بيانات المكتب غير صالحة');
}
async function save(payload) {
  validate(payload);
  const serviceFile = path.join(root,'data/services.json');
  const officeFile = path.join(root,'data/office.json');
  await fs.mkdir(path.join(root,'backups'),{recursive:true});
  await Promise.all([fs.copyFile(serviceFile,path.join(root,'backups/services.previous.json')),fs.copyFile(officeFile,path.join(root,'backups/office.previous.json'))]);
  await fs.writeFile(serviceFile+'.tmp',JSON.stringify(payload.services,null,2)+'\n');
  await fs.writeFile(officeFile+'.tmp',JSON.stringify(payload.office,null,2)+'\n');
  await fs.rename(serviceFile+'.tmp',serviceFile);
  await fs.rename(officeFile+'.tmp',officeFile);
}
http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  try {
    const url = new URL(req.url,'http://127.0.0.1:'+port);
    if(['/login','/logout'].includes(url.pathname) && req.method === 'POST') {
      if(req.headers.origin !== (process.env.PUBLIC_ORIGIN || 'http://'+req.headers.host)){res.writeHead(403);res.end('Origin rejected');return;}
      if(url.pathname === '/logout'){logout(req,res);return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)throw Error('Invalid login');}
      const form=new URLSearchParams(body);login(req,res,form.get('username'),form.get('password'));return;
    }
    if(['/admin','/admin.html','/assets/js/admin.js','/api/save'].includes(url.pathname) && !authorize(req,res))return;
    if(url.pathname === '/api/save' && req.method === 'POST') {
      const expected = process.env.PUBLIC_ORIGIN || 'http://'+req.headers.host;
      if(req.headers.origin !== expected) {res.writeHead(403);res.end('Origin rejected');return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2_000_000)throw Error('حجم البيانات كبير');}
      const payload=JSON.parse(body);
      const job=saveQueue.then(()=>save(payload));saveQueue=job.catch(()=>{});await job;
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end('{"saved":true}');return;
    }
    const file=routes.get(url.pathname);
    if(req.method !== 'GET' || !file){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8'});res.end(await fs.readFile(path.join(root,file[0])));
  }catch(error){res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.message);}
}).listen(port,'127.0.0.1',()=>console.log('الوتين الذكي: http://127.0.0.1:'+port));
