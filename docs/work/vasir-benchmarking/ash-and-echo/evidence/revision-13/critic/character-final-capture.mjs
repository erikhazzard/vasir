import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const out='tmp/ash-and-echo/living-ash-pass/critic/character-final';await fs.mkdir(out,{recursive:true});
const report={method:'Ordinary real browser keyboard, normal RAF, no screenshots inside action windows. Starting positions arranged; repeated releases preserve event history. Video + 25fps sequence for temporal review, not physical phone/performance proof.',source:{},errors:[],actions:[]};
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});const p=await c.newPage();
p.on('pageerror',e=>report.errors.push(String(e)));p.on('response',async r=>{if(r.url().endsWith('.js'))report.source[new URL(r.url()).pathname]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
const mark=async name=>report.actions.push({name,wallTime:Date.now(),...await p.evaluate(()=>({clock:performance.now(),...window.__echo.snapshot()}))});
const release=async()=>{for(const k of ['ArrowLeft','ArrowRight','Space'])await p.keyboard.up(k)};
try{await p.goto('http://localhost:8317/?v=13-continuous');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await p.locator('#start-button').click();await p.waitForTimeout(250);
for(let i=0;i<3;i++){await release();await p.evaluate(()=>{const e=window.__echo,a=e.game.platforms.find(p=>p.id==='opening-refuge');Object.assign(e.game.player,{x:190,y:a.y-28,vx:0,vy:0,grounded:true,airJumps:1,wallDir:0,motion:'idle'});e.game.cameraY=a.y-e.game.viewportHeight*.68;});await p.waitForTimeout(200);await mark('repeat-'+i+'-before');await p.keyboard.down(i%2?'ArrowLeft':'ArrowRight');await p.keyboard.down('Space');await mark('repeat-'+i+'-ground-jump');await p.waitForTimeout(120);await p.keyboard.up('Space');await p.waitForTimeout(40);await p.keyboard.down('Space');await mark('repeat-'+i+'-double-jump');await p.waitForTimeout(170);await release();await p.waitForTimeout(1000);await mark('repeat-'+i+'-after');}
await p.screenshot({path:out+'/native-final.png'});
}finally{await c.close();await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}console.log(JSON.stringify(report.source));
