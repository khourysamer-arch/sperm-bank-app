const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const recordsSource=fs.readFileSync(require('node:path').join(__dirname,'../dist/records.js'),'utf8');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/app.js'),'utf8');
function harness(){
 const elements=new Map();
 const doc={querySelector:s=>{if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',style:{},hidden:false,scrollIntoView(){},focus(){}});return elements.get(s)},querySelectorAll:()=>[],documentElement:{style:{setProperty(){}}},addEventListener(){}};
 class FrozenDate extends Date { constructor(...args){super(...(args.length?args:['2026-11-25T10:00:00Z']))} static now(){return new Date('2026-11-25T10:00:00Z').getTime()} }
 const c=vm.createContext({document:doc,window:{scrollTo(){}},crypto:webcrypto,localStorage:{getItem:()=>null,setItem(){}},console,Date:FrozenDate,Intl,URL,Blob,atob,btoa,TextDecoder,setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(source,c);
 vm.runInContext(recordsSource,c);
 vm.runInContext("state=ensureInseminationNumbers(ensureRecordExtensions(seed()));modal=(title,body,callback)=>{globalThis.submit=callback};render=()=>{};closeModal=()=>{};toast=()=>{};",c);
 return {run:code=>vm.runInContext(code,c),submit:f=>{c.form=f;return vm.runInContext('submit(form)',c)}};
}
const use=(dose='V-10005',recipient='R-2402')=>({dose,recipient,type:'IUI',date:'2026-11-25',cycle:'TEST-CYCLE',note:'test'});
test('synthetic seed is restorable and all used doses match their treatment',()=>{const h=harness();assert.equal(h.run('validateBackup(JSON.parse(JSON.stringify(state))).doses.length'),96)});
test('blocked donor use fails without changing dose or treatment count',()=>{const h=harness();h.run("useForm('V-10205')");assert.throws(()=>h.submit(use('V-10205')),/התורם חסום/);assert.equal(h.run('state.uses.length'),18);assert.equal(h.run("state.doses.find(x=>x.id==='V-10205').status"),'available')});
test('approved use consumes exactly one dose and links recipient',()=>{const h=harness();h.run("useForm('V-10005')");h.submit(use());assert.equal(h.run('state.uses.length'),19);assert.equal(h.run("state.doses.find(x=>x.id==='V-10005').status"),'used');assert.equal(h.run("state.doses.find(x=>x.id==='V-10005').recipient"),'R-2402');assert.throws(()=>h.submit(use()),/متاح|אינה זמינה|כבר נרשם/)});
test('expired approval blocks use even if donor status says active',()=>{const h=harness();h.run("state.approvals.find(a=>a.donor==='BZ-1042').expires='2026-10-01';useForm('V-10005')");assert.throws(()=>h.submit(use()),/אישור/)});
test('reservation cannot be consumed by another recipient',()=>{const h=harness();h.run("useForm('V-10004')");assert.throws(()=>h.submit(use('V-10004','R-2403')),/שמורה לנתרמת אחרת/)});
test('latest pending decision supersedes older valid approval',()=>{const h=harness();h.run("state.approvals.push({id:'PENDING',donor:'BZ-1042',decision:'pending',date:'2026-11-20',received:'2026-11-20'});useForm('V-10005')");assert.throws(()=>h.submit(use()),/אישור/)});
test('a blocked donor cannot be exported to another bank',()=>{const h=harness();h.run("transferForm('BZ-1031')");assert.throws(()=>h.submit({donor:'BZ-1031',date:'2026-11-25',bank:'Test Bank',ref:'TEST',doseIds:'V-10205',note:''}),/חסום/);assert.equal(h.run("state.doses.find(x=>x.id==='V-10205').status"),'available')});
test('mixed valid and unavailable transfer IDs produce no partial mutation',()=>{const h=harness();h.run("transferForm('BZ-1042')");assert.throws(()=>h.submit({donor:'BZ-1042',date:'2026-11-25',bank:'Test',ref:'TEST',doseIds:'V-10005,V-10001',note:''}),/זמינות/);assert.equal(h.run("state.doses.find(x=>x.id==='V-10005').status"),'available')});
test('quarantined dose requires valid approval before release',()=>{const h=harness();h.run("manageDose('V-10405')");assert.throws(()=>h.submit({status:'available',recipient:'',location:'Test',reason:'Test'}),/אישור/);assert.equal(h.run("state.doses.find(x=>x.id==='V-10405').status"),'quarantine')});
test('negative remaining embryo inventory is rejected',()=>{const h=harness();h.run("embryoForm('BZ-1042')");assert.throws(()=>h.submit({donor:'BZ-1042',recipient:'R-2402',date:'2026-11-25',cycle:'NEW',created:'2',used:'3',discarded:'0',location:'TEST',note:'TEST'}),/לעלות/)});
test('backup validation rejects duplicate identifiers, broken references and impossible counts',()=>{for(const mutation of ["state.donors.push({...state.donors[0]})","state.uses[0].donor='MISSING'","state.embryos[0].used=999"]){const h=harness();h.run(mutation);assert.throws(()=>h.run('validateBackup(state)'))}});
test('CSV handles quoted commas, CRLF and BOM; unknown donor import fails',()=>{const h=harness();h.run('globalThis.text="\\uFEFFdonor_code,decision,decision_date,received_date,reference,reason,expires\\r\\nBZ-1042,blocked,2026-11-25,2026-11-25,TEST,\\\"reason, details\\\",\\r\\n"');assert.equal(h.run('validateMoh(csvParse(text))[0].reason'),'reason, details');h.run("text=text.replace('BZ-1042','MISSING')");assert.throws(()=>h.run('validateMoh(csvParse(text))'),/לא קיים/)});

test('recipient card retains existing fields and saves structured Appendix D sections',()=>{
 const h=harness();h.run("recipientForm('R-2402')");
 h.submit({id:'R-2402',name:'Synthetic card',status:'active',opened:'2026-05-02',notes:'Demo',card_personal_firstName:'Demo',card_personal_lastName:'Card',card_personal_phone:'000-0000',card_parents_bioFatherFirst:'Synthetic parent',card_partner_firstName:'Synthetic partner',card_appearance_height:'165',card_labs_hiv_result:'ממתין לתוצאה',card_labs_hiv_date:'2026-11-20'});
 assert.equal(h.run("patient('R-2402').card.parents.bioFatherFirst"),'Synthetic parent');
 assert.equal(h.run("patient('R-2402').card.labs.hiv_result"),'ממתין לתוצאה');
 assert.equal(h.run("validateBackup(JSON.parse(JSON.stringify(state))).recipients.length"),16);
});
test('nonnumeric physical description cannot be saved as height; no partial recipient edit',()=>{
 const h=harness();h.run("recipientForm('R-2402')");
 assert.throws(()=>h.submit({id:'R-2402',name:'Changed',status:'active',opened:'2026-05-02',card_appearance_height:'שחום'}),/מספרי/);
 assert.equal(h.run("patient('R-2402').name"),'נתרמת הדגמה 2');
});
test('followup records preserve dose status and usage count',()=>{
 const h=harness();h.run("treatmentFollowup('U-0-1')");
 h.submit({clinical_cycleDay:'8',clinical_concentration:'24.5',clinical_concentrationUnit:'per_ml',clinical_motility:'40',clinical_outcome:'positive',clinical_sex:'unknown',clinical_notes:'Demo followup',sourceNote:'Synthetic source'});
 assert.equal(h.run('state.uses.length'),18);
 assert.equal(h.run("state.doses.find(v=>v.id==='V-10002').status"),'used');
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-1').clinical.motility"),'40');
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-1').followupHistory.length"),1);
});
test('invalid motility is rejected before consuming a local vial',()=>{
 const h=harness();h.run("useForm('V-10005')");
 assert.throws(()=>h.submit({...use(),clinical_motility:'101'}),/תנועה/);
 assert.equal(h.run("state.doses.find(v=>v.id==='V-10005').status"),'available');
});
test('external historical treatment records do not consume inventory',()=>{
 const h=harness();h.run("externalTreatmentForm('R-2402')");
 h.submit({recipient:'R-2402',date:'2026-01-10',bank:'Synthetic outside bank',donor:'',donorCode:'DEMO-EXT',donorAlias:'Demo',method:'AID',cycle:'HIST-1',frozen:'2025-12-01',note:'Synthetic external record',clinical_outcome:'unknown'});
 assert.equal(h.run('state.externalTreatments.length'),1);
 assert.equal(h.run('state.uses.length'),18);
 assert.equal(h.run("state.doses.filter(v=>v.status==='used').length"),18);
 assert.equal(h.run("treatmentRows('R-2402').some(u=>u.source==='external')"),true);
});
test('clinical delivery outcome requires a plausible date and child count',()=>{
 const h=harness();assert.throws(()=>h.run("validateClinical({outcome:'birth',children:'1'},'2026-01-01')"),/נדרשים/);
 assert.throws(()=>h.run("validateClinical({outcome:'birth',children:'1',birthDate:'2025-01-01'},'2026-01-01')"),/קודם/);
});
test('document backups preserve text bytes and reject executable MIME types',()=>{
 const h=harness();h.run("state.documents.push({id:'DOC-test',filename:'demo.txt',mime:'text/plain',size:4,dataUrl:'data:text/plain;base64,RGVtbw==',added:'2026-11-25T10:00:00Z',ownerType:'recipient',ownerId:'R-2402'})");
 assert.equal(h.run('validateBackup(JSON.parse(JSON.stringify(state))).documents[0].dataUrl'),'data:text/plain;base64,RGVtbw==');
 h.run("state.documents[0].mime='text/html'");assert.throws(()=>h.run('validateBackup(state)'),/נתמכים/);
});
test('documents cannot reference a different donor decision or a nonexistent recipient',()=>{
 for(const owner of ["{ownerType:'recipient',ownerId:'MISSING'}","{ownerType:'donor',ownerId:'BZ-1042',approvalId:'AP-BLOCK'}"]){
  const h=harness();h.run("state.documents=[{id:'DOC-t',filename:'demo.txt',mime:'text/plain',size:4,dataUrl:'data:text/plain;base64,RGVtbw==',added:'2026-11-25T10:00:00Z',..."+owner+"}]");assert.throws(()=>h.run('validateBackup(state)'));
 }
});
test('reject reason is appended as a decision and remains multiline',async()=>{
 const h=harness();h.run("approvalForm('BZ-1031','blocked',true)");
 await h.submit({donor:'BZ-1031',decision:'blocked',date:'2026-11-25',received:'2026-11-25',expires:'',ref:'DEMO-REJECT-2',note:'First demo line\nSecond demo line'});
 assert.equal(h.run("donor('BZ-1031').blockReason"),'First demo line\nSecond demo line');
 assert.equal(h.run("donor('BZ-1031').status"),'blocked');
 assert.equal(h.run("state.approvals.filter(a=>a.donor==='BZ-1031'&&a.decision==='blocked').length"),2);
});
test('adding an ordinary approval never silently releases an existing donor rejection',async()=>{
 const h=harness();h.run("approvalForm('BZ-1031')");
 await h.submit({donor:'BZ-1031',decision:'approved',date:'2026-11-25',received:'2026-11-25',expires:'2027-12-31',ref:'DEMO-APPROVAL',note:'Synthetic ordinary approval'});
 assert.equal(h.run("canUse(donor('BZ-1031'))"),false);
});

test('full parent names fall back to previous split fields without deleting them',()=>{
 const h=harness();h.run("patient('R-2402').card={parents:{bioFatherFirst:'Synthetic',bioFatherLast:'Parent',bioMotherFirst:'Demo',bioMotherLast:'Mother',stepFatherFirst:'Step',stepFatherLast:'Parent'}}");
 assert.equal(h.run("cardValue(patient('R-2402'),'parents','bioFatherFull')"),'Synthetic Parent');
 assert.equal(h.run("cardValue(patient('R-2402'),'parents','bioMotherFull')"),'Demo Mother');
 assert.equal(h.run("cardValue(patient('R-2402'),'parents','stepFatherFull')"),'Step Parent');
 h.run("recipientForm('R-2402')");h.submit({id:'R-2402',name:'Synthetic card',status:'active',opened:'2026-05-02',card_parents_bioFatherFull:'Explicit Full Name'});
 assert.equal(h.run("patient('R-2402').card.parents.bioFatherFirst"),'Synthetic');
 assert.equal(h.run("cardValue(patient('R-2402'),'parents','bioFatherFull')"),'Explicit Full Name');
});
test('family tables expose ten and fifteen blank slots without creating stored relatives',()=>{
 const h=harness();assert.equal(h.run("relativeRows(patient('R-2402'),'siblings').length"),10);
 assert.equal(h.run("relativeRows(patient('R-2402'),'descendants').length"),15);
 assert.equal(h.run("relativeRows(patient('R-2402'),'siblings').filter(r=>r.member).length"),0);
 assert.equal(h.run("patient('R-2402').relatives"),undefined);
});
test('family form saves populated rows only, preserves identifiers and retains previous version',()=>{
 const h=harness();h.run("editRelativesForm('R-2402')");
 h.submit({sibling_unused:'',siblings_0_fullName:'Synthetic sibling',siblings_0_relationship:'אחות',siblings_0_birthYear:'1980',siblings_0_identity:'DEMO-SIB',siblings_1_fullName:'',descendants_0_fullName:'Synthetic niece',descendants_0_relationship:'אחיינית',descendants_0_parentName:'Synthetic sibling',descendants_0_birthYear:'2005',familySource:'Synthetic source'});
 assert.equal(h.run("patient('R-2402').relatives.siblings.length"),1);assert.equal(h.run("patient('R-2402').relatives.descendants.length"),1);
 const id=h.run("patient('R-2402').relatives.siblings[0].id");h.run("editRelativesForm('R-2402')");
 h.submit({siblings_0_id:id,siblings_0_fullName:'Updated synthetic sibling',siblings_0_relationship:'אחות'});
 assert.equal(h.run("patient('R-2402').relatives.siblings[0].id"),id);
 assert.equal(h.run("patient('R-2402').relativesHistory.length"),2);
 assert.equal(h.run("patient('R-2402').relativesHistory[1].previous.descendants.length"),1);
 assert.equal(h.run("validateBackup(JSON.parse(JSON.stringify(state))).recipients.find(p=>p.id==='R-2402').relatives.siblings.length"),1);
});
test('invalid family rows do not partially replace saved relatives',()=>{
 const h=harness();h.run("patient('R-2402').relatives={siblings:[{id:'REL-old',fullName:'Existing demo sibling'}],descendants:[]};editRelativesForm('R-2402')");
 assert.throws(()=>h.submit({siblings_0_fullName:'New demo sibling',siblings_0_birthYear:'2027'}),/שנת לידה/);
 assert.equal(h.run("patient('R-2402').relatives.siblings[0].id"),'REL-old');
});
test('additional relatives beyond the printed template fit and roundtrip',()=>{
 const h=harness();h.run("patient('R-2402').relatives={siblings:Array.from({length:12},(_,i)=>({id:'S-'+i,fullName:'Sibling '+i})),descendants:Array.from({length:17},(_,i)=>({id:'D-'+i,fullName:'Descendant '+i}))}");
 assert.equal(h.run("relativeRows(patient('R-2402'),'siblings').length"),12);
 assert.equal(h.run("relativeRows(patient('R-2402'),'descendants').length"),17);
 assert.equal(h.run("validateBackup(JSON.parse(JSON.stringify(state))).recipients.find(p=>p.id==='R-2402').relatives.descendants.length"),17);
});
test('IUI and AID share per-recipient numbering while IVF is excluded',()=>{
 const h=harness();h.run("state.externalTreatments.push({id:'EXT-IUI',recipient:'R-2401',date:'2026-01-01',type:'IUI',method:'AID',bank:'Demo bank',donor:'',donorCode:'DEMO'});ensureInseminationNumbers(state)");
 assert.equal(h.run("state.externalTreatments[0].inseminationNumber"),3);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-0').inseminationNumber"),1);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-1').inseminationNumber"),undefined);
 assert.equal(h.run("inseminationRows('R-2401').filter(r=>r.treatment).length"),3);
 assert.equal(h.run("inseminationRows('R-2401').length"),5);
});
test('editing insemination numbers rejects duplicates before any clinical update',()=>{
 const h=harness();h.run("editInseminationForm('U-0-2')");
 assert.throws(()=>h.submit({inseminationNumber:'1',clinical_cycleDay:'9',clinical_outcome:'positive',sourceNote:'Demo source'}),/כבר קיים/);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-2').inseminationNumber"),2);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-2').clinical"),undefined);
});
test('insemination update persists the number and followup without consuming another dose',()=>{
 const h=harness();h.run("editInseminationForm('U-0-2')");
 h.submit({inseminationNumber:'4',clinical_cycleDay:'9',clinical_mucusQuality:'טוב',clinical_concentration:'20',clinical_concentrationUnit:'per_ml',clinical_motility:'50',clinical_outcome:'positive',sourceNote:'Synthetic followup'});
 assert.equal(h.run('state.uses.length'),18);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-2').inseminationNumber"),4);
 assert.equal(h.run("state.uses.find(u=>u.id==='U-0-2').clinical.cycleDay"),'9');
 assert.equal(h.run("state.doses.find(v=>v.id==='V-10003').status"),'used');
 assert.equal(h.run("validateBackup(JSON.parse(JSON.stringify(state))).uses.find(u=>u.id==='U-0-2').inseminationNumber"),4);
});
test('backup validation rejects duplicate IUI numbers and invalid family relationships',()=>{
 const h=harness();h.run("state.uses.find(u=>u.id==='U-0-2').inseminationNumber=1");assert.throws(()=>h.run('validateBackup(state)'),/כפול/);
 const family=harness();family.run("patient('R-2402').relatives={siblings:[{id:'X',fullName:'Demo',relationship:'אחיינית'}],descendants:[]}");assert.throws(()=>family.run('validateBackup(state)'),/קרבה/);
});
