import { loadPolicies } from '../src/policy.mjs';
import { calculateRequest } from '../src/calculate.mjs';

const policies = await loadPolicies();
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { return res.status(200).json(calculateRequest(req.body, policies)); }
  catch (error) { return res.status(400).json({ status: 'error', answer: error.message, citations: [], evidence: [] }); }
}
