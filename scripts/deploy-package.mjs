// Explicit source allowlist. Never package .env, .git, credentials, tests or local history.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=path.join(root,'.deployment-manifest.json');
if(process.argv[2]==='--group'){
 const data=JSON.parse(await readFile(manifest,'utf8'));const group=data.groups[Number(process.argv[3])];if(!group)throw Error('Invalid source group');console.log(JSON.stringify(group));
}else{
 const files=[];async function walk(folder){for(const item of (await readdir(path.join(root,folder),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=folder+'/'+item.name;if(item.isSymbolicLink())throw Error('Deployment source cannot include symlinks');if(item.isDirectory())await walk(name);else files.push(name);}}
 for(const folder of ['api','src','public','policies'])await walk(folder);files.push('package.json','vercel.json');
 const groups=[];let group=[],bytes=0,total=0;
 for(const file of files){if(file.split('/').some(p=>p.startsWith('.')))throw Error('Hidden file rejected from deployment');const data=await readFile(path.join(root,file));if(/gsk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}/.test(data.toString('utf8')))throw Error('Credential-like source rejected');const entry={file,data:data.toString('base64'),encoding:'base64'};if(bytes+entry.data.length>24000&&group.length){groups.push(group);group=[];bytes=0;}group.push(entry);bytes+=entry.data.length;total+=data.length;}
 if(group.length)groups.push(group);await writeFile(manifest,JSON.stringify({groups}));console.log(JSON.stringify({groups:groups.length,files:files.length,totalBytes:total,policyFiles:files.filter(f=>f.startsWith('policies/')).length}));
}
