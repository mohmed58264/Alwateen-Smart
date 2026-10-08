(async()=>{try{const initialResponse=await fetch('/api/state',{cache:'no-store'});if(!initialResponse.ok)throw Error('تعذر قراءة بيانات الموقع');let dataRevision=initialResponse.headers.get('X-Data-Revision')||'initial';const {services:initialCatalog,office:initialOffice}=await initialResponse.json();
/* ==========================================================
   2) بيانات المكتب — عدّل هنا فقط
   ========================================================== */
const CFG = {
  name:        "الوتين الذكي",
  tagline:     "تعقيب وإنجاز المعاملات الحكومية",
  phone: "",
  phoneText: "سيُضاف رقم الجوال قريبًا",
  whatsapp: "",
  email:       "alwateensmart@gmail.com",
  address:     "FHDF8448، 5806، حي التعاون، الهفوف (Al Hofuf) 36361",
  addressShort:"FHDF8448، 5806، حي التعاون، الهفوف (Al Hofuf) 36361",
  hours:       "الأحد – الخميس ٨:٠٠ ص – ٥:٠٠ م · السبت ٩:٠٠ ص – ٢:٠٠ م",
  cr:          "0000000000",
  vat:         "300000000000003",
  iban: "",
  sla:         "24 ساعة"
};

document.querySelectorAll("[data-cfg]").forEach(el=>{
  const v = CFG[el.dataset.cfg]; if(v) el.textContent = v;
});
document.querySelectorAll("[data-cfg-href]").forEach(el=>{
  const t = el.dataset.cfgHref;
  if(t==="tel")  el.href = "tel:" + CFG.phone;
  if(t==="mail") el.href = "mailto:" + CFG.email;
  if(t==="wa")   el.href = "https://wa.me/" + CFG.whatsapp;
});
document.getElementById("year").textContent = new Date().getFullYear();

/* ظهور العناصر + عدّاد الأرقام */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
  });
},{threshold:.15});
document.querySelectorAll(".rv").forEach((el,i)=>{
  el.style.transitionDelay = (i % 4) * 70 + "ms";
  io.observe(el);
});

const countIO = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, pre = el.dataset.prefix || "";
    countIO.unobserve(el);
    if(reduce){ el.textContent = pre + target.toLocaleString("en-US"); return; }
    const dur = 1300, t0 = performance.now();
    (function tick(t){
      const k = Math.min((t - t0)/dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + Math.round(target * eased).toLocaleString("en-US");
      if(k < 1) requestAnimationFrame(tick);
    })(t0);
  });
},{threshold:.6});
document.querySelectorAll("[data-count]").forEach(el=>countIO.observe(el));

/* شريط الجهات: تكرار المحتوى ليدور بلا فجوة */
const ents = document.getElementById("ents");
ents.innerHTML += ents.innerHTML;

/* شريط تقدم القراءة */
const bar = document.getElementById("progress");
addEventListener("scroll", ()=>{
  const h = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + "%";
}, {passive:true});

/* أكورديون: فتح واحد فقط */
document.querySelectorAll(".faq details").forEach(d=>{
  d.addEventListener("toggle", ()=>{
    if(d.open) document.querySelectorAll(".faq details").forEach(o=>{ if(o!==d) o.open=false; });
  });
});

/* إرسال النموذج عبر واتساب — بدون سيرفر */
function sendWhatsApp(e){
  e.preventDefault();
  const f = e.target;
  if (!CFG.whatsapp) {
    const message = `طلب خدمة جديد\nالاسم: ${f.elements.name.value}\nالجوال: ${f.elements.phone.value}\nالخدمة: ${f.elements.service.value}\nالتفاصيل: ${f.elements.note.value || "-"}`;
    location.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("طلب خدمة — الوتين الذكي") + "&body=" + encodeURIComponent(message);
    return false;
  }
  const msg =
    "طلب خدمة جديد%0A" +
    "الاسم: "    + encodeURIComponent(f.elements.name.value)    + "%0A" +
    "الجوال: "   + encodeURIComponent(f.elements.phone.value)   + "%0A" +
    "الخدمة: "   + encodeURIComponent(f.elements.service.value) + "%0A" +
    "التفاصيل: " + encodeURIComponent(f.elements.note.value || "-");
  window.open("https://wa.me/" + CFG.whatsapp + "?text=" + msg, "_blank", "noopener");
  return false;
}

/* إغلاق قائمة الجوال بعد الضغط */
document.querySelectorAll("#menu a").forEach(a=>{
  a.addEventListener("click", ()=> {
    document.getElementById("menu").classList.remove("open");
    document.querySelector(".burger").setAttribute("aria-expanded", "false");
  });
});

/* البحث وتصنيف الخدمات واختيارها في نموذج الطلب */
const serviceCards = [...document.querySelectorAll(".srv__item")];
const serviceGroups = ["individual", "individual", "business", "business", "business", "individual business"];
const serviceSelect = document.getElementById("s") || document.querySelector('[name="service"]');
serviceCards.forEach((card, index) => {
  card.dataset.group = serviceGroups[index];
  const link = document.createElement("a");
  link.className = "srv__link";
  link.href = "#contact";
  const title = card.querySelector("h3").textContent;
  link.setAttribute("aria-label", "اطلب خدمة " + title);
  link.innerHTML = '<span>اطلب هذه الخدمة</span><span aria-hidden="true">←</span>';
  link.addEventListener("click", () => {
    if (serviceSelect && serviceSelect.options[index]) serviceSelect.selectedIndex = index;
  });
  card.appendChild(link);
});
let activeServiceFilter = "all";
const normalizeSearch = text => text.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").toLowerCase();
function filterServices() {
  const query = normalizeSearch(document.getElementById("serviceSearch").value.trim());
  let visible = 0;
  serviceCards.forEach(card => {
    const matches = (activeServiceFilter === "all" || card.dataset.group.includes(activeServiceFilter)) && normalizeSearch(card.textContent).includes(query);
    card.hidden = !matches;
    if (matches) visible++;
  });
  document.getElementById("serviceEmpty").hidden = visible > 0;
}
document.getElementById("serviceSearch").addEventListener("input", filterServices);
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeServiceFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(other => {
      other.classList.toggle("active", other === button);
      other.setAttribute("aria-pressed", String(other === button));
    });
    filterServices();
  });
});


const catalog = initialCatalog;
const officeState = {prices:{},office:initialOffice,additions:[]};
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let editingPrices = false;
let selectedCategory = 'عقارات';
let audience = 'all';
const priceOf = row => officeState.prices[row.id] ?? row.price;
const catalogRoot = document.getElementById('catalog-panels');
function renderCatalog() {
  const query = normalizeSearch(document.getElementById('catalog-search').value.trim());
  let count = 0;
  catalogRoot.innerHTML = catalog.map((category,index) => {
    if(audience !== 'all' && !category.group.includes(audience)) return '';
    if(!query && selectedCategory !== 'all' && selectedCategory !== category.id) return '';
    const rows = category.rows.filter(row => !query || normalizeSearch(category.title+' '+row.name).includes(query));
    if(!rows.length) return '';
    count += rows.length;
    const color = ['#09876e','#507bd0','#9869c0','#ba832e'][index%4];
    return `<article class="fee-panel" style="--category-color:${color}" id="catalog-${escapeHtml(category.id)}"><div class="fee-panel__head"><span class="fee-icon" aria-hidden="true">${category.icon}</span><div><h3>${escapeHtml(category.title)}</h3><p>${category.id==='ري'?'خدمات المزارعين والمياه والري':category.id==='عقارات'?'للملاك والمكاتب العقارية — من الاستعلام حتى متابعة المعاملة':'خدمات '+escapeHtml(CFG.name)}</p></div><span class="fee-count">${rows.length} خدمة</span></div><table class="fee-table"><caption class="visually-hidden">${escapeHtml(category.title)} وأتعاب المكتب بالريال السعودي</caption><thead><tr><th scope="col">الخدمة</th><th scope="col">أتعاب المكتب</th><th scope="col"><span class="visually-hidden">طلب الخدمة</span></th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${escapeHtml(row.name)}</th><td>${editingPrices?`<input class="price-edit" data-price-id="${row.id}" aria-label="أتعاب ${escapeHtml(row.name)}" value="${escapeHtml(priceOf(row))}" dir="ltr" inputmode="decimal">`:`<span class="fee-amount" dir="ltr">${escapeHtml(priceOf(row))}</span>`} <span class="fee-currency">ريال</span></td><td><button type="button" class="fee-request" ${row.enabled===false?'disabled':''} data-order-id="${row.id}">اطلب الخدمة ←</button></td></tr>`).join('')}</tbody></table></article>`;
  }).join('');
  document.getElementById('catalog-result').textContent = count ? `${count} خدمة معروضة` : 'لا توجد خدمات مطابقة. جرّب كلمة أخرى.';
  document.querySelectorAll('[data-category]').forEach(button=>{
    const active=button.dataset.category===selectedCategory&&!query;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  });
}
document.getElementById('catalog-categories').innerHTML = `<button type="button" data-category="all">جميع الأقسام</button>`+catalog.map(category=>`<button type="button" data-category="${escapeHtml(category.id)}">${category.icon} ${escapeHtml(category.title)} <small>${category.rows.length}</small></button>`).join('');
const select = document.getElementById('s');
catalog.forEach(category=>{if(![...select.options].some(option=>option.value===category.title))select.add(new Option(category.title,category.title));});
document.getElementById('catalog-categories').addEventListener('click',event=>{
  const button=event.target.closest('[data-category]');if(!button)return;
  selectedCategory=button.dataset.category;document.getElementById('catalog-search').value='';renderCatalog();
});
document.getElementById('catalog-search').addEventListener('input',renderCatalog);
document.getElementById('catalog-audience').addEventListener('change',event=>{audience=event.target.value;selectedCategory='all';renderCatalog();});
catalogRoot.addEventListener('click',event=>{
  const button=event.target.closest('[data-order-id]');if(!button)return;
  const category=catalog.find(category=>category.rows.some(row=>row.id===button.dataset.orderId));
  const row=category.rows.find(row=>row.id===button.dataset.orderId);
  select.value=category.title;
  document.getElementById('d').value=`الخدمة: ${row.name}\nالمنصة: ${category.title}\nأتعاب المكتب: ${priceOf(row)} ريال\nتفاصيل الطلب: `;
  document.getElementById('contact').scrollIntoView({behavior:reduce?'auto':'smooth'});
});
const normalizePrice = value => value.trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[-–—]/g,'–').replace(/\s/g,'');
function validPrice(value) {
  if(!/^\d+(\.\d{1,2})?(–\d+(\.\d{1,2})?)?$/.test(value))return false;
  const numbers=value.split('–').map(Number);return numbers.length===1||numbers[1]>=numbers[0];
}
function status(message){document.getElementById('settings-status').textContent=message;}
async function persist(){
 try {
 const services=catalog.map(category=>({...category,rows:category.rows.map(row=>({...row,price:priceOf(row)}))}));
 const response=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','X-Data-Revision':dataRevision},body:JSON.stringify({services,office:officeState.office})});
 if(!response.ok)throw new Error(await response.text());dataRevision=response.headers.get('X-Data-Revision')||dataRevision;status('تم الحفظ على Cloudflare. يظهر التعديل للعملاء مباشرة.');return true;
 }catch(error){status('تعذر الحفظ: '+error.message);return false;}
}


function applyOffice(){
  Object.assign(CFG,officeState.office);
  const mapQuery = encodeURIComponent(CFG.address);
  document.getElementById('office-map-link').href = 'https://www.google.com/maps/search/?api=1&query=' + mapQuery;
  const mapPreview = document.getElementById('office-map-preview');
  const mapSource = 'https://maps.google.com/maps?q=' + mapQuery + '&output=embed';
  if (mapPreview.getAttribute('src') !== mapSource) mapPreview.src = mapSource;
  const phone=CFG.phone||'';
  CFG.whatsapp=phone.replace(/\D/g,'');CFG.phoneText=phone||'سيُضاف رقم الجوال قريبًا';
  document.querySelectorAll('[data-cfg]').forEach(el=>{el.textContent=CFG[el.dataset.cfg]|| (el.dataset.cfg==='iban'?'سيُضاف الآيبان قريبًا':'');});
  document.querySelectorAll('[data-cfg-href]').forEach(el=>{
    const type=el.dataset.cfgHref;
    if(type==='mail')el.href='mailto:'+CFG.email;
    if(type==='tel'){el.href=phone?'tel:'+phone:'#contact';}
    if(type==='wa'){
      el.href=phone?'https://wa.me/'+CFG.whatsapp:'mailto:'+CFG.email;
      if(!phone){el.removeAttribute('target');if(el.classList.contains('fab')){el.setAttribute('aria-label','التواصل بالبريد');el.querySelector('span').textContent='راسلنا';}else{el.textContent='تواصل عبر البريد';}}
      else{el.target='_blank';if(el.classList.contains('fab')){el.setAttribute('aria-label','واتساب');el.querySelector('span').textContent='واتساب';}else{el.textContent='تواصل عبر واتساب';}}
    }
  });
  document.querySelector('.contact__form button[type="submit"]').textContent=phone?'إرسال الطلب عبر واتساب':'إرسال الطلب عبر البريد';
}
const settingsForm=document.getElementById('office-settings-form');
['phone','iban','email','address'].forEach(key=>settingsForm.elements[key].value=officeState.office[key]||'');
settingsForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const phoneInput=settingsForm.elements.phone,ibanInput=settingsForm.elements.iban;
  let phone=phoneInput.value.replace(/[\s()-]/g,'');if(/^05\d{8}$/.test(phone))phone='+966'+phone.slice(1);if(/^9665\d{8}$/.test(phone))phone='+'+phone;
  if(phone&&!/^\+9665\d{8}$/.test(phone)){phoneInput.setCustomValidity('أدخل جوالًا سعوديًا مثل 05XXXXXXXX أو +9665XXXXXXXX.');phoneInput.reportValidity();return;}
  const iban=ibanInput.value.replace(/\s/g,'').toUpperCase();
  if(iban){let remainder=0;const rearranged=iban.slice(4)+iban.slice(0,4);const digits=rearranged.replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));for(const digit of digits)remainder=(remainder*10+Number(digit))%97;if(!/^SA\d{22}$/.test(iban)||remainder!==1){ibanInput.setCustomValidity('أدخل آيبانًا سعوديًا صحيحًا من 24 خانة يبدأ بـ SA، أو اتركه فارغًا.');ibanInput.reportValidity();return;}}
  const previousOffice={...officeState.office};
  officeState.office={...officeState.office,phone,iban,email:settingsForm.elements.email.value.trim(),address:settingsForm.elements.address.value.trim()};
  officeState.office.addressShort=officeState.office.address;if(await persist())applyOffice();else officeState.office=previousOffice;
});
settingsForm.addEventListener('input',event=>event.target.setCustomValidity(''));

document.querySelectorAll('[data-open-realty]').forEach(link=>link.addEventListener('click',()=>{selectedCategory='عقارات';audience='all';document.getElementById('catalog-audience').value='all';document.getElementById('catalog-search').value='';renderCatalog();}));

const adminCategory=document.getElementById('admin-price-category');
const adminService=document.getElementById('admin-price-service');
const adminPrice=document.getElementById('admin-price-value');
const newCategory=document.getElementById('new-service-category');
for(const category of catalog){adminCategory.add(new Option(category.title,category.id));newCategory.add(new Option(category.title,category.id));}

function selectedAdminRow(){return catalog.flatMap(category=>category.rows).find(row=>row.id===adminService.value);}
function refreshServiceControls(){const row=selectedAdminRow();document.getElementById('toggle-service').disabled=!row;document.getElementById('delete-service').disabled=!row;document.getElementById('toggle-service').textContent=row&&row.enabled===false?'تفعيل الخدمة':'تعطيل الخدمة';document.getElementById('service-state').textContent=!row?'لا توجد خدمات في هذا القسم.':row.enabled===false?'الحالة: معطّلة — مخفية عن العملاء':'الحالة: مفعّلة — ظاهرة للعملاء';}
let modifyingService=false;
document.getElementById('toggle-service').addEventListener('click',async()=>{const row=selectedAdminRow();if(!row||modifyingService)return;modifyingService=true;const previous=row.enabled;row.enabled=row.enabled===false;try{if(!await persist()){if(previous===undefined)delete row.enabled;else row.enabled=previous;return;}const id=row.id;refreshAdminServices();adminService.value=id;refreshAdminPrice();renderCatalog();document.getElementById('price-admin-status').textContent=row.enabled?'تم تفعيل الخدمة وإظهارها للعملاء.':'تم تعطيل الخدمة وإخفاؤها عن العملاء.';}finally{modifyingService=false;}});
document.getElementById('delete-service').addEventListener('click',async()=>{const row=selectedAdminRow();if(!row||modifyingService)return;if(!confirm('حذف خدمة «'+row.name+'» نهائيًا؟ لا يمكن التراجع من الواجهة.'))return;modifyingService=true;const category=catalog.find(category=>category.rows.some(item=>item.id===row.id));const index=category.rows.indexOf(row);category.rows.splice(index,1);try{if(!await persist()){category.rows.splice(index,0,row);return;}delete officeState.prices[row.id];officeState.additions=officeState.additions.filter(item=>item.id!==row.id);refreshAdminServices();refreshCatalogNavigation();renderCatalog();document.getElementById('price-admin-status').textContent='تم حذف الخدمة نهائيًا.';}finally{modifyingService=false;}});

function refreshAdminServices(){const category=catalog.find(c=>c.id===adminCategory.value);adminService.replaceChildren(...category.rows.map(row=>new Option(row.name+(row.enabled===false?" — معطّلة":""),row.id)));refreshAdminPrice();}
function refreshAdminPrice(){const row=catalog.flatMap(c=>c.rows).find(row=>row.id===adminService.value);adminPrice.value=row?priceOf(row):'';adminPrice.setCustomValidity('');document.querySelector('#price-settings-form button[type="submit"]').disabled=!row;refreshServiceControls();}
adminCategory.addEventListener('change',refreshAdminServices);adminService.addEventListener('change',refreshAdminPrice);refreshAdminServices();
function readAdminPrice(input){const value=normalizePrice(input.value);if(!validPrice(value)){input.setCustomValidity('أدخل مبلغًا صحيحًا مثل 75 أو نطاقًا مثل 50–100.');input.reportValidity();return null;}input.setCustomValidity('');return value;}
[adminPrice,document.getElementById('new-service-price')].forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
document.getElementById('price-settings-form').addEventListener('submit',async event=>{event.preventDefault();const price=readAdminPrice(adminPrice);if(price===null)return;const oldPrice=officeState.prices[adminService.value];officeState.prices[adminService.value]=price;const stored=await persist();if(!stored){if(oldPrice===undefined)delete officeState.prices[adminService.value];else officeState.prices[adminService.value]=oldPrice;document.getElementById('price-admin-status').textContent='تعذر حفظ السعر. لم يتغير سعر الخدمة.';return;}renderCatalog();document.getElementById('price-admin-status').textContent='تم تغيير السعر الظاهر للعملاء إلى '+price+' ريال.'+(stored?'':' نزّل الصفحة للاحتفاظ بالتعديل.');});
function refreshCatalogNavigation(){document.getElementById('catalog-categories').innerHTML='<button type="button" data-category="all">جميع الأقسام</button>'+catalog.map(category=>'<button type="button" data-category="'+escapeHtml(category.id)+'">'+category.icon+' '+escapeHtml(category.title)+' <small>'+category.rows.length+'</small></button>').join('');document.querySelector('.catalog-total').innerHTML='<strong>'+catalog.length+'</strong> قسمًا <span>•</span> <strong>'+catalog.reduce((n,c)=>n+c.rows.length,0)+'</strong> خدمة';}
document.getElementById('new-service-form').addEventListener('submit',async event=>{event.preventDefault();const nameInput=document.getElementById('new-service-name');const name=nameInput.value.trim();if(!name){nameInput.setCustomValidity('اكتب اسم الخدمة.');nameInput.reportValidity();return;}const price=readAdminPrice(document.getElementById('new-service-price'));if(price===null)return;const category=catalog.find(c=>c.id===newCategory.value);if(category.rows.some(row=>normalizeSearch(row.name)===normalizeSearch(name))){nameInput.setCustomValidity('هذه الخدمة موجودة في القسم. يمكنك تعديل سعرها من نموذج تعديل السعر.');nameInput.reportValidity();return;}const id='custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);const row={id,name,price};category.rows.push(row);officeState.additions.push({...row,categoryId:category.id});if(!await persist()){category.rows.pop();officeState.additions.pop();document.getElementById('new-service-status').textContent='تعذر حفظ الخدمة. حاول مرة أخرى.';return;}selectedCategory=category.id;audience='all';document.getElementById('catalog-audience').value='all';document.getElementById('catalog-search').value='';refreshCatalogNavigation();renderCatalog();adminCategory.value=category.id;refreshAdminServices();adminService.value=id;refreshAdminPrice();document.getElementById('new-service-status').textContent='أُضيفت الخدمة إلى '+category.title+' بسعر '+price+' ريال.';nameInput.value='';document.getElementById('new-service-price').value='';});
document.getElementById('new-service-name').addEventListener('input',event=>event.target.setCustomValidity(''));
refreshCatalogNavigation();

applyOffice();renderCatalog();


window.sendWhatsApp = sendWhatsApp;
}catch(error){document.getElementById('catalog-result').textContent='تعذر تحميل البيانات. شغّل المشروع بالأمر node server.cjs. '+error.message;console.error(error);}})();
