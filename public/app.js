const root = document.querySelector('#view-root');
const sidebar = document.querySelector('#sidebar');
const conversationKey = 'novacart-intelligence-conversation-v1';
const saved = readSaved();
let conversation = saved.messages;
let activeFlow = saved.flow;
let view = 'assistant';
let service = null;
let documents = null;
let selectedEvidence = null;
let dockOpen = false;
let language = 'en';

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(conversationKey) || '{}'); return { messages: Array.isArray(value.messages) ? value.messages.slice(-40) : [], flow: value.flow ?? null }; }
  catch { return { messages: [], flow: null }; }
}
function persist() { try { localStorage.setItem(conversationKey, JSON.stringify({ messages: conversation.slice(-40), flow: activeFlow })); } catch {} }
function h(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
function icon(name) {
  const paths = {
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    evidence: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 5v16M8 6h8M8 10h8M8 14h5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    retry: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = paths[name] || '';
  return svg;
}
function setView(next) {
  view = next; selectedEvidence = null;
  document.querySelector('#nova-launcher').hidden = next === 'assistant';
  if (next === 'assistant' && dockOpen) toggleDock(false);
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const titles = { overview:'Overview', assistant:'AI Assistant', library:'Policy Library', calculator:'Refund Calculator' };
  document.querySelector('#view-title').textContent = titles[view];
  sidebar.classList.remove('mobile-open'); document.querySelector('#mobile-shade').classList.remove('visible');
  renderView();
  history.replaceState(null, '', `#${view}`);
}
function providerText() {
  if (!service) return 'Checking providers…';
  const names = ['Deterministic'];
  if (service.providers?.geminiConfigured) names.unshift('Gemini');
  if (service.providers?.grokFallbackEnabled) names.push('Grok backup');
  return names.join(' · ');
}
async function loadStatus() {
  try { const response = await fetch('/api/health'); if (!response.ok) throw Error(); service = await response.json(); document.querySelector('#library-count').textContent = service.policyFiles; document.querySelector('#provider-state').textContent = providerText(); document.querySelector('#service-status').textContent = 'Policy service ready'; document.querySelector('#provider-indicator').classList.add('ready'); renderView(); }
  catch { document.querySelector('#provider-state').textContent = 'Deterministic · offline capable'; document.querySelector('#service-status').textContent = 'Service unavailable'; document.querySelector('#provider-indicator').classList.remove('ready'); }
}
async function loadLibrary() { if (documents) return documents; const r = await fetch('/api/library'); if (!r.ok) throw Error('The policy library could not be loaded.'); documents = (await r.json()).documents; return documents; }
function renderView() {
  root.replaceChildren();
  if (view === 'assistant') renderAssistant(root);
  else if (view === 'overview') renderOverview(root);
  else if (view === 'library') renderLibrary(root);
  else if (view === 'calculator') renderCalculator(root);
}
function intro(eyebrow, title, description, action) {
  const block = h('section', 'page-intro'); const copy = h('div');
  copy.append(h('p', 'page-eyebrow', eyebrow), h('h1', '', title), h('p', 'page-description', description)); block.append(copy);
  if (action) block.append(action); return block;
}
function renderAssistant(container) {
  container.append(intro('NOVA · POLICY INTELLIGENCE', 'What can I help you understand?', 'Ask about returns, shipping, payments or warranties. Nova checks the policy text and shows you the source behind each answer.', button('New conversation', 'quiet-button', resetConversation)));
  const grid = h('div', 'assistant-layout');
  const panel = h('section', 'conversation-panel'); panel.setAttribute('aria-label', 'Conversation with Nova');
  const panelHead = h('header', 'conversation-head');
  const mascot = novaAvatar('idle'); const headCopy = h('div'); headCopy.append(h('strong', '', 'Nova'), h('small', '', 'NovaCart policy assistant'));
  const headStatus = h('span', 'head-ready'); headStatus.append(h('i', 'status-led'), h('span', '', 'Ready')); panelHead.append(mascot, headCopy, headStatus);
  const thread = h('div', 'thread'); thread.id = 'conversation-thread';
  if (!conversation.length) renderWelcome(thread);
  conversation.forEach((item, index) => renderMessage(thread, item, index));
  const composer = makeComposer({ dock:false }); panel.append(panelHead, thread, composer);
  const inspector = makeInspector(); grid.append(panel, inspector); container.append(grid);
}
function novaAvatar(state='idle', small=false) {
  const avatar = h('span', `nova-avatar${small ? ' small' : ''} ${state}`); avatar.setAttribute('aria-hidden','true');
  avatar.innerHTML = '<svg viewBox="0 0 48 48"><path d="M13 13.5c2.4-3 6.4-4.8 11-4.8 7.6 0 13.8 5.7 13.8 12.7 0 2.4-.7 4.6-2.1 6.5l2.1 7-7.5-2a15 15 0 0 1-6.3 1.4c-7.6 0-13.8-5.7-13.8-12.7 0-3.1 1.1-5.9 3.1-8.1"/><path class="nova-eye" d="M18 22h.1M29.5 22h.1"/><path d="M19 27c1.3 1.2 2.9 1.8 4.7 1.8 1.7 0 3.2-.6 4.4-1.6"/></svg><i></i>';
  return avatar;
}
function renderWelcome(thread) {
  const welcome = h('div','welcome'); welcome.append(novaAvatar(), h('h2','','A clearer answer starts here.'), h('p','','Nova uses NovaCart’s policy documents to answer your question. If one detail changes the rule, Nova will ask just for that detail.'));
  const suggestions = h('div','suggestion-list');
  const prompts = ['How long do I have to return an electronics item in Lahore?', 'What is the shipping fee for Gilgit-Baltistan?', 'How are promotional discounts split across returned items?'];
  prompts.forEach((text, i) => { const b = button(text,'suggestion',()=>{ const input=document.querySelector('#question-input'); if(input){input.value=text;input.focus();} }); b.append(icon('arrow')); suggestions.append(b); });
  const note=h('p','welcome-note','Add a contact date when you ask about a dated policy.'); welcome.append(suggestions,note); thread.append(welcome);
}
function renderMessage(thread, item, index) {
  const row = h('article', `message-row ${item.role}`); row.dataset.messageIndex=String(index);
  if (item.role === 'assistant') row.append(novaAvatar(item.status==='clarification_required'?'question':'answering', true));
  const content = h('div','message-content'); const label = h('div','message-label',item.role==='user'?'YOU':'NOVA'); content.append(label);
  const bubble = h('div', item.role==='user'?'user-bubble':'assistant-bubble'); bubble.append(h('p','message-text',item.text));
  if(item.result?.status){ const status=h('span',`answer-status ${item.result.status}`, statusLabel(item.result.status)); bubble.append(status); }
  content.append(bubble);
  if(item.result?.trace?.length){ const details=h('details','calculation-details'); const summary=h('summary','','Calculation steps'); const ol=h('ol','trace-list'); item.result.trace.forEach(x=>ol.append(h('li','',x))); details.append(summary,ol); content.append(details); }
  if(item.result?.knownFacts&&Object.keys(item.result.knownFacts).some(key=>item.result.knownFacts[key])){const facts=h('div','known-facts');facts.append(h('span','facts-label','DETAILS USED'));for(const [key,value] of Object.entries(item.result.knownFacts)){if(!value)continue;const line=h('span','fact-chip',`${factLabel(key)}: ${factDisplay(key,value)}`);line.title='Edit this detail';line.tabIndex=0;line.setAttribute('role','button');line.addEventListener('click',()=>editFact(item.result.knownFacts,key));line.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editFact(item.result.knownFacts,key);}});facts.append(line);}content.append(facts);}
  if(item.result?.evidence?.length){
    const sourceGroup=h('div','message-sources'); item.result.evidence.forEach((e,i)=>{const b=button(`${e.filename} · §${e.section}`,'source-chip',()=>selectSource(e));b.append(h('small','',e.effectiveDate));sourceGroup.append(b);}); content.append(sourceGroup);
  }
  if(item.result?.status==='error'){ const retry=button('Try again','retry-button',()=>{const previous=conversation[index-1];if(previous)sendQuestion(previous.text);}); retry.prepend(icon('retry')); content.append(retry); }
  const actions=h('div','message-actions'); if(item.role==='assistant'&&item.text){const copy=button('Copy answer','message-action',async()=>{try{await navigator.clipboard.writeText(item.text);toast('Answer copied');}catch{toast('Copy was unavailable');}});copy.prepend(icon('copy'));actions.append(copy);} content.append(actions);
  row.append(content); thread.append(row);
  if(item.result?.clarification){ renderClarification(thread,item.result.clarification,index); }
  if(item.result?.status==='answered'&&item.result.presentation==='greeting'&&conversation.length<3) renderQuickPrompts(thread);
}
function renderClarification(thread, clarification, index) {
  const card=h('section','clarification-card'); card.setAttribute('aria-labelledby',`clarify-title-${index}`);
  const heading=h('div','clarification-heading'); heading.append(h('span','clarification-mark','?')); const title=h('div'); title.append(h('h3','',clarification.question),h('p','',clarification.explanation||'This detail helps Nova apply the right policy.')); heading.append(title); card.append(heading);
  const form=h('form','clarification-form'); let answer;
  if(clarification.inputType==='single_select'){
    const choices=h('div','choice-grid'); choices.setAttribute('role','group'); choices.setAttribute('aria-label',clarification.question);
    clarification.options.forEach((option,i)=>{const id=`clarify-${index}-${i}`;const label=h('label','choice-option');const radio=document.createElement('input');radio.type='radio';radio.name=`clarify-${index}`;radio.value=option.value;radio.id=id;label.append(radio,h('span','',option.label));choices.append(label);});form.append(choices);
    if(clarification.allowCustom){const custom=h('label','custom-answer');custom.append(h('span','','Or enter another answer'));const input=document.createElement('input');input.type='text';input.name='custom';input.placeholder='Type your answer';input.autocomplete='off';custom.append(input);form.append(custom);}
    answer=()=>form.querySelector('input[type=radio]:checked')?.value||form.querySelector('input[name=custom]')?.value.trim()||'';
    form.addEventListener('change',e=>{if(e.target.type==='radio'){const c=form.querySelector('input[name=custom]');if(c)c.value='';}});
  } else {
    const label=h('label','date-answer');label.append(h('span','',clarification.inputType==='currency'?'Paid price (whole Rs.)':'Choose a date'));const input=document.createElement('input');input.type=clarification.inputType==='currency'?'number':'date';input.name='answer';input.required=true;input.setAttribute('aria-label',clarification.question);if(clarification.inputType==='currency'){input.min='0';input.step='1';input.inputMode='numeric';input.placeholder='e.g. 12,000';}label.append(input);form.append(label);answer=()=>input.value;
  }
  const footer=h('div','clarification-footer');const notSure=button("I don't know",'subtle-button',()=>submitClarification("not_sure"));notSure.type='button';const submit=document.createElement('button');submit.type='submit';submit.className='primary-button';submit.textContent='Continue';submit.append(icon('arrow'));footer.append(notSure,submit);form.append(footer);
  const validation=h('p','validation-message');validation.setAttribute('aria-live','polite');form.append(validation);
  form.addEventListener('submit',e=>{e.preventDefault();const value=answer();if(!value){validation.textContent=clarification.inputType==='date'?'Choose a date to continue.':clarification.inputType==='currency'?'Enter the whole-rupee price to continue.':'Choose an option or enter your answer.';return;}if(clarification.inputType==='currency'&&(!Number.isSafeInteger(Number(value))||Number(value)<0)){validation.textContent='Enter a non-negative whole-rupee price.';return;}submitClarification(clarification.inputType==='currency'?Number(value):value);});
  card.append(form);thread.append(card);card.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'nearest'});
  function submitClarification(value){ card.remove(); const known=activeFlow?.knownFacts||conversation.findLast(x=>x.result?.clarification)?.result?.knownFacts||{}; const next={...known,[clarification.field]:value}; activeFlow={question:activeFlow?.question||conversation.findLast(x=>x.role==='user')?.text||'',knownFacts:next}; persist(); sendQuestion(activeFlow.question,{knownFacts:next,reply:value},true); }
}
function renderQuickPrompts(thread){const row=h('div','quick-prompts');[['Return a purchase','I want to understand the return policy for an item.'],['Shipping costs','What shipping fee applies to my order?'],['Refund timing','How long will my refund take?']].forEach(([label,q])=>row.append(button(label,'quick-prompt',()=>{const input=document.querySelector('#question-input');if(input){input.value=q;input.focus();}})));thread.append(row);}
function statusLabel(status){return ({answered:'GROUNDED ANSWER',partial:'PARTIAL ANSWER',clarification_required:'NEEDS ONE DETAIL',not_covered:'NOT IN THE POLICY',error:'COULD NOT COMPLETE'})[status]||status.toUpperCase();}
function makeComposer({dock=false}={}) {
  const form=h('form',`composer${dock?' dock-composer':''}`);const label=document.createElement('label');label.htmlFor=dock?'dock-question':'question-input';label.className='sr-only';label.textContent='Ask Nova a policy question';const input=document.createElement('textarea');input.id=dock?'dock-question':'question-input';input.rows=1;input.maxLength=2000;input.placeholder='Ask about a NovaCart policy…';input.required=true;const submit=document.createElement('button');submit.type='submit';submit.className='send-button';submit.setAttribute('aria-label','Send question');submit.append(h('span','','Ask Nova'),icon('arrow'));const note=h('div','composer-note','Policy answers stay grounded in verified source excerpts.');form.append(label,input,submit,note);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';sendQuestion(q,activeFlow?{knownFacts:activeFlow.knownFacts}:{});});
  return form;
}
function makeInspector(){const panel=h('aside','evidence-inspector');panel.id='evidence-inspector';panel.setAttribute('aria-label','Evidence inspector');renderInspector(panel);return panel;}
function renderInspector(panel){panel.replaceChildren();const head=h('header','inspector-head');head.append(h('span','inspector-overline','SOURCE INSPECTOR'));if(selectedEvidence){const close=button('Close','inspector-close',()=>{selectedEvidence=null;renderView();});close.prepend(icon('close'));head.append(close);}panel.append(head);
  if(selectedEvidence){const e=selectedEvidence;panel.append(h('h2','inspector-title',e.title||e.filename),h('p','inspector-file',e.filename));const meta=h('div','source-meta');meta.append(h('span','',`Section ${e.section}`),h('span','',`Effective ${e.effectiveDate}`));panel.append(meta,h('p','source-label','ORIGINAL POLICY TEXT'));const excerpt=h('blockquote','source-excerpt',e.excerpt);panel.append(excerpt);if(e.region&&e.region!=='All regions')panel.append(h('p','source-scope',`Applies to: ${e.region}`));return;}
  panel.append(h('div','inspector-empty-icon', '↗'),h('h2','inspector-title','Evidence, in context'),h('p','inspector-copy','Select a citation in Nova’s answer to inspect its exact policy excerpt and effective date.'),h('div','inspector-divider'),h('p','source-label','YOUR CONVERSATION'),h('p','inspector-copy',conversation.length?`${conversation.filter(x=>x.role==='user').length} questions in this browser session.`:'No questions asked yet.'));
}
function selectSource(e){selectedEvidence=e;if(view==='assistant'){const panel=document.querySelector('#evidence-inspector');if(panel)renderInspector(panel);}else openEvidenceDrawer(e);}
function openEvidenceDrawer(e){const drawer=h('section','evidence-drawer');drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','Policy source detail');const close=button('Close source','inspector-close',()=>drawer.remove());close.prepend(icon('close'));drawer.append(close,h('p','inspector-overline','SOURCE INSPECTOR'),h('h2','inspector-title',e.title||e.filename),h('p','inspector-file',e.filename),h('p','source-meta',`Section ${e.section} · Effective ${e.effectiveDate}`),h('p','source-label','ORIGINAL POLICY TEXT'),h('blockquote','source-excerpt',e.excerpt));document.body.append(drawer);close.focus();}
function addMessage(role,text,result){conversation.push({role,text,result:result||null,at:Date.now()});conversation=conversation.slice(-40);persist();const thread=document.querySelector('#conversation-thread');if(view==='assistant'&&thread){renderMessage(thread,conversation.at(-1),conversation.length-1);thread.scrollTop=thread.scrollHeight;}renderDock();}
async function sendQuestion(question,context={},isFollowup=false){
  if(!isFollowup){activeFlow={question,knownFacts:context.knownFacts||{},editField:context.editField};addMessage('user',question);}else if(context.reply)addMessage('user',String(context.reply));
  const thread=document.querySelector('#conversation-thread');let pending;
  if(view==='assistant'&&thread){pending=h('article','message-row assistant pending-row');pending.append(novaAvatar('thinking',true));const b=h('div','thinking-bubble');b.append(h('span','','Nova is checking the policy'),h('i','thinking-dots'));pending.append(b);thread.append(pending);thread.scrollTop=thread.scrollHeight;document.querySelector('#service-status').textContent='Checking policy';}
  document.querySelectorAll('.send-button').forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true');});
  try{const response=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:activeFlow.question,context:{knownFacts:activeFlow.knownFacts,editField:activeFlow.editField}})});let result=await response.json();if(!response.ok&&result.status!=='error')throw Error('Policy request failed');if(result.status==='answered'&&result.presentation==='refund_estimate_ready'){const facts=result.knownFacts||{};const calcResponse=await fetch('/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'return',contactDate:facts.contactDate,region:facts.region,errorReturn:['yes','true'].includes(String(facts.novaCartError).toLowerCase()),items:[{category:facts.category,paidPrice:facts.paidPrice,opened:['yes','true'].includes(String(facts.opened).toLowerCase())}]})});const calculation=await calcResponse.json();if(!calcResponse.ok||calculation.status==='error')throw Error(calculation.answer||'Refund estimate could not be calculated');const evidence=[...(result.evidence||[]),...(calculation.evidence||[])];result={...result,...calculation,answer:`${calculation.answer}\n\nPolicy calculation is based on these rules:\n${result.answer}`,evidence:[...new Map(evidence.map(x=>[`${x.filename}#${x.section}`,x])).values()]};}activeFlow=result.status==='clarification_required'?{question:activeFlow.question,knownFacts:result.knownFacts||activeFlow.knownFacts}:null;persist();if(pending)pending.remove();addMessage('assistant',result.answer||'No answer returned.',result);document.querySelector('#service-status').textContent='Policy service ready';const status=document.querySelector('.head-ready span:last-child');if(status)status.textContent='Ready';}
  catch{if(pending)pending.remove();activeFlow=null;addMessage('assistant','I could not reach the policy service. Check your connection and try again.',{status:'error'});document.querySelector('#service-status').textContent='Connection interrupted';}
  finally{document.querySelectorAll('.send-button').forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy');});}
}
function renderDock(){const preview=document.querySelector('#dock-preview');if(!preview)return;preview.replaceChildren();const tail=conversation.slice(-4);if(!tail.length){preview.append(h('p','dock-greeting','Hi, I’m Nova. What would you like to know?'));return;}tail.forEach(item=>{const m=h('div',`dock-message ${item.role}`);m.textContent=item.text;preview.append(m);});const pending=conversation.at(-1)?.result?.clarification;if(pending){const note=h('div','dock-followup');note.append(h('p','',pending.question),button('Continue in full assistant','subtle-button',()=>{toggleDock(false);setView('assistant');}));preview.append(note);}}
function renderOverview(container){container.append(intro('YOUR POLICY WORKSPACE','Policy clarity, in one place.','Ask Nova a question, explore the source library, or estimate a refund using documented rules.'));
  const status=service;const section=h('section','overview-workspace');const primary=h('div','overview-primary');const welcome=h('div','overview-welcome');welcome.append(novaAvatar(),h('div','','Start with a question.'),h('p','','Nova can explain policy rules and show exactly where each answer comes from.'));welcome.append(button('Ask Nova','primary-button',()=>setView('assistant')));primary.append(welcome);
  const shortcuts=h('div','overview-shortcuts');shortcuts.append(h('h2','','Your tools'));shortcuts.append(button('Browse policy library','tool-row',()=>setView('library')));shortcuts.append(button('Estimate a refund','tool-row',()=>setView('calculator')));primary.append(shortcuts);
  const rail=h('aside','overview-rail');rail.append(h('p','rail-label','POLICY KNOWLEDGE'),h('div','rail-number',String(status?.policyFiles??'—')),h('p','rail-copy','official documents currently indexed'),h('div','rail-rule'),h('p','rail-label','POLICY TOPICS'));const topics=status?.categories||['Returns & refunds','Shipping & delivery','Warranty','Payments','Promotions','Privacy','Marketplace'];const list=h('ul','topic-list');topics.forEach(t=>list.append(h('li','',t)));rail.append(list);const provider=h('div','overview-provider');provider.append(h('span','provider-indicator ready'),h('div','','Answering mode'),h('small','',providerText()));rail.append(provider);section.append(primary,rail);container.append(section);
  const latest=h('section','recent-section');latest.append(h('header','','Recent in this conversation'),conversation.length?h('p','','This browser’s conversation is saved on this device.') : h('p','','Your recent questions will appear here as you chat with Nova.'));if(conversation.length){const last=conversation.filter(m=>m.role==='user').slice(-3);last.reverse().forEach(m=>latest.append(button(m.text,'recent-question',()=>setView('assistant'))));}container.append(latest);
}
function renderLibrary(container){container.append(intro('SOURCE DOCUMENTS','The policy library.','Browse the original NovaCart documents. Every passage shown here is drawn directly from the source files.'));
  const frame=h('section','library-workspace');const list=h('div','library-list');const search=h('label','library-search');search.append(icon('search'));const input=document.createElement('input');input.type='search';input.placeholder='Search policies or sections';input.setAttribute('aria-label','Search policy documents');search.append(input);list.append(search);const results=h('div','library-results');list.append(results);const detail=h('div','library-detail');frame.append(list,detail);container.append(frame);
  loadLibrary().then(docs=>{function paint(filter=''){results.replaceChildren();const matches=docs.filter(d=>`${d.filename} ${d.title} ${d.sections.map(s=>s.excerpt).join(' ')}`.toLowerCase().includes(filter.toLowerCase()));matches.forEach(doc=>{const b=button('', 'document-row',()=>showDocument(doc));b.append(h('strong','',doc.title),h('span','',doc.filename),h('small','',`${doc.sections.length} numbered sections · effective ${doc.effectiveDate}`));results.append(b);});if(!matches.length)results.append(h('p','library-empty','No policy documents match this search.'));}function showDocument(doc){detail.replaceChildren(h('p','inspector-overline',doc.filename),h('h2','',doc.title),h('p','library-document-meta',`Effective ${doc.effectiveDate} · ${doc.scope} scope${doc.region!=='All regions'?` · ${doc.region}`:''}`));doc.sections.forEach(s=>{const entry=h('article','library-section');entry.append(h('h3','',`Section ${s.section} · ${s.title}`),h('p','',s.excerpt));detail.append(entry);});}input.addEventListener('input',()=>paint(input.value));paint();if(docs.length)showDocument(docs[0]);}).catch(()=>{results.append(h('p','library-empty','The policy library could not load. Check your connection and retry.'));});
}
function renderCalculator(container){container.append(intro('DETERMINISTIC TOOL','Estimate a return refund.','Use paid prices after any discount or bundle allocation. Nova calculates documented deductions and rounding; it does not decide return eligibility.'));
  const layout=h('section','calculator-layout');const form=h('form','calculator-form');form.append(field('Contact date',dateInput('contactDate',new Date().toISOString().slice(0,10))),field('Delivery region',selectInput('region',['Islamabad','Lahore','Karachi','Rest of Pakistan','Remote areas','International'])),field('Item category',selectInput('category',['electronics','clothing','furniture/bulky','personal care','grocery/perishables'])),field('Paid price (Rs.)',numberInput('paidPrice')));
  const checks=h('div','calculator-checks');checks.append(check('opened','Electronics item was opened'),check('errorReturn','NovaCart error (wrong, defective or damaged)'));form.append(checks);const submit=document.createElement('button');submit.type='submit';submit.className='primary-button';submit.textContent='Calculate estimate';submit.append(icon('arrow'));form.append(submit);const result=h('div','calculator-result');result.append(h('div','calculator-empty-mark','Rs'),h('h2','','Your estimate will appear here'),h('p','','Add the required order details. Nova will show the calculation trace and applicable policy sources.'));layout.append(form,result);container.append(layout);
  form.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form);const body={type:'return',contactDate:f.get('contactDate'),region:f.get('region'),errorReturn:f.has('errorReturn'),items:[{category:f.get('category'),paidPrice:Number(f.get('paidPrice')),opened:f.has('opened')}]};submit.disabled=true;submit.textContent='Calculating…';try{const r=await fetch('/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();renderCalculation(result,data);}catch{result.replaceChildren(h('h2','','Calculator unavailable'),h('p','','Check your connection and try again.'));}finally{submit.disabled=false;submit.textContent='Calculate estimate';}});
}
function renderCalculation(target,data){target.replaceChildren();if(data.status==='error'){target.append(h('span','answer-status error','CHECK DETAILS'),h('h2','','Could not estimate this refund'),h('p','',data.answer));return;}target.append(h('span','answer-status answered','ESTIMATE'),h('h2','calculated-total',data.answer));const steps=h('details','calculation-details');steps.open=true;steps.append(h('summary','','Calculation trace'));const list=h('ol','trace-list');data.trace.forEach(x=>list.append(h('li','',x)));steps.append(list);target.append(steps);data.evidence?.forEach(e=>target.append(button(`${e.filename} · Section ${e.section}`,'source-chip',()=>selectSource(e))));}
function field(label,control){const wrap=h('label','form-field');wrap.append(h('span','',label),control);return wrap;}
function dateInput(name,value){const i=document.createElement('input');i.type='date';i.name=name;i.required=true;i.value=value;return i;}
function numberInput(name){const i=document.createElement('input');i.type='number';i.name=name;i.min='0';i.step='1';i.required=true;i.placeholder='e.g. 12,000';return i;}
function selectInput(name,values){const s=document.createElement('select');s.name=name;s.required=true;values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;s.append(o);});return s;}
function check(name,label){const l=h('label','check-field');const i=document.createElement('input');i.type='checkbox';i.name=name;l.append(i,h('span','',label));return l;}
function button(label,cls,action){const b=document.createElement('button');b.type='button';b.className=cls;b.append(h('span','',label));if(action)b.addEventListener('click',action);return b;}
function resetConversation(){conversation=[];activeFlow=null;selectedEvidence=null;persist();renderView();renderDock();document.querySelector('#nova-launcher').focus();}
function factLabel(key){return ({contactDate:'Contact date',deliveryDate:'Delivery date',region:'Region',category:'Category',paymentMethod:'Payment method',paidPrice:'Paid price',novaCartError:'NovaCart error',opened:'Opened'})[key]||key;}
function factDisplay(key,value){if(key==='category'||key==='paymentMethod')return String(value).replaceAll('_',' ');return String(value);}
function editFact(facts,key){const question=conversation.findLast(x=>x.role==='user')?.text;if(!question)return;activeFlow={question,knownFacts:{...facts},editField:key};sendQuestion(question,{knownFacts:{...facts},editField:key});}
function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
let toastTimer;
function toast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('#new-chat').addEventListener('click',resetConversation);
document.querySelector('#menu-toggle').addEventListener('click',()=>{sidebar.classList.toggle('mobile-open');document.querySelector('#mobile-shade').classList.toggle('visible');});
document.querySelector('#mobile-shade').addEventListener('click',()=>{sidebar.classList.remove('mobile-open');document.querySelector('#mobile-shade').classList.remove('visible');});
const launcher=document.querySelector('#nova-launcher'),dock=document.querySelector('#nova-dock');
function toggleDock(open){dockOpen=open;dock.hidden=!open;launcher.setAttribute('aria-expanded',String(open));launcher.classList.toggle('open',open);renderDock();if(open)dock.querySelector('#dock-question')?.focus();else launcher.focus();}
launcher.addEventListener('click',()=>toggleDock(!dockOpen));document.querySelector('.dock-minimize').addEventListener('click',()=>toggleDock(false));document.querySelector('.dock-open-workspace').addEventListener('click',()=>{toggleDock(false);setView('assistant');});
document.querySelector('#nova-dock').append(makeComposer({dock:true}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(dockOpen)toggleDock(false);else if(sidebar.classList.contains('mobile-open')){sidebar.classList.remove('mobile-open');document.querySelector('#mobile-shade').classList.remove('visible');}}});
document.querySelector('#language-button').addEventListener('click',()=>{const existing=document.querySelector('.language-menu');if(existing){existing.remove();return;}const menu=h('div','language-menu');menu.setAttribute('role','menu');[['en','English'],['ur','Urdu (coming soon)'],['roman','Roman Urdu (coming soon)']].forEach(([code,label])=>{const b=button(label,'language-option',()=>{menu.remove();if(code!=='en'){toast('Urdu translations are not enabled yet. The interface and policy answers remain in English.');return;}language='en';document.querySelector('#language-button').title='English interface';document.querySelector('#language-button').firstChild.textContent='EN';toast('English selected');});b.setAttribute('role','menuitem');menu.append(b);});document.querySelector('.topbar').append(menu);});
document.addEventListener('click',e=>{const menu=document.querySelector('.language-menu');if(menu&&!menu.contains(e.target)&&!document.querySelector('#language-button').contains(e.target))menu.remove();});

document.querySelector('#nova-launcher').hidden=view==='assistant';
renderView();renderDock();loadStatus();
if(location.hash&&['overview','assistant','library','calculator'].includes(location.hash.slice(1)))setView(location.hash.slice(1));
