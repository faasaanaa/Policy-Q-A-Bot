import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActivity, addActivity, activityWeek, dayKey } from '../public/activity.js';

const now=new Date(2026,10,14,12);
test('fresh dashboard has zero real activity and no sample records',()=>{
 const state=normalizeActivity(null,now);assert.ok(Object.values(state.totals).every(n=>n===0));assert.equal(state.recent.length,0);assert.equal(activityWeek(state,now).length,7);assert.ok(activityWeek(state,now).every(d=>d.question===0&&d.answer===0));
});
test('activity types count independently without mutating the prior state',()=>{
 const empty=normalizeActivity(null,now);let state=addActivity(empty,'question',{question:'Shipping fee?'},now);state=addActivity(state,'answer',{},now);state=addActivity(state,'refund',{total:8300},now);state=addActivity(state,'source',{filename:'01_returns_policy.md'},now);state=addActivity(state,'partial',{},now);
 assert.equal(empty.totals.question,0);assert.equal(state.totals.question,1);assert.equal(state.totals.answer,1);assert.equal(state.totals.refund,1);assert.equal(state.totals.source,1);assert.equal(state.totals.partial,1);assert.equal(state.days[dayKey(now)].question,1);
 assert.deepEqual(addActivity(state,'followup',{},now).totals,state.totals);
});
test('invalid or failed refund amounts cannot inflate the successful calculation count',()=>{
 let state=normalizeActivity(null,now);for(const total of [undefined,-1,1.5,NaN,Infinity,'8300'])state=addActivity(state,'refund',{total},now);assert.equal(state.totals.refund,0);assert.equal(state.recent.length,0);state=addActivity(state,'refund',{total:0},now);assert.equal(state.totals.refund,1);
});
test('history retention does not reduce cumulative counters and week ends today',()=>{
 let state=normalizeActivity(null,now);for(let i=0;i<40;i++)state=addActivity(state,'question',{},new Date(2026,9,6+i,12));
 assert.equal(state.totals.question,40);assert.equal(Object.keys(state.days).length,31);assert.equal(state.recent.length,12);const week=activityWeek(state,now);assert.equal(week[0].date,'2026-11-08');assert.equal(week.at(-1).date,'2026-11-14');assert.ok(week.every(d=>d.question===1));
});
test('corrupt local records normalize safely and counters never become NaN',()=>{
 const state=normalizeActivity({version:1,startedAt:{},totals:{question:-1,answer:'12',refund:Infinity},days:{bad:{question:1}},recent:[{type:'source',at:{}},null]},now);assert.ok(Object.values(state.totals).every(n=>n===0));assert.equal(state.recent.length,0);assert.equal(Object.keys(state.days).length,0);
});
test('JSON persistence preserves activity and tracked conversation ID',()=>{
 let state=normalizeActivity(null,now);state.sessionId='local-session';state=addActivity(state,'conversation',{},now);state=addActivity(state,'refund',{total:11300},now);const restored=normalizeActivity(JSON.parse(JSON.stringify(state)),now);assert.deepEqual(restored,state);assert.equal(restored.sessionId,'local-session');
});
