import fs from 'node:fs';
fs.mkdirSync('public/media',{recursive:true});
const photos={space:'photo-1446776811953-b23d57bd21aa',desert:'photo-1509316785289-025f5b846b35',portrait:'photo-1534528741775-53994a69daeb',city:'photo-1519608487953-e999c86e7455',coast:'photo-1518837695005-2083093ee35b',car:'photo-1492144534655-ae79c964c9d7',mountain:'photo-1464822759023-fed622ff2c3b',flowers:'photo-1490750967868-88aa4486c946',fashion:'photo-1483985988355-763728e1935b',ocean:'photo-1500375592092-40eb2168fd21',product:'photo-1541643600914-78b084683601',forest:'photo-1448375240586-882707db888b'};
const results=await Promise.allSettled(Object.entries(photos).map(async([name,id])=>{const url='https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=1200&q=85';const res=await fetch(url);if(!res.ok)throw new Error(name+': '+res.status);fs.writeFileSync('public/media/'+name+'.jpg',new Uint8Array(await res.arrayBuffer()));return {name,url};}));
fs.writeFileSync('recon/asset-sources.json',JSON.stringify(results,null,2));
for(const r of results)console.log(r.status==='fulfilled'?r.value.name:r.reason.message);
