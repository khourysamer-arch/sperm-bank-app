'use strict';

// Appendix D recipient cards and documented donor rejection evidence.
// Only the field structure is derived from the user's form. No supplied values are seeded.
const CARD_GROUPS = [
  {id:'personal',title:'פרטים אישיים',fields:[
    ['firstName','שם פרטי'],['fatherName','שם אבא'],['lastName','שם משפחה'],
    ['identity','ת״ז / מזהה'],['previousName','שם קודם'],['religion','דת / לאום'],
    ['phone','טלפון','tel'],['address','כתובת'],['birthYear','שנת לידה','year'],
    ['birthCountry','ארץ לידה'],['motherOrigin','מוצא אם'],['fatherOrigin','מוצא אב']
  ]},
  {id:'parents',title:'פרטי הורים ביולוגיים וחורגים',fields:[
    ['bioFatherFirst','שם פרטי אב ביולוגי'],['bioFatherFather','שם אבא של האב הביולוגי'],
    ['bioFatherLast','שם משפחה אב ביולוגי'],['bioFatherIdentity','ת״ז אב ביולוגי'],
    ['bioMotherFirst','שם פרטי אם ביולוגית'],['bioMotherFather','שם אבא של האם הביולוגית'],
    ['bioMotherLast','שם משפחה אם ביולוגית'],['bioMotherIdentity','ת״ז אם ביולוגית'],
    ['marriagePlace','מקום נישואין'],['stepFatherFirst','שם פרטי אב חורג'],
    ['stepFatherLast','שם משפחה אב חורג'],['stepFatherIdentity','ת״ז אב חורג']
  ]},
  {id:'appearance',title:'תיאור חיצוני',fields:[
    ['height','גובה (ס״מ)','height'],['weight','משקל (ק״ג)','weight'],['skin','צבע עור'],
    ['build','מבנה גוף'],['hair','צבע שיער'],['eyes','צבע עיניים']
  ]},
  {id:'partner',title:'פרטים אישיים — בן / בת זוג (אופציונלי)',fields:[
    ['firstName','שם פרטי — בן / בת זוג'],['lastName','שם משפחה — בן / בת זוג'],
    ['identity','ת״ז — בן / בת זוג'],['religion','דת / לאום — בן / בת זוג'],
    ['birthYear','שנת לידה — בן / בת זוג','year'],['birthCountry','ארץ לידה — בן / בת זוג'],
    ['motherOrigin','מוצא אם — בן / בת זוג'],['fatherOrigin','מוצא אב — בן / בת זוג'],
    ['marriageDate','תאריך נישואין','date']
  ]},
  {id:'partnerAppearance',title:'תיאור חיצוני — בן / בת זוג',fields:[
    ['height','גובה בן / בת זוג (ס״מ)','height'],['weight','משקל בן / בת זוג (ק״ג)','weight'],
    ['skin','צבע עור — בן / בת זוג'],['build','מבנה גוף — בן / בת זוג'],
    ['hair','צבע שיער — בן / בת זוג'],['eyes','צבע עיניים — בן / בת זוג']
  ]}
];
const LAB_TESTS = [
  ['blood','סוג דם ו־RH'],['syphilis','SYPHILIS'],['hiv','HIV'],['hbsag','HBsAg (צהבת B)'],
  ['hcv','HCV (צהבת C)'],['rubella','RUBELLA (אדמת)'],['genetics','סקר גנטי']
];
const PARTNER_TESTS = [['blood','סוג דם ו־RH — בן / בת זוג'],['hbsag','HBsAg — בן / בת זוג'],['hcv','HCV — בן / בת זוג']];
const CARD_TABS = [['personal','פרטים אישיים'],['parents','הורים ותיאור'],['partner','בן / בת זוג'],['labs','בדיקות מעבדה'],['treatments','טיפולים והריונות'],['documents','מסמכים']];
const OUTCOMES = {unknown:'טרם דווחה',negative:'ללא הריון',positive:'בדיקת הריון חיובית',clinical:'הריון קליני',ongoing:'הריון מתמשך',loss:'אובדן הריון',birth:'הריון ולידה',ectopic:'הריון חוץ רחמי'};
const SEXES = {unknown:'לא דווח',female:'נקבה',male:'זכר',mixed:'זכר ונקבה',other:'אחר / לא צוין'};
let recipientTab = 'personal';

function ensureRecordExtensions(s) {
  s.documents ??= [];
  s.externalTreatments ??= [];
  return s;
}
ensureRecordExtensions(state);

function cardValue(p, group, key) { return p.card?.[group]?.[key] ?? ''; }
function cardFieldName(group,key) { return 'card_'+group+'_'+key; }
function cardField(group,spec,p) {
  const [key,label,kind='text'] = spec;
  const value = cardValue(p,group,key);
  const numeric = ['year','height','weight'].includes(kind);
  const extra = kind==='year' ? `min="1900" max="${new Date().getFullYear()}" step="1"` : kind==='height' ? 'min="30" max="250" step="0.1"' : kind==='weight' ? 'min="1" max="400" step="0.1"' : 'maxlength="500"';
  return field(cardFieldName(group,key),label,numeric?'number':kind,value,false,false,extra);
}
function labFields(group,tests,p) {
  return tests.map(([key,label])=>{
    const result = cardValue(p,group,key+'_result');
    const resultField = key==='blood' ? selectField(cardFieldName(group,key+'_result'),label,[['','לא הוזן'],...['A+','A−','B+','B−','AB+','AB−','O+','O−'].map(x=>[x,x]),['unknown','לא ידוע / ממתין']],result,false) : field(cardFieldName(group,key+'_result'),label+' — תוצאה כפי שדווחה','text',result,false);
    return resultField+field(cardFieldName(group,key+'_date'),'תאריך בדיקת '+label,'date',cardValue(p,group,key+'_date'),false);
  }).join('') + field(cardFieldName(group,'notes'),'הערות בדיקות / מקור תוצאות','textarea',cardValue(p,group,'notes'),false,true);
}
function allCardSpecs() {
  const specs = CARD_GROUPS.flatMap(g=>g.fields.map(f=>({group:g.id,key:f[0],label:f[1],kind:f[2]||'text'})));
  for(const [group,tests] of [['labs',LAB_TESTS],['partnerLabs',PARTNER_TESTS]]) {
    for(const [key,label] of tests) specs.push({group,key:key+'_result',label,kind:'text'},{group,key:key+'_date',label:'תאריך '+label,kind:'date'});
    specs.push({group,key:'notes',label:'הערות בדיקות',kind:'text'});
  }
  specs.push({group:'family',key:'history',label:'אנמנזה משפחתית',kind:'text'});
  return specs;
}
function validateCard(card) {
  requireCondition(card&&typeof card==='object'&&!Array.isArray(card),'מבנה כרטיס הנתרמת אינו תקין');
  const specs = allCardSpecs();
  for(const group of Object.keys(card)) requireCondition(specs.some(s=>s.group===group),'קבוצת כרטיס לא מוכרת');
  for(const spec of specs) {
    const val=card[spec.group]?.[spec.key];
    if(val===undefined||val==='') continue;
    requireCondition(typeof val==='string'&&val.length<=10000,'שדה לא תקין: '+spec.label);
    if(spec.kind==='date') { requireCondition(validDate(val),'תאריך לא תקין: '+spec.label); past(val,spec.label); }
    if(['year','height','weight'].includes(spec.kind)) {
      const n=Number(val), min=spec.kind==='year'?1900:spec.kind==='height'?30:1;
      const max=spec.kind==='year'?new Date().getFullYear():spec.kind==='height'?250:400;
      requireCondition(Number.isFinite(n)&&n>=min&&n<=max&&(spec.kind!=='year'||Number.isInteger(n)),'נדרש ערך מספרי תקין: '+spec.label);
    }
  }
  for(const group of Object.keys(card)) {
    requireCondition(card[group]&&typeof card[group]==='object'&&!Array.isArray(card[group]),'מבנה סעיף לא תקין');
    for(const key of Object.keys(card[group])) requireCondition(specs.some(s=>s.group===group&&s.key===key),'שדה כרטיס לא מוכר');
  }
  return card;
}
function collectCard(f,p) {
  const card=JSON.parse(JSON.stringify(p?.card||{}));
  for(const spec of allCardSpecs()) {
    const name=cardFieldName(spec.group,spec.key);
    if(Object.hasOwn(f,name)) { card[spec.group]??={}; card[spec.group][spec.key]=String(f[name]).trim(); }
  }
  return validateCard(card);
}

recipientForm = function(id) {
  const p=id?patient(id):null, draft=p||{};
  modal(p?'עריכת כרטיס נתרמת — נספח ד׳':'כרטיס אישה נתרמת — נספח ד׳',`
    <div class="notice">מבנה הכרטיס מבוסס על הטופס שהעברת. השדות הנוספים אופציונליים; יש להשתמש בנתוני הדגמה בלבד.</div>
    <div class="form-grid">${field('id','קוד נתרמת','text',p?.id||'',true,false,p?'readonly':'maxlength="40"')}${field('name','שם תצוגה / שם לדוגמה','text',p?.name||'',true)}${selectField('status','מצב תיק',Object.entries(recStatus),p?.status||'active')}${field('opened','תאריך פתיחת תיק','date',p?.opened||today())}</div>
    ${CARD_GROUPS.map((g,i)=>`<details class="card-form-section" ${i===0?'open':''}><summary>${g.title}</summary><div class="form-grid">${g.fields.map(s=>cardField(g.id,s,draft)).join('')}</div></details>`).join('')}
    <details class="card-form-section"><summary>בדיקות מעבדה — נתרמת</summary><p class="label-note">התוצאה נשמרת כלשונה. אין סיווג אוטומטי של כשירות לטיפול.</p><div class="form-grid">${labFields('labs',LAB_TESTS,draft)}</div></details>
    <details class="card-form-section"><summary>בדיקות מעבדה — בן / בת זוג</summary><div class="form-grid">${labFields('partnerLabs',PARTNER_TESTS,draft)}</div></details>
    <details class="card-form-section"><summary>אנמנזה משפחתית והערות</summary><div class="form-grid">${field(cardFieldName('family','history'),'אנמנזה משפחתית','textarea',cardValue(draft,'family','history'),false,true)}${field('notes','הערות בתיק','textarea',p?.notes||'',false,true)}</div></details>`, f=>{
      const code=f.id.trim();
      requireCondition(/^[A-Za-z0-9_-]{2,40}$/.test(code),'קוד נתרמת יכיל אותיות באנגלית, ספרות, מקף או קו תחתון בלבד');
      requireCondition(p||!patient(code),'קוד הנתרמת כבר קיים');
      requireCondition(['active','paused','completed'].includes(f.status),'מצב התיק אינו תקין');
      requireCondition(validDate(f.opened),'תאריך פתיחת התיק אינו תקין'); past(f.opened);
      const card=collectCard(f,p);
      const updated={...draft,id:code,name:f.name.trim(),status:f.status,opened:f.opened,notes:f.notes??p?.notes??'',card};
      requireCondition(updated.name,'יש להזין שם תצוגה');
      if(p) Object.assign(p,updated); else state.recipients.push(updated);
      view='recipient'; selected=code;
      done((p?'עודכן':'נפתח')+' כרטיס נתרמת '+code);
    });
  $('#overlay .modal')?.classList?.add('wide-modal');
};

recipientDetail = function(id) {
  if(!patient(id))return;
  closeModal(); view='recipient'; selected=id; recipientTab='personal'; render(); window.scrollTo(0,0);
};
function kvCard(p,group,fields) {
  return `<div class="kv-grid card-kv">${fields.map(([key,label,kind])=>{
    const v=cardValue(p,group,key);
    return `<div><div class="kv-label">${label}</div><div class="kv-value prewrap">${esc(v?(kind==='date'?fmt(v):v):'לא הוזן')}</div></div>`;
  }).join('')}</div>`;
}
function labCard(p,group,tests) {
  return table(['בדיקה','תוצאה כפי שדווחה','תאריך בדיקה'],tests.map(([key,label])=>[
    esc(label),esc(cardValue(p,group,key+'_result')==='unknown'?'לא ידוע / ממתין':cardValue(p,group,key+'_result')||'לא הוזן'),fmt(cardValue(p,group,key+'_date'))
  ]))+`<div class="detail-body"><div class="kv-label">הערות / מקור</div><p class="prewrap help-text">${esc(cardValue(p,group,'notes')||'לא הוזנו')}</p></div>`;
}
function recipientPage() {
  const p=patient(selected); if(!p)return '<div class="empty">התיק לא נמצא</div>';
  const treatments=treatmentRows(p.id), docs=recordDocuments('recipient',p.id);
  const frozenCount=state.embryos.filter(e=>e.recipient===p.id).reduce((s,e)=>s+frozen(e),0);
  let body='';
  if(recipientTab==='personal')body=`<div class="detail-body">${kvCard(p,'personal',CARD_GROUPS[0].fields)}<h3 class="subheading">הערות בתיק</h3><p class="prewrap help-text">${esc(p.notes||'לא הוזנו')}</p></div>`;
  if(recipientTab==='parents')body=`<div class="detail-body"><h3 class="subheading">פרטי הורים</h3>${kvCard(p,'parents',CARD_GROUPS[1].fields)}<h3 class="subheading">תיאור חיצוני</h3>${kvCard(p,'appearance',CARD_GROUPS[2].fields)}<h3 class="subheading">אנמנזה משפחתית</h3><p class="prewrap help-text">${esc(cardValue(p,'family','history')||'לא הוזנה')}</p></div>`;
  if(recipientTab==='partner')body=`<div class="detail-body">${kvCard(p,'partner',CARD_GROUPS[3].fields)}<h3 class="subheading">תיאור חיצוני — בן / בת זוג</h3>${kvCard(p,'partnerAppearance',CARD_GROUPS[4].fields)}</div><div class="panel-head"><h2>בדיקות מעבדה — בן / בת זוג</h2></div>${labCard(p,'partnerLabs',PARTNER_TESTS)}`;
  if(recipientTab==='labs')body=labCard(p,'labs',LAB_TESTS);
  if(recipientTab==='treatments')body=`<div class="detail-body actions">${btn('טיפול ממנה ביחידה','recipientUse','plus',true,p.id)}${btn('תיעוד טיפול היסטורי חיצוני','externalTreatment','file',false,p.id)}${btn('רישום לידה','addBirth','baby')}</div>${treatmentTable(treatments)}<div class="panel-head"><h2>מלאי עוברים</h2></div>${embryoTable(state.embryos.filter(e=>e.recipient===p.id))}<div class="panel-head"><h2>דיווחי לידה פרטניים</h2></div>${birthTable(state.births.filter(b=>b.recipient===p.id))}`;
  if(recipientTab==='documents')body=`<div class="detail-body actions">${btn('הוספת סריקה / מסמך','recipientDocument','upload',true,p.id)}</div>${documentsList(docs)}`;
  return heading('כרטיס נתרמת '+esc(p.id),'נספח ד׳ · '+esc(p.name),btn('חזרה לנתרמות','backRecipients')+btn('ייצוא מעקב טיפולים','exportRecipientTreatment','download',false,p.id)+btn('עריכת כרטיס','editRecipient','edit',true,p.id))+`
    <div class="recipient-summary"><div class="recipient-initial">${icon('heart',28)}</div><div><h2>${esc(p.name)}</h2><p>${esc(p.id)} · נפתח ${fmt(p.opened)}</p></div><div class="recipient-stat"><strong>${treatments.length}</strong><span>טיפולים מתועדים</span></div><div class="recipient-stat"><strong>${frozenCount}</strong><span>עוברים מוקפאים</span></div><div class="recipient-stat"><strong>${docs.length}</strong><span>מסמכים מצורפים</span></div>${badge(recStatus[p.status],p.status==='active'?'good':'neutral')}</div>
    <section class="panel"><div class="detail-tabs">${CARD_TABS.map(([key,label])=>`<button data-recipient-tab="${key}" class="${recipientTab===key?'active':''}">${label}</button>`).join('')}</div>${body}</section>`;
}
const legacyRecipientsPage=recipientsPage;
recipientsPage=function() {
  return heading('כרטיסי נתרמות','נספח ד׳ · פרטים אישיים, בדיקות ומעקב טיפולים והריונות.',btn('פתיחת כרטיס נתרמת','addRecipient','plus',true))+
    panel('תיקי נתרמות',`<div class="filters"><div class="search">${icon('search',16)}<input id="recipientSearch" aria-label="חיפוש נתרמות" placeholder="חיפוש לפי קוד, שם או מזהה…"></div><span class="last-update">${state.recipients.length} תיקים במאגר המקומי</span></div><div id="recipientResults">${recipientDirectory(state.recipients)}</div>`)+
    panel('מעקב טיפולים והריונות',treatmentTable(treatmentRows()));
};
function recipientDirectory(list) {
  return table(['כרטיס נתרמת','שם תצוגה','מצב תיק','טיפולים','עוברים מוקפאים','פעולות'],list.map(p=>[
    pLink(p.id),esc(p.name),badge(recStatus[p.status],p.status==='active'?'good':'neutral'),treatmentRows(p.id).length,
    state.embryos.filter(e=>e.recipient===p.id).reduce((s,e)=>s+frozen(e),0),
    `<div class="actions">${btn('פתיחת כרטיס','recipientDetail','file',false,p.id)}${btn('עריכה','editRecipient','edit',false,p.id)}</div>`
  ]));
}

// These files are browser-local demo evidence, included in JSON backups.
// Conservative byte limits keep the combined JSON within typical localStorage quotas.
const DOCUMENT_MIMES = ['application/pdf','image/jpeg','image/png','image/webp','text/plain'];
const MAX_DOCUMENT_BYTES = 1024*1024;
const MAX_TOTAL_DOCUMENT_BYTES = 1250*1024;
function recordDocuments(ownerType,ownerId) { return (state.documents||[]).filter(d=>d.ownerType===ownerType&&d.ownerId===ownerId); }
function validateDocument(d) {
  requireCondition(d&&typeof d.id==='string'&&typeof d.filename==='string'&&d.filename.length<=250,'פרטי מסמך אינם תקינים');
  requireCondition(DOCUMENT_MIMES.includes(d.mime)&&Number.isInteger(d.size)&&d.size>0&&d.size<=MAX_DOCUMENT_BYTES,'סוג או גודל מסמך אינם נתמכים');
  requireCondition(typeof d.dataUrl==='string'&&d.dataUrl.startsWith('data:'+d.mime+';base64,'),'תוכן מסמך אינו תקין');
  const encoded=d.dataUrl.split(',')[1];
  requireCondition(/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)&&encoded.length%4===0,'קידוד מסמך אינו תקין');
  const bytes=atob(encoded);
  requireCondition(bytes.length===d.size,'גודל מסמך אינו תואם לתוכן');
  if(d.mime==='application/pdf')requireCondition(bytes.startsWith('%PDF-'),'הקובץ אינו PDF תקין');
  if(d.mime==='image/png')requireCondition(bytes.startsWith('\x89PNG\r\n\x1a\n'),'הקובץ אינו PNG תקין');
  if(d.mime==='image/jpeg')requireCondition(bytes.charCodeAt(0)===255&&bytes.charCodeAt(1)===216&&bytes.charCodeAt(2)===255,'הקובץ אינו JPEG תקין');
  if(d.mime==='image/webp')requireCondition(bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP','הקובץ אינו WebP תקין');
  return d;
}
function ensureDocumentCapacity(newDocs=[]) {
  const docs=[...(state.documents||[]),...newDocs];
  requireCondition(docs.reduce((s,d)=>s+d.size,0)<=MAX_TOTAL_DOCUMENT_BYTES,'נפח המסמכים המקומי מלא (1.25MB). יש להשתמש במסמך קטן יותר בגרסת ההדגמה.');
  requireCondition(JSON.stringify({...state,documents:docs}).length<=2200000,'הגיבוי המקומי גדול מדי. יש לצמצם את גודל המסמך.');
}
function evidenceFields() {
  return `<div class="evidence-box"><h3>סריקה או מסמך מצורף</h3><p class="label-note">PDF, צילום JPG/PNG/WebP או קובץ TXT · עד 1MB לקובץ, 1.25MB בסך הכול בהדגמה. הקבצים נשמרים בדפדפן בלבד.</p><div class="evidence-actions"><label class="btn">${icon('upload',16)}בחירת מסמכים<input id="evidenceFiles" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain" multiple></label><label class="btn">${icon('eye',16)}צילום / סריקה בנייד<input id="evidenceCamera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><button type="button" class="btn" id="pasteReason">הדבקת מלל לסיבה</button></div><p class="label-note">אפשר גם להדביק ישירות בשדה הסיבה. מסמך סרוק מצורף כפי שהוא; אין פענוח OCR אוטומטי. TXT יכול להיקלט כמלל.</p><div id="evidencePending" aria-live="polite"></div></div>`;
}
function setupEvidence(noteName='note') {
  const pending=[]; let loading=Promise.resolve();
  const draw=()=>{ $('#evidencePending').innerHTML=pending.map((d,i)=>`<div class="pending-doc">${icon('file',16)}<span>${esc(d.filename)} · ${Math.ceil(d.size/1024)}KB</span><button type="button" class="btn small" data-remove-pending="${i}">הסרה מהרשומה</button>${d.mime==='text/plain'?`<button type="button" class="btn small" data-import-text="${i}">העתקת מלל לסיבה</button>`:''}</div>`).join('');
    $$('[data-remove-pending]').forEach(b=>b.onclick=()=>{pending.splice(Number(b.dataset.removePending),1);draw()});
    $$('[data-import-text]').forEach(b=>b.onclick=()=>{const d=pending[Number(b.dataset.importText)];const bytes=Uint8Array.from(atob(d.dataUrl.split(',')[1]),c=>c.charCodeAt(0));const text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);const el=$('#f-'+noteName);if(el)el.value+=(el.value?'\n\n':'')+text;});
  };
  const fileData=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('לא ניתן לקרוא את הקובץ'));reader.readAsDataURL(file)});
  async function read(files) {
    const incoming=[];
    for(const file of files) {
      requireCondition(file.size>0&&file.size<=MAX_DOCUMENT_BYTES,'כל קובץ צריך להיות עד 1MB ולא ריק');
      const ext=file.name.split('.').pop().toLowerCase();
      const mime=file.type||({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain'}[ext]);
      requireCondition(DOCUMENT_MIMES.includes(mime),'הקובץ אינו מסוג נתמך');
      let dataUrl=await fileData(file); if(!file.type)dataUrl=dataUrl.replace(/^data:[^;]*;/,'data:'+mime+';');
      incoming.push(validateDocument({id:uid('DOC'),filename:file.name,mime,size:file.size,dataUrl,added:new Date().toISOString()}));
    }
    ensureDocumentCapacity([...pending,...incoming]); pending.push(...incoming);draw();
  }
  const bindInput=selector=>{const input=$(selector);if(!input)return;input.onchange=e=>{const files=[...e.target.files];loading=loading.catch(()=>{}).then(()=>read(files));loading.catch(err=>{const error=$('#formError');if(error){error.hidden=false;error.textContent=err.message}});input.value='';};};
  bindInput('#evidenceFiles');bindInput('#evidenceCamera');
  const paste=$('#pasteReason');if(paste)paste.onclick=async()=>{try{const text=await navigator.clipboard.readText();requireCondition(text,'הלוח ריק');const el=$('#f-'+noteName);requireCondition(el,'שדה מלל לא נמצא');el.value+=(el.value?'\n\n':'')+text;el.focus();}catch{toast('ניתן להדביק ישירות בשדה הסיבה באמצעות Ctrl+V או ⌘V')}};
  return async()=>{await loading;ensureDocumentCapacity(pending);return [...pending]};
}
function documentsList(list) {
  if(!list.length)return '<div class="empty">טרם צורפו מסמכים</div>';
  return `<div class="document-grid">${list.map(d=>`<article class="document-card">${icon('file',25)}<div><b>${esc(d.filename)}</b><p>${Math.ceil(d.size/1024)}KB · ${fmt(d.added)}</p></div>${btn('צפייה / הורדה','documentView','eye',false,d.id)}</article>`).join('')}</div>`;
}
function documentView(id) {
  const d=(state.documents||[]).find(x=>x.id===id);requireCondition(d,'המסמך לא נמצא');validateDocument(d);
  let preview='<p class="help-text">קובץ PDF מצורף. ניתן להוריד ולפתוח אותו במציג המסמכים במכשיר.</p>';
  if(d.mime.startsWith('image/'))preview=`<img class="document-preview" src="${d.dataUrl}" alt="סריקת מסמך מצורף">`;
  if(d.mime==='text/plain') {const bytes=Uint8Array.from(atob(d.dataUrl.split(',')[1]),c=>c.charCodeAt(0));preview=`<pre class="document-text">${esc(new TextDecoder().decode(bytes))}</pre>`;}
  modal(esc(d.filename),preview+`<button class="btn primary" id="downloadEvidence">${icon('download')}הורדת המסמך</button>`,null,'מסמך הדגמה מקומי · '+Math.ceil(d.size/1024)+'KB');
  $('#downloadEvidence').onclick=()=>{const bytes=Uint8Array.from(atob(d.dataUrl.split(',')[1]),c=>c.charCodeAt(0));download(d.filename,bytes,d.mime)};
}
function addDocumentForRecipient(id) {
  requireCondition(patient(id),'תיק הנתרמת לא נמצא');let collect;
  modal('צירוף מסמכים לכרטיס נתרמת',`<div class="notice">המסמכים מקושרים לתיק ${esc(id)} ונכללים בגיבוי JSON. יש לצרף מסמכי הדגמה בלבד.</div>${field('note','הערה על המסמך','textarea','',false,true)}${evidenceFields()}`,async f=>{
    const docs=await collect();requireCondition(docs.length,'יש לבחור לפחות מסמך אחד');
    docs.forEach(d=>state.documents.push({...d,ownerType:'recipient',ownerId:id,note:f.note||''}));
    recipientTab='documents';done('צורפו '+docs.length+' מסמכים לכרטיס נתרמת '+id);
  });collect=setupEvidence();
}

// Rejection decisions append a record; editing never silently releases a blocked donor.
approvalForm=function(id,forced,prefillReason=false) {
  const d=donor(id), last=d?[...state.approvals].reverse().find(a=>a.donor===id&&a.decision==='blocked'):null;
  const blocked=forced==='blocked';let collect;
  modal(blocked?'סיבת רג׳קט / מניעת שימוש בתורם':'תיעוד החלטה ואסמכתה',`
    <div class="notice">ניתן להקליד או להדביק סיבה מפורטת ולצרף סריקה. אישור רגיל אינו משחרר חסימה קיימת; שחרור מתועד במסלול נפרד.</div>
    <div class="form-grid">${selectField('donor','תורם',donorOpts(),id||'')}${selectField('decision','סוג החלטה',blocked?[['blocked','רג׳קט / מניעת שימוש']]:[['approved','אישור שימוש'],['blocked','רג׳קט / מניעת שימוש'],['pending','ממתין / הסגר']],forced||'approved')}${field('date','תאריך החלטה','date',today())}${field('received','תאריך קבלת המידע','date',today())}${field('expires','תוקף אישור עד (נדרש לאישור)','date','',false)}${field('ref','אסמכתה / מספר מסמך','text',prefillReason?last?.ref||'':'')}${field('note','סיבת הרג׳קט / מלל ההחלטה','textarea',prefillReason?d?.blockReason||'':'',true,true)}</div>${evidenceFields()}`, async f=>{
      const current=donor(f.donor);requireCondition(current,'יש לבחור תורם');
      requireCondition(['approved','blocked','pending'].includes(f.decision),'סוג ההחלטה אינו תקין');
      requireCondition(validDate(f.date)&&validDate(f.received),'תאריך החלטה או קבלה אינו תקין');past(f.date);past(f.received);
      requireCondition(f.received>=f.date,'תאריך הקבלה לא יקדם להחלטה');
      requireCondition(f.note.trim()&&f.ref.trim(),'יש להזין סיבה ואסמכתה');
      if(f.decision==='approved')requireCondition(validDate(f.expires)&&f.expires>=f.date,'נדרש תוקף אישור תקין');
      const docs=await collect(), approval={...f,note:f.note.trim(),id:uid('AP')};
      ensureRecordExtensions(state);
      docs.forEach(doc=>state.documents.push({...doc,ownerType:'donor',ownerId:current.id,approvalId:approval.id}));
      if(f.decision==='blocked'){current.status='blocked';current.blockedDate=f.date;current.blockReason=approval.note;}
      else if(current.status!=='blocked')current.status=f.decision==='approved'?'active':'pending';
      state.approvals.push(approval);
      state.mohUpdates.push({id:uid('MU'),date:f.received,ref:f.ref,rows:1,note:'תיעוד ידני · '+current.id});
      done('תועדה '+(blocked?'סיבת רג׳קט':'החלטה')+' לתורם '+current.id+' · '+docs.length+' מסמכים');
    });
  $('#overlay .modal')?.classList?.add('wide-modal');collect=setupEvidence();
};
approvalTable=function(list) {
  return table(['תורם','החלטה','מועד החלטה','מועד קבלה','תוקף עד','אסמכתה','סיבה / פירוט','מסמכים'],[...list].reverse().map(a=>[
    donorLink(a.donor),badge(a.decision==='blocked'?'רג׳קט / חסום':a.decision==='approved'?'אישור':'המתנה',a.decision==='blocked'?'bad':a.decision==='approved'?'good':'wait'),fmt(a.date),fmt(a.received),fmt(a.expires),esc(a.ref),
    `<div class="reason-text">${esc(a.note)}</div>`,(state.documents||[]).filter(d=>d.approvalId===a.id).map(d=>`<button class="btn small" data-action="documentView" data-id="${esc(d.id)}">${icon('file',14)}${esc(d.filename)}</button>`).join('')||'—'
  ]));
};
const baseDonorPage=donorPage;
donorPage=function() {
  const html=baseDonorPage(), d=donor(selected);if(!d)return html;
  const extra=`<section class="panel"><div class="panel-head"><div><h2>סיבת רג׳קט ומסמכים</h2><p>מלל ההחלטה והסריקות נשמרים עם האסמכתה</p></div>${btn(d.status==='blocked'?'עדכון סיבת רג׳קט / צירוף מסמך':'תיעוד רג׳קט','rejectionReason','edit',false,d.id)}</div>${d.blockReason?`<div class="detail-body"><div class="reason-text full">${esc(d.blockReason)}</div></div>`:''}${documentsList(recordDocuments('donor',d.id))}</section>`;
  return html+extra+(detailTab==='recipients'?panel('מעקב טיפולים והריונות — כולל תיעוד חיצוני',treatmentTable(treatmentRows().filter(u=>u.donor===d.id))):'');
};
const baseBlocksPage=blocksPage;
blocksPage=function() {
  return baseBlocksPage()+panel('סיבות רג׳קט ואסמכתאות',table(['תורם','סיבה נוכחית','מסמכים','פעולה'],state.donors.filter(d=>d.status==='blocked').map(d=>[
    donorLink(d.id),`<div class="reason-text">${esc(d.blockReason)}</div>`,recordDocuments('donor',d.id).length,
    btn('מלל / סריקה / עדכון סיבה','rejectionReason','file',false,d.id)
  ])));
};

function clinicalFormFields(c={}) {
  return `<div class="field wide"><h3 class="subheading">מעקב טיפול והריון — דף 3</h3></div>
    ${field('clinical_cycleDay','יום מחזור','number',c.cycleDay??'',false,false,'min="1" max="999" step="1"')}
    ${field('clinical_mucusQuality','איכות ריר','text',c.mucusQuality||'',false)}
    ${field('clinical_concentration','ריכוז זרע (×10^6)','number',c.concentration??'',false,false,'min="0" max="1000000" step="any"')}
    ${selectField('clinical_concentrationUnit','יחידת הריכוז',[['','לא צוינה'],['per_ml','למ״ל'],['total','סך הכול בדגימה']],c.concentrationUnit||'',false)}
    ${field('clinical_motility','תנועה (%)','number',c.motility??'',false,false,'min="0" max="100" step="any"')}
    ${selectField('clinical_outcome','תוצאת הריון',Object.entries(OUTCOMES),c.outcome||'unknown',false)}
    ${field('clinical_birthDate','תאריך לידה','date',c.birthDate||'',false)}
    ${field('clinical_children','מספר ילדים מדווח','number',c.children??'',false,false,'min="0" max="20" step="1"')}
    ${field('clinical_childHealth','מצב / בריאות הילדים כפי שדווחו','text',c.childHealth||'',false)}
    ${selectField('clinical_sex','מין הילדים המדווח',Object.entries(SEXES),c.sex||'unknown',false)}
    ${field('clinical_notes','הערות מעקב טיפול / הריון','textarea',c.notes||'',false,true)}`;
}
function validateClinical(c,treatmentDate) {
  requireCondition(c&&typeof c==='object'&&!Array.isArray(c),'מבנה מעקב טיפול אינו תקין');
  for(const key of ['cycleDay','concentration','motility','children']) {
    if(c[key]===''||c[key]===undefined||c[key]===null)continue;
    const n=Number(c[key]);
    const min=key==='cycleDay'?1:0, max=key==='cycleDay'?999:key==='motility'?100:key==='children'?20:1000000;
    requireCondition(Number.isFinite(n)&&n>=min&&n<=max&&(!['cycleDay','children'].includes(key)||Number.isInteger(n)),'ערך מספרי לא תקין: '+({cycleDay:'יום מחזור',concentration:'ריכוז',motility:'תנועה (%)',children:'מספר ילדים'}[key]));
  }
  requireCondition(!c.outcome||Object.hasOwn(OUTCOMES,c.outcome),'תוצאת הריון אינה תקינה');
  requireCondition(!c.sex||Object.hasOwn(SEXES,c.sex),'מין מדווח אינו תקין');
  requireCondition(!c.concentrationUnit||['per_ml','total'].includes(c.concentrationUnit),'יחידת ריכוז אינה תקינה');
  if(c.birthDate){requireCondition(validDate(c.birthDate),'תאריך לידה אינו תקין');past(c.birthDate,'תאריך לידה');requireCondition(!treatmentDate||c.birthDate>=treatmentDate,'תאריך הלידה קודם לטיפול');}
  if(c.outcome==='birth')requireCondition(c.birthDate&&Number(c.children)>=1,'בתוצאת הריון ולידה נדרשים תאריך לידה ומספר ילדים');
  for(const key of ['mucusQuality','childHealth','notes'])requireCondition(c[key]===undefined||(typeof c[key]==='string'&&c[key].length<=10000),'מלל מעקב אינו תקין');
  return c;
}
function collectClinical(f,treatmentDate) {
  const c={};
  for(const key of ['cycleDay','mucusQuality','concentration','concentrationUnit','motility','outcome','birthDate','children','childHealth','sex','notes']) {
    const value=f['clinical_'+key]; if(value!==undefined)c[key]=String(value).trim();
  }
  return validateClinical(c,treatmentDate);
}
function treatmentRows(recipientId) {
  return [...state.uses.map(u=>({...u,source:'local'})),...(state.externalTreatments||[]).map(u=>({...u,source:'external'}))]
    .filter(u=>!recipientId||u.recipient===recipientId).sort((a,b)=>b.date.localeCompare(a.date));
}
function treatmentTable(rows) {
  return `<div class="treatment-scroll">${table(['תאריך / מקור','נתרמת','יום מחזור','בנק','מס׳ / כינוי תורם','מנה / סוג טיפול','איכות ריר','תאריך הקפאה','ריכוז (×10^6)','תנועה %','תוצאת הריון','תאריך לידה','מס׳ ילדים','מצב / בריאות','מין','הערות','פעולה'],rows.map(u=>{
    const d=donor(u.donor),v=state.doses.find(v=>v.id===u.dose),c=u.clinical||{};
    return [`${fmt(u.date)}<small>${u.source==='external'?'תיעוד חיצוני היסטורי':'מנה מהיחידה'}</small>`,pLink(u.recipient),esc(c.cycleDay||'—'),esc(u.source==='external'?u.bank:d?.bank||'—'),
      d?donorLink(d.id):`${esc(u.donorCode||'—')}<small>${esc(u.donorAlias||'')}</small>`,
      `${esc(u.dose||'ללא גריעת מלאי')}<small>${esc(u.method||u.type)}</small>`,esc(c.mucusQuality||'—'),fmt(v?.frozen||u.frozen),
      `${esc(c.concentration??'—')}<small>${c.concentrationUnit==='per_ml'?'למ״ל':c.concentrationUnit==='total'?'סך הכול':'יחידה לא צוינה'}</small>`,esc(c.motility??'—'),badge(OUTCOMES[c.outcome]||OUTCOMES.unknown,c.outcome==='birth'?'good':'neutral'),fmt(c.birthDate),esc(c.children??'—'),
      `<div class="reason-text">${esc(c.childHealth||'לא דווח')}</div>`,esc(SEXES[c.sex]||SEXES.unknown),`<div class="reason-text">${esc(c.notes||u.note||'—')}</div>`,btn('עדכון מעקב','treatmentFollowup','edit',false,u.id)
    ];
  }))}</div>`;
}
function treatmentFollowup(id) {
  const u=state.uses.find(x=>x.id===id)||(state.externalTreatments||[]).find(x=>x.id===id);requireCondition(u,'הטיפול לא נמצא');
  modal('עדכון מעקב טיפול והריון',`<div class="notice">טיפול מ־${fmt(u.date)} · ${esc(u.recipient)}. עדכון תוצאות אינו צורך מנה נוספת ואינו משנה את תאריך ההקפאה.</div><div class="form-grid">${clinicalFormFields(u.clinical||{})}${field('sourceNote','מקור המידע / אסמכתת עדכון','textarea','',true,true)}</div>`,f=>{
    const clinical=collectClinical(f,u.date);requireCondition(f.sourceNote.trim(),'נדרש מקור מידע לעדכון');
    u.followupHistory??=[];u.followupHistory.push({time:new Date().toISOString(),previous:u.clinical||{},source:f.sourceNote});
    u.clinical=clinical;done('עודכן מעקב טיפול '+u.id+' · '+f.sourceNote);
  });$('#overlay .modal')?.classList?.add('wide-modal');
}
function externalTreatmentForm(recipientId) {
  requireCondition(patient(recipientId),'כרטיס הנתרמת לא נמצא');
  modal('תיעוד טיפול היסטורי מחוץ למלאי היחידה',`<div class="notice">זהו רישום היסטורי ממקור חיצוני. הוא אינו מאשר טיפול חדש ואינו גורע מנה מהמלאי. טיפול ממנה ביחידה יש לרשום במסלול ״טיפול ממנה ביחידה״.</div><div class="form-grid">
    ${field('recipient','קוד נתרמת','text',recipientId,true,false,'readonly')}
    ${field('date','תאריך טיפול','date','')}${field('bank','בנק זרע בעת הטיפול')}
    ${selectField('donor','קישור לתורם במאגר (אם מזוהה)',[['','ללא זיהוי במאגר המקומי'],...donorOpts().slice(1)],'',false)}
    ${field('donorCode','מספר תורם בבנק המקור')}${field('donorAlias','כינוי התורם','text','',false)}
    ${selectField('method','סוג טיפול',[['AID','AID / IUI · הזרעה'],['IUI','IUI · הזרעה'],['IVF','IVF'],['ICSI','ICSI']],'AID')}
    ${field('cycle','מחזור טיפול / אסמכתת מקור')}${field('frozen','תאריך הקפאת מנה (אם ידוע)','date','',false)}
    ${field('note','מקור התיעוד והערות','textarea','',true,true)}${clinicalFormFields({})}</div>`,f=>{
      requireCondition(patient(f.recipient),'נתרמת לא קיימת');requireCondition(validDate(f.date),'יש להזין תאריך טיפול תקין');past(f.date);
      requireCondition(f.bank.trim()&&f.donorCode.trim()&&f.note.trim(),'נדרשים בנק מקור, מספר תורם ומקור מידע');
      requireCondition(['AID','IUI','IVF','ICSI'].includes(f.method),'סוג טיפול אינו תקין');
      if(f.donor)requireCondition(donor(f.donor),'התורם המקושר אינו קיים');
      if(f.frozen)requireCondition(validDate(f.frozen)&&f.frozen<=f.date,'הקפאה צריכה להיות לפני הטיפול');
      const clinical=collectClinical(f,f.date);const type=f.method==='AID'?'IUI':f.method;
      ensureRecordExtensions(state);state.externalTreatments.push({id:uid('EXT'),recipient:f.recipient,date:f.date,bank:f.bank,donor:f.donor,donorCode:f.donorCode,donorAlias:f.donorAlias,method:f.method,type,cycle:f.cycle,frozen:f.frozen,note:f.note,clinical});
      done('תועד טיפול היסטורי חיצוני לנתרמת '+f.recipient);
    });$('#overlay .modal')?.classList?.add('wide-modal');
}

const baseValidateBackup=validateBackup;
validateBackup=function(s) {
  baseValidateBackup(s);
  if(s.documents!==undefined) {
    requireCondition(Array.isArray(s.documents)&&s.documents.length<=1000,'רשימת מסמכים אינה תקינה');
    requireCondition(new Set(s.documents.map(d=>d.id)).size===s.documents.length,'מזהי מסמכים כפולים');
    requireCondition(s.documents.reduce((sum,d)=>sum+(Number(d.size)||0),0)<=MAX_TOTAL_DOCUMENT_BYTES,'נפח המסמכים בגיבוי גדול מדי');
    for(const d of s.documents) {
      validateDocument(d);
      requireCondition(['recipient','donor'].includes(d.ownerType),'סוג בעלות מסמך אינו תקין');
      requireCondition((d.ownerType==='recipient'?s.recipients:s.donors).some(x=>x.id===d.ownerId),'מסמך מפנה לתיק חסר');
      if(d.approvalId)requireCondition(d.ownerType==='donor'&&s.approvals.some(a=>a.id===d.approvalId&&a.donor===d.ownerId),'מסמך מפנה להחלטה לא תואמת');
    }
  }
  for(const p of s.recipients)if(p.card!==undefined)validateCard(p.card);
  for(const u of s.uses)if(u.clinical!==undefined)validateClinical(u.clinical,u.date);
  if(s.externalTreatments!==undefined) {
    requireCondition(Array.isArray(s.externalTreatments)&&s.externalTreatments.length<=20000,'רשימת טיפולים חיצוניים אינה תקינה');
    requireCondition(new Set(s.externalTreatments.map(u=>u.id)).size===s.externalTreatments.length,'מזהי טיפול חיצוני כפולים');
    for(const u of s.externalTreatments) {
      requireCondition(typeof u.id==='string'&&validDate(u.date)&&s.recipients.some(p=>p.id===u.recipient),'טיפול חיצוני מפנה לתיק חסר או תאריך לא תקין');
      requireCondition(!u.donor||s.donors.some(d=>d.id===u.donor),'תורם חיצוני מקושר חסר');
      requireCondition(typeof u.bank==='string'&&u.bank.trim()&&typeof u.donorCode==='string'&&u.donorCode.trim(),'פרטי בנק / תורם בטיפול חיצוני אינם תקינים');
      requireCondition(['IUI','IVF','ICSI'].includes(u.type)&&(!u.frozen||validDate(u.frozen)&&u.frozen<=u.date),'פרטי טיפול חיצוני אינם תקינים');
      validateClinical(u.clinical||{},u.date);
    }
  }
  return ensureRecordExtensions(s);
};
const baseCountRecipients=countRecipients;
countRecipients=function(id,active=false) {
  const ids=new Set([...us(id).map(u=>u.recipient),...ds(id).filter(v=>v.status==='reserved').map(v=>v.recipient),...em(id).filter(e=>frozen(e)>0).map(e=>e.recipient),...(state.externalTreatments||[]).filter(u=>u.donor===id).map(u=>u.recipient)]);
  return [...ids].filter(p=>p&&(!active||patient(p)?.status==='active')).length;
};
historicCount=function(id) { return new Set([...us(id).map(u=>u.recipient),...(state.externalTreatments||[]).filter(u=>u.donor===id).map(u=>u.recipient)]).size; };
const baseLinkedPatients=linkedPatients;
linkedPatients=function(id) {
  const ids=new Set([...baseLinkedPatients(id).map(p=>p.id),...(state.externalTreatments||[]).filter(u=>u.donor===id).map(u=>u.recipient)]);
  return state.recipients.filter(p=>ids.has(p.id));
};
const baseExportReport=exportReport;
exportReport=function(action) {
  if(action==='exportRecipientTreatment') {
    const rows=treatmentRows(selected);
    return csv('recipient_treatments_'+selected,['תאריך','נתרמת','מקור','יום מחזור','בנק','קוד תורם','כינוי','מנה','סוג טיפול','איכות ריר','הקפאה','ריכוז x10^6','יחידת ריכוז','תנועה אחוז','תוצאת הריון','תאריך לידה','מספר ילדים','מצב בריאות','מין','הערות'],rows.map(u=>{
      const c=u.clinical||{},d=donor(u.donor),v=state.doses.find(v=>v.id===u.dose);
      return [u.date,u.recipient,u.source,c.cycleDay,u.bank||d?.bank,u.donorCode||d?.external||d?.id,u.donorAlias||d?.alias,u.dose,u.method||u.type,c.mucusQuality,v?.frozen||u.frozen,c.concentration,c.concentrationUnit,c.motility,OUTCOMES[c.outcome]||'',c.birthDate,c.children,c.childHealth,SEXES[c.sex]||'',c.notes||u.note];
    }));
  }
  return baseExportReport(action);
};
const baseAct=act;
act=function(action,id) {
  try {
    ensureRecordExtensions(state);
    if(action==='backRecipients')return go('recipients');
    if(action==='recipientUse')return useForm(null,id);
    if(action==='externalTreatment')return externalTreatmentForm(id);
    if(action==='treatmentFollowup')return treatmentFollowup(id);
    if(action==='recipientDocument')return addDocumentForRecipient(id);
    if(action==='documentView')return documentView(id);
    if(action==='rejectionReason')return approvalForm(id,'blocked',true);
    return baseAct(action,id);
  }catch(err){toast(err.message)}
};
const baseBind=bind;
bind=function() {
  baseBind();
  $$('[data-recipient-tab]').forEach(b=>b.onclick=()=>{recipientTab=b.dataset.recipientTab;render()});
  if($('#recipientSearch'))$('#recipientSearch').oninput=()=>{
    const q=$('#recipientSearch').value.toLowerCase();
    $('#recipientResults').innerHTML=recipientDirectory(state.recipients.filter(p=>[p.id,p.name,cardValue(p,'personal','identity'),cardValue(p,'personal','firstName'),cardValue(p,'personal','lastName')].some(v=>v.toLowerCase().includes(q))));
    $$('#recipientResults [data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action,b.dataset.id));
  };
};
render();
