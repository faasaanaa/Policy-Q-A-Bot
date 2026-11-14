import { classifyTopic, retrieve } from './search.mjs';
import { injectionPattern } from './policy.mjs';

const regions = ['remote area', 'azad jammu', 'gilgit', 'baltistan', 'international', 'usa', 'united states', ' uk ', 'united kingdom', 'uae', 'islamabad', 'lahore', 'karachi', 'rest of pakistan', 'pakistan'];
const categories = ['electronics', 'clothing', 'grocery', 'perishable', 'furniture', 'bulky', 'personal care'];
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

  const topic = classifyTopic(question);
  const missing = [];
  const hasContextDate = validDate(safeContext.contactDate);
  const questionDate = question.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  const hasQuestionDate = validDate(questionDate);
  if (topic !== 'general' && !hasContextDate && !hasQuestionDate) missing.push('contact date');
  if ((topic === 'return' || topic === 'shipping' || topic === 'warranty' || (topic === 'payment' && /cod|cash on delivery/.test(q) && /available|where|which areas|destination|region/.test(q))) && !hasAny(q, regions) && !safeContext.region) missing.push('delivery region');
  if (topic === 'return' && !hasAny(q, categories) && !safeContext.category) missing.push('item category');
  if (topic === 'return' && /how many days|within|eligible|can i return|return window|return it|qualify/.test(q) && !safeContext.deliveryDate && !/\d{4}-\d{2}-\d{2}/.test(question)) missing.push('delivery date');
  if (missing.length) return { status: 'clarification_required', answer: `To apply the right ${topic === 'return' ? 'return rule' : `${topic} policy`}, what is the ${missing.join(', ')}?`, citations: [], evidence: [], missing };

  const contactDate = validDate(safeContext.contactDate) ? safeContext.contactDate : hasQuestionDate ? questionDate : undefined;
  const contextText = [safeContext.region, safeContext.category, safeContext.deliveryDate, safeContext.orderDate].filter(Boolean).join(' ');
  let evidence = retrieve(`${question} ${contextText}`, items, { contactDate, limit: 9 });
  if (!evidence.length) return { status: 'not_covered', answer: 'I could not find a supporting rule in the NovaCart policy files, so I can’t confirm this.', citations: [], evidence: [] };

  const precedence = resolvePrecedence(evidence, question, safeContext, contactDate ?? '', topic);
  evidence = precedence.evidence;
  if (!evidence.length) return { status: 'not_covered', answer: 'I could not find a supporting rule in the NovaCart policy files, so I can’t confirm this.', citations: [], evidence: [] };

  const primary = evidence.slice(0, 5);
  const status = precedence.codLimitConflict || (primary.length > 1 && !precedence.regional) ? 'partial' : 'answered';
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
  return { status, answer: `${noticeText}${notices.length ? '\n\n' : ''}${excerpts}${caveat}`, citations, evidence: citedEvidence.map(({ filename, item, sectionTitle, excerpt, effectiveDate, scope, region }) => ({ filename, section: item, sectionTitle, excerpt, effectiveDate, scope, region })) };
}
