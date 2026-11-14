export function isNearBottom(top, height, total, threshold = 90) { return total - top - height <= threshold; }
export function activeClarification(messages, flow) { const last = messages.at(-1); return flow && last?.role === 'assistant' && last.result?.status === 'clarification_required' ? last.result.clarification : null; }
export function evidenceLabel(filename) { return String(filename || '').replace(/^\d+_/, '').replace(/\.md$/, '').replaceAll('_', ' '); }
export function shouldCollapseAnswer(text) { return text.length > 850 || text.split('\n').length > 12; }
// Presentation only: keep the stored answer and original evidence unchanged.
export function answerSegments(text, evidence = []) {
  const clean=String(text??'').replace(/^\s*[-*_]{3,}\s*$/gm,'').replace(/\*\*|__/g,'').replace(/`([^`]+)`/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/(\d)\s*--+\s*(?=\d)/g,'$1 to ').replace(/\s*(?:--+|—)\s*/g,', ');
  const parts=[];let start=0;
  const pattern=/\[((?:[^\]\n]*\.md,?\s*(?:Section|§)\s*[\d.]+)|(?:file\s+\d{2},?\s*Section\s*[\d.]+))\]/gi;
  for(const match of clean.matchAll(pattern)){
    if(match.index>start)parts.push({type:'text',text:clean.slice(start,match.index)});
    const ref=match[1],parsed=ref.match(/^([^,\s]+\.md),?\s*(?:Section|§)\s*([\d.]+)$/i);
    const source=parsed?evidence.find(e=>e.filename===parsed[1]&&e.section===parsed[2]):undefined;
    parts.push({type:'reference',text:ref,...(source?{evidence:source}:{})});start=match.index+match[0].length;
  }
  if(start<clean.length)parts.push({type:'text',text:clean.slice(start)});
  return parts;
}
export function readableAnswer(text,evidence=[]){return answerSegments(text,evidence).map(p=>p.text).join('');}
export function exportConversation(messages) {
  return 'NovaCart policy conversation\n\n' + messages.map(m => {
    const sources = m.result?.evidence?.map(e => `${e.filename}, Section ${e.section}, effective ${e.effectiveDate}\n${e.excerpt}`).join('\n') || '';
    const trace = m.result?.trace?.join('\n') || '';
    return `${m.role === 'user' ? 'You' : 'Nova'}\n\n${m.role==='assistant'?readableAnswer(m.text,m.result?.evidence):m.text}\n\n${trace ? `Calculation\n${trace}\n\n` : ''}${sources ? `Original policy evidence\n${sources}\n` : ''}`;
  }).join('\n');
}
