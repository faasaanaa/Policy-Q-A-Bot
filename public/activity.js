// Device-local activity, never fabricated or sent to an analytics service.
const types=['question','answer','refund','source','conversation','partial','uncovered','error'];
const counters=()=>Object.fromEntries(types.map(t=>[t,0]));
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function dayKey(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
export function normalizeActivity(raw,now=new Date()){
  const valid=raw&&raw.version===1?raw:{};
  const totals=Object.fromEntries(types.map(t=>[t,count(valid.totals?.[t])]));
  const days=Object.fromEntries(Object.entries(valid.days||{}).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object').sort(([a],[b])=>a.localeCompare(b)).slice(-31).map(([k,v])=>[k,Object.fromEntries(types.map(t=>[t,count(v[t])]))]));
  const recent=Array.isArray(valid.recent)?valid.recent.filter(e=>e&&types.includes(e.type)&&typeof e.at==='string'&&Number.isFinite(Date.parse(e.at))).slice(-12).map(e=>({type:e.type,at:e.at,...(typeof e.question==='string'?{question:e.question.slice(0,200)}:{}),...(Number.isSafeInteger(e.total)&&e.total>=0?{total:e.total}:{}),...(typeof e.filename==='string'?{filename:e.filename.slice(0,100)}:{})})):[];
  return {version:1,startedAt:typeof valid.startedAt==='string'&&Number.isFinite(Date.parse(valid.startedAt))?valid.startedAt:now.toISOString(),sessionId:typeof valid.sessionId==='string'?valid.sessionId.slice(0,80):null,totals,days,recent};
}
export function addActivity(raw,type,detail={},now=new Date()){
  const state=normalizeActivity(raw,now);if(!types.includes(type))return state;
  if(type==='refund'&&(!Number.isSafeInteger(detail.total)||detail.total<0))return state;
  const day=dayKey(now);state.days[day]||=counters();
  state.totals[type]=Math.min(Number.MAX_SAFE_INTEGER,state.totals[type]+1);
  state.days[day][type]=Math.min(Number.MAX_SAFE_INTEGER,state.days[day][type]+1);
  const event={type,at:now.toISOString()};
  if(typeof detail.question==='string')event.question=detail.question.slice(0,200);
  if(type==='refund')event.total=detail.total;
  if(typeof detail.filename==='string')event.filename=detail.filename.slice(0,100);
  state.recent.push(event);return normalizeActivity(state,now);
}
export function activityWeek(raw,now=new Date()){
  const state=normalizeActivity(raw,now);
  return Array.from({length:7},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i,12);const key=dayKey(d);return{date:key,day:d,...counters(),...(state.days[key]||{})};});
}
