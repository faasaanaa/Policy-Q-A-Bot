import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPolicies } from '../src/policy.mjs';
import { answerQuestion } from '../src/answer.mjs';
import { applyConfiguredModel } from '../src/grounding.mjs';
import { calculateRequest } from '../src/calculate.mjs';
import { percent, roundHalfUp, allocateProportionally, calculateReturn, calculateShipping, calculatePromo } from '../src/calculator.mjs';

const policies = await loadPolicies();
const source = policies.find(p=>p.filename==='01_returns_policy.md'&&p.item==='3.1');
const evidence={filename:source.filename,section:source.item,effectiveDate:source.effectiveDate,excerpt:source.excerpt};
const base={status:'answered',answer:source.excerpt,citations:[{filename:evidence.filename,section:evidence.section,effectiveDate:evidence.effectiveDate}],evidence:[evidence]};
const reply=answer=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({answer,citations:base.citations})}}]})});

test('international shipping asks for a country instead of assuming a rate',()=>{
  const result=answerQuestion({question:'What does international shipping cost?',context:{contactDate:'2026-11-14'}},policies);
  assert.equal(result.status,'clarification_required');assert.equal(result.clarification.field,'region');assert.deepEqual(result.clarification.options.map(o=>o.value),['USA','UK','UAE']);
});

test('unknown required order detail abstains without invented evidence',()=>{
  const result=answerQuestion({question:'Can I return my item?',context:{knownFacts:{contactDate:'not_sure'}}},policies);
  assert.equal(result.status,'not_covered');assert.deepEqual(result.citations,[]);
});

test('429 Retry-After cools Gemini down while Groq still answers', async()=>{
  const original=globalThis.fetch,env={GEMINI_API_KEY:'test',GROQ_API_KEY:'test',ENABLE_GROQ_FALLBACK:'true'};
  let geminiCalls=0,groqCalls=0;
  globalThis.fetch=async url=>String(url).includes('googleapis.com')?(geminiCalls++,{ok:false,status:429,headers:{get:()=> '120'}}):(groqCalls++,reply(source.excerpt));
  try{assert.equal((await applyConfiguredModel(base,'Return conditions?',env)).model,'groq');assert.equal((await applyConfiguredModel(base,'Return conditions?',env)).model,'groq');assert.equal(geminiCalls,1);assert.equal(groqCalls,2);}finally{globalThis.fetch=original;}
});

test('Groq quota cooldown avoids repeated calls and keeps the exact deterministic answer',async()=>{
  const original=globalThis.fetch,env={GROQ_API_KEY:'test',ENABLE_GROQ_FALLBACK:'true'};let calls=0;
  globalThis.fetch=async()=>{calls++;return{ok:false,status:429,headers:{get:()=>new Date(Date.now()+60000).toUTCString()}};};
  try{for(let i=0;i<2;i++){const result=await applyConfiguredModel(base,'Return conditions?',env);assert.equal(result.model,'deterministic');assert.equal(result.answer,base.answer);}assert.equal(calls,1);}finally{globalThis.fetch=original;}
});

test('AI cannot invert a condition, remove part of a sentence, or hide claims in brackets',async t=>{
  for(const [name,answer] of [['negation flip',source.excerpt.replace('must','must not')],['dropped condition','A restocking fee of 15% of the paid price applies.'],['bracket claim',source.excerpt+' [Every return is always approved.]']]){
    await t.test(name,async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>reply(answer);try{const result=await applyConfiguredModel(base,'Return conditions?',{GROQ_API_KEY:'test',ENABLE_GROQ_FALLBACK:'true'});assert.equal(result.model,'deterministic');assert.equal(result.answer,base.answer);}finally{globalThis.fetch=original;}});
  }
});

test('AI never rewrites an unresolved COD contradiction',async()=>{
  const conflict=answerQuestion({question:'What is the maximum COD order total on 2026-11-14?'},policies);
  assert.equal(conflict.status,'partial');const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not be called');};
  try{const result=await applyConfiguredModel(conflict,'COD maximum?',{GEMINI_API_KEY:'test'});assert.equal(calls,0);assert.equal(result.answer,conflict.answer);assert.match(result.answer,/40,000/);assert.match(result.answer,/50,000/);}finally{globalThis.fetch=original;}
});

const validReturn={type:'return',contactDate:'2026-11-14',region:'Lahore',items:[{category:'electronics',paidPrice:10000,opened:true}]};
test('calculator rejects missing or ambiguous fee inputs',async t=>{
  const cases=[['unknown region',{...validReturn,region:'Mars'}],['missing region',{...validReturn,region:undefined}],['string error flag',{...validReturn,errorReturn:'false'}],['string opened flag',{...validReturn,items:[{category:'electronics',paidPrice:10000,opened:'false'}]}],['missing opened state',{...validReturn,items:[{category:'electronics',paidPrice:10000}]}],['invalid calendar date',{...validReturn,contactDate:'2026-99-99'}],['null item',{...validReturn,items:[null]}],['fractional price',{...validReturn,items:[{category:'clothing',paidPrice:10.5}]}]];
  for(const [name,payload] of cases)await t.test(name,()=>assert.throws(()=>calculateRequest(payload,policies)));
});

test('older refund rates use only sources active on the contact date',()=>{
  for(const contactDate of ['2025-09-01','2026-02-01']){const result=calculateRequest({...validReturn,contactDate},policies);assert.equal(result.total,8850);assert.ok(result.evidence.every(e=>e.effectiveDate<=contactDate));assert.ok(result.evidence.some(e=>e.filename==='02_returns_policy_2025.md'&&e.section==='4.1'));}
});

test('return trace cites actual return fee and error waivers',()=>{
  const normal=calculateRequest(validReturn,policies);assert.ok(normal.evidence.some(e=>e.filename==='01_returns_policy.md'&&e.section==='4.1'));
  const sealed=calculateRequest({...validReturn,items:[{category:'electronics',paidPrice:10000,opened:false}]},policies);assert.equal(sealed.total,9800);assert.ok(sealed.evidence.some(e=>e.section==='3.1'));
  const waived=calculateRequest({...validReturn,errorReturn:true},policies);assert.equal(waived.total,10000);assert.ok(waived.evidence.some(e=>e.section==='3.5'));assert.ok(waived.evidence.some(e=>e.section==='4.2'));
});

test('large proportional products and half-up ties remain exact',()=>{
  assert.equal(roundHalfUp(Number.MAX_SAFE_INTEGER,2),4503599627370496);
  assert.equal(percent(Number.MAX_SAFE_INTEGER,15),1351079888211149);
  assert.deepEqual(allocateProportionally(500,[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER]),[250,250]);
  assert.throws(()=>calculateReturn({items:[{paidPrice:Number.MAX_SAFE_INTEGER},{paidPrice:Number.MAX_SAFE_INTEGER}]}),/safe range/);
});

test('shipping does not guess an international destination or coerce flags',()=>{
  const shipping={region:'Lahore',contactDate:'2026-11-14',subtotalAfterDiscount:3000};
  assert.throws(()=>calculateShipping({...shipping,region:'International'}),/USA, UK or UAE/);
  assert.throws(()=>calculateShipping({...shipping,freeShip:'false'}),/boolean/);
  assert.throws(()=>calculateShipping({...shipping,contactDate:'2026-02-01',orderDate:'2026-02-01',freeShip:true}),/not documented/);
  assert.equal(calculateShipping({...shipping,region:'UK'}).total,5500);
});

test('expired, first-order and monthly promo restrictions are enforced',()=>{
  const promo={contactDate:'2026-11-14',orderDate:'2026-11-14',items:[{category:'clothing',price:5000}]};
  assert.throws(()=>calculatePromo({...promo,code:'STYLE15'}),/expired/);
  assert.throws(()=>calculatePromo({...promo,code:'WELCOME10',firstOrder:false}),/first order/);
  assert.throws(()=>calculatePromo({...promo,code:'TECH500',tech500UsedThisMonth:true,items:[{category:'electronics',price:20000}]}),/already/);
});
