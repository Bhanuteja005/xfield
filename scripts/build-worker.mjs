import {build} from 'esbuild';
await build({entryPoints:['apps/api/src/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
