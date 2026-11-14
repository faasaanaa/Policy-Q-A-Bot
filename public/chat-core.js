export function isNearBottom(top, height, total, threshold = 90) { return total - top - height <= threshold; }
export function activeClarification(messages, flow) { const last = messages.at(-1); return flow && last?.role === 'assistant' && last.result?.status === 'clarification_required' ? last.result.clarification : null; }
export function evidenceLabel(filename) { return String(filename || '').replace(/^\d+_/, '').replace(/\.md$/, '').replaceAll('_', ' '); }
export function shouldCollapseAnswer(text) { return text.length > 850 || text.split('\n').length > 12; }
export function exportConversation(messages) {
  return '# NovaCart policy conversation\n\n' + messages.map(m => {
    const sources = m.result?.evidence?.map(e => `- ${e.filename}, Section ${e.section}, effective ${e.effectiveDate}\n  ${e.excerpt}`).join('\n') || '';
    const trace = m.result?.trace?.map(x => `- ${x}`).join('\n') || '';
    return `## ${m.role === 'user' ? 'You' : 'Nova'}\n\n${m.text}\n\n${trace ? `### Calculation\n${trace}\n\n` : ''}${sources ? `### Original policy evidence\n${sources}\n` : ''}`;
  }).join('\n');
}
