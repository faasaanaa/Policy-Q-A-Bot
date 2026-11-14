import { answerSegments } from './chat-core.js';

// Shared, full transcript for print/PDF and real Office Open XML exports.
export function conversationBlocks(messages){
 const blocks=[{kind:'title',parts:[{text:'NovaCart policy conversation'}]}];
 for(const message of messages){
  const evidence=message.result?.evidence||[];
  blocks.push({kind:'heading',parts:[{text:message.role==='user'?'You':'Nova'}]},{kind:'body',parts:message.role==='assistant'?answerSegments(message.text,evidence):[{text:message.text}]});
  if(message.result?.trace?.length){blocks.push({kind:'subheading',parts:[{text:'Calculation'}]});for(const step of message.result.trace)blocks.push({kind:'body',parts:answerSegments(step,evidence)});}
  if(evidence.length)blocks.push({kind:'subheading',parts:[{text:'Policy evidence'}]});
  for(const e of evidence)blocks.push({kind:'reference',parts:[{type:'reference',text:`${e.filename}, Section ${e.section}, effective ${e.effectiveDate}`}]},{kind:'source',parts:[{text:e.excerpt}]});
 }
 return blocks;
}
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function printDocument(messages){
 const content=conversationBlocks(messages).map(block=>{const tag={title:'h1',heading:'h2',subheading:'h3'}[block.kind]||'p';return `<${tag} class="${block.kind}" dir="auto">${block.parts.map(p=>p.type==='reference'?`<span class="reference">${escape(p.text)}</span>`:escape(p.text)).join('')}</${tag}>`;}).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>NovaCart conversation</title><link rel="stylesheet" href="/export.css"></head><body>'+content+'</body></html>';
}

const utf8=text=>new TextEncoder().encode(text);
function xml(text){return escape(String(text??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''));}
function wordRun(part){const props=part.type==='reference'?'<w:rPr><w:color w:val="2454A5"/><w:b/></w:rPr>':'';return '<w:r>'+props+String(part.text??'').split('\n').map((line,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+xml(line)+'</w:t>').join('')+'</w:r>';}
function wordDocument(messages){
 const body=conversationBlocks(messages).map(b=>{const style={title:'Title',heading:'Heading1',subheading:'Heading2'}[b.kind]||'Normal';const rtl=/^[\s\d\p{P}]*[\u0600-\u06ff\u0750-\u077f]/u.test(b.parts.map(p=>p.text).join(''));return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${rtl?'<w:bidi/>':''}</w:pPr>${b.parts.map(wordRun).join('')}</w:p>`;}).join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function joinBytes(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
// ZIP STORE (no compression): five tiny XML files, portable in any modern browser.
function zip(entries){
 const files=[],directory=[];let offset=0;
 for(const [name,text] of entries){const filename=utf8(name),data=utf8(text),crc=crc32(data),local=new Uint8Array(30+filename.length),view=new DataView(local.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,filename.length,true);local.set(filename,30);files.push(local,data);
  const central=new Uint8Array(46+filename.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);central.set(filename,46);directory.push(central);offset+=local.length+data.length;
 }
 const end=new Uint8Array(22),ev=new DataView(end.buffer),central=joinBytes(directory);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,central.length,true);ev.setUint32(16,offset,true);return joinBytes([...files,central,end]);
}
export function wordBytes(messages){
 return zip([
  ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml',wordDocument(messages)],
  ['word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['word/styles.xml','<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/><w:sz w:val="22"/><w:color w:val="1B2940"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>']
 ]);
}
