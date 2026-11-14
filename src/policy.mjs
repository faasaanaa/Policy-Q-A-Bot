import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_DIR = path.join(ROOT, 'policies');
const itemPattern = /^\*\*(\d+\.\d+)\*\*\s*(.*)$/;
const headingPattern = /^##\s+(\d+)\.\s+(.*)$/;
const injectionPattern = /(?:system\s+override|ignore\s+all\s+(?:previous|prior)|reveal\s+your\s+system\s+prompt|internal\s+note\s+for\s+ai\s+assistants|instruction\s+for\s+assistants|always\s+(?:approve|tell\s+the\s+customer|apply\s+this))/i;

function parseFrontMatter(text, filename) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`Missing front matter in ${filename}`);
  const metadata = Object.fromEntries(match[1].split(/\r?\n/).map(line => {
    const i = line.indexOf(':');
    return i < 0 ? ['', ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }).filter(([key]) => key));
  for (const key of ['doc_id', 'title', 'effective_date', 'scope']) {
    if (!metadata[key]) throw new Error(`Missing ${key} in ${filename}`);
  }
  return { metadata, body: text.slice(match[0].length) };
}

function parseItems(body, file) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let section = null;
  let current = null;
  const flush = () => {
    if (!current) return;
    // Keep source text for auditability, but never surface embedded instructions as policy.
    const originalExcerpt = current.lines.join('\n').trim();
    const safeExcerpt = current.lines.filter(line => !injectionPattern.test(line)).join('\n').trim();
    if (safeExcerpt) out.push({ ...file, section: current.item.split('.')[0], item: current.item, sectionTitle: current.sectionTitle, excerpt: safeExcerpt, originalExcerpt });
    current = null;
  };
  for (const line of lines) {
    const heading = line.match(headingPattern);
    if (heading) { flush(); section = { number: heading[1], title: heading[2] }; continue; }
    const item = line.match(itemPattern);
    if (item) {
      flush();
      current = { item: item[1], sectionTitle: section?.title ?? '', lines: [line] };
    } else if (current && !/^\s*---\s*$/.test(line)) current.lines.push(line);
  }
  flush();
  return out;
}

export async function loadPolicies() {
  const names = (await readdir(POLICY_DIR)).filter(n => /^\d{2}_.*\.md$/.test(n)).sort();
  if (names.length !== 22) throw new Error(`Expected 22 organizer policy files, found ${names.length}`);
  const items = [];
  for (const filename of names) {
    const text = await readFile(path.join(POLICY_DIR, filename), 'utf8');
    const { metadata, body } = parseFrontMatter(text, filename);
    const region = filename.startsWith('19_') ? 'Remote areas' : filename.startsWith('20_') ? 'International' : 'All regions';
    const parsed = parseItems(body, { filename, docId: metadata.doc_id, title: metadata.title, effectiveDate: metadata.effective_date, scope: metadata.scope, region });
    if (!parsed.length) throw new Error(`No numbered policy items found in ${filename}`);
    items.push(...parsed);
  }
  return items;
}

export { injectionPattern };
