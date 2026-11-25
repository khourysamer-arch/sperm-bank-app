const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/app.js'),'utf8');
function harness(){
 const elements=new Map();
 const doc={querySelector:s=>{if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',style:{},hidden:false,scrollIntoView(){},focus(){}});return elements.get(s)},querySelectorAll:()=>[],documentElement:{style:{setProperty(){}}},addEventListener(){}};
 class FrozenDate extends Date { constructor(...args){super(...(args.length?args:['2026-11-25T10:00:00Z']))} static now(){return new Date('2026-11-25T10:00:00Z').getTime()} }
 const c=vm.createContext({document:doc,window:{scrollTo(){}},crypto:webcrypto,localStorage:{getItem:()=>null,setItem(){}},console,Date:FrozenDate,Intl,URL,Blob,setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(source,c);
 vm.runInContext("state=seed();modal=(title,body,callback)=>{globalThis.submit=callback};render=()=>{};closeModal=()=>{};toast=()=>{};",c);
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
