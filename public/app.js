const form = document.querySelector('#ask-form');
const input = document.querySelector('#question');
const messages = document.querySelector('#messages');
const send = document.querySelector('#send');
let pendingQuestion = null;

function escapeHtml(value) { return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
function addMessage(text, role, result) {
  const article = document.createElement('article'); article.className = `message ${role}${result?.status === 'error' ? ' error' : ''}`;
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  if (role === 'assistant') {
    const label = document.createElement('div'); label.className = 'bubble-label';
    label.innerHTML = `POLICY ASSISTANT <span>·</span> <span class="status-pill ${escapeHtml(result?.status ?? '')}">${escapeHtml((result?.status ?? 'answered').replaceAll('_', ' ').toUpperCase())}</span>`;
    bubble.append(label);
  }
  const p = document.createElement('p'); p.textContent = text; bubble.append(p);
  if (result?.evidence?.length) {
    const list = document.createElement('div'); list.className = 'citation-list';
    result.evidence.forEach((e, i) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'citation';
      btn.innerHTML = `${escapeHtml(e.filename)}, Section ${escapeHtml(e.section)} <small>Effective ${escapeHtml(e.effectiveDate)}</small>`;
      const detail = document.createElement('div'); detail.className = 'citation-detail'; detail.textContent = e.excerpt;
      btn.addEventListener('click', () => detail.classList.toggle('open'));
      list.append(btn, detail);
    });
    bubble.append(list);
  }
  if (result?.trace?.length) {
    const trace = document.createElement('div'); trace.className = 'trace';
    trace.textContent = `CALCULATION TRACE\n${result.trace.join('\n')}`; bubble.append(trace);
  }
  article.append(bubble); messages.append(article); article.scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function loading(on) { send.disabled = on; send.querySelector('span').textContent = on ? '…' : 'Ask'; }

form.addEventListener('submit', async event => {
  event.preventDefault(); const followUp = input.value.trim(); if (!followUp) return;
  const question = pendingQuestion ? `${pendingQuestion}\nAdditional details from customer: ${followUp}` : followUp;
  addMessage(followUp, 'user'); input.value = ''; loading(true);
  const pending = document.createElement('article'); pending.className = 'message assistant'; pending.innerHTML = '<div class="bubble"><div class="bubble-label">POLICY ASSISTANT</div><p>Checking the policy sources…</p></div>'; messages.append(pending);
  try {
    const response = await fetch('/api/ask', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question }) });
    const result = await response.json(); pending.remove(); addMessage(result.answer || 'No answer returned.', 'assistant', result);
    pendingQuestion = result.status === 'clarification_required' ? question : null;
  } catch { pending.remove(); addMessage('I could not reach the policy service. Check your connection and try again.', 'assistant', { status:'error' }); }
  finally { loading(false); input.focus(); }
});
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.question; input.focus(); form.requestSubmit(); }));
document.querySelector('[data-calculator="return"]').addEventListener('click', () => {
  document.querySelector('.refund-tool')?.remove();
  const tool = document.createElement('form'); tool.className = 'refund-tool';
  tool.innerHTML = `<div class="tool-kicker">DETERMINISTIC CALCULATOR</div><strong>Estimate a return refund</strong><p>Enter the paid price after any code or bundle allocation. This estimates the amount only; eligibility is a separate policy question.</p><div class="tool-grid"><label>Contact date<input name="contactDate" type="date" required></label><label>Delivery region<select name="region"><option>Metro</option><option>Rest of Pakistan</option><option>Remote areas</option><option>International</option></select></label><label>Category<select name="category"><option>electronics</option><option>clothing</option><option>furniture/bulky</option><option>personal care</option><option>grocery/perishables</option></select></label><label>Paid price (Rs.)<input name="paidPrice" type="number" min="0" step="1" required placeholder="e.g. 15000"></label></div><div class="tool-checks"><label><input name="opened" type="checkbox"> Electronics opened</label><label><input name="errorReturn" type="checkbox"> NovaCart error (wrong, defective or damaged)</label></div><button class="tool-submit" type="submit">Calculate estimate <b>→</b></button><button class="tool-close" type="button">Close</button></form>`;
  messages.append(tool); tool.scrollIntoView({ behavior:'smooth', block:'nearest' });
  tool.querySelector('.tool-close').addEventListener('click', () => tool.remove());
  tool.addEventListener('submit', async event => {
    event.preventDefault(); const data = new FormData(tool); const errorReturn = data.has('errorReturn');
    const payload = { type:'return', contactDate:data.get('contactDate'), region:data.get('region'), errorReturn, items:[{ category:data.get('category'), paidPrice:Number(data.get('paidPrice')), opened:data.has('opened') }] };
    const submit = tool.querySelector('.tool-submit'); submit.disabled = true; submit.textContent = 'Calculating…';
    try { const response = await fetch('/api/calculate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); const result = await response.json(); addMessage(result.answer || 'Could not calculate this estimate.', 'assistant', result); }
    catch { addMessage('The calculator service is unavailable. Please try again.', 'assistant', { status:'error' }); }
    finally { tool.remove(); }
  });
});
document.querySelector('#clear').addEventListener('click', () => { messages.replaceChildren(); pendingQuestion = null; input.focus(); });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
