import { calculateReturn, calculatePromo, calculateShipping } from './calculator.mjs';

const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function calculateRequest(body, policies) {
  let calculation, refs;
  if (body?.type === 'return') {
    const { contactDate, region, items, errorReturn = false } = body;
    if (!isDate(contactDate)) throw new Error('A valid contact date is required.');
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new Error('Provide between 1 and 20 returned items.');
    if(typeof errorReturn!=='boolean')throw new TypeError('errorReturn must be a boolean.');
    const country = String(region ?? '').trim().toLowerCase();
    const knownRegions=['metro','islamabad','lahore','karachi','rest of pakistan','pakistan','remote areas','remote area','gilgit-baltistan','gilgit baltistan','azad jammu & kashmir','azad jammu and kashmir','ajk','international','usa','united states','uk','united kingdom','uae'];
    if(!knownRegions.includes(country))throw new Error('Choose a documented delivery region before calculating return fees.');
    const remote = /remote|gilgit|baltistan|azad jammu|ajk/.test(country);
    const international = /international|usa|united states|^uk$|united kingdom|uae/.test(country);
    const modern = contactDate >= '2026-03-01';
    if (contactDate < '2025-06-01') throw new Error('No return refund formula is documented for this contact date.');
    if (remote && contactDate < '2026-04-01') throw new Error('The remote-area return fee is not documented for this date.');
    if (international && contactDate < '2026-04-01') throw new Error('International return rules are not documented for this date.');
    const shaped = items.map((item, index) => {
      if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError(`Item ${index + 1}: provide an item object.`);
      const category = String(item.category ?? '').toLowerCase();
      const allowed = ['electronics', 'clothing', 'furniture/bulky', 'personal care', 'grocery/perishables'];
      if (!allowed.includes(category)) throw new Error(`Item ${index + 1}: choose a documented product category.`);
      if(item.opened!==undefined&&typeof item.opened!=='boolean')throw new TypeError(`Item ${index + 1}: opened must be a boolean.`);
      if(category==='electronics'&&!errorReturn&&typeof item.opened!=='boolean')throw new Error(`Item ${index + 1}: confirm whether the electronics item was opened.`);
      const opened = item.opened === true;
      const defective = errorReturn === true;
      let restockPercent = 0;
      if (!defective && category === 'electronics' && opened) restockPercent = modern ? 15 : 10;
      if (!defective && category === 'furniture/bulky') restockPercent = 10;
      if (!Number.isSafeInteger(item.paidPrice) || item.paidPrice < 0) throw new Error(`Item ${index + 1}: paid price must be a whole number of rupees.`);
      return { label: item.label ?? `Item ${index + 1}`, paidPrice: item.paidPrice, restockPercent };
    });
    const hasBulky = items.some(i => String(i.category).toLowerCase() === 'furniture/bulky');
    const returnFee = errorReturn || international ? 0 : remote ? 400 : hasBulky ? (modern ? 2000 : 1500) : (modern ? 200 : 150);
    calculation = calculateReturn({ items: shaped, returnFee, errorReturn });
    const base = modern ? '01_returns_policy.md' : '02_returns_policy_2025.md';
    refs = [{ filename: base, section: '5.2' }, { filename: base, section: '5.3' }];
    if(contactDate>='2026-01-01')refs.push({ filename: '00_how_policies_work_together.md', section: '1.3' });
    if(!remote&&!international&&!errorReturn)refs.push({ filename: base, section: '4.1' });
    if(errorReturn)refs.push({ filename: base, section: '3.5' }, { filename: base, section: '4.2' });
    const conditionSections={electronics:'3.1',clothing:'3.2','furniture/bulky':'3.3','personal care':'3.4'};
    for(const item of items){const section=conditionSections[String(item.category).toLowerCase()];if(section)refs.push({filename:base,section});}
    if (remote) refs.push({ filename: '19_remote_areas_addendum.md', section: '4.2' });
    if (international) refs.push({ filename: '20_international_addendum.md', section: '6.3' });
    if(contactDate>='2026-03-01')refs.push({ filename: '03_refunds_policy.md', section: '2.5' });
  } else if (body?.type === 'promo') {
    calculation = calculatePromo(body);
    refs = calculation.citations;
  } else if (body?.type === 'shipping') {
    calculation = calculateShipping(body);
    refs = calculation.citations;
    refs.push({ filename: '00_how_policies_work_together.md', section: '5.1' });
  } else throw new Error('Choose calculation type: return, promo, or shipping.');

  const unique = [...new Map(refs.map(r => [`${r.filename}#${r.section}`, r])).values()];
  const evidence = unique.map(ref => {
    const source = policies.find(p => p.filename === ref.filename && p.item === ref.section);
    if (!source) throw new Error(`A calculator citation could not be verified: ${ref.filename} Section ${ref.section}`);
    if(source.effectiveDate>body.contactDate)throw new Error('A required calculation source is not active on the contact date.');
    return { filename: source.filename, section: source.item, sectionTitle: source.sectionTitle, excerpt: source.excerpt, effectiveDate: source.effectiveDate, scope: source.scope, region: source.region };
  });
  const trace = calculation.trace ?? [];
  return { status: 'answered', answer: body.type === 'return' ? `Estimated refund: Rs. ${calculation.total.toLocaleString('en-US')}. This estimate assumes the items are eligible for return; it does not decide eligibility.` : calculation.eligible === false ? calculation.reason : `${body.type === 'promo' ? 'Discount' : 'Shipping and extra charges'} total: Rs. ${(calculation.discount ?? calculation.total).toLocaleString('en-US')}.`, trace, total: calculation.total ?? calculation.discount ?? 0, citations: evidence.map(({ filename, section, effectiveDate }) => ({ filename, section, effectiveDate })), evidence };
}
