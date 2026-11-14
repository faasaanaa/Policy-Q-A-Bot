import { loadPolicies } from '../src/policy.mjs';
const policies = await loadPolicies();
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const categories = ['returns & refunds', 'shipping & delivery', 'warranty', 'payments', 'promotions', 'privacy', 'marketplace'];
  return res.status(200).json({ status: 'ok', policyFiles: 22, policyItems: policies.length, categories, providers: { deterministic: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY), groqFallbackEnabled: process.env.ENABLE_GROQ_FALLBACK === 'true' && Boolean(process.env.GROQ_API_KEY) } });
}
