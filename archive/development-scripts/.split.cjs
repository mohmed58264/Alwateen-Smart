const fs=require('fs');fs.mkdirSync('assets',{recursive:true});fs.mkdirSync('data',{recursive:true});fs.mkdirSync('backups',{recursive:true});let html=fs.readFileSync('index.html','utf8');fs.writeFileSync('backups/index-before-split.html',html);
const catalog=JSON.parse(html.match(/<script type="application\/json" id="catalog-data">([\s\S]*?)<\/script>/)[1]);const settings=JSON.parse(html.match(/<script type="application\/json" id="office-state">([\s\S]*?)<\/script>/)[1]);fs.writeFileSync('data/services.json',JSON.stringify(catalog,null,2));fs.writeFileSync('data/office.json',JSON.stringify(settings.office,null,2));
fs.copyFileSync('C:/Users/jamms/Downloads/WhatsApp Image 2026-10-05 at 6.06.32 AM.jpeg','assets/logo.jpeg');html=html.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g,'/assets/logo.jpeg');const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];fs.writeFileSync('assets/styles.css',css);html=html.replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="/assets/styles.css">');
let js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
js=js.replace(/const catalog = JSON.parse\(document.getElementById\('catalog-data'\).textContent\);[\s\S]*?const escapeHtml =/,`const catalog = initialCatalog;
const officeState = {prices:{},office:initialOffice,additions:[]};
const escapeHtml =`);
js=js.replace(/function persist\(\)\{[^\n]+\}/,`async function persist(){
 try {
 const services=catalog.map(category=>({...category,rows:category.rows.map(row=>({...row,price:priceOf(row)}))}));
 const response=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({services,office:officeState.office})});
 if(!response.ok)throw new Error(await response.text());status('تم الحفظ في ملفات المشروع. يظهر التعديل بعد تحديث الصفحة على أي جهاز.');return true;
 }catch(error){status('تعذر الحفظ: '+error.message);return false;}
}`);
js=js.replace(/document.getElementById\('download-page'\).addEventListener[\s\S]*?\n\}\);/,'');
js=js.replace("settingsForm.addEventListener('submit',event=>{","settingsForm.addEventListener('submit',async event=>{");
js=js.replace('officeState.office={...officeState.office,phone,iban,','const previousOffice={...officeState.office};\n  officeState.office={...officeState.office,phone,iban,');
js=js.replace('officeState.office.addressShort=officeState.office.address;applyOffice();persist();','officeState.office.addressShort=officeState.office.address;if(await persist())applyOffice();else officeState.office=previousOffice;');
js=js.replace("document.getElementById('price-settings-form').addEventListener('submit',event=>", "document.getElementById('price-settings-form').addEventListener('submit',async event=>");
js=js.replace('officeState.prices[adminService.value]=price;const stored=persist();renderCatalog();','const oldPrice=officeState.prices[adminService.value];officeState.prices[adminService.value]=price;const stored=await persist();if(!stored){if(oldPrice===undefined)delete officeState.prices[adminService.value];else officeState.prices[adminService.value]=oldPrice;document.getElementById(\'price-admin-status\').textContent=\'تعذر حفظ السعر. لم يتغير سعر الخدمة.\';return;}renderCatalog();');
js=js.replace("document.getElementById('new-service-form').addEventListener('submit',event=>", "document.getElementById('new-service-form').addEventListener('submit',async event=>");
js=js.replace('officeState.additions.push({...row,categoryId:category.id});persist();','officeState.additions.push({...row,categoryId:category.id});if(!await persist()){category.rows.pop();officeState.additions.pop();document.getElementById(\'new-service-status\').textContent=\'تعذر حفظ الخدمة. حاول مرة أخرى.\';return;}');
js=js.replace(/catalogRoot.addEventListener\('change',[\s\S]*?\n\}\);/,'').replace(/catalogRoot.addEventListener\('input',[^\n]*\n/,'');
js=`(async()=>{try{const responses=await Promise.all([fetch('/data/services.json',{cache:'no-store'}),fetch('/data/office.json',{cache:'no-store'})]);if(responses.some(r=>!r.ok))throw Error('تعذر قراءة ملفات المشروع');const [initialCatalog,initialOffice]=await Promise.all(responses.map(r=>r.json()));\n`+js+`\n}catch(error){document.getElementById('catalog-result').textContent='تعذر تحميل البيانات. شغّل المشروع بالأمر node server.cjs. '+error.message;console.error(error);}})();`;
fs.writeFileSync('assets/app.js',js);html=html.replace(/<script[\s\S]*?<\/script>/g,'');html=html.replace('</body>','<script src="/assets/app.js" defer></script>\n</body>');
html=html.replace('التعديلات تُحفظ في هذا المتصفح. لتنقلها إلى جهاز آخر أو تنشرها، نزّل نسخة الصفحة بعد الحفظ واستبدل بها ملف index.html. هذه إعدادات محلية وليست لوحة إدارة محمية أو قاعدة بيانات مشتركة.','تُحفظ الأسعار والخدمات وبيانات المكتب مباشرة في ملفات المشروع، بدون قاعدة بيانات. تحديث الصفحة يعرض البيانات المحفوظة.');html=html.replace(/<button class="btn btn--line" type="button" id="download-page">[^<]*<\/button>/,'');
fs.writeFileSync('index.html',html);console.log('Split HTML, CSS, JS, logo and JSON data');
