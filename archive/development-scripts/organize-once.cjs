const fs=require('fs'),path=require('path');const root=process.cwd();
function target(relative){const p=path.resolve(root,relative);if(!p.startsWith(root+path.sep))throw Error('Path outside project');return p;}
function move(from,to){const source=target(from),destination=target(to);if(!fs.existsSync(source))return;fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination);}
for(const page of ['index.html','admin.html','login.html'])move(page,'public/'+page);
for(const file of ['app.js','admin.js'])move('assets/'+file,'public/assets/js/'+file);
move('assets/styles.css','public/assets/css/styles.css');move('assets/logo.jpeg','public/assets/images/logo.jpeg');
for(const filename of fs.readdirSync(root)){if(filename.endsWith('.png'))move(filename,'docs/previews/'+filename);if(filename.startsWith('.')&&filename.endsWith('.cjs'))move(filename,'archive/development-scripts/'+filename);}
move('index.before-catalog.html','backups/pages/index.before-catalog.html');move('index.before-service-editor.html','backups/pages/index.before-service-editor.html');move('backups/index-before-split.html','backups/pages/index-before-split.html');move('catalog-extra.txt','archive/catalog-extra.txt');move('admin-auth.cjs','server/admin-auth.cjs');move('set-admin-password.cjs','scripts/set-admin-password.cjs');
let server=fs.readFileSync('server.cjs','utf8').replace("require('./admin-auth.cjs')","require('./server/admin-auth.cjs')");
for(const page of ['index.html','admin.html','login.html'])server=server.replaceAll("['"+page+"', 'text/html']","['public/"+page+"', 'text/html']");
for(const [old,updated]of [['styles.css','css/styles.css'],['app.js','js/app.js'],['admin.js','js/admin.js'],['logo.jpeg','images/logo.jpeg']]){server=server.replaceAll('/assets/'+old,'/assets/'+updated).replaceAll("['assets/"+old+"'","['public/assets/"+updated+"'");}
fs.writeFileSync('server.cjs',server);
for(const page of ['index.html','admin.html','login.html']){let text=fs.readFileSync('public/'+page,'utf8');for(const [old,updated]of [['styles.css','css/styles.css'],['app.js','js/app.js'],['admin.js','js/admin.js'],['logo.jpeg','images/logo.jpeg']])text=text.replaceAll('/assets/'+old,'/assets/'+updated);fs.writeFileSync('public/'+page,text);}
let auth=fs.readFileSync('server/admin-auth.cjs','utf8').replace("path.join(__dirname,'.private')","path.join(__dirname,'..','.private')");fs.writeFileSync('server/admin-auth.cjs',auth);let setup=fs.readFileSync('scripts/set-admin-password.cjs','utf8').replace("require('./admin-auth.cjs')","require('../server/admin-auth.cjs')");fs.writeFileSync('scripts/set-admin-password.cjs',setup);
if(fs.existsSync('assets')&&fs.readdirSync('assets').length===0)fs.rmdirSync('assets');
console.log('Project organized; credentials and data preserved');
