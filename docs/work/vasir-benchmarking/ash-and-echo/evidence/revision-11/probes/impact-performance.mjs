import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const out='tmp/ash-and-echo/volume-pass/impact-performance';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage(),receipt={proof:'Actual keyboard down/up through normal browser handlers, read-only game observations. Informed route, not newcomer or human feel evidence.',source:{},errors:[],samples:[],events:[]};
page.on('response',async r=>{if(r.url().endsWith('.js'))receipt.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
page.on('pageerror',e=>receipt.errors.push(String(e)));
await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();
let stage=0,stageStart=0,jumpStart=-1,held=false,axis=0,kicked=false,doubled=false,cursor=0;
const targets=['first-hop','second-hop','wall-transfer','resonant-stone','opening-refuge'];
async function input(a,h){if(a!==axis){if(axis)await page.keyboard.up(axis<0?'ArrowLeft':'ArrowRight');if(a)await page.keyboard.down(a<0?'ArrowLeft':'ArrowRight');axis=a;}if(h!==held){if(h)await page.keyboard.down('Space');else await page.keyboard.up('Space');held=h;}}
await page.waitForTimeout(300);
const started=Date.now();
while(stage<4&&Date.now()-started<25000){
 const s=await page.evaluate(cursor=>({p:{...window.__echo.game.player},time:window.__echo.game.elapsed,deaths:window.__echo.game.deaths,platforms:window.__echo.game.platforms.filter(p=>p.landmark),events:window.__echo.eventLog.slice(cursor),cursor:window.__echo.eventLog.length}),cursor);cursor=s.cursor;receipt.events.push(...s.events);
 if(s.deaths){receipt.failure='unexpected death';break;}
 const target=s.platforms.find(p=>p.id===targets[stage]);
 if(s.events.some(e=>e.type==='land'&&e.platformId===target.id)){
  await input(0,false);
  receipt.samples.push({kind:'target-land',id:target.id,...s});stage++;stageStart=s.time;jumpStart=-1;continue;
 }
 const p=s.p,d=target.x+target.w/2-p.x-p.w/2;
 let a=Math.abs(d)<Math.max(3,p.vx*p.vx/(2*1900))?0:Math.sign(d),h=held;
 if(s.time-stageStart<.35){a=0;h=false;}
 else if(p.grounded&&jumpStart<0){h=true;jumpStart=s.time;}
 if(stage<2&&jumpStart>=0&&s.time-jumpStart>.11)h=false;
 if(stage===2&&!kicked){a=s.time-stageStart<.35?0:1;if(!p.grounded&&p.wallDir===1&&p.vy>0){if(held)h=false;else{h=true;kicked=true;}}}
 if(stage===3&&!doubled&&jumpStart>=0&&s.time-jumpStart>.35&&p.vy> -130){if(held)h=false;else{h=true;doubled=true;}}
 await input(a,h);receipt.samples.push({stage,t:s.time,p,a,h});await page.waitForTimeout(8);
}
await input(0,false);await page.waitForTimeout(1100);
await page.evaluate(()=>window.__echo.frameSamples.length=0);
let contacts=0,lastJump=-10,perfCursor=await page.evaluate(()=>window.__echo.eventLog.length);
const perfBegin=Date.now();
while(stage===4&&contacts<26&&Date.now()-perfBegin<35000){
 const s=await page.evaluate(cursor=>({p:{...window.__echo.game.player},t:window.__echo.game.elapsed,events:window.__echo.eventLog.slice(cursor),cursor:window.__echo.eventLog.length}),perfCursor);perfCursor=s.cursor;
 contacts+=s.events.filter(e=>e.type==='land'&&e.platformId==='resonant-stone').length;
 if(s.p.grounded&&s.t-lastJump>.6&&!held){await input(0,true);lastJump=s.t;}
 else if(held&&s.t-lastJump>.35)await input(0,false);
 await page.waitForTimeout(10);
}
await input(0,false);
const frames=await page.evaluate(()=>window.__echo.frameSamples),sorted=[...frames].sort((a,b)=>a-b);
receipt.performance={scenario:'Quiet desktop Chrome,390x844 DPR2, actual key opening then26 repeated resonant-stone contacts, no screenshots/video during measured window. Not physical-phone evidence.',contacts,count:frames.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],max:Math.max(...frames),over33:frames.filter(n=>n>33.4).length,frames};
receipt.stage=stage;receipt.final=await page.evaluate(()=>window.__echo.snapshot());receipt.scenery=await page.evaluate(()=>window.__echo.renderer.sceneryState);receipt.events=await page.evaluate(()=>window.__echo.eventLog);

await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({stage,final:receipt.final,errors:receipt.errors,performance:{...receipt.performance,frames:undefined}},null,2));await context.close();await browser.close();if(stage!==4||contacts<26)process.exitCode=1;
