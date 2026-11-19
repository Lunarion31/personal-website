import {build} from 'esbuild';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
const directory='dist/dev.lunarion.now-playing';
await mkdir(directory,{recursive:true});
await build({entryPoints:['src/main.js'],outfile:directory+'/plugin.js',bundle:true,format:'esm',platform:'browser',target:'chrome108',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
await rm(directory+'/plugin.json',{force:true});
const manifest={identifier:'dev.lunarion.now-playing',ce_prefix:'lunarion-playing',name:'Lunarion Now Playing',description:'Share now-playing and listening stats with your website.',version:'1.0.1',author:'Lunarion31',repo:'https://github.com/Lunarion31/personal-website',pluginKitVersion:'4'};
const yaml=Object.entries(manifest).map(([key,value])=>key+': '+JSON.stringify(value)).join('\n')+'\nentry:\n  plugin.js:\n    type: main\n';
await writeFile(directory+'/plugin.yml',yaml);
console.log('Built '+directory);

const licenses=await Promise.all(['@ciderapp/pluginkit','vue','lodash'].map(async name=>name+'\n'+await readFile('node_modules/'+name+'/LICENSE','utf8')));
await writeFile(directory+'/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n'));
