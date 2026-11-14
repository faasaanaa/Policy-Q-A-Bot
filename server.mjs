import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPolicies } from './src/policy.mjs';
import { answerQuestion } from './src/answer.mjs';
import { applyConfiguredModel } from './src/grounding.mjs';
import { calculateRequest } from './src/calculate.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const policies = await loadPolicies();
const publicFiles = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/styles.css', ['styles.css', 'text/css; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/locales.js', ['locales.js', 'text/javascript; charset=utf-8']], ['/chat-core.js', ['chat-core.js', 'text/javascript; charset=utf-8']], ['/activity.js', ['activity.js', 'text/javascript; charset=utf-8']]]);
const headers = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { ...headers, 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok', policyFiles: 22, policyItems: policies.length, categories: ['returns & refunds', 'shipping & delivery', 'warranty', 'payments', 'promotions', 'privacy', 'marketplace'], providers: { deterministic: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY), groqFallbackEnabled: process.env.ENABLE_GROQ_FALLBACK === 'true' && Boolean(process.env.GROQ_API_KEY) } });
    if (req.method === 'GET' && url.pathname === '/api/library') {
      const documents = new Map();
      for (const item of policies) {
        if (!documents.has(item.filename)) documents.set(item.filename, { filename: item.filename, title: item.title, effectiveDate: item.effectiveDate, scope: item.scope, region: item.region, sections: [] });
        documents.get(item.filename).sections.push({ section: item.item, title: item.sectionTitle, excerpt: item.excerpt });
      }
      return send(res, 200, { documents: [...documents.values()] });
    }
    if (req.method === 'POST' && url.pathname === '/api/ask') {
      let body = '', tooLarge = false;
      for await (const chunk of req) { body += chunk; if (body.length > 16_384) { tooLarge = true; break; } }
      if (tooLarge) return send(res, 413, { status: 'error', answer: 'Request is too large.', citations: [], evidence: [] });
      let parsed;
      try { parsed = JSON.parse(body); } catch { return send(res, 400, { status: 'error', answer: 'Request body must be valid JSON.', citations: [], evidence: [] }); }
      const result = answerQuestion(parsed, policies);
      return send(res, 200, await applyConfiguredModel(result, parsed.question));
    }
    if (req.method === 'POST' && url.pathname === '/api/calculate') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 16_384) return send(res, 413, { status: 'error', answer: 'Request is too large.' }); }
      try { return send(res, 200, calculateRequest(JSON.parse(body), policies)); }
      catch (error) { return send(res, 400, { status: 'error', answer: error.message, citations: [], evidence: [] }); }
    }
    if (req.method === 'GET' && publicFiles.has(url.pathname)) {
      const [name, type] = publicFiles.get(url.pathname);
      return send(res, 200, await readFile(path.join(root, 'public', name), 'utf8'), type);
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Request failed:', error.message);
    send(res, 500, { status: 'error', answer: 'Something went wrong while reading the policy files. Please try again.', citations: [], evidence: [] });
  }
});

server.listen(port, host, () => console.log(`NovaCart Policy Q&A listening at http://${host}:${port} (${policies.length} policy items indexed)`));
