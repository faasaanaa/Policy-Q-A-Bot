import { languages, localeFor, translate, guidedQuestions, optionLabel } from './locales.js';
import { isNearBottom, activeClarification, evidenceLabel, answerSegments, readableAnswer, shouldCollapseAnswer } from './chat-core.js';
import { normalizeActivity, addActivity, activityWeek } from './activity.js';
import { printDocument, wordBytes } from './export.js';

const root = document.querySelector('#view-root');
const storageKey = 'novacart-intelligence-conversation-v1';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
const stored = read(storageKey, {});
let messages = Array.isArray(stored.messages) ? stored.messages.filter(m => ['user','assistant'].includes(m.role) && typeof m.text === 'string').slice(-40) : [];
let flow = stored.flow && typeof stored.flow.question === 'string' ? stored.flow : null;
let locale = localeFor(read('nova-language', 'en')).code;
let theme = read('nova-theme', 'light') === 'dark' ? 'dark' : 'light';
const activityKey='novacart-local-activity-v1';
let sharedActivity=Boolean(navigator.locks?.request);
let activity=normalizeActivity(sharedActivity?read(activityKey,null):null);
let activityQueue=Promise.resolve(),tabSessionId=null;
try{if(sharedActivity)tabSessionId=sessionStorage.getItem('nova-chat-session');}catch{}
let view = 'dashboard', service = null, library = null, sending = false, requestController = null, requestVersion = 0;
let searchOpen = false, searchText = '', toastTimer, selectedDocument = '', draft = '';
const expanded = new Set();
const navMedia = matchMedia('(max-width: 760px)');
const t = key => translate(locale, key);
const paths = {
 dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 chat:'M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.3A8.5 8.5 0 1 1 21 11.5Z M8 11.5h.01M12 11.5h.01M16 11.5h.01',
 book:'M4 4a2 2 0 0 1 2-2h14v17H6a2 2 0 0 0-2 2V4ZM4 19h16M8 6h8M8 10h8M8 14h5',
 calculator:'M5 2h14v20H5zM8 5h8v4H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
 arrow:'M5 12h14M13 6l6 6-6 6',up:'M12 19V5M6 11l6-6 6 6',close:'m6 6 12 12M18 6 6 18',
 search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 download:'M12 3v12M6 9l6 6 6-6M4 16v5h16v-5',copy:'M8 8h12v12H8zM15 8V3H3v12h5',
 globe:'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0ZM3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z',
 moon:'M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z',
 sun:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
 menu:'M4 6h16M4 12h16M4 18h16',stop:'M6 6h12v12H6z',plus:'M12 5v14M5 12h14',
 shield:'M12 2 4 5v6c0 5 8 11 8 11s8-6 8-11V5l-8-3ZM8 11l3 3 5-5'
};
function h(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
function icon(name) { const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('aria-hidden','true');const p=document.createElementNS(n.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.chat);n.append(p);return n; }
function button(text, cls, action, symbol) {const b=h('button',cls);b.type='button';if(symbol)b.append(icon(symbol));b.append(h('span','button-label',text));b.setAttribute('aria-label',text);b.title=text;if(action)b.addEventListener('click',action);return b;}
function persist(){save(storageKey,{messages:messages.slice(-40),flow});}
function recordActivity(type,detail={}){const at=new Date();activityQueue=activityQueue.then(async()=>{let ran=false;const update=()=>{ran=true;activity=addActivity(sharedActivity?read(activityKey,activity):activity,type,detail,at);if(sharedActivity)save(activityKey,activity);};try{if(sharedActivity)await navigator.locks.request(activityKey,update);else update();}catch{if(!ran){sharedActivity=false;activity=normalizeActivity(null);tabSessionId=null;update();}}refreshDashboardActivity();}).catch(()=>{});return activityQueue;}
function startTrackedSession(){if(!tabSessionId){tabSessionId=crypto.randomUUID();try{if(sharedActivity)sessionStorage.setItem('nova-chat-session',tabSessionId);}catch{}recordActivity('conversation');}}
function refreshDashboardActivity(){if(view!=='dashboard')return;const host=h('div');renderDashboard(host);const fresh=host.firstElementChild;root.querySelectorAll('[data-dynamic]').forEach(current=>{const next=fresh.querySelector('[data-dynamic="'+current.dataset.dynamic+'"]');if(next)current.replaceChildren(...next.childNodes);});}
function mobileNav(open,restoreFocus=true){const sidebar=document.querySelector('#sidebar'),wasOpen=sidebar.classList.contains('open');open=Boolean(open&&navMedia.matches);sidebar.classList.toggle('open',open);sidebar.inert=navMedia.matches&&!open;document.querySelector('#mobile-shade').hidden=!open;document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));if(open)sidebar.querySelector('a,button')?.focus();else if(wasOpen&&restoreFocus)document.querySelector('#menu-toggle').focus();}
function statusText(){return sending?t('checking'):service?t('ready'):t('retry');}
function updateShell(){
 const language=localeFor(locale);document.documentElement.lang=locale;document.documentElement.dir=language.dir;document.documentElement.dataset.theme=theme;
 document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
 document.querySelector('#sidebar-note').textContent=t('original');
 document.querySelector('#language-select').value=locale;
 document.querySelector('#theme-toggle').replaceChildren(icon(theme==='dark'?'sun':'moon'));document.querySelector('#theme-toggle').title=t('theme');document.querySelector('#theme-toggle').setAttribute('aria-label',t('theme'));
 document.querySelector('#view-title').textContent=t(view==='assistant'?'chat':view);
 document.querySelectorAll('[data-view]').forEach(n=>{n.classList.toggle('active',n.dataset.view===view);n.setAttribute('aria-current',n.dataset.view===view?'page':'false');});
 document.querySelector('#service-status').textContent=statusText();
 document.querySelector('#provider-state').textContent=service?[service.providers?.geminiConfigured?'Gemini':null,service.providers?.groqFallbackEnabled?'Groq':null,'Evidence'].filter(Boolean).join(' · '):'Evidence engine';
 document.querySelector('#provider-indicator').classList.toggle('ready',Boolean(service));
 if(service)document.querySelector('#library-count').textContent=service.policyFiles;
}
function setView(next,preserveDraft=true){if(preserveDraft)draft=document.querySelector('#question-input')?.value??draft;view=['dashboard','library','calculator'].includes(next)?next:'assistant';mobileNav(false);history.replaceState(null,'','#'+view);updateShell();renderView();}
function renderView(){root.replaceChildren();if(view==='dashboard')renderDashboard();else if(view==='library')renderLibrary();else if(view==='calculator')renderCalculator();else renderAssistant();}
function number(value){try{return new Intl.NumberFormat(locale).format(value);}catch{return String(value);}}
function localDate(date,options){try{return new Intl.DateTimeFormat(locale,options).format(date);}catch{return new Intl.DateTimeFormat('en',options).format(date);}}
function openAssistant(){setView('assistant');document.querySelector('#question-input')?.focus();}
function renderDashboard(target=root){
 const page=h('section','tool-page dashboard-page');
 const hero=h('section','dashboard-hero'),copy=h('div','dashboard-hero-copy');
 copy.append(h('h1','',t('dashboardTitle')),h('p','',t('dashboardIntro')));
 const actions=h('div','dashboard-hero-actions');actions.append(button(t('askNova'),'hero-primary',openAssistant,'chat'),button(t('calculator'),'hero-secondary',()=>setView('calculator'),'calculator'));copy.append(actions);
 const art=h('div','dashboard-visual');art.setAttribute('aria-hidden','true');
 art.innerHTML='<svg viewBox="0 0 360 240" class="nova-orbit"><defs><radialGradient id="novaGlow"><stop stop-color="#6f9cff" stop-opacity=".55"/><stop offset="1" stop-color="#6f9cff" stop-opacity="0"/></radialGradient><linearGradient id="novaCore" x2="1" y2="1"><stop stop-color="#8fe4f4"/><stop offset="1" stop-color="#80a4ff"/></linearGradient></defs><circle cx="180" cy="120" r="117" fill="url(#novaGlow)" stroke="none"/><g class="orbit-ring"><ellipse cx="180" cy="120" rx="143" ry="78" transform="rotate(-24 180 120)" fill="none" stroke="#8eb2fa" stroke-opacity=".35"/><circle cx="311" cy="78" r="5" fill="#bde8ff" stroke="none"/></g><ellipse cx="180" cy="120" rx="111" ry="101" fill="none" stroke="#9bc7ff" stroke-opacity=".2"/><g class="nova-core"><rect x="126" y="66" width="108" height="108" rx="32" fill="url(#novaCore)" stroke="none"/><path d="M151 102c0-7 6-13 13-13h32c7 0 13 6 13 13v22c0 7-6 13-13 13h-17l-13 11v-11h-2c-7 0-13-6-13-13v-22Z" stroke="#153776" fill="none" stroke-width="3"/><path d="M168 111h.1M191 111h.1" stroke="#153776" stroke-width="5"/><path d="M171 121c5 5 12 5 17 0" stroke="#153776" stroke-width="3" fill="none"/></g><g class="orbit-tile tile-a"><rect x="41" y="75" width="45" height="50" rx="12" fill="#eaf3ff" stroke="none"/><path d="M53 87h20v26H53zM58 94h10M58 100h10M58 106h6" stroke="#4166b7" stroke-width="2"/></g><g class="orbit-tile tile-b"><rect x="264" y="145" width="48" height="48" rx="14" fill="#b9eceb" stroke="none"/><path d="m277 169 7 7 14-16" stroke="#14686b" stroke-width="3" fill="none"/></g><g class="orbit-tile tile-c"><rect x="255" y="37" width="37" height="37" rx="11" fill="#dce3ff" stroke="none"/><path d="M266 50h15M266 56h15M266 62h9" stroke="#5169b9" stroke-width="2"/></g></svg>';
 hero.append(copy,art);page.append(hero);
 const summary=h('section','dashboard-summary');summary.setAttribute('aria-label',t('activity'));const stats=h('dl','stats-band');
 for(const [key,label,symbol] of [['question','questionsAsked','chat'],['answer','answersDelivered','shield'],['refund','refundsCalculated','calculator'],['source','evidenceOpened','book']]){const item=h('div','stat-item'),value=h('dd','stat-number',number(activity.totals[key]));value.dataset.dynamic='count-'+key;item.append(h('dt','',t(label)),value);const mark=h('span','stat-icon stat-'+key);mark.append(icon(symbol));item.append(mark);stats.append(item);}
 const scope=h('p','dashboard-local-note',t(sharedActivity?'localActivity':'visitActivity'));scope.dataset.dynamic='scope';summary.append(stats,scope);page.append(summary);
 const lower=h('div','dashboard-lower'),chart=h('section','activity-panel');const chartHead=h('header','panel-heading');chartHead.append(h('h2','',t('activity')),h('span','',t('last7Days')));chart.append(chartHead);
 const legend=h('div','chart-legend');legend.append(h('span','legend-question',t('questionsAsked')),h('span','legend-answer',t('answersDelivered')));chart.append(legend);
 const week=activityWeek(activity),max=Math.max(1,...week.map(d=>Math.max(d.question,d.answer))),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 630 180');svg.setAttribute('class','activity-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',t('activity')+' — '+t('last7Days'));
 function chartNode(tag,attrs,text){const n=document.createElementNS(svg.namespaceURI,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(text!==undefined)n.textContent=text;svg.append(n);return n;}
 for(const y of [25,80,135])chartNode('line',{x1:10,y1:y,x2:620,y2:y,class:'chart-grid'});
 const accessible=h('ul','sr-only');week.forEach((day,i)=>{const x=24+i*88;for(const [key,offset] of [['question',0],['answer',29]]){const height=day[key]/max*105;chartNode('rect',{x:x+offset,y:135-height,width:23,height,rx:5,class:'chart-bar bar-'+key});}chartNode('text',{x:x+25,y:162,'text-anchor':'middle',class:'chart-day'},localDate(day.day,{weekday:'short'}));accessible.append(h('li','',localDate(day.day,{month:'short',day:'numeric'})+': '+t('questionsAsked')+' '+number(day.question)+', '+t('answersDelivered')+' '+number(day.answer)));});
 const plot=h('div','dashboard-plot');plot.dataset.dynamic='plot';plot.append(svg,accessible);if(!week.some(d=>d.question||d.answer))plot.append(h('p','chart-empty',t('noActivity')));chart.append(plot);
 const footer=h('div','chart-footer'),conversationCount=h('span','',t('conversations')+': '+number(activity.totals.conversation));conversationCount.dataset.dynamic='conversations';footer.append(conversationCount,button(t('library'),'text-button',()=>setView('library'),'arrow'));chart.append(footer);
 const recent=h('section','recent-panel'),recentHeader=h('header','panel-heading'),recentBody=h('div');recentHeader.append(h('h2','',t('recentActivity')));recentBody.dataset.dynamic='recent';recent.append(recentHeader);const list=h('ul','activity-list');
 const labels={question:'questionsAsked',answer:'answersDelivered',refund:'refundsCalculated',source:'evidenceOpened',conversation:'conversations',partial:'partial',uncovered:'notCovered',error:'retry'};
 [...activity.recent].reverse().slice(0,6).forEach(event=>{const item=h('li','activity-event'),mark=h('span','event-icon');mark.append(icon(event.type==='refund'?'calculator':event.type==='source'?'book':'chat'));const detail=h('div','event-detail');detail.append(h('strong','',t(labels[event.type])));if(event.type==='refund')detail.append(h('span','','Rs. '+number(event.total)));else if(event.question)detail.append(h('span','',event.question));else if(event.filename)detail.append(h('span','',evidenceLabel(event.filename)));const time=h('time','',localDate(new Date(event.at),{hour:'2-digit',minute:'2-digit'}));time.dateTime=event.at;item.append(mark,detail,time);list.append(item);});
 if(!activity.recent.length){const empty=h('div','activity-empty');empty.append(icon('chat'),h('p','',t('noActivity')));recentBody.append(empty);}else recentBody.append(list);
 const lastRefund=[...activity.recent].reverse().find(e=>e.type==='refund');if(lastRefund){const last=h('div','last-estimate');last.append(h('span','',t('lastEstimate')),h('strong','','Rs. '+number(lastRefund.total)));recentBody.append(last);}
 recent.append(recentBody,button(t('askNova'),'text-button recent-action',openAssistant,'arrow'));lower.append(chart,recent);page.append(lower);target.append(page);
}
function makeDetails(title){const d=h('details','answer-details');d.append(h('summary','',title));return d;}
function sourceButton(e){const b=button(evidenceLabel(e.filename)+' · §'+e.section,'source-button',()=>openSource(e),'book');b.title=e.filename+', Section '+e.section;return b;}
function openSource(e){
 const dialog=document.querySelector('#source-dialog'),content=document.querySelector('#source-content');content.replaceChildren();
 const header=h('header');header.append(h('strong','',t('sources')),button(t('close'),'icon-button',()=>dialog.close(),'close'));
 const body=h('div','source-body');body.append(h('h2','',e.sectionTitle||evidenceLabel(e.filename)),h('p','source-filename',e.filename));
 const meta=h('div','source-meta');meta.append(h('span','',t('section')+' '+e.section),h('span','',t('effective')+' '+e.effectiveDate));body.append(meta);
 const text=h('blockquote','source-text',e.excerpt);text.lang='en';text.dir='ltr';body.append(text,h('p','original-note',t('original')));content.append(header,body);if(!dialog.open)dialog.showModal();recordActivity('source',{filename:e.filename});
}
function renderAssistant(){
 const page=h('section','assistant-page');const toolbar=h('header','workspace-toolbar');toolbar.append(h('h1','',t('chat')));
 const actions=h('div','toolbar-actions');actions.append(button(t('search'),'text-button',()=>{searchOpen=!searchOpen;const row=document.querySelector('.chat-search');row.hidden=!searchOpen;if(searchOpen)row.querySelector('input').focus();else{searchText='';row.querySelector('input').value='';renderThread();}},'search'),exportMenu());toolbar.append(actions);page.append(toolbar);
 const search=h('div','chat-search');search.hidden=!searchOpen;const input=h('input');input.type='search';input.placeholder=t('search');input.setAttribute('aria-label',t('search'));input.value=searchText;input.addEventListener('input',()=>{searchText=input.value;renderThread();});search.append(icon('search'),input,h('span','search-count'));page.append(search);
 const wrap=h('div','thread-wrap'),thread=h('div','thread');thread.id='conversation-thread';thread.setAttribute('role','log');thread.setAttribute('aria-label',t('chat'));thread.setAttribute('aria-live','polite');thread.setAttribute('aria-relevant','additions');
 const jump=button(t('latest'),'jump-latest',()=>scrollLatest(false),'arrow');jump.hidden=true;thread.addEventListener('scroll',()=>{jump.hidden=isNearBottom(thread.scrollTop,thread.clientHeight,thread.scrollHeight);},{passive:true});wrap.append(thread,jump);page.append(wrap,makeComposer());root.append(page);renderThread(true);
}
function renderWelcome(thread){
 const welcome=h('div','welcome');const avatar=h('span','nova-symbol');avatar.append(icon('chat'));welcome.append(avatar,h('h2','',t('title')),h('p','',t('intro')));
 const list=h('div','prompt-list');Object.entries(guidedQuestions).forEach(([key,question])=>list.append(button(t(key),'prompt-button',()=>{const input=document.querySelector('#question-input');draft=question;input.value=question;input.focus();},key==='warranty'?'shield':key==='shipping'?'arrow':key==='refunds'?'calculator':'book')));
 welcome.append(list,h('p','original-note',t('original')));thread.append(welcome);
}
function renderThread(force=false){
 const thread=document.querySelector('#conversation-thread');if(!thread)return;const oldTop=thread.scrollTop,near=isNearBottom(thread.scrollTop,thread.clientHeight,thread.scrollHeight);
 thread.replaceChildren();if(!messages.length)renderWelcome(thread);let matches=0;
 messages.forEach((m,i)=>{if(searchText&&!m.text.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()))return;renderMessage(thread,m,i);matches++;});
 const clarification=activeClarification(messages,flow);if(clarification&&!searchText&&!sending)renderClarification(thread,clarification);
 if(sending){const pending=h('div','pending');pending.id='pending-response';pending.append(h('span'),document.createTextNode(t('checking')));thread.append(pending);}
 const count=document.querySelector('.search-count');if(count)count.textContent=searchText?String(matches):'';
 if(searchText&&!matches)thread.append(h('p','tool-empty',t('notCovered')));
 if(force||near&&!searchText)scrollLatest(force);else thread.scrollTop=oldTop;
 updateComposer();
}
function renderMessage(thread,m,index){
 const result=m.result||{};const row=h('article','message '+m.role);row.dataset.messageIndex=index;
 const content=h('div','message-content');const meta=h('div','message-meta');meta.append(h('strong','',m.role==='assistant'?'Nova':t('self')));
 if(m.role==='assistant'&&result.status){const statusKey={answered:'answered',partial:'partial',clarification_required:'needDetail',not_covered:'notCovered',error:'retry'}[result.status];meta.append(h('span','status-label '+result.status,t(statusKey||'answered')));}
 content.append(meta);let display=m.text;
 if(result.presentation==='greeting')display=t('intro');
 if(result.clarification)display=t(result.clarification.field==='novaCartError'?'errorReturn':result.clarification.field)+' — '+t('detailHint');
 const text=h('p','message-text'+(m.role==='assistant'?' answer-text':''));text.dir='auto';
 if(m.role==='assistant'){const parts=answerSegments(display,result.evidence);display=parts.map(p=>p.text).join('');for(const part of parts){if(part.type!=='reference')text.append(document.createTextNode(part.text));else if(part.evidence)text.append(button(part.text,'inline-reference',()=>openSource(part.evidence)));else text.append(h('span','inline-reference',part.text));}}else text.textContent=display;
 const messageId=m.id||String(m.at||index);if(m.role==='assistant'&&shouldCollapseAnswer(display)&&!expanded.has(messageId)){text.classList.add('collapsed');text.querySelectorAll('button').forEach(b=>b.tabIndex=-1);}
 content.append(text);
 if(m.role==='assistant'){
  const actions=h('div','message-actions');
  if(shouldCollapseAnswer(display)){const toggle=button(expanded.has(messageId)?t('less'):t('more'),'text-button',()=>{if(expanded.has(messageId))expanded.delete(messageId);else expanded.add(messageId);text.classList.toggle('collapsed',!expanded.has(messageId));text.querySelectorAll('button').forEach(b=>b.tabIndex=expanded.has(messageId)?0:-1);toggle.querySelector('span').textContent=expanded.has(messageId)?t('less'):t('more');toggle.setAttribute('aria-expanded',String(expanded.has(messageId)));});toggle.setAttribute('aria-expanded',String(expanded.has(messageId)));actions.append(toggle);}
  actions.append(button(t('copy'),'text-button',async()=>{try{await navigator.clipboard.writeText(readableAnswer(m.text,result.evidence));toast(t('copied'));}catch{toast(t('retry'));}},'copy'));
  if(result.status==='error')actions.append(button(t('retry'),'text-button',()=>{const q=result.question||messages[index-1]?.text;if(q)sendQuestion(q,result.requestContext||{},undefined,false);},'arrow'));
  content.append(actions);
  if(result.trace?.length){const details=makeDetails(t('trace')),list=h('ol','trace-list');result.trace.forEach(x=>list.append(h('li','',x)));details.append(list);content.append(details);}
  if(result.evidence?.length){const details=makeDetails(t('sources')+' · '+result.evidence.length);const sources=h('div','message-sources');result.evidence.forEach(e=>sources.append(sourceButton(e)));details.append(sources);content.append(details);}
  const facts=Object.entries(result.knownFacts||{}).filter(([key,value])=>['contactDate','region','category','deliveryDate','paymentMethod','paidPrice','novaCartError','opened'].includes(key)&&value!==undefined&&value!=='');
  if(facts.length){const details=makeDetails(t('details')),list=h('div','fact-list');facts.forEach(([key,value])=>{const text=t(key==='novaCartError'?'errorReturn':key)+': '+optionLabel(locale,value);const q=result.question;list.append(q?button(text,'fact-chip',()=>sendQuestion(q,{knownFacts:result.knownFacts,editField:key},undefined,false)):h('span','fact-chip',text));});details.append(list);content.append(details);}
  const avatar=h('span','nova-symbol message-avatar');avatar.append(icon('chat'));row.append(avatar);
 }
 row.append(content);thread.append(row);
}
function renderClarification(thread,c){
 const card=h('section','clarification-card'),title=h('h3','',locale==='en'?c.question:t(c.field==='novaCartError'?'errorReturn':c.field));title.id='current-clarification';card.setAttribute('aria-labelledby',title.id);card.append(title,h('p','',locale==='en'?c.explanation:t('detailHint')));
 const form=h('form');let getValue;
 if(c.inputType==='single_select'){
  const choices=h('div','choice-grid');c.options.forEach(o=>{const label=h('label','choice-option'),radio=h('input');radio.type='radio';radio.name='choice';radio.value=o.value;label.append(radio,h('span','',optionLabel(locale,o.value,o.label)));choices.append(label);});form.append(choices);
  let custom;if(c.allowCustom){custom=h('input');custom.type='text';custom.maxLength=100;custom.autocomplete='off';custom.setAttribute('aria-label',t(c.field));form.append(field(t('details'),custom));custom.addEventListener('input',()=>form.querySelectorAll('input[type=radio]').forEach(r=>r.checked=false));}
  getValue=()=>form.querySelector('input[type=radio]:checked')?.value||custom?.value.trim();
 }else{const input=h('input');input.type=c.inputType==='currency'?'number':'date';input.required=true;if(c.inputType==='currency'){input.min='0';input.step='1';input.inputMode='numeric';}input.setAttribute('aria-label',t(c.field));form.append(field(t(c.field),input));getValue=()=>input.value;}
 const footer=h('div','clarification-footer');footer.append(button(t('cancel'),'text-button',()=>{flow=null;persist();renderThread();}),button(t('unknown'),'text-button',()=>submitClarification('not_sure')));
 const submit=h('button','primary-button',t('continue'));submit.type='submit';footer.append(submit);form.append(footer);const warning=h('p','validation-message');warning.setAttribute('role','status');form.append(warning);
 form.addEventListener('submit',e=>{e.preventDefault();const value=getValue();if(value===undefined||value===''){warning.textContent=t('needDetail');return;}if(c.inputType==='currency'&&(!Number.isSafeInteger(Number(value))||Number(value)<0)){warning.textContent=t('paidPrice')+': 0, 1, 2…';return;}submitClarification(c.inputType==='currency'?Number(value):value);});card.append(form);thread.append(card);
}
function submitClarification(value){const c=activeClarification(messages,flow);if(!c||sending)return;sendQuestion(flow.question,{knownFacts:{...(flow.knownFacts||{}),[c.field]:value}},String(value));}
function makeComposer(){
 const area=h('div','composer-area'),form=h('form','composer');const label=h('label','sr-only',t('placeholder'));label.htmlFor='question-input';const input=h('textarea');input.id='question-input';input.rows=1;input.maxLength=2000;input.required=true;input.value=draft;input.placeholder=t('placeholder');input.setAttribute('aria-label',t('placeholder'));
 const send=button(t('send'),'send-button',null,'up');send.type='submit';send.querySelector('span').className='sr-only';
 send.addEventListener('click',e=>{if(sending){e.preventDefault();cancelRequest();}});
 input.addEventListener('input',()=>{draft=input.value;input.rows=Math.min(4,Math.max(1,input.value.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/75)),0)));const count=area.querySelector('.character-count');if(count)count.textContent=input.value.length+' / 2000';});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(sending)cancelRequest();else form.requestSubmit();}});
 form.addEventListener('submit',e=>{e.preventDefault();if(sending){cancelRequest();return;}const value=input.value.trim();if(!value)return;input.value='';draft='';input.rows=1;if(activeClarification(messages,flow))submitClarification(value);else sendQuestion(value);});
 form.append(label,input,send);const foot=h('div','composer-foot');foot.append(h('span','',t('original')),h('small','character-count',draft.length+' / 2000'));area.append(form,foot);return area;
}
function updateComposer(){const send=document.querySelector('.send-button');if(!send)return;send.type=sending?'button':'submit';send.replaceChildren(icon(sending?'stop':'up'),h('span','sr-only',t(sending?'stop':'send')));send.title=t(sending?'stop':'send');send.setAttribute('aria-label',t(sending?'stop':'send'));const input=document.querySelector('#question-input');if(input)input.placeholder=activeClarification(messages,flow)?t('needDetail'):t('placeholder');}
function scrollLatest(immediate=false){requestAnimationFrame(()=>{const thread=document.querySelector('#conversation-thread');if(thread)thread.scrollTo({top:thread.scrollHeight,behavior:immediate||matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
function appendMessage(role,text,result){messages.push({id:crypto.randomUUID(),role,text,result:result||null,at:Date.now()});messages=messages.slice(-40);persist();renderThread(role==='user');}
async function post(url,body,signal){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});const data=await response.json();if(!response.ok)throw Error(data.answer||'Service unavailable');return data;}
async function sendQuestion(question,context={},reply,countQuestion=true){
 if(sending)return;const version=++requestVersion;const facts=context.knownFacts||{};flow={question,knownFacts:facts};sending=true;requestController=new AbortController();const controller=requestController;
 startTrackedSession();if(reply===undefined&&countQuestion)recordActivity('question',{question});
 appendMessage('user',reply!==undefined?reply:question);updateShell();const timer=setTimeout(()=>controller.abort('timeout'),15000);
 try{
  let result=await post('/api/ask',{question,context:{knownFacts:facts,editField:context.editField}},controller.signal);
  if(result.status==='answered'&&result.presentation==='refund_estimate_ready'){
   const f=result.knownFacts||{};const calculation=await post('/api/calculate',{type:'return',contactDate:f.contactDate,region:f.region,errorReturn:['yes','true'].includes(String(f.novaCartError)),items:[{category:f.category,paidPrice:f.paidPrice,opened:['yes','true'].includes(String(f.opened))}]},controller.signal);
   const evidence=[...(result.evidence||[]),...(calculation.evidence||[])];result={...result,...calculation,calculationType:'return',evidence:[...new Map(evidence.map(e=>[e.filename+'#'+e.section,e])).values()]};
  }
  if(version!==requestVersion)return;result.question=question;flow=result.status==='clarification_required'?{question,knownFacts:result.knownFacts||facts}:null;
  if(result.status==='answered'&&result.presentation!=='greeting'&&result.evidence?.length)recordActivity('answer',{question});
  if(result.calculationType==='return')recordActivity('refund',{total:result.total});
  if(result.status==='partial')recordActivity('partial',{question});else if(result.status==='not_covered')recordActivity('uncovered',{question});
  sending=false;appendMessage('assistant',result.answer||t('notCovered'),result);
 }catch(error){if(version!==requestVersion)return;flow=null;sending=false;const stopped=controller.signal.reason==='user';if(!stopped)recordActivity('error',{question});appendMessage('assistant',stopped?t('stop'):t('retry')+' — The policy service could not complete this request.',{status:'error',question,knownFacts:facts,requestContext:{...context,knownFacts:facts}});}
 finally{clearTimeout(timer);if(version===requestVersion){sending=false;requestController=null;persist();updateShell();updateComposer();}}
}
function cancelRequest(){requestController?.abort('user');}
function resetChat(){if(messages.length&&!confirm(t('newChat')+'?'))return;requestVersion++;requestController?.abort('reset');sending=false;requestController=null;messages=[];flow=null;draft='';searchText='';tabSessionId=null;try{sessionStorage.removeItem('nova-chat-session');}catch{}expanded.clear();persist();setView('assistant',false);document.querySelector('#question-input').focus();}
function exportMenu(){const menu=h('details','export-menu'),summary=h('summary','text-button');summary.append(icon('download'),h('span','button-label',t('export')));summary.title=t('export');summary.setAttribute('aria-label',t('export'));const options=h('div','export-options');function choose(format){menu.open=false;summary.focus();downloadChat(format,summary);}options.append(button('PDF','export-option',()=>choose('pdf')),button('Word (.docx)','export-option',()=>choose('word')));menu.append(summary,options);menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;summary.focus();}});menu.addEventListener('focusout',()=>setTimeout(()=>{if(!menu.contains(document.activeElement))menu.open=false;},0));return menu;}
function downloadChat(format,trigger){
 if(!messages.length){toast(t('newChat'));return;}
 if(format==='pdf'){
  document.querySelector('#print-export-frame')?.remove();const frame=h('iframe','print-export-frame');frame.id='print-export-frame';frame.title='NovaCart PDF';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  const cleanup=()=>{frame.remove();if(trigger?.isConnected)trigger.focus();};frame.addEventListener('load',async()=>{try{await frame.contentDocument.fonts?.ready;frame.contentWindow.addEventListener('afterprint',cleanup,{once:true});frame.contentWindow.focus();frame.contentWindow.print();}catch{cleanup();toast(t('retry'));}},{once:true});frame.srcdoc=printDocument(messages);document.body.append(frame);setTimeout(()=>frame.remove(),600000);return;
 }
 try{const url=URL.createObjectURL(new Blob([wordBytes(messages)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})),a=h('a');a.href=url;a.download='novacart-conversation.docx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast(t('retry'));}
}
function heading(parent,key,description){const header=h('header','page-heading');header.append(h('h1','',t(key)),h('p','',description));parent.append(header);}
async function renderLibrary(){
 const page=h('section','tool-page');heading(page,'library',t('original'));const layout=h('div','library-layout'),index=h('div','library-index'),label=h('label','library-search'),search=h('input');search.type='search';search.placeholder=t('search');search.setAttribute('aria-label',t('search'));label.append(search);const list=h('div','document-list'),detail=h('article','library-document');index.append(label,list);layout.append(index,detail);page.append(layout);root.append(page);
 try{if(!library){const response=await fetch('/api/library');if(!response.ok)throw Error();library=(await response.json()).documents;}if(!page.isConnected)return;
  function show(doc){selectedDocument=doc.filename;detail.replaceChildren(h('h2','',doc.title),h('p','source-filename',doc.filename),h('p','source-meta',t('effective')+' '+doc.effectiveDate));doc.sections.forEach(s=>{const section=h('section','document-section');section.append(h('h3','',t('section')+' '+s.section+' · '+s.title),h('p','source-text',s.excerpt));detail.append(section);});list.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.file===doc.filename));}
  function paint(){list.replaceChildren();const q=search.value.toLocaleLowerCase();const docs=library.filter(d=>(d.filename+' '+d.title+' '+d.sections.map(s=>s.excerpt).join(' ')).toLocaleLowerCase().includes(q));docs.forEach(doc=>{const b=button('','document-button',()=>show(doc));b.replaceChildren(h('strong','',doc.title),h('small','',doc.sections.length+' · '+t('sources')));b.dataset.file=doc.filename;b.classList.toggle('selected',doc.filename===selectedDocument);list.append(b);});if(!docs.length)list.append(h('p','tool-empty',t('notCovered')));}
  search.addEventListener('input',paint);paint();const initial=library.find(d=>d.filename===selectedDocument)||library[0];if(initial)show(initial);
 }catch{detail.replaceChildren(h('p','tool-empty',t('retry')),button(t('retry'),'secondary-button',()=>renderView()));}
}
function field(label,control){const n=h('label','form-field');n.append(h('span','',label),control);return n;}
function input(type,name,value){const n=h('input');n.type=type;n.name=name;n.required=true;if(value!==undefined)n.value=value;if(type==='number'){n.min='0';n.step='1';n.inputMode='numeric';}return n;}
function select(name,values){const n=h('select');n.name=name;values.forEach(v=>{const o=h('option','',optionLabel(locale,v));o.value=v;n.append(o);});return n;}
function check(name,label){const n=h('label','check-field'),i=h('input');i.type='checkbox';i.name=name;n.append(i,h('span','',label));return n;}
function renderCalculator(){
 const page=h('section','tool-page');heading(page,'calculator',t('detailHint')+' '+t('original'));
 const layout=h('div','calculator-layout'),form=h('form','calculator-form'),result=h('div','calculator-result');
 form.append(field(t('contactDate'),input('date','contactDate',new Date().toISOString().slice(0,10))),field(t('region'),select('region',['Islamabad','Lahore','Karachi','Rest of Pakistan','Remote areas','International'])),field(t('category'),select('category',['electronics','clothing','furniture/bulky','personal care','grocery/perishables'])),field(t('paidPrice'),input('number','paidPrice')));
 const checks=h('div','calculator-checks');checks.append(check('opened',t('opened')),check('errorReturn',t('errorReturn')));form.append(checks);const submit=h('button','primary-button',t('calculate'));submit.type='submit';form.append(submit);result.append(h('h2','',t('calculator')),h('p','',t('details')));layout.append(form,result);page.append(layout);root.append(page);
 form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);submit.disabled=true;result.setAttribute('aria-busy','true');try{const calc=await post('/api/calculate',{type:'return',contactDate:data.get('contactDate'),region:data.get('region'),errorReturn:data.has('errorReturn'),items:[{category:data.get('category'),paidPrice:Number(data.get('paidPrice')),opened:data.has('opened')}]});result.replaceChildren(h('p','calculated-amount','Rs. '+calc.total.toLocaleString('en-US')),h('p','',calc.answer));const detail=makeDetails(t('trace'));detail.open=true;const list=h('ol','trace-list');calc.trace.forEach(line=>list.append(h('li','',line)));detail.append(list);result.append(detail);const sources=h('div','message-sources');calc.evidence.forEach(e=>sources.append(sourceButton(e)));result.append(sources);recordActivity('refund',{total:calc.total});}catch(error){result.replaceChildren(h('h2','',t('retry')),h('p','',error.message));}finally{submit.disabled=false;result.removeAttribute('aria-busy');}});
}
function toast(text){const n=document.querySelector('#toast');n.textContent=text;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),2600);}
document.querySelectorAll('[data-icon]').forEach(n=>n.replaceChildren(icon(n.dataset.icon)));
const languageSelect=document.querySelector('#language-select');languages.forEach(l=>{const o=h('option','',l.native+' · '+l.name);o.value=l.code;languageSelect.append(o);});
languageSelect.addEventListener('change',()=>{draft=document.querySelector('#question-input')?.value||draft;locale=localeFor(languageSelect.value).code;save('nova-language',locale);updateShell();renderView();});
document.querySelector('#theme-toggle').addEventListener('click',()=>{theme=theme==='light'?'dark':'light';save('nova-theme',theme);updateShell();});
document.querySelectorAll('[data-view]').forEach(n=>n.addEventListener('click',()=>setView(n.dataset.view)));
document.querySelector('#new-chat').addEventListener('click',resetChat);
document.querySelector('#menu-toggle').addEventListener('click',()=>mobileNav(!document.querySelector('#sidebar').classList.contains('open')));
document.querySelector('#mobile-shade').addEventListener('click',()=>mobileNav(false));
document.querySelector('.brand').addEventListener('click',()=>setView('dashboard'));
document.addEventListener('keydown',e=>{if(e.key==='Tab'&&navMedia.matches&&document.querySelector('#sidebar').classList.contains('open')){const items=[...document.querySelector('#sidebar').querySelectorAll('a,button:not(:disabled)')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(e.key==='Escape'){mobileNav(false);if(searchOpen){searchOpen=false;searchText='';document.querySelector('.chat-search')?.setAttribute('hidden','');const search=document.querySelector('.chat-search input');if(search)search.value='';renderThread();}}if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();if(view!=='assistant')setView('assistant');searchOpen=true;document.querySelector('.chat-search').hidden=false;document.querySelector('.chat-search input').focus();}});
navMedia.addEventListener('change',()=>mobileNav(false,false));
window.addEventListener('storage',e=>{if(sharedActivity&&e.key===activityKey){activity=normalizeActivity(read(activityKey,activity));refreshDashboardActivity();}});
mobileNav(false,false);
view=['dashboard','assistant','library','calculator'].includes(location.hash.slice(1))?location.hash.slice(1):'dashboard';updateShell();renderView();
fetch('/api/health').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{service=data;updateShell();}).catch(()=>{service=null;updateShell();});
