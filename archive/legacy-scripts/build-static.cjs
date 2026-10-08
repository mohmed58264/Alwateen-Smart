const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'deploy', 'site');
const files = [
  ['public/index.html', 'index.html'],
  ['public/assets/css/styles.css', 'assets/css/styles.css'],
  ['public/assets/js/app.js', 'assets/js/app.js'],
  ['public/assets/images/logo.jpeg', 'assets/images/logo.jpeg'],
  ['public/assets/images/commercial-registration.png', 'assets/images/commercial-registration.png'],
  ['data/office.json', 'data/office.json']
];
fs.mkdirSync(output, {recursive:true});
for(const [source, destination] of files) {
  const target = path.join(output, destination);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.copyFileSync(path.join(root,source),target);
}
const services = JSON.parse(fs.readFileSync(path.join(root,'data/services.json'),'utf8'));
fs.writeFileSync(path.join(output,'data/services.json'),JSON.stringify(services.map(category=>({...category,rows:category.rows.filter(row=>row.enabled!==false)})),null,2));
let js=fs.readFileSync(path.join(output,'assets/js/app.js'),'utf8');
js=js.replace('تعذر تحميل البيانات. شغّل المشروع بالأمر node server.cjs.','تعذر تحميل الخدمات. يرجى تحديث الصفحة والمحاولة مجددًا.');
fs.writeFileSync(path.join(output,'assets/js/app.js'),js);
console.log('Static upload files: deploy/site');
