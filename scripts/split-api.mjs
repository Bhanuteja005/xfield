import fs from 'node:fs';
import path from 'node:path';
const file='apps/api/src/worker.mjs';let s=fs.readFileSync(file,'utf8');
const pieces=[['account'," if(p==='/api/session')"," if(p==='/api/assets'"],['assets'," if(p==='/api/assets'"," if(p==='/api/folders')"],['projects'," if(p==='/api/folders')"," if(p==='/api/jobs'&&request.method==='POST')"],['generation'," if(p==='/api/jobs'&&request.method==='POST')"," return reply({error:'Not found'},404);"]];
const start=s.indexOf(" if(p==='/api/session')"),end=s.indexOf(" return reply({error:'Not found'},404);");
for(const [name,a,b]of pieces){const content=s.slice(s.indexOf(a),s.indexOf(b));const target='apps/api/src/routes/'+name+'.mjs';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`import {json,text} from '../lib/http.mjs';\nimport {authKey,provider} from '../integrations/higgsfield.mjs';\nimport {runPreview} from '../services/previews.mjs';\nimport {generationInput,assetUpdate,profileUpdate,folderInput} from '../../../../packages/shared/src/contracts.ts';\nexport async function handle${name[0].toUpperCase()+name.slice(1)}({request,env,ctx,u,p,owner,reply}) {\nconst publicMedia=p.startsWith('/api/public/');\n${content}\nreturn null;\n}\n`)}
s=s.slice(0,start)+` for(const handler of [handleAccount,handleAssets,handleProjects,handleGeneration]){const response=await handler({request,env,ctx,u,p,owner,reply});if(response)return response;}\n`+s.slice(end);
const headEnd=s.indexOf('export default');const head=s.slice(0,headEnd);
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content)}
write('apps/api/src/lib/http.mjs',head.slice(0,head.indexOf('const escape=')).replaceAll('const ','export const '));
write('apps/api/src/integrations/higgsfield.mjs',`import {cookie,text} from '../lib/http.mjs';\n`+head.slice(head.indexOf('const authKey='),head.indexOf('export function validateJob')).replace('const authKey=','export const authKey=').replace('async function provider(','export async function provider('));
write('apps/api/src/services/previews.mjs',head.slice(head.indexOf('const escape='),head.indexOf('const authKey='))+head.slice(head.indexOf('function previewSvg(')).replace('function previewSvg(','export function previewSvg(').replace('async function runPreview(','export async function runPreview('));
s=`import {json,cookie} from './lib/http.mjs';\n`+pieces.map(([n])=>`import {handle${n[0].toUpperCase()+n.slice(1)}} from './routes/${n}.mjs';`).join('\n')+'\n'+s.slice(headEnd);
s=s.replace(" const publicMedia=p.startsWith('/api/public/');\n",'');
fs.writeFileSync(file,s);
console.log('API split into entrypoint, route controllers, provider integration and preview service.');
