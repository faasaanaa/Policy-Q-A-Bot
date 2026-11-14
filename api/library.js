import { loadPolicies } from '../src/policy.mjs';

const items = await loadPolicies();
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const documents = new Map();
  for (const item of items) {
    if (!documents.has(item.filename)) documents.set(item.filename, { filename: item.filename, title: item.title, effectiveDate: item.effectiveDate, scope: item.scope, region: item.region, sections: [] });
    documents.get(item.filename).sections.push({ section: item.item, title: item.sectionTitle, excerpt: item.excerpt });
  }
  return res.status(200).json({ documents: [...documents.values()] });
}
