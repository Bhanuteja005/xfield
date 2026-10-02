import fs from 'node:fs';
import path from 'node:path';
const source=fs.readFileSync('src/App.jsx','utf8');
const names=['Modal','Empty','Gallery','Heading','KeyDialog','Studio','AssetLibrary','ProjectLibrary','Canvas','Marketing','Apps','Community','Pricing','Settings','Academy','Assistant','downloadText'];
const chunks={};
for(let i=0;i<names.length;i++){const start=source.indexOf('function '+names[i]+'(');const end=i+1<names.length?source.indexOf('function '+names[i+1]+'('):source.length;chunks[names[i]]=source.slice(start,end).trim();}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content+'\n')}
const commonHeader=`import {useEffect,useState,useRef} from 'react';\nimport {api,post,patch} from '../../lib/api';\nimport {media,presets,imageModels,videoModels} from '../../lib/data';\nimport {Icon,Button,Modal,Empty,Gallery,Heading} from '../../components/ui';\n`;
const groups={studio:['Studio'],assets:['AssetLibrary'],projects:['ProjectLibrary'],canvas:['Canvas'],marketing:['Marketing'],discovery:['Apps','Community','Academy'],account:['Pricing','Settings','KeyDialog'],assistant:['Assistant']};
for(const [group,list]of Object.entries(groups))write('apps/web/src/features/'+group+'/index.jsx',commonHeader+(group==='marketing'?`import {downloadText} from '../../lib/download';\n`:'')+list.map(n=>chunks[n].replace('function '+n+'(', 'export function '+n+'(')).join('\n\n'));
const uiStart=source.indexOf('const Icon=');const uiEnd=source.indexOf('const routeNames=');
write('apps/web/src/components/ui.jsx',`import {useEffect,useRef} from 'react';\nimport {Icon as LucideIcon, ArrowLeft,ArrowRight,ArrowUp,ArrowUpRight,AudioLines,Bookmark,Check,CheckCircle2,ChevronDown,ChevronRight,Clapperboard,Compass,Copy,CircleHelp,Download,Ellipsis,Folder,FolderOpen,FolderPlus,Gem,Globe,GraduationCap,Grid2X2,GripHorizontal,Heart,History,Image,ImagePlus,Info,KeyRound,Layers,LoaderCircle,Megaphone,Menu,Minus,Pencil,Plus,Save,Search,Settings,Sparkles,StickyNote,Trash2,Upload,User,Users,Video,WandSparkles,Workflow,X,Zap,AlertCircle} from 'lucide-react';\nconst Icons={ArrowLeft,ArrowRight,ArrowUp,ArrowUpRight,AudioLines,Bookmark,Check,CheckCircle2,ChevronDown,ChevronRight,Clapperboard,Compass,Copy,CircleHelp,Download,Ellipsis,Folder,FolderOpen,FolderPlus,Gem,Globe,GraduationCap,Grid2X2,GripHorizontal,Heart,History,Image,ImagePlus,Info,KeyRound,Layers,LoaderCircle,Megaphone,Menu,Minus,Pencil,Plus,Save,Search,Settings,Sparkles,StickyNote,Trash2,Upload,User,Users,Video,WandSparkles,Workflow,X,Zap,AlertCircle};\n`+source.slice(uiStart,uiEnd).replace('const Icon=','export const Icon=').replace('function Button(', 'export function Button(')+['Modal','Empty','Gallery','Heading'].map(n=>chunks[n].replace('function '+n+'(', 'export function '+n+'(')).join('\n\n'));
let app=source.slice(0,source.indexOf('function Modal('));
app=app.replace("import * as Icons from 'lucide-react';\n",'').replace("from './api'","from './lib/api'").replace("from './data'","from './lib/data'");
app=app.slice(0,app.indexOf('const Icon='))+app.slice(app.indexOf('const routeNames='));
app=`import {Icon,Button,Modal,Empty,Gallery} from './components/ui';\n`+Object.entries(groups).map(([g,list])=>`import {${list.join(',')}} from './features/${g}';`).join('\n')+'\n'+app;
write('apps/web/src/App.jsx',app);
write('apps/web/src/lib/download.js',chunks.downloadText.replace('function downloadText(', 'export function downloadText('));
for(const [from,to]of [['src/api.js','apps/web/src/lib/api.js'],['src/data.js','apps/web/src/lib/data.js'],['src/main.jsx','apps/web/src/main.jsx'],['src/style.css','apps/web/src/styles/global.css'],['index.html','apps/web/index.html'],['server/worker.mjs','apps/api/src/worker.mjs'],['db/schema.ts','packages/db/src/schema.ts']]){fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to)}
let main=fs.readFileSync('apps/web/src/main.jsx','utf8').replace("'./style.css'","'./styles/global.css'");fs.writeFileSync('apps/web/src/main.jsx',main);
fs.renameSync('public','apps/web/public');
// The old source files are superseded by feature modules; remove only those known files.
fs.unlinkSync('src/App.jsx');
console.log('Moved implementation into apps/web, apps/api and packages/db.');
