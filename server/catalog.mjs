import * as XLSX from './vendor/xlsx.mjs';

export const workbookType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const columns = ['القسم', 'الخدمة', 'السعر من (ريال)', 'السعر إلى (ريال)', 'الحالة', 'رمز الخدمة'];

export function validateCatalog(input, seed) {
  if (!Array.isArray(input) || input.length !== seed.services.length) throw Error('قائمة الأقسام غير صالحة.');
  const ids = new Set(); let count = 0;
  return seed.services.map(category => {
    const matches = input.filter(c => c?.id === category.id);
    if (matches.length !== 1 || !Array.isArray(matches[0].rows)) throw Error('قسم مفقود أو مكرر.');
    const rows = matches[0].rows.map(row => {
      if (++count > 3000) throw Error('الحد الأقصى 3000 خدمة.');
      const id = row.id || crypto.randomUUID();
      if (typeof id !== 'string' || !/^[\p{L}\p{N}_-]{1,100}$/u.test(id) || ids.has(id)) throw Error('رمز خدمة غير صالح أو مكرر.');
      ids.add(id);
      if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 250) throw Error('اسم الخدمة مطلوب، وبحد أقصى 250 حرفًا.');
      if (typeof row.price !== 'string' || !/^\d{1,7}(?:\.\d{1,2})?(?:–\d{1,7}(?:\.\d{1,2})?)?$/.test(row.price)) throw Error('السعر غير صالح. استخدم رقمًا أو نطاقًا مثل 50–100.');
      const [min, max = min] = row.price.split('–').map(Number);
      if (min > max) throw Error('السعر الأدنى أكبر من السعر الأعلى.');
      if (row.enabled !== undefined && typeof row.enabled !== 'boolean') throw Error('حالة الخدمة غير صالحة.');
      return {id, name: row.name.trim(), price: min === max ? String(min) : `${min}–${max}`, enabled: row.enabled !== false};
    });
    return {...category, rows};
  });
}

export function toWorkbook(services) {
  const rows = [columns];
  for (const c of services) for (const r of c.rows) {
    const [min, max = min] = r.price.split('–').map(Number);
    rows.push([c.title, r.name, min, max, r.enabled === false ? 'معطلة' : 'مفعلة', r.id]);
  }
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{wch:35},{wch:60},{wch:20},{wch:20},{wch:14},{wch:40}];
  sheet['!autofilter'] = {ref:sheet['!ref']};
  book.Workbook = {Views:[{RTL:true}]};
  XLSX.utils.book_append_sheet(book, sheet, 'الخدمات والأسعار');
  return XLSX.write(book, {bookType:'xlsx', type:'array', compression:true});
}

// Bound expanded ZIP size before the spreadsheet parser touches uploaded data.
function checkZip(bytes) {
  if (bytes.byteLength > 512 * 1024 || bytes.byteLength < 22) throw Error('حجم ملف Excel غير صالح (الحد 512 كيلوبايت).');
  const v = new DataView(bytes); let end = -1;
  for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 65557); i--) {
    if (v.getUint32(i,true) === 0x06054b50 && i + 22 + v.getUint16(i+20,true) === bytes.byteLength) {end=i;break;}
  }
  if (end < 0 || v.getUint16(end+4,true) || v.getUint16(end+6,true)) throw Error('ملف Excel غير مدعوم.');
  const entries=v.getUint16(end+10,true); let at=v.getUint32(end+16,true), total=0;
  if (!entries || entries>100 || at+v.getUint32(end+12,true)!==end) throw Error('ملف Excel غير صالح.');
  for(let i=0;i<entries;i++) {
    if(at+46>end || v.getUint32(at,true)!==0x02014b50) throw Error('ملف Excel تالف.');
    const size=v.getUint32(at+24,true), packed=v.getUint32(at+20,true), local=v.getUint32(at+42,true);
    total+=size;
    if(total>4*1024*1024 || size>2*1024*1024 || local+30>bytes.byteLength || v.getUint32(local,true)!==0x04034b50 || v.getUint16(at+8,true)&1) throw Error('ملف Excel كبير أو مشفر.');
    if(local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true)+packed>at) throw Error('ملف Excel تالف.');
    at+=46+v.getUint16(at+28,true)+v.getUint16(at+30,true)+v.getUint16(at+32,true);
  }
  if(at!==end) throw Error('ملف Excel غير صالح.');
}

export function fromWorkbook(bytes, seed) {
  checkZip(bytes);
  const book=XLSX.read(bytes,{type:'array',cellFormula:true,sheetRows:3002});
  const sheet=book.Sheets['الخدمات والأسعار'];
  if(!sheet) throw Error('استخدم ملف Excel الذي نزّلته من الإدارة.');
  for(const [key,cell] of Object.entries(sheet)) if(!key.startsWith('!') && cell.f) throw Error('الصيغ الحسابية غير مسموحة في ملف الخدمات.');
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:false});
  if(rows.length>3001 || columns.some((name,i)=>rows[0]?.[i]!==name)) throw Error('عناوين الأعمدة أو عدد الصفوف غير صالح.');
  const services=seed.services.map(c=>({...c,rows:[]}));
  for(const row of rows.slice(1)) {
    const c=services.find(c=>c.title===row[0]);
    if(!c || !['مفعلة','معطلة'].includes(row[4])) throw Error('قسم أو حالة غير صالحة في Excel.');
    const min=String(row[2]),max=String(row[3] === '' ? row[2] : row[3]);
    c.rows.push({id:String(row[5]),name:row[1],price:min===max?min:`${min}–${max}`,enabled:row[4]==='مفعلة'});
  }
  return validateCatalog(services,seed);
}
