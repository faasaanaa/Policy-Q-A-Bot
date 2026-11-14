import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { loadPolicies } from '../src/policy.mjs';
import { answerQuestion } from '../src/answer.mjs';
import { calculateRequest } from '../src/calculate.mjs';

const policies=await loadPolicies();
const samples=[
 {question:'What is the shipping fee in Gilgit-Baltistan?',context:{contactDate:'2026-11-14'}},
 {question:'What is the maximum COD order total on 2026-11-14?'},
 {question:'What is the electronics return window in Lahore?',context:{contactDate:'2026-11-14',deliveryDate:'2026-11-01'}},
 {question:'What is the shipping fee in Lahore on 2027-02-01?'},
 {question:'How long will my refund take?',context:{contactDate:'2026-11-14',paymentMethod:'card'}}
];
const qa=[],calculation=[];
for(const sample of samples)answerQuestion(sample,policies);
for(let pass=0;pass<2;pass++)for(const sample of samples){const start=performance.now();answerQuestion(sample,policies);qa.push(performance.now()-start);}
for(let i=0;i<100;i++){const start=performance.now();calculateRequest({type:'return',contactDate:'2026-11-14',region:'Lahore',items:[{category:'electronics',paidPrice:10000,opened:true},{category:'clothing',paidPrice:3000}]},policies);calculation.push(performance.now()-start);}
function metrics(values){const sorted=[...values].sort((a,b)=>a-b);const at=p=>Number(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)].toFixed(3));return{samples:values.length,p50Ms:at(.5),p95Ms:at(.95)};}
const result={scope:'Local deterministic CPU timings only; excludes HTTP, providers, network, cold starts and rendering.',node:process.version,policyFiles:new Set(policies.map(p=>p.filename)).size,policySections:policies.length,providerCalls:0,qa:metrics(qa),calculation:metrics(calculation)};
await writeFile(new URL('../BENCHMARK.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
