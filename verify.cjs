const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const elements=new Map();const el=s=>{if(!elements.has(s))elements.set(s,{textContent:'',innerHTML:'',value:'',style:{},classList:{toggle(){},add(){},remove(){}},showModal(){},close(){},focus(){},setSelectionRange(){}});return elements.get(s);};
const source=fs.readFileSync('dist/app.js','utf8').split("import('./cloud.js")[0];
function boot(){const context=vm.createContext({console,crypto:{randomUUID},structuredClone,Intl,Date,Number,JSON,Set,Object,Array,String,Math,Error,URL,document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}},location:{hash:''},window:{addEventListener(){}},setTimeout:()=>1,clearTimeout(){}});vm.runInContext(fs.readFileSync('dist/insights.js','utf8'),context);vm.runInContext(source,context);return code=>vm.runInContext(code,context);}
let run=boot();assert.equal(run('state.trades.length'),0);assert.throws(()=>run('save()'),/connected/);run('state=demoState()');assert.equal(run('totals().holdings.length'),5);
assert.equal(run('totals().dividend'),7800);
run(`state=emptyState();state.trades=[{id:'a',type:'buy',symbol:'TEST.N0000',name:'Test',sector:'Banks',qty:100,price:10,fee:10,date:'2026-01-01'},{id:'b',type:'buy',symbol:'TEST.N0000',name:'Test',sector:'Banks',qty:100,price:20,fee:20,date:'2026-02-01'},{id:'c',type:'sell',symbol:'TEST.N0000',name:'Test',sector:'Banks',qty:50,price:25,fee:5,date:'2026-03-01'}];`);
assert.equal(run('totals().realised'),487.5);assert.equal(run('totals().cost'),2272.5);assert.equal(run('totals().missing'),1);
run(`state.quotes['TEST.N0000']={price:22,date:'2026-10-26'}`);assert.equal(run('totals().value'),3300);assert.equal(run('totals().gain'),1027.5);
assert.throws(()=>run(`ledger([{type:'sell',symbol:'X',qty:1,price:1,fee:0,date:'2026-01-01'}])`),/exceeds/);
assert.throws(()=>run(`validate({...state,trades:[...state.trades,{...state.trades[0]}]})`),/duplicate/);
assert.throws(()=>run(`checkDate('2026-02-30')`),/valid date/);
run('state=validate(JSON.parse(JSON.stringify(state)))');assert.equal(run('totals().realised'),487.5);
for(const p of ['overview','holdings','transactions','dividends','watchlist','research','settings'])run(`page='${p}';render()`);
(async()=>{
  run(`cloudReady=true;lastSaved=structuredClone(state);cloud={commit:async(data,expected)=>expected+1};state.dividends.push({id:'save-test',symbol:'TEST.N0000',date:'2026-10-26',amount:100,note:''});`);
  await run('save()');assert.equal(run('revision'),1);assert.equal(run('lastSaved.dividends.length'),1);assert.equal(run('saving'),false);
  run(`cloud={commit:async()=>{throw Error('Offline')},load:async()=>{throw Error('Offline')}};state.dividends.push({id:'unsaved-test',symbol:'TEST.N0000',date:'2026-10-26',amount:200,note:''});`);
  await run('save()');assert.equal(run('state.dividends.length'),1);assert.equal(run('failedDraft.dividends.length'),2);assert.equal(run('revision'),1);
  run(`cloud={commit:async()=>{const e=Error('Changed elsewhere');e.code='portfolio/conflict';throw e;},load:async()=>({data:{...lastSaved,dividends:[]},revision:2})};state.dividends.push({id:'conflict-test',symbol:'TEST.N0000',date:'2026-10-26',amount:300,note:''});`);
  await run('save()');assert.equal(run('state.dividends.length'),0);assert.equal(run('revision'),2);assert.equal(run('failedDraft.dividends.length'),2);
  console.log('Passed: sign-in guard, average cost, sell fees, valuations, oversell protection, backup round trip, all page renders, confirmed cloud saves, failed-save rollback, unsaved backup and conflict recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
