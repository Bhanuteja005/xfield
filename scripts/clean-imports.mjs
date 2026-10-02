import {ESLint} from 'eslint';
import fs from 'node:fs';
const eslint=new ESLint();
for(const result of await eslint.lintFiles(['apps'])){
 const unused=result.messages.filter(m=>m.ruleId==='no-unused-vars').map(m=>m.message.match(/^'([^']+)'/)?.[1]).filter(Boolean);
 let source=fs.readFileSync(result.filePath,'utf8');
 source=source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*(['"][^'"]+['"]);/g,(all,list,from)=>{const kept=list.split(',').map(s=>s.trim()).filter(s=>s&&!unused.includes(s.split(/\s+as\s+/).pop()));return kept.length?`import {${kept.join(',')}} from ${from};`:''});
 fs.writeFileSync(result.filePath,source);
}
