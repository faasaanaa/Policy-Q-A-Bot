// Decimal-safe whole-PKR calculation helpers. Inputs are integer rupees; all
// fractional results round half up at the step where the policy requires it.
export function roundHalfUp(numerator, denominator = 1) {
  if ((typeof numerator !== 'bigint' && !Number.isSafeInteger(numerator)) || (typeof denominator !== 'bigint' && !Number.isSafeInteger(denominator))) throw new TypeError('Use safe integer amounts and a positive denominator');
  const n=BigInt(numerator), d=BigInt(denominator);
  if(d<=0n)throw new TypeError('Use a positive denominator');
  const absolute=n<0n?-n:n;
  const rounded=(absolute*2n+d)/(2n*d)*(n<0n?-1n:1n);
  const result=Number(rounded);
  if(!Number.isSafeInteger(result))throw new RangeError('Amount exceeds the supported safe range');
  return result;
}
export function percent(amount, rateNumerator, rateDenominator = 100) {
  if (![amount, rateNumerator, rateDenominator].every(Number.isSafeInteger) || amount < 0 || rateNumerator < 0) throw new TypeError('Amounts and rates must be non-negative safe integers');
  return roundHalfUp(BigInt(amount) * BigInt(rateNumerator), BigInt(rateDenominator));
}
export function allocateProportionally(total, weights) {
  if (!Number.isSafeInteger(total) || total < 0 || !weights.length || weights.some(w => !Number.isSafeInteger(w) || w < 0)) throw new TypeError('Invalid allocation');
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (!sum) throw new TypeError('Allocation weights must sum above zero');
  const shares = weights.map(w => roundHalfUp(BigInt(total) * BigInt(w), sum));
  const delta = Number(BigInt(total) - shares.reduce((a, b) => a + BigInt(b), 0n));
  let winner = 0;
  for (let i = 1; i < weights.length; i++) if (weights[i] > weights[winner]) winner = i;
  shares[winner] += delta;
  return shares;
}

export function calculateReturn({ items, returnFee = 0, errorReturn = false }) {
  if (!Array.isArray(items) || !items.length || items.some(i => !i || !Number.isSafeInteger(i.paidPrice) || i.paidPrice < 0 || !Number.isSafeInteger(i.restockPercent ?? 0) || (i.restockPercent ?? 0)<0 || (i.restockPercent ?? 0)>100)) throw new TypeError('Return items require non-negative whole-PKR paidPrice values and valid percentages');
  if(typeof errorReturn!=='boolean'||!Number.isSafeInteger(returnFee)||returnFee<0)throw new TypeError('Return fee and error-return flag are invalid');
  const trace = [];
  const lineRefunds = items.map(item => {
    const fee = errorReturn ? 0 : percent(item.paidPrice, item.restockPercent ?? 0);
    const refund = Math.max(0, item.paidPrice - fee);
    trace.push(`${item.label ?? 'Item'}: Rs. ${item.paidPrice.toLocaleString('en-US')} paid − Rs. ${fee.toLocaleString('en-US')} restocking = Rs. ${refund.toLocaleString('en-US')}`);
    return refund;
  });
  const chargedReturnFee = errorReturn ? 0 : returnFee;
  const subtotal = safeSum(lineRefunds);
  const total = Math.max(0, subtotal - chargedReturnFee);
  trace.push(`Item refunds Rs. ${subtotal.toLocaleString('en-US')} − one return fee Rs. ${chargedReturnFee.toLocaleString('en-US')} = Rs. ${total.toLocaleString('en-US')}`);
  return { total, lineRefunds, trace };
}

const promoRules = {
  WELCOME10: { kind: 'percent', rate: 10, minimum: 3000, cap: 1000, lastDay: '2026-12-31', categories: ['electronics', 'clothing', 'furniture/bulky', 'personal care'], needsFirstOrder: true },
  STYLE15: { kind: 'percent', rate: 15, minimum: 4000, cap: 1500, lastDay: '2026-08-31', categories: ['clothing'] },
  TECH500: { kind: 'fixed', amount: 500, minimum: 15000, cap: 500, lastDay: '2027-01-31', categories: ['electronics'], needsMonthlyCheck: true }
};
const validIsoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const money = n => `Rs. ${n.toLocaleString('en-US')}`;
function safeSum(amounts) {const result=amounts.reduce((sum,n)=>sum+BigInt(n),0n);if(result>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('Amount exceeds the supported safe range');return Number(result);}

export function calculatePromo({ code, items, orderDate, contactDate, firstOrder, tech500UsedThisMonth, region = 'Metro' }) {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!validIsoDate(contactDate) || contactDate < '2026-06-01') throw new Error('A valid contact date on or after 2026-06-01 is required for current promo rules.');
  if (normalized === 'FREESHIP') return { type: 'shipping_code', eligible: false, reason: 'FREESHIP removes a standard shipping fee; use calculateShipping to evaluate its threshold and region rules.', citations: [{ filename: '12_promo_code_rules.md', section: '5.1' }, { filename: '12_promo_code_rules.md', section: '5.2' }, { filename: '12_promo_code_rules.md', section: '5.3' }] };
  const rule = promoRules[normalized];
  if (!rule) throw new Error('This code is not listed in the active promo policy.');
  if (!validIsoDate(orderDate)) throw new Error('A valid order date (YYYY-MM-DD) is required to check this code.');
  if (orderDate > rule.lastDay) throw new Error(`${normalized} expired after ${rule.lastDay}.`);
  if (rule.needsFirstOrder && firstOrder !== true) throw new Error('WELCOME10 requires confirmation that this is the customer’s first order.');
  if (rule.needsMonthlyCheck && typeof tech500UsedThisMonth !== 'boolean') throw new Error('Confirm whether TECH500 was used by this customer in the current calendar month.');
  if (rule.needsMonthlyCheck && tech500UsedThisMonth) throw new Error('TECH500 has already been used by this customer in this calendar month.');
  if (!Array.isArray(items) || !items.length) throw new TypeError('Add at least one order item.');
  const international = /usa|uk|uae|international/i.test(region);
  const priced = items.map(item => {
    if (!Number.isSafeInteger(item.price) || item.price < 0 || typeof item.category !== 'string') throw new TypeError('Each item needs a whole-rupee price and category.');
    const price = international ? roundHalfUp(BigInt(item.price) * 100n, 118n) : item.price;
    const eligible = rule.categories.includes(item.category.toLowerCase()) && !item.marketplace && !item.finalSale && !item.bundle;
    return { ...item, price, eligible };
  });
  const eligibleItems = priced.filter(item => item.eligible);
  const eligibleSubtotal = safeSum(eligibleItems.map(item=>item.price));
  if (eligibleSubtotal < rule.minimum) throw new Error(`Eligible subtotal ${money(eligibleSubtotal)} is below the ${money(rule.minimum)} minimum.`);
  let discount = rule.kind === 'percent' ? Math.min(percent(eligibleSubtotal, rule.rate), rule.cap) : Math.min(rule.amount, eligibleSubtotal);
  const shares = allocateProportionally(discount, eligibleItems.map(item => item.price));
  const itemShares = eligibleItems.map((item, index) => ({ label: item.label ?? item.category, discountShare: shares[index], paidPrice: item.price - shares[index] }));
  const trace = [
    ...priced.map(i => `${i.label ?? i.category}: ${money(i.price)}${international ? ' export price (listed price ÷ 1.18, rounded)' : ' selling price'}${i.eligible ? ' · eligible' : ' · excluded'}`),
    `Eligible subtotal: ${money(eligibleSubtotal)} · minimum: ${money(rule.minimum)}`,
    `Discount: ${money(discount)}${rule.kind === 'percent' ? ` (${rule.rate}% rounded half up, capped at ${money(rule.cap)})` : ` (fixed code, limited to eligible subtotal)`}`,
    ...itemShares.map(i => `${i.label}: discount share ${money(i.discountShare)}, paid price ${money(i.paidPrice)}`)
  ];
  return { code: normalized, eligible: true, eligibleSubtotal, discount, itemShares, trace, citations: [{ filename: '12_promo_code_rules.md', section: '2.1' }, { filename: '12_promo_code_rules.md', section: '3.1' }, { filename: '12_promo_code_rules.md', section: '3.2' }, { filename: '12_promo_code_rules.md', section: '6.1' }, { filename: '12_promo_code_rules.md', section: '6.2' }] };
}

export function calculateShipping({ region, contactDate, orderDate, subtotalAfterDiscount, express = false, bulkyItemCount = 0, cod = false, freeShip = false }) {
  if([express,cod,freeShip].some(value=>typeof value!=='boolean'))throw new TypeError('Shipping flags must be boolean values.');
  if (!validIsoDate(contactDate) || contactDate < '2026-01-15') throw new Error('A valid contact date on or after 2026-01-15 is required for shipping fee rules.');
  if (!Number.isSafeInteger(subtotalAfterDiscount) || subtotalAfterDiscount < 0 || !Number.isSafeInteger(bulkyItemCount) || bulkyItemCount < 0) throw new TypeError('Provide a non-negative whole-rupee subtotal and bulky item count.');
  const r = String(region ?? '').trim().toLowerCase();
  if(r==='international')throw new Error('Choose USA, UK or UAE to determine the documented international shipping rate.');
  const remote = /remote|gilgit|baltistan|azad jammu|ajk/.test(r);
  const international = /international|usa|united states|^uk$|united kingdom|uae/.test(r);
  const metro = /metro|islamabad|lahore|karachi/.test(r);
  const rest = /rest|pakistan/.test(r) && !remote;
  if (!remote && !international && !metro && !rest) throw new Error('Choose Metro, Rest of Pakistan, Remote areas, UAE, UK, or USA.');
  if ((remote || international) && contactDate < '2026-04-01') throw new Error('Regional shipping fees are not documented as active for this date.');
  if (cod && contactDate < '2026-05-01') throw new Error('COD shipping fees are not documented as active for this date.');
  if (freeShip && (!validIsoDate(orderDate) || orderDate > '2026-12-31')) throw new Error('FREESHIP requires a valid order date on or before 2026-12-31.');
  if(freeShip && contactDate<'2026-06-01')throw new Error('FREESHIP policy is not documented as active for this contact date.');
  const updated = contactDate >= '2027-02-01';
  let standard = 0, threshold = Infinity, expressFee = 0, bulkyRate = 0, feeSource;
  if (remote) { standard = 600; threshold = 12000; feeSource = '19_remote_areas_addendum.md'; }
  else if (international) {
    standard = /uae/.test(r) ? 3500 : /\buk\b|united kingdom/.test(r) ? 5500 : 6500;
    feeSource = '20_international_addendum.md';
  } else if (metro) { standard = updated ? 300 : 250; threshold = updated ? 6000 : 5000; expressFee = updated ? 600 : 500; bulkyRate = updated ? 1800 : 1500; feeSource = updated ? '21_shipping_fee_update_2027.md' : '06_shipping_fees_and_free_shipping.md'; }
  else { standard = updated ? 400 : 350; threshold = updated ? 8500 : 7500; bulkyRate = updated ? 3000 : 2500; feeSource = updated ? '21_shipping_fee_update_2027.md' : '06_shipping_fees_and_free_shipping.md'; }
  if ((remote || international) && (express || bulkyItemCount || cod)) throw new Error('Express, bulky delivery, and COD are unavailable for this region under the regional policy.');
  if (express && !metro) throw new Error('Express delivery is available in Metro cities only.');
  if (cod && (remote || international)) throw new Error('COD is unavailable for Remote areas and International orders.');
  const thresholdWaiver = !international && !express && subtotalAfterDiscount >= threshold;
  const freeshipEligibleRegion = metro || rest;
  const freeshipWaiver = freeShip && freeshipEligibleRegion && subtotalAfterDiscount >= 2000;
  const standardFee = express ? expressFee : thresholdWaiver || freeshipWaiver ? 0 : standard;
  const expressCharge = express ? 0 : 0;
  const bulkySurcharge = bulkyRate * bulkyItemCount;
  const codFee = cod ? 100 : 0;
  const total = standardFee + expressCharge + bulkySurcharge + codFee;
  if(!Number.isSafeInteger(bulkySurcharge)||!Number.isSafeInteger(total))throw new RangeError('Amount exceeds the supported safe range');
  const trace = [
    `Standard shipping: ${express ? 'express' : money(standard)}${express ? ` (replaces standard fee: ${money(expressFee)})` : thresholdWaiver ? ` (waived; subtotal ${money(subtotalAfterDiscount)} meets ${money(threshold)} threshold)` : freeshipWaiver ? ' (waived by eligible FREESHIP code)' : ` (subtotal threshold: ${money(threshold)})`}`,
    `Bulky surcharge: ${money(bulkySurcharge)} (${bulkyItemCount} × ${money(bulkyRate)})`,
    `COD fee: ${money(codFee)}`,
    `Shipping and extra charges total: ${money(total)}`
  ];
  if (freeShip && !freeshipEligibleRegion) trace.push('FREESHIP does not apply to Remote areas or International orders.');
  else if (freeShip && !freeshipWaiver) trace.push('FREESHIP minimum not met; it requires Rs. 2,000 after any other discount.');
  const citations = [{ filename: feeSource, section: remote ? '2.1' : international ? '4.1' : updated ? '1.1' : '1.1' }];
  if (express) citations.push({ filename: '05_shipping_policy.md', section: '2.2' }, { filename: feeSource, section: updated ? '1.2' : '1.2' });
  if (bulkyItemCount) citations.push({ filename: feeSource, section: remote || international ? '2.2' : updated ? '1.3' : '1.3' });
  if (cod) citations.push({ filename: '11_cod_and_failed_payments.md', section: '2.1' });
  if (freeShip) citations.push({ filename: '12_promo_code_rules.md', section: '5.1' }, { filename: '12_promo_code_rules.md', section: '5.2' }, { filename: '12_promo_code_rules.md', section: '5.3' });
  return { total, standardFee, bulkySurcharge, codFee, trace, citations };
}
