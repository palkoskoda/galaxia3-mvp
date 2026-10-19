const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
const compiled = ts.transpileModule(fs.readFileSync('frontend/src/personal/storage.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText;
const moduleScope={exports:{}};
vm.runInNewContext(compiled,{exports:moduleScope.exports,module:moduleScope});
const {readState,storeDraft,STORAGE_KEY}=moduleScope.exports;
const draft=(weekStart='2026-10-19')=>({weekStart,profile:{name:'Test',address:'Testovacia 1',email:'test@example.com'},selections:{[weekStart]:{B:1}},note:'Bez poznámky',sendAt:null});
function memory(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('browser draft survives reload and stores contact details locally',()=>{const storage=memory();storeDraft(storage,draft());const state=readState(storage);assert.equal(state.orders[0].selections['2026-10-19'].B,1);assert.equal(state.profile.address,'Testovacia 1');assert.equal(state.orders[0].status,'draft');});
test('saving a second week preserves first week; updating a week keeps latest selection',()=>{const storage=memory();storeDraft(storage,draft());storeDraft(storage,draft('2026-10-26'));const updated=draft();updated.selections['2026-10-19'].B=2;storeDraft(storage,updated);const state=readState(storage);assert.equal(state.orders.length,2);assert.equal(state.orders.find(o=>o.weekStart==='2026-10-19').selections['2026-10-19'].B,2);assert.equal(state.orders.find(o=>o.weekStart==='2026-10-26').selections['2026-10-26'].B,1);});
test('invalid dates, foreign weeks and invalid quantities cannot enter restored selections',()=>{const storage=memory();const value={version:1,profile:{},orders:[{...draft(),selections:{'2026-10-19':{A:-1,B:1.5,C:21,D:2},'2026-10-25':{A:3},'2026-02-31':{A:4}}},{...draft('2026-02-31')}]};storage.setItem(STORAGE_KEY,JSON.stringify(value));const state=readState(storage);assert.equal(state.orders.length,1);assert.equal(state.orders[0].selections['2026-10-19'].D,2);assert.equal(Object.keys(state.orders[0].selections['2026-10-19']).length,1);assert.equal(state.orders[0].selections['2026-10-25'],undefined);});
test('corrupted stored draft is not silently overwritten',()=>{const storage=memory();storage.setItem(STORAGE_KEY,'broken json');assert.throws(()=>storeDraft(storage,draft()));assert.equal(storage.getItem(STORAGE_KEY),'broken json');});
test('blocked local storage reports failure instead of claiming successful save',()=>{const storage={getItem:()=>null,setItem:()=>{throw new Error('blocked');}};assert.throws(()=>storeDraft(storage,draft()),/blocked/);});
