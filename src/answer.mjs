import { classifyTopic, retrieve } from './search.mjs';
import { injectionPattern } from './policy.mjs';

const regions = ['remote area', 'azad jammu', 'gilgit', 'baltistan', 'international', 'usa', 'united states', ' uk ', 'united kingdom', 'uae', 'islamabad', 'lahore', 'karachi', 'rest of pakistan', 'pakistan'];
const categories = ['electronics', 'clothing', 'grocery', 'perishable', 'furniture', 'bulky', 'personal care'];
const categoryOptions = [
  { value: 'electronics', label: 'Electronics' }, { value: 'clothing', label: 'Clothing' },
  { value: 'furniture/bulky', label: 'Furniture or bulky' }, { value: 'personal care', label: 'Personal care' },
  { value: 'grocery/perishables', label: 'Grocery or perishables' }
];
const regionOptions = [
  { value: 'Islamabad', label: 'Islamabad' }, { value: 'Lahore', label: 'Lahore' },
  { value: 'Karachi', label: 'Karachi' }, { value: 'Rest of Pakistan', label: 'Rest of Pakistan' },
  { value: 'Remote areas', label: 'Azad Jammu & Kashmir or Gilgit-Baltistan' },
  { value: 'USA', label: 'USA' }, { value: 'UK', label: 'UK' }, { value: 'UAE', label: 'UAE' }
];
const hasAny = (q, words) => words.some(w => q.includes(w.trim()));
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

function resolvePrecedence(evidence, question, context, contactDate, topic) {
  const region = `${context.region ?? ''} ${question}`.toLowerCase();
  const remote = /remote|gilgit|baltistan|azad jammu|\bajk\b/.test(region);
  const international = /international|overseas|\busa\b|united states|\buk\b|united kingdom|\buae\b/.test(region);
  const marketplace = /marketplace|seller|sold by/.test(region);
  const codQuery = /cod|cash on delivery/.test(region);
  const codMaxQuery = codQuery && /max|maximum|limit/.test(region);
  const lostQuery = /lost|missing|undelivered|damaged|defective/.test(region);
  const allowed = {
    return: new Set(['00', '01', '02', '03', '04', '07', '08', '12', '13', '14', '18', '19', '20']),
    shipping: new Set(['00', '05', '06', '07', '11', '19', '20', '21']),
    warranty: new Set(['00', '08', '09', '18', '19', '20']),
    promo: new Set(['00', '12', '13', '19', '20']),
    payment: new Set(['00', '03', '10', '11', '14', '17', '18', '20'])
  }[topic];
  let removed = false;
  const kept = evidence.filter(item => {
    const docNumber = item.filename.slice(0, 2);
    if (codMaxQuery && !((item.filename === '10_payments.md' && item.item === '3.2') || (item.filename === '11_cod_and_failed_payments.md' && item.item === '1.2') || (item.filename === '00_how_policies_work_together.md' && item.item === '4.4'))) return false;
    if (allowed && !allowed.has(docNumber)) return false;
    if (['18', '19', '20'].includes(docNumber) && ['return', 'warranty'].includes(topic) && docNumber === '18' && !marketplace) return false;
    if (topic === 'payment' && docNumber === '18' && !marketplace) return false;
    if (docNumber === '19' && !remote) return false;
    if (docNumber === '20' && !international) return false;
    if (topic === 'return' && docNumber === '08' && !/warranty|defect|expired|outside|passed|window.*closed/.test(region)) return false;
    if (topic === 'return' && docNumber === '12' && !/promo|discount|code|coupon|bundle/.test(region)) return false;
    if (topic === 'return' && docNumber === '13' && !/bundle|sale|flash/.test(region)) return false;
    if (topic === 'return' && docNumber === '14' && !/store credit|credit balance/.test(region)) return false;
    if (topic === 'shipping' && docNumber === '19' && item.item === '3.1' && /fee|charge|cost|price|free shipping|surcharge/.test(region)) return false;
    if (['07'].includes(docNumber) && ['shipping', 'return'].includes(topic) && !lostQuery) return false;
    if (docNumber === '11' && topic === 'shipping' && !codQuery) return false;
    let suppress = false;
    if (topic === 'return' && contactDate >= '2026-03-01' && item.filename === '02_returns_policy_2025.md') suppress = true;
    if (remote && topic === 'shipping' && ['05_shipping_policy.md', '06_shipping_fees_and_free_shipping.md', '21_shipping_fee_update_2027.md'].includes(item.filename) && /^\d\./.test(item.item)) suppress = true;
    if (remote && topic === 'return' && item.filename === '01_returns_policy.md' && ['2.1', '4.1', '4.3'].includes(item.item)) suppress = true;
    if (remote && topic === 'warranty' && item.filename === '09_warranty_claims.md' && item.item === '3.1') suppress = true;
    if (international && topic === 'shipping' && ['05_shipping_policy.md', '06_shipping_fees_and_free_shipping.md', '21_shipping_fee_update_2027.md'].includes(item.filename)) suppress = true;
    if (international && topic === 'return' && ((item.filename === '01_returns_policy.md' && ['2.1', '4.1', '4.3'].includes(item.item)) || (item.filename === '03_refunds_policy.md' && item.item === '3.2'))) suppress = true;
    if (international && topic === 'warranty' && item.filename === '09_warranty_claims.md' && item.item === '2.1') suppress = true;
    if (!remote && !international && topic === 'shipping' && contactDate >= '2027-02-01' && item.filename === '06_shipping_fees_and_free_shipping.md' && ['1.1', '1.2', '1.3'].includes(item.item)) suppress = true;
    if (suppress) removed = true;
    return !suppress;
  });
  const codLimitConflict = codQuery && /max|maximum|limit/.test(region) && kept.some(x => x.filename === '10_payments.md' && x.item === '3.2') && kept.some(x => x.filename === '11_cod_and_failed_payments.md' && x.item === '1.2');
  return { evidence: kept, regional: remote || international, olderVersion: topic === 'return' && contactDate >= '2026-03-01' && evidence.some(x => x.filename === '02_returns_policy_2025.md'), feeUpdate: topic === 'shipping' && !remote && !international && contactDate >= '2027-02-01' && evidence.some(x => x.filename === '21_shipping_fee_update_2027.md'), codLimitConflict };
}

export function answerQuestion(payload, items) {
  const { question, context = {} } = payload && typeof payload === 'object' ? payload : {};
  const safeContext = context && typeof context === 'object' ? context : {};
  if (typeof question !== 'string' || question.trim().length < 3 || question.length > 2000) return { status: 'error', answer: 'Please enter a question between 3 and 2,000 characters.', citations: [], evidence: [] };
  const q = ` ${question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  if (/ignore (all )?(previous|prior)|system prompt|reveal.*prompt|developer message|jailbreak|act as (an? )?(admin|system)/i.test(question)) return { status: 'not_covered', answer: 'I can answer questions from NovaCart policy text, but I can’t follow instructions embedded in a question or policy document.', citations: [], evidence: [] };

  if (/^\s*(hi|hello|hey|good morning|good afternoon|good evening)[!.\s]*$/i.test(question)) return { status: 'answered', presentation: 'greeting', answer: "Hello, I'm Nova. I can help explain NovaCart's return, refund, warranty, shipping, payment, and promotion policies.", citations: [], evidence: [] };
  if (/^\s*(how are you|how are you doing|how is it going|how's it going|what's up|whats up)[?!.\s]*$/i.test(question)) return { status: 'answered', presentation: 'greeting', answer: "I'm doing well, thanks for asking! I'm ready to help with NovaCart policies whenever you are.", citations: [], evidence: [] };
  if (/^\s*(thanks|thank you|thx)[!.\s]*$/i.test(question)) return { status: 'answered', presentation: 'greeting', answer: "You're welcome. Ask whenever you'd like help with a NovaCart policy.", citations: [], evidence: [] };
  if (/what can you help|how do i use this assistant/i.test(question)) return { status: 'answered', presentation: 'greeting', answer: "I can explain NovaCart's documented policies, check which dated or regional rule applies, and estimate a supported refund. Include the contact date and order details when they affect the answer.", citations: [], evidence: [] };

  const topic = classifyTopic(question);
  const refundEstimate = topic === 'return' && /calculate|estimate|how much|refund amount|refund value/.test(q);
  const { knownFacts: rawKnownFacts, editField: requestedEditField, ...baseContext } = safeContext;
  const known = rawKnownFacts && typeof rawKnownFacts === 'object' ? rawKnownFacts : {};
  const knownValue = missingField => String(known[missingField] ?? '').trim().toLowerCase();
  if (['contactDate', 'region', 'category', 'deliveryDate', 'paymentMethod', 'paidPrice', 'novaCartError', 'opened'].some(key => knownValue(key) === 'not sure' || knownValue(key) === 'not_sure')) {
    return { status: 'not_covered', presentation: 'insufficient_evidence', answer: "That detail is needed to apply the right policy. If you can find it on your order confirmation or delivery details, share it and I can continue. Otherwise I can't determine the applicable rule from the information provided.", citations: [], evidence: [] };
  }
  const usable = {
    ...baseContext,
    contactDate: validDate(known.contactDate) ? known.contactDate : validDate(safeContext.contactDate) ? safeContext.contactDate : undefined,
    deliveryDate: validDate(known.deliveryDate) ? known.deliveryDate : validDate(safeContext.deliveryDate) ? safeContext.deliveryDate : undefined,
    region: regionOptions.some(x => x.value.toLowerCase() === String(known.region ?? safeContext.region ?? '').toLowerCase()) ? (known.region ?? safeContext.region) : undefined,
    category: categoryOptions.some(x => x.value === String(known.category ?? safeContext.category ?? '').toLowerCase()) ? (known.category ?? safeContext.category).toLowerCase() : undefined,
    paymentMethod: ['card', 'online banking', 'wallet', 'store credit', 'cash on delivery'].includes(String(known.paymentMethod ?? safeContext.paymentMethod ?? '').toLowerCase()) ? (known.paymentMethod ?? safeContext.paymentMethod).toLowerCase() : undefined
  };
  let missing;
  const questionDate = question.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  const hasQuestionDate = validDate(questionDate);
  const hasContactDate = Boolean(usable.contactDate) || hasQuestionDate;
  if (topic !== 'general' && !hasContactDate) missing = { field: 'contactDate', question: 'What date are you asking about?', explanation: 'NovaCart policy versions depend on the date you contact support.', inputType: 'date', options: [], allowCustom: false, required: true };
  else if (topic === 'shipping' && /international|overseas/.test(`${q} ${usable.region ?? ''}`.toLowerCase()) && !/\busa\b|united states|\buk\b|united kingdom|\buae\b/.test(`${q} ${usable.region ?? ''}`.toLowerCase())) missing = { field: 'region', question: 'Which country is the order being delivered to?', explanation: 'International shipping fees differ for the USA, UK and UAE.', inputType: 'single_select', options: regionOptions.filter(x=>['USA','UK','UAE'].includes(x.value)), allowCustom: false, required: true };
  else if ((topic === 'return' || topic === 'shipping' || topic === 'warranty' || (topic === 'payment' && /cod|cash on delivery/.test(q) && /available|where|which areas|destination|region/.test(q))) && !usable.region && (refundEstimate || !hasAny(q, regions))) missing = { field: 'region', question: 'Where was the order delivered?', explanation: 'Some shipping, return, and warranty rules vary by destination.', inputType: 'single_select', options: regionOptions, allowCustom: true, required: true };
  else if (topic === 'return' && !usable.category && (refundEstimate || !hasAny(q, categories))) missing = { field: 'category', question: 'What kind of item is it?', explanation: 'The return window and any restocking fee depend on the item category.', inputType: 'single_select', options: categoryOptions, allowCustom: true, required: true };
  else if (refundEstimate && !(known.paidPrice !== undefined && String(known.paidPrice).trim() !== '' && Number.isSafeInteger(Number(known.paidPrice)) && Number(known.paidPrice) >= 0)) missing = { field: 'paidPrice', question: 'What was the paid price for the item?', explanation: 'Enter the whole-rupee amount after any discount or bundle allocation.', inputType: 'currency', options: [], allowCustom: false, required: true };
  else if (refundEstimate && !['true','false','yes','no'].includes(knownValue('novaCartError'))) missing = { field: 'novaCartError', question: 'Was the return caused by a NovaCart error?', explanation: 'A wrong, defective, or transit-damaged item has different return fees.', inputType: 'single_select', options: [{value:'yes',label:'Yes, wrong / defective / damaged'},{value:'no',label:'No, change of mind'}], allowCustom: false, required: true };
  else if (refundEstimate && usable.category === 'electronics' && !['true','false','yes','no'].includes(knownValue('opened'))) missing = { field: 'opened', question: 'Was the electronics item opened?', explanation: 'Opened, non-defective electronics may have a restocking fee.', inputType: 'single_select', options: [{value:'yes',label:'Yes, opened'},{value:'no',label:'No, sealed'}], allowCustom: false, required: true };
  else if (topic === 'return' && /how many days|within|eligible|can i return|return window|return it|qualify/.test(q) && !usable.deliveryDate && !hasQuestionDate) missing = { field: 'deliveryDate', question: 'When was the item delivered?', explanation: 'Return windows count from the delivery date.', inputType: 'date', options: [], allowCustom: false, required: true };
  else if (topic === 'payment' && /refund|refunded|refund timing|how long/.test(q) && !usable.paymentMethod) missing = { field: 'paymentMethod', question: 'How did you pay for the order?', explanation: 'Refund processing time depends on the original payment method.', inputType: 'single_select', options: [{value:'card',label:'Debit or credit card'},{value:'online banking',label:'Online banking'},{value:'wallet',label:'JazzCash or Easypaisa wallet'},{value:'cash on delivery',label:'Cash on delivery'},{value:'store credit',label:'Store credit'}], allowCustom: true, required: true };
  const editable = ['contactDate', 'region', 'category', 'deliveryDate', 'paymentMethod'];
  if (!missing && ['paidPrice','novaCartError','opened'].includes(requestedEditField)) {
    const field=requestedEditField;
    missing=field==='paidPrice'?{field,question:'What was the paid price for the item?',explanation:'Enter the whole-rupee amount after any discount or bundle allocation.',inputType:'currency',options:[],allowCustom:false,required:true}
      :field==='opened'?{field,question:'Was the electronics item opened?',explanation:'Opened, non-defective electronics may have a restocking fee.',inputType:'single_select',options:[{value:'yes',label:'Yes, opened'},{value:'no',label:'No, sealed'}],allowCustom:false,required:true}
      :{field,question:'Was the return caused by a NovaCart error?',explanation:'A wrong, defective, or transit-damaged item has different return fees.',inputType:'single_select',options:[{value:'yes',label:'Yes, wrong / defective / damaged'},{value:'no',label:'No, change of mind'}],allowCustom:false,required:true};
  }
  if (!missing && editable.includes(requestedEditField)) {
    const field = requestedEditField;
    missing = field === 'contactDate' ? { field, question: 'What contact date should I use?', explanation: 'I’ll re-check the policy version for this date.', inputType: 'date', options: [], allowCustom: false, required: true }
      : field === 'deliveryDate' ? { field, question: 'When was the item delivered?', explanation: 'Return windows count from the delivery date.', inputType: 'date', options: [], allowCustom: false, required: true }
      : field === 'region' ? { field, question: 'Where was the order delivered?', explanation: 'Regional addenda can change the applicable rule.', inputType: 'single_select', options: regionOptions, allowCustom: true, required: true }
      : field === 'category' ? { field, question: 'What kind of item is it?', explanation: 'Return windows and restocking fees depend on the category.', inputType: 'single_select', options: categoryOptions, allowCustom: true, required: true }
      : { field, question: 'How did you pay for the order?', explanation: 'Refund processing time depends on the original payment method.', inputType: 'single_select', options: [{value:'card',label:'Debit or credit card'},{value:'online banking',label:'Online banking'},{value:'wallet',label:'JazzCash or Easypaisa wallet'},{value:'cash on delivery',label:'Cash on delivery'},{value:'store credit',label:'Store credit'}], allowCustom: true, required: true };
  }
  if (missing) {
    const provided = knownValue(missing.field);
    const invalid = provided ? `“${provided}” doesn't match a supported ${missing.field === 'region' ? 'delivery region' : missing.field === 'category' ? 'item category' : missing.field === 'paymentMethod' ? 'payment method' : 'date format'}. ` : '';
    return { status: 'clarification_required', presentation: 'clarification', answer: `${invalid}${missing.question}`, clarification: missing, knownFacts: Object.fromEntries(Object.entries(known).filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')), citations: [], evidence: [] };
  }

  const contactDate = usable.contactDate ?? (hasQuestionDate ? questionDate : undefined);
  const contextText = [usable.region, usable.category, usable.deliveryDate, baseContext.orderDate, usable.paymentMethod].filter(Boolean).join(' ');
  let evidence = retrieve(`${question} ${contextText}`, items, { contactDate, limit: 9 });
  if (!evidence.length) return { status: 'not_covered', answer: 'I could not find a supporting rule in the NovaCart policy files, so I can’t confirm this.', citations: [], evidence: [] };

  const precedence = resolvePrecedence(evidence, question, usable, contactDate ?? '', topic);
  evidence = precedence.evidence;
  if (!evidence.length) return { status: 'not_covered', answer: 'I could not find a supporting rule in the NovaCart policy files, so I can’t confirm this.', citations: [], evidence: [] };

  const primary = evidence.slice(0, 5);
  const status = precedence.codLimitConflict ? 'partial' : 'answered';
  const notices = [];
  if (precedence.olderVersion) notices.push('The 2025 returns edition differs; the later-dated Returns Policy (effective 2026-03-01) applies on your contact date under file 00, Section 4.2.');
  if (precedence.feeUpdate) notices.push('The shipping fee update (effective 2027-02-01) differs from the earlier fee schedule; the later-dated update applies under file 00, Section 4.2.');
  if (precedence.codLimitConflict) notices.push('The COD limits conflict: file 10, Section 3.2 says Rs. 40,000, while file 11, Section 1.2 says Rs. 50,000. They have the same effective date and scope, so the policy does not resolve this; NovaCart support must confirm under file 00, Section 4.4.');
  const precedenceSource = precedence.olderVersion || precedence.feeUpdate ? items.find(x => x.filename === '00_how_policies_work_together.md' && x.item === '4.2') : null;
  const conflictSource = precedence.codLimitConflict ? items.find(x => x.filename === '00_how_policies_work_together.md' && x.item === '4.4') : null;
  const citedEvidence = [...primary, ...(precedenceSource ? [precedenceSource] : []), ...(conflictSource ? [conflictSource] : [])];
  const citations = [...new Map(citedEvidence.map(x => [`${x.filename}#${x.item}`, { filename: x.filename, section: x.item, effectiveDate: x.effectiveDate }])).values()];
  const excerpts = primary.map(x => `${x.excerpt}\n[${x.filename}, Section ${x.item}]`).join('\n\n');
  const noticeText = notices.map((n, i) => `${n} [00_how_policies_work_together.md, Section ${precedence.codLimitConflict && i === notices.length - 1 ? '4.4' : '4.2'}]`).join('\n\n');
  const caveat = primary.length > 1 && !precedence.regional ? '\n\nThese excerpts cover the closest matching rules. If another special case applies but is not shown, please share those details.' : '';
  return { status, presentation: refundEstimate ? 'refund_estimate_ready' : 'policy_answer', knownFacts: { ...usable, ...(usable.contactDate || hasQuestionDate ? { contactDate: usable.contactDate ?? questionDate } : {}), ...(known.paidPrice !== undefined && String(known.paidPrice).trim() !== '' && Number.isSafeInteger(Number(known.paidPrice)) && Number(known.paidPrice) >= 0 ? { paidPrice:Number(known.paidPrice) } : {}), ...(known.novaCartError ? { novaCartError:known.novaCartError } : {}), ...(known.opened ? { opened:known.opened } : {}) }, answer: `${noticeText}${notices.length ? '\n\n' : ''}${excerpts}${caveat}`, citations, evidence: citedEvidence.map(({ filename, item, sectionTitle, excerpt, effectiveDate, scope, region }) => ({ filename, section: item, sectionTitle, excerpt, effectiveDate, scope, region })) };
}
