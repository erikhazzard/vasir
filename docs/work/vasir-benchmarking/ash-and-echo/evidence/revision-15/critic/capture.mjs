import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';import path from 'node:path';
const [sourcePath,out,kind='full']=process.argv.slice(2);
if(!sourcePath||!out)throw new Error('sourcePath and output directory required');await fs.mkdir(out,{recursive:true});
const source=await fs.readFile(sourcePath,'utf8');
const served=kind==='body'?source.replace(/^\s*drawWake\(c\);\s*$/m,'\n    // Scratch: travelling wake omitted.').replace(/^\s*drawRupture\(c\);\s*$/m,'\n    // Scratch: detached rupture omitted.'):source;
if(kind==='body'&&served===source)throw new Error('Scratch body isolation did not replace expected draw calls');
await fs.writeFile(out+'/character.original.js',source);await fs.writeFile(out+'/character.served.js',served);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const report={method:'Native390×844, normal RAF, ordinary keyboard, arranged initial platform position; no screenshots during action windows. Body mode only omits drawWake/drawRupture calls in scratch served source. Production files untouched. Video supplies temporal judgment; no physical-phone performance claim.',kind,sourceHash:hash(source),servedHash:hash(served),source:{},errors:[],actions:[]};
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});const p=await c.newPage();
p.on('pageerror',e=>report.errors.push(String(e)));p.on('response',async r=>{if(new URL(r.url()).pathname.endsWith('.js'))try{report.source[new URL(r.url()).pathname]=hash(await r.body())}catch{}});
await p.route('**/character.js',route=>route.fulfill({contentType:'text/javascript',body:served}));
const mark=async name=>report.actions.push({name,...await p.evaluate(()=>({clock:performance.now(),...window.__echo.snapshot(),lastEvent:window.__echo.eventLog.at(-1)}))});
const release=async()=>{for(const key of ['ArrowLeft','ArrowRight','Space'])await p.keyboard.up(key)};
try{await p.goto('http://localhost:8317/?v=raven-critic');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await p.locator('#start-button').click();await p.waitForTimeout(350);
for(const mode of ['normal','gentle']){
 if(mode==='gentle'){await p.locator('#pause-button').click();await p.locator('#motion-setting').check();await p.locator('#resume-button').click();}
 for(const side of [0,1,-1]){await release();await p.evaluate(()=>{const e=window.__echo,a=e.game.platforms.find(p=>p.id==='opening-refuge');Object.assign(e.game.player,{x:190,y:a.y-28,vx:0,vy:0,grounded:true,airJumps:1,wallDir:0,motion:'idle'});e.game.cameraY=a.y-e.game.viewportHeight*.68;});await p.waitForTimeout(230);await mark(mode+'-'+side+'-before');if(side)await p.keyboard.down(side<0?'ArrowLeft':'ArrowRight');await p.keyboard.down('Space');await mark(mode+'-'+side+'-jump');await p.waitForTimeout(145);await p.keyboard.up('Space');await p.waitForTimeout(35);await p.keyboard.down('Space');await mark(mode+'-'+side+'-double');await p.waitForTimeout(340);await release();await p.waitForTimeout(1000);await mark(mode+'-'+side+'-after');}
}
await p.screenshot({path:out+'/native-final.png'});
}finally{await c.close();await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}console.log(JSON.stringify({sourceHash:report.sourceHash,servedHash:report.servedHash,errors:report.errors,actions:report.actions.length}));
