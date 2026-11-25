'use strict';

// UI/UX Pro Max informed presentation layer. Clinical data and workflow rules stay in app.js/records.js.
// Move only the original default accent to the new palette; keep user-selected colors.
if(state.settings.accent==='#24796f')state.settings.accent='#2459C4';
const WORKSPACE_GROUPS=[['ניהול שוטף',['dashboard','donors','doses','recipients']],['בקרה ומעקב',['approvals','blocks','transfers']],['תובנות',['reports']]];
function workspaceNav(id){
  const item=navs.find(n=>n[0]===id);if(!item)return '';
  const active=view===id||view==='donor'&&id==='donors'||view==='recipient'&&id==='recipients';
  const blocked=state.donors.filter(d=>d.status==='blocked').length;
  return `<button class="navbtn ${active?'active':''}" data-nav="${id}" ${active?'aria-current="page"':''}>${icon(item[1],20)}<span>${esc(item[2])}</span>${id==='blocks'&&blocked?`<span class="count red" aria-label="${blocked} תורמים חסומים">${blocked}</span>`:''}</button>`;
}
function searchWorkspaceRecords(query){
  const q=String(query||'').trim().toLocaleLowerCase('he');if(q.length<2)return [];
  const match=values=>values.some(v=>String(v||'').toLocaleLowerCase('he').includes(q));
  return [
    ...state.donors.filter(d=>match([d.id,d.alias,d.bank,d.external])).map(d=>({kind:'donor',id:d.id,title:d.id,label:d.alias,description:'תורם · '+orig[d.origin],icon:'users'})),
    ...state.recipients.filter(p=>match([p.id,p.name])).map(p=>({kind:'recipientDetail',id:p.id,title:p.id,label:p.name,description:'כרטיס נתרמת',icon:'heart'})),
    ...state.doses.filter(d=>match([d.id,d.batch])).map(d=>({kind:'locateDose',id:d.id,title:d.id,label:d.donor,description:'מנה · '+doseStatus[d.status],icon:'vial'}))
  ];
}
function globalSearchMarkup(){return `<div class="global-search">${icon('search',19)}<input id="workspaceSearch" type="search" placeholder="חיפוש תורם, נתרמת או מנה..." aria-label="חיפוש בכל המערכת" autocomplete="off" aria-controls="workspaceSearchResults" aria-expanded="false"><span class="search-hint">חיפוש מהיר</span><div id="workspaceSearchResults" class="global-search-results" hidden></div></div>`;}
render=function(){
  document.documentElement.style.setProperty('--teal',state.settings.accent);
  const title=view==='recipient'?'כרטיס נתרמת':view==='donor'?'כרטיס תורם':navs.find(x=>x[0]===view)?.[2]||'הגדרות המערכת';
  const alertCount=alerts().length;
  $('#app').innerHTML=`<a class="skip-link" href="#workspace-main">דילוג לתוכן הראשי</a><div class="shell">
  <aside class="sidebar" id="workspace-sidebar" aria-label="ניווט ראשי">
    <div class="brand"><div class="brandmark" aria-hidden="true"></div><div><div class="brandname">זרע<span class="brand-period">.</span></div><div class="brandsub">סביבת עבודה לבנק הזרע</div></div><button class="sidebar-close" data-action="menu" aria-label="סגירת ניווט">${icon('close',20)}</button></div>
    <div class="workspace-label"><span class="workspace-dot"></span><span>${esc(state.settings.unit)}</span></div>
    <div class="sidebar-scroll">${WORKSPACE_GROUPS.map(([label,items])=>`<div class="nav-label">${label}</div><nav aria-label="${label}">${items.map(workspaceNav).join('')}</nav>`).join('')}</div>
    <div class="sidebar-bottom"><button class="navbtn ${view==='settings'?'active':''}" data-nav="settings">${icon('settings',20)}<span>הגדרות והתאמה</span></button><button class="navbtn" data-action="help">${icon('help',20)}<span>עזרה ומקורות</span></button>
    <div class="institution"><div class="logo-hospital">${icon('building',20)}</div><div><b>${esc(state.settings.institution)}</b><small>סביבת הדגמה מקומית</small></div></div></div>
  </aside><button class="sidebar-scrim" data-action="menu" aria-label="סגירת תפריט" hidden></button>
  <div class="main"><header class="topbar"><div class="crumb"><button class="menu-btn" data-action="menu" aria-label="פתיחת ניווט" aria-controls="workspace-sidebar" aria-expanded="false">${icon('menu',22)}</button><span class="crumb-home">סביבת העבודה</span><span class="crumb-divider">/</span><b>${esc(title)}</b></div>
    ${globalSearchMarkup()}
    <div class="top-left"><span class="demo">${icon('shield',14)}נתוני הדגמה</span><button class="top-icon" data-nav="blocks" aria-label="התראות${alertCount?' · '+alertCount+' למעקב':''}">${icon('bell',21)}${alertCount?'<i class="notification"></i>':''}</button><div class="operator"><span class="avatar">ב״צ</span><span>בנק הזרע<small>מרחב ניהול</small></span></div></div>
  </header><main id="workspace-main" tabindex="-1" data-view="${esc(view)}"><div class="content">
    ${storageWarning?`<div class="notice bad" role="alert">${esc(storageWarning)}</div>`:''}${content()}
    <footer class="footer-note"><span><span class="footer-brand">זרע.</span> ניהול בנק הזרע, במקום אחד.</span><span>${icon('shield',13)}נתונים מקומיים בדפדפן · ללא סנכרון בין משתמשים</span></footer>
  </div></main></div></div>`;
  bind(); decorateWorkspace();
};
heading=function(title,sub,buttons=''){
  return `<div class="heading"><div class="heading-copy"><div class="eyebrow">${view==='dashboard'?'סביבת עבודה קלינית':'בנק הזרע'}<span>/</span>${esc(state.settings.institution)}</div><h1>${title}</h1><p>${sub}</p></div><div class="actions heading-actions">${buttons}</div></div>`;
};
metric=function(label,value,foot,ic){
  return `<div class="metric" data-metric="${esc(ic)}"><div class="metric-label">${label}<span class="metric-icon">${icon(ic,21)}</span></div><div class="metric-num">${value}</div><div class="metric-foot">${foot}</div></div>`;
};
function dashboardInventory(){
  const available=state.doses.filter(v=>v.status==='available'&&canUse(donor(v.donor))).length;
  const reserved=state.doses.filter(v=>v.status==='reserved'&&canUse(donor(v.donor))).length;
  const hold=state.doses.filter(v=>['available','reserved','quarantine'].includes(v.status)&&(!canUse(donor(v.donor))||v.status==='quarantine')).length;
  return {available,reserved,hold,total:available+reserved+hold};
}
function dashboardAttention(){
  const a=alerts();
  return `<section class="panel attention-panel"><div class="panel-head"><h2>דורש תשומת לב</h2><span class="section-count">${a.length}</span></div>${a.length?a.slice(0,4).map(x=>`<button class="attention-item" data-action="donor" data-id="${esc(x.id)}"><span class="attention-symbol ${x.kind==='wait'?'amber':''}">${icon(x.kind==='bad'?'ban':'clock',17)}</span><span class="attention-copy"><b>${esc(x.title)}</b><span class="attention-description">${esc(x.body)}</span><span class="attention-date">${esc(x.date)}</span></span></button>`).join(''):'<div class="empty">אין התראות פתוחות</div>'}<div class="panel-tail"><button class="btn text" data-nav="blocks">לכל החסימות וההתראות</button></div></section>`;
}
function dashboardStock(){
  const k=dashboardInventory(),a=k.total?k.available/k.total*100:0,b=k.total?(k.available+k.reserved)/k.total*100:0;
  return `<section class="panel stock-panel"><div class="panel-head"><div><h2>מלאי ביחידה</h2><p>מנות נותרות לפי מצב שימוש</p></div>${icon('vial',20)}</div><div class="stock-overview"><div class="donut" role="img" aria-label="${k.total} מנות ביחידה: ${k.available} זמינות, ${k.reserved} שמורות, ${k.hold} בהמתנה או חסימה" style="background:conic-gradient(var(--teal) 0 ${a}%,#91B6E7 0 ${b}%,#E1E7EF 0 100%)"><div class="donut-value">${k.total}<small>מנות ביחידה</small></div></div><div class="stock-legend"><div><i style="background:var(--teal)"></i><span>זמינות לשימוש</span><b>${k.available}</b></div><div><i style="background:#91B6E7"></i><span>שמורות לנתרמות</span><b>${k.reserved}</b></div><div><i style="background:#E1E7EF"></i><span>בהמתנה / חסימה</span><b>${k.hold}</b></div></div></div><div class="panel-tail"><button class="btn text" data-nav="doses">לניהול מלאי המנות</button></div></section>`;
}
dashboard=function(){
  const blocked=state.donors.filter(d=>d.status==='blocked').length;
  const dateLabel=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jerusalem'}).format(new Date());
  const quick=[['addDose','vial','קליטת מנות','הוספת תרומה או משלוח'],['use','heart','רישום טיפול','קישור מנה לנתרמת'],['addRecipient','users','כרטיס נתרמת','פתיחת תיק ומעקב'],['mohImport','shield','עדכון רגולטורי','קליטת החלטה ואסמכתה']];
  return heading('תמונת מצב','כל התורמים, המנות והמעקב הקליני — בתצוגה אחת.',btn('ייצוא דוח','exportSummary','download')+btn('הוספת תורם','addDonor','plus',true))+
    `<div class="overview-caption"><span>${dateLabel}</span><span class="local-state">${icon('clock',14)}תמונת מצב מהנתונים המקומיים</span></div>`+metrics()+
    (blocked?`<div class="banner"><span class="banner-icon">${icon('ban',20)}</span><div><strong>${blocked===1?'תורם אחד חסום לשימוש':blocked+' תורמים חסומים לשימוש'}</strong><span>מנות ועוברים הקשורים לתורם מסומנים למעקב. רישום שימוש חדש במנות חסום.</span></div><button class="btn small" data-nav="blocks">בדיקת חסימות</button></div>`:'')+
    `<div class="dashboard-grid"><div class="dashboard-primary"><section class="panel donor-panel"><div class="panel-head"><div class="section-heading"><span class="section-icon">${icon('users',20)}</span><div><h2>מאגר התורמים <span class="inline-total">${state.donors.length}</span></h2><p>סטטוס שימוש, מלאי ונתרמות פעילות</p></div></div><button class="btn small" data-nav="donors">לכל התורמים</button></div>${filterBar(false)}${donorTable(true)}</section>
    <section class="quick-section"><div class="section-subtitle"><h2>פעולות יומיומיות</h2><span>גישה מהירה לתהליכי העבודה</span></div><div class="quick-grid">${quick.map(([action,ic,title,sub])=>`<button class="quick-card" data-action="${action}"><span class="quick-icon">${icon(ic,22)}</span><span><b>${title}</b><small>${sub}</small></span></button>`).join('')}</div></section>
    <section class="panel activity-panel"><div class="panel-head"><h2>פעילות אחרונה</h2><span class="last-update">יומן הפעולות המקומי</span></div><div class="activity-list">${[...state.audit].reverse().slice(0,4).map(a=>`<div class="activity"><span class="activity-icon">${icon(a.action.includes('חסימ')||a.action.includes('רג׳קט')?'ban':'file',17)}</span><div><p>${esc(a.action)}</p><small>${fmt(a.time)} · ${esc(a.by)}</small></div></div>`).join('')}</div></section></div>
    <aside class="dashboard-aside">${dashboardAttention()}${dashboardStock()}<section class="panel regulatory-panel"><div class="panel-head"><div class="section-heading"><span class="regulatory-icon">${icon('shield',21)}</span><h2>משרד הבריאות</h2></div></div><div class="regulatory-body"><div class="last-update-label">עדכון מתועד אחרון</div><b class="regulatory-date">${fmt(state.mohUpdates.at(-1)?.date)}</b><p>קליטת החלטות ואסמכתאות ידנית או מקובץ. אין חיבור חי למשרד הבריאות.</p><button class="btn" data-nav="approvals">לאישורים ועדכונים</button></div></section></aside></div>`;
};
const donorTableBeforeRedesign=donorTable;
donorTable=function(compact=false){
  return donorTableBeforeRedesign(compact).replaceAll(icon('chevron',15),icon('file',15)).replace('<div id="donorTable">',`<div id="donorTable" class="${compact?'compact-donors':'full-donors'}">`);
};
function decorateWorkspace(){
  $$('.table-wrap').forEach(w=>{w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label','טבלת נתונים — ניתן לגלול אופקית לפי הצורך')});
  $$('.detail-tabs button').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('active')?'true':'false'));
  $$('.metric-num').forEach(n=>n.setAttribute('dir','auto'));
}
const bindBeforeWorkspace=bind;
bind=function(){
  bindBeforeWorkspace();
  const input=$('#workspaceSearch'),result=$('#workspaceSearchResults');
  if(input&&result){
    const close=()=>{result.hidden=true;input.setAttribute('aria-expanded','false')};
    const openResults=()=>{
      const q=input.value.trim();if(q.length<2){close();return;}
      const rows=searchWorkspaceRecords(q);
      result.innerHTML=`<div class="search-result-heading">${rows.length?'תוצאות חיפוש · '+rows.length:'לא נמצאו רשומות'}</div>`+rows.slice(0,7).map(r=>`<button class="global-result" data-search-action="${r.kind}" data-id="${esc(r.id)}"><span class="result-icon">${icon(r.icon,19)}</span><span><b><bdi>${esc(r.title)}</bdi> <span>${esc(r.label)}</span></b><small>${esc(r.description)}</small></span></button>`).join('');
      result.hidden=false;input.setAttribute('aria-expanded','true');
      result.querySelectorAll('[data-search-action]').forEach(b=>b.onclick=()=>{close();act(b.dataset.searchAction,b.dataset.id)});
    };
    input.oninput=openResults;
    input.onkeydown=e=>{if(e.key==='Escape'){close();return;}if(e.key==='ArrowDown'){const first=result.querySelector('button');if(first){e.preventDefault();first.focus()}}if(e.key==='Enter'){const first=result.querySelector('button');if(first){e.preventDefault();first.click()}}};
    result.onkeydown=e=>{const rows=[...result.querySelectorAll('button')],i=rows.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();rows[(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length]?.focus()}if(e.key==='Escape'){close();input.focus()}};
  }
};
const actBeforeWorkspace=act;
act=function(action,id){
  if(action==='menu'){
    const sidebar=$('.sidebar'),open=sidebar.classList.toggle('open'),scrim=$('.sidebar-scrim');
    if(scrim)scrim.hidden=!open;
    $('.menu-btn')?.setAttribute('aria-expanded',String(open));
    if(open)sidebar.querySelector('.navbtn.active')?.focus();else $('.menu-btn')?.focus();return;
  }
  if(action==='locateDose'){
    go('doses');const input=$('#doseSearch');if(input){input.value=id;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}return;
  }
  return actBeforeWorkspace(action,id);
};
document.addEventListener('click',e=>{if(!e.target.closest?.('.global-search')){const result=$('#workspaceSearchResults');if(result){result.hidden=true;$('#workspaceSearch')?.setAttribute('aria-expanded','false')}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const result=$('#workspaceSearchResults');if(result){result.hidden=true;$('#workspaceSearch')?.setAttribute('aria-expanded','false')}const sidebar=$('.sidebar');if(sidebar?.classList.contains('open'))act('menu')}});
render();
