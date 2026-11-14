import { answerQuestion } from '../src/answer.mjs';
import { loadPolicies } from '../src/policy.mjs';
import { applyConfiguredModel } from '../src/grounding.mjs';

const policies = await loadPolicies();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = answerQuestion(body, policies);
    return res.status(200).json(await applyConfiguredModel(result, body.question));
  } catch (error) {
    console.error('Ask endpoint failed:', error.message);
    return res.status(500).json({ status: 'error', answer: 'Something went wrong while reading the policy files. Please try again.', citations: [], evidence: [] });
  }
}
