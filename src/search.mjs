const stop = new Set('a an and are as at be by can do does for from how i in is it of on or the this to was what when where which who with you your novacart policy sell selling buy item items available'.split(' '));
const synonymGroups = [
  ['refund', 'reimburse', 'money back', 'repayment'], ['return', 'send back', 'exchange'],
  ['shipping', 'delivery', 'courier', 'postage'], ['fee', 'charge', 'cost', 'surcharge'],
  ['discount', 'promo', 'promotion', 'code', 'coupon'], ['warranty', 'guarantee', 'repair'],
  ['marketplace', 'seller', 'third party'], ['remote', 'gilgit', 'baltistan', 'ajk', 'azad'],
  ['international', 'overseas', 'export', 'usa', 'uk', 'uae'], ['cancel', 'cancellation'],
  ['lost', 'missing', 'undelivered'], ['damaged', 'defective', 'broken', 'wrong'],
  ['personal care', 'cosmetics', 'skincare'], ['grocery', 'perishable', 'food'],
  ['furniture', 'bulky', 'oversized'], ['clothing', 'apparel', 'garment'],
  ['electronics', 'electronic', 'device', 'phone', 'laptop'], ['cod', 'cash on delivery'],
  ['store credit', 'credit balance']
];
const normalize = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function tokens(text) {
  const base = normalize(text).split(/\s+/).filter(t => t && !stop.has(t));
  const expanded = new Set(base);
  const q = ` ${normalize(text)} `;
  for (const group of synonymGroups) if (group.some(word => q.includes(` ${normalize(word)} `))) group.forEach(w => normalize(w).split(' ').forEach(t => expanded.add(t)));
  return [...expanded];
}

export function retrieve(query, items, { contactDate, limit = 7 } = {}) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  let candidates = contactDate ? items.filter(x => x.effectiveDate <= contactDate) : items;
  const avg = candidates.reduce((n, x) => n + tokens(`${x.title} ${x.sectionTitle} ${x.excerpt}`).length, 0) / Math.max(1, candidates.length);
  const df = new Map(queryTokens.map(t => [t, candidates.filter(x => tokens(`${x.title} ${x.sectionTitle} ${x.excerpt}`).includes(t)).length]));
  const scored = candidates.map(item => {
    const text = `${item.title} ${item.sectionTitle} ${item.excerpt}`;
    const ts = tokens(text), counts = new Map();
    for (const t of ts) counts.set(t, (counts.get(t) ?? 0) + 1);
    let score = 0;
    for (const term of queryTokens) {
      const tf = counts.get(term) ?? 0;
      if (tf) score += Math.log(1 + (candidates.length - (df.get(term) ?? 0) + .5) / ((df.get(term) ?? 0) + .5)) * (tf * 2.2 / (tf + 1.2 * (.25 + .75 * ts.length / Math.max(1, avg))));
    }
    const nq = normalize(query);
    if (nq.length > 5 && normalize(item.excerpt).includes(nq)) score += 2;
    return { ...item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.filename.localeCompare(b.filename) || a.item.localeCompare(b.item));
  if (!scored.length || scored[0].score < 1.05) return [];
  const threshold = Math.max(0.65, scored[0].score * .18);
  const picked = [], byFile = new Map();
  for (const hit of scored) {
    if (hit.score < threshold) break;
    const count = byFile.get(hit.filename) ?? 0;
    if (count >= 2) continue;
    picked.push(hit); byFile.set(hit.filename, count + 1);
    if (picked.length === limit) break;
  }
  return picked;
}

export function classifyTopic(query) {
  const q = normalize(query);
  if (/refund timing|refund take|how long.*refund|when.*refund/.test(q)) return 'payment';
  if (/return|refund|send back|exchange/.test(q)) return 'return';
  if (/promo|discount|coupon|code/.test(q)) return 'promo';
  if (/warranty|repair|guarantee/.test(q)) return 'warranty';
  if (/cod|cash on delivery|payment|wallet|credit card|debit card/.test(q)) return 'payment';
  if (/ship|deliver|courier|postage/.test(q)) return 'shipping';
  return 'general';
}
