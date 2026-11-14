import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { answerSegments, readableAnswer } from '../public/chat-core.js';
import { printDocument, wordBytes } from '../public/export.js';

const evidence={filename:'19_remote_areas_addendum.md',section:'2.1',effectiveDate:'2026-04-01',excerpt:'**2.1** Standard fee: Rs. 600.\nNo free shipping. [file 00, Section 3]'};
const messages=[{role:'user',text:'¿Mi reembolso? اردو <img src=x onerror=alert(1)>'},{role:'assistant',text:'**2.1** Fee -- Rs. 600.\n[19_remote_areas_addendum.md, Section 2.1]',result:{evidence:[evidence],trace:['10000 - 1500 - 200 = 8300']}}];

test('answer formatting removes Markdown decoration and preserves numbers, dates and source identity',()=>{
 const parts=answerSegments(messages[1].text,[evidence]);assert.equal(parts[1].text,'19_remote_areas_addendum.md, Section 2.1');assert.equal(parts[1].evidence,evidence);assert.equal(parts[1].type,'reference');
 assert.equal(readableAnswer(messages[1].text,[evidence]),'2.1 Fee, Rs. 600.\n19_remote_areas_addendum.md, Section 2.1');
 assert.equal(readableAnswer('2026-11-14, -5, 3--5 days; **4.2**'), '2026-11-14, -5, 3 to 5 days; 4.2');
 assert.equal(evidence.excerpt.startsWith('**2.1**'),true,'Original policy evidence must not change');
 const unknown=answerSegments('[invented.md, Section 9.9]',[]);assert.equal(unknown[0].evidence,undefined);
});
test('PDF print document escapes untrusted text, keeps full trace and uses colored references',()=>{
 const html=printDocument(messages);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(html.includes('اردو'));assert.match(html,/class="reference"/);assert.match(html,/10000 - 1500 - 200 = 8300/);assert.ok(html.includes('/export.css'));assert.match(html,/<p class="body" dir="auto">2\.1 Fee, Rs\. 600/);assert.ok(!html.includes('[19_remote_areas_addendum.md'));assert.ok(html.includes(evidence.excerpt),'Original evidence remains verbatim');
 const long='Policy detail. '.repeat(3000);assert.ok(printDocument([{role:'assistant',text:long}]).includes(long),'Collapsed UI answers must export in full');
});
function unzipStored(bytes){
 const data=Buffer.from(bytes),end=data.length-22;assert.equal(data.readUInt32LE(end),0x06054b50);const count=data.readUInt16LE(end+10),files=new Map();let pos=data.readUInt32LE(end+16);
 for(let i=0;i<count;i++){assert.equal(data.readUInt32LE(pos),0x02014b50);const size=data.readUInt32LE(pos+24),nameLength=data.readUInt16LE(pos+28),extraLength=data.readUInt16LE(pos+30),commentLength=data.readUInt16LE(pos+32),local=data.readUInt32LE(pos+42),name=data.subarray(pos+46,pos+46+nameLength).toString('utf8');assert.equal(data.readUInt32LE(local),0x04034b50);assert.equal(data.readUInt16LE(local+8),0);const start=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28),body=data.subarray(start,start+size);assert.equal(crc32(body),data.readUInt32LE(pos+16),'ZIP CRC must validate');files.set(name,body.toString('utf8'));pos+=46+nameLength+extraLength+commentLength;}
 return files;
}
test('Word export is a valid CRC-checked DOCX archive with Unicode, evidence and calculations',()=>{
 const files=unzipStored(wordBytes(messages));assert.equal(files.size,5);assert.match(files.get('[Content_Types].xml'),/wordprocessingml.document.main\+xml/);assert.match(files.get('_rels/.rels'),/Target="word\/document.xml"/);assert.ok(files.has('word/_rels/document.xml.rels'));const xml=files.get('word/document.xml');assert.ok(xml.includes('اردو'));assert.ok(xml.includes('¿Mi reembolso?'));assert.ok(!xml.includes('<img'));assert.ok(xml.includes('&lt;img'));assert.ok(xml.includes('10000 - 1500 - 200 = 8300'));assert.ok(xml.includes('19_remote_areas_addendum.md, Section 2.1'));assert.ok(xml.includes('w:color w:val="2454A5"'));assert.ok(xml.includes('2.1 Fee, Rs. 600.'));assert.ok(xml.includes('**2.1** Standard fee: Rs. 600.'));assert.ok(!xml.includes('[19_remote_areas_addendum.md'));
});
test('chat offers PDF and Word only and loads both export assets',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(app.includes("button('PDF'"));assert.ok(app.includes("button('Word (.docx)'"));assert.ok(!app.includes('novacart-conversation.md'));assert.ok(!app.includes('text/markdown'));assert.ok(app.includes('contentWindow.print()'));
});
