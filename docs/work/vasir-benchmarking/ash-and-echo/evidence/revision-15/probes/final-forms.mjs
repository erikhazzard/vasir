import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const out='tmp/ash-and-echo/raven-pass/final-forms';await fs.mkdir(out,{recursive:true});
const report={method:'Final served source, real browser keys and actual gentle setting; desktop opening and arranged small portrait refuge start. Native-size captures are visual smoke evidence, not tactile or physical phone proof.',source:{},errors:[],samples:[]};
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const form of ['desktop','small-gentle']){
const c=await b.newContext({viewport:form==='desktop'?{width:1280,height:900}:{width:320,height:568},deviceScaleFactor:1,isMobile:form!=='desktop',hasTouch:form!=='desktop'});const p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e)));p.on('response',async r=>{if(r.url().endsWith('.js'))report.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
await p.goto('http://localhost:8317/?v=15');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await p.locator('#start-button').click();await p.waitForTimeout(200);
if(form==='small-gentle'){
 await p.evaluate(()=>{const e=window.__echo,a=e.game.platforms.find(p=>p.id==='opening-refuge');Object.assign(e.game.player,{x:198,y:a.y-28,vx:0,vy:0,grounded:true,motion:'idle'});e.game.cameraY=a.y-e.game.viewportHeight*.68;});
 await p.locator('#pause-button').click();await p.locator('#motion-setting').check();await p.locator('#resume-button').click();await p.waitForTimeout(100);
}
await p.keyboard.down('Space');await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('Space');await p.waitForTimeout(40);await p.keyboard.down('Space');await p.waitForTimeout(80);await p.screenshot({path:out+'/'+form+'-air.png'});report.samples.push({form,...await p.evaluate(()=>({snapshot:window.__echo.snapshot(),overflow:document.documentElement.scrollWidth>innerWidth,gentle:document.querySelector('#motion-setting').checked,events:window.__echo.eventLog.map(e=>e.type)}))});await p.keyboard.up('Space');await p.keyboard.up('ArrowRight');await c.close();
}}finally{await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}console.log(JSON.stringify({errors:report.errors,samples:report.samples.map(s=>({form:s.form,overflow:s.overflow,gentle:s.gentle,events:s.events}))}));
