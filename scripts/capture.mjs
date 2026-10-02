import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const root = path.resolve(import.meta.dirname, '..');
const sessions = path.join(os.homedir(), '.codex', 'sessions');
const output = path.join(root, '.agent-logs');
const current = '01a0fdf5-203d-7c02-8746-da5e68dc3e22';
const seen = new Map();
const redactBranding = (body) => body.replace(/\b8x\b/gi, '[project]').replace(/\bassignment\b/gi, 'project');
fs.mkdirSync(output, { recursive: true });
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : e.name.endsWith('.jsonl') ? [path.join(dir,e.name)] : []);
}
function sync() {
  for (const file of files(sessions)) {
    const stat = fs.statSync(file);
    if (seen.get(file) === stat.mtimeMs) continue;
    seen.set(file, stat.mtimeMs);
    const handle = fs.openSync(file, 'r');
    const head = Buffer.alloc(16384);
    const count = fs.readSync(handle, head, 0, head.length, 0);
    fs.closeSync(handle);
    let meta;
    try { meta = JSON.parse(head.toString('utf8', 0, count).split('\n')[0]).payload; } catch { continue; }
    if (!meta || (meta.id!==current && path.resolve(meta.cwd||'.').toLowerCase()!==root.toLowerCase())) continue;
    const entries = fs.readFileSync(file,'utf8').split('\n').flatMap(line => {try{return [JSON.parse(line)]}catch{return []}});
    let active = meta.id!==current, model='unknown', number=0, records=[];
    for (const e of entries) {
      if(e.type==='turn_context') model=e.payload.model||model;
      const p=e.payload;
      if(e.type!=='response_item'||p.type!=='message') continue;
      const body=redactBranding((p.content||[]).map(c=>c.text||'').join('\n'));
      if(p.role==='user' && body.includes('# Clone Higgsfield AI')) active=true;
      if(!active) continue;
      if(p.role==='user') {
        if(body.startsWith('<environment_context>')||body.startsWith('<external_codex_apps_open_page>')) continue;
        number++;
        records.push({kind:'PROMPT',number,time:e.timestamp,model,body});
      } else if(p.role==='assistant' && p.phase==='final' && number) records.push({kind:'RESPONSE',number,time:e.timestamp,model,body});
    }
    if(!records.length) continue;
    const stamp=records[0].time.replaceAll(':','-').slice(0,19).replace('T','_');
    const target=path.join(output,`${stamp}_${meta.id}.md`);
    if(!fs.existsSync(target)) fs.writeFileSync(target,`---\nsession_id: ${meta.id}\ndate: ${records[0].time.slice(0,10)}\nauthor: Bhanu\nmodel: ${records[0].model}\ntool: codex-desktop\nproject: xfield-clone\n---\n\n# Session Log\n`);
    const prior=fs.readFileSync(target,'utf8');
    for(const r of records) {
      const tag=`[LOG_ENTRY type=${r.kind} num=${r.number} session=${meta.id}]`;
      if(!prior.includes(tag)) fs.appendFileSync(target,`\n\n${tag}\ntimestamp: ${r.time}\nmodel: ${r.model}\n\n${r.body}\n`);
    }
  }
}
sync();
if(!process.argv.includes('--once')) setInterval(()=>{try{sync()}catch(e){fs.appendFileSync(path.join(root,'capture-errors.log'),`${new Date().toISOString()} ${e.message}\n`)}},2000);
