import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const out='tmp/ash-and-echo/living-ash-pass/critic/contact-final';await fs.mkdir(out,{recursive:true});
const report={method:'Ordinary real browser keyboard, normal RAF, no screenshots inside action windows. Starting positions arranged; repeated releases preserve event history. Video + 25fps sequence for temporal review, not physical phone/performance proof.',source:{},errors:[],actions:[]};
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});const p=await c.newPage();
p.on('pageerror',e=>report.errors.push(String(e)));p.on('response',async r=>{if(r.url().endsWith('.js'))report.source[new URL(r.url()).pathname]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
const mark=async name=>report.actions.push({name,wallTime:Date.now(),...await p.evaluate(()=>({clock:performance.now(),...window.__echo.snapshot()}))});
const release=async()=>{for(const k of ['ArrowLeft','ArrowRight','Space'])await p.keyboard.up(k)};
try{await p.goto('http://localhost:8317/?v=13-continuous');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await p.locator('#start-button').click();await p.waitForTimeout(250);
for(const scene of [{name:'rib-left',x:88,y:3990,side:-1},{name:'rib-right',x:302,y:3470,side:1},{name:'outer-left',x:60,y:4300,side:-1},{name:'outer-right',x:336,y:4300,side:1}]){await release();await p.evaluate(s=>{const e=window.__echo;Object.assign(e.game.player,{x:s.x,y:s.y,vx:0,vy:110,grounded:false,wallDir:s.side,airJumps:0,motion:'wallSlide'});e.game.cameraY=s.y-e.game.viewportHeight*.54;},scene);await p.keyboard.down(scene.side<0?'ArrowLeft':'ArrowRight');await p.waitForTimeout(150);await mark(scene.name+'-before');await p.keyboard.down('Space');await mark(scene.name+'-kick');await p.waitForTimeout(110);await release();await p.waitForTimeout(650);await mark(scene.name+'-after');}
await p.screenshot({path:out+'/native-final.png'});
}finally{await c.close();await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}console.log(JSON.stringify(report.source));
