import { loadPolicies } from '../src/policy.mjs';
const policies = await loadPolicies();
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ status: 'ok', policyFiles: 22, policyItems: policies.length, mode: 'deterministic-evidence-with-optional-gemini-grok' });
}
