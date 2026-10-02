import fs from 'node:fs';
const flows=JSON.parse(fs.readFileSync('recon/mobbin-flows.json','utf8'));
const unique=[...new Map(flows.flatMap(f=>f.screens).map(s=>[s.screen_id,s])).values()];
fs.mkdirSync('recon/screens',{recursive:true});
let next=0,ok=0,errors=[];
async function worker(){while(next<unique.length){const s=unique[next++],target='recon/screens/'+s.screen_id+'.jpg';if(fs.existsSync(target)){ok++;continue}try{const res=await fetch(s.image_url,{signal:AbortSignal.timeout(30000)});if(!res.ok)throw new Error(String(res.status));fs.writeFileSync(target,new Uint8Array(await res.arrayBuffer()));ok++}catch(e){errors.push({id:s.screen_id,error:e.message})}}}
await Promise.all(Array.from({length:6},worker));fs.writeFileSync('recon/download-status.json',JSON.stringify({downloaded:ok,total:unique.length,errors},null,2));console.log({downloaded:ok,total:unique.length,errors:errors.length});
