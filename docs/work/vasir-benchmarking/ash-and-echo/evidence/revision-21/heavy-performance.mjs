import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const out='tmp/ash-and-echo/embodied-depth-pass/landing-performance';await fs.mkdir(out,{recursive:true});
const receipt={method:'Quiet desktop Chrome390x844DPR2. Sixteen arranged650px zero-velocity falls onto the actual upper right ledge-25, through its clear vertical column. Normal RAF and production collision/event dispatch. All scenery/colliders remain. Arrangement is an effects stress diagnostic, not an authored-route or physical-phone claim. No screenshot or video during the measured window.',source:{},errors:[],contacts:[]};
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
p.on('pageerror',e=>receipt.errors.push(String(e)));p.on('response',async r=>{if(r.url().endsWith('.js'))receipt.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
await p.goto('http://localhost:8317/?v=21');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await p.locator('#start-button').tap();
// Warm the full scene at this camera before measuring.
await p.evaluate(()=>{const e=window.__echo,a=e.game.platforms.find(a=>a.id==='ledge-25');Object.assign(e.game.player,{x:a.x+a.w*.5-12,y:a.y-28,grounded:true,vx:0,vy:0});e.game.cameraY=Math.max(0,a.y-e.game.viewportHeight*.72);});await p.waitForTimeout(1300);
await p.evaluate(()=>window.__echo.frameSamples.length=0);
for(let i=0;i<16;i++){
 const cursor=await p.evaluate(()=>{const e=window.__echo,a=e.game.platforms.find(a=>a.id==='ledge-25');Object.assign(e.game.player,{x:a.x+a.w*.5-12,y:a.y-28-650,grounded:false,vx:0,vy:0,airJumps:0,motion:'fall'});return e.eventLog.length;});
 await p.waitForFunction(i=>window.__echo.eventLog.slice(i).some(e=>e.type==='land'),cursor,{polling:'raf'});
 receipt.contacts.push(await p.evaluate(i=>window.__echo.eventLog.slice(i).find(e=>e.type==='land'),cursor));
 await p.waitForTimeout(1080);
}
const frames=await p.evaluate(()=>window.__echo.frameSamples),s=[...frames].sort((a,b)=>a-b);
receipt.performance={count:frames.length,median:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:Math.max(...frames),over33:frames.filter(n=>n>33.4).length,frames};receipt.final=await p.evaluate(()=>window.__echo.snapshot());
await p.screenshot({path:out+'/after.png'});
if(receipt.contacts.length!==16||receipt.contacts.some(e=>e.landingSeverity!==1||e.impactSpeed!==900)||receipt.errors.length||receipt.final.state!=='playing')throw Error('maximum landing diagnostic failed');
}finally{await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));}
console.log(JSON.stringify({errors:receipt.errors,contacts:receipt.contacts.length,performance:{...receipt.performance,frames:undefined}}));
