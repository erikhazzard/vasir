import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const out='tmp/ash-and-echo/shared-light-pass/played-full-route';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});
const page=await context.newPage(),receipt={proof:'Actual keyboard down/up through normal browser handlers, read-only game observations. Informed route, not newcomer or human feel evidence.',source:{},errors:[],samples:[],events:[]};
page.on('response',async r=>{if(r.url().endsWith('.js'))receipt.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
page.on('pageerror',e=>receipt.errors.push(String(e)));
await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();
let stage=0,stageStart=0,jumpStart=-1,held=false,axis=0,kicked=false,doubled=false,cursor=0;
const targets=['first-hop','second-hop','wall-transfer','resonant-stone','opening-refuge'];
async function input(a,h){if(a!==axis){if(axis)await page.keyboard.up(axis<0?'ArrowLeft':'ArrowRight');if(a)await page.keyboard.down(a<0?'ArrowLeft':'ArrowRight');axis=a;}if(h!==held){if(h)await page.keyboard.down('Space');else await page.keyboard.up('Space');held=h;}}
await page.waitForTimeout(300);await page.locator('#game-frame').screenshot({path:out+'/00-opening.png'});
const started=Date.now();
while(stage<5&&Date.now()-started<25000){
 const s=await page.evaluate(cursor=>({p:{...window.__echo.game.player},time:window.__echo.game.elapsed,deaths:window.__echo.game.deaths,platforms:window.__echo.game.platforms.filter(p=>p.landmark),events:window.__echo.eventLog.slice(cursor),cursor:window.__echo.eventLog.length}),cursor);cursor=s.cursor;receipt.events.push(...s.events);
 if(s.deaths){receipt.failure='unexpected death';break;}
 const target=s.platforms.find(p=>p.id===targets[stage]);
 if(s.events.some(e=>e.type==='land'&&e.platformId===target.id)){
  await input(0,false);await page.locator('#game-frame').screenshot({path:out+'/'+String(stage+1).padStart(2,'0')+'-'+target.id+'.png'});
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
// Continue the existing ascent with ordinary keys. Deliberately fail once after
// the real checkpoint, recover there, reach the summit and use the actual retry.
let checkpointDeath=false,deathPhase=0,deathStart=0,lastPress=-10,groundStart=0,ascentTargetId=null;
const ascentStart=Date.now();
while(stage===5&&Date.now()-ascentStart<80000){
 const s=await page.evaluate(()=>({...window.__echo.snapshot(),respawnTimer:window.__echo.game.respawnTimer,platforms:window.__echo.game.platforms.filter(p=>p.route==='ascent')}));
 const p=s.player;
 if(s.state==='won'){receipt.won=s;break;}
 if(s.paused){receipt.failure='unexpected pause';break;}
 if(s.deaths&&!checkpointDeath){receipt.failure='unplanned death';break;}
 if(s.checkpoint.active&&!checkpointDeath&&p.grounded&&Math.abs(p.y+p.h-2448)<1){checkpointDeath=true;deathPhase=1;deathStart=s.elapsed;await input(-1,false);await page.waitForTimeout(20);await input(-1,true);}
 if(deathPhase){
   if(s.deaths&&s.respawnTimer===0){deathPhase=0;await input(0,false);receipt.checkpointRecovery=s;}
   else {if(s.deaths)await input(0,false);else if(deathPhase===1&&s.elapsed-deathStart>.30){await input(-1,false);deathPhase=2;}else if(deathPhase===2){await input(-1,true);deathPhase=3;}await page.waitForTimeout(8);continue;}
 }
 if(p.grounded||!ascentTargetId)ascentTargetId=(s.platforms.find(a=>a.y<p.y+p.h-1)||s.platforms.at(-1)).id;
 const target=s.platforms.find(a=>a.id===ascentTargetId);
 const d=target.x+target.w/2-p.x-p.w/2;
 const a=Math.abs(d)<Math.max(4,p.vx*p.vx/(2*1900)+4)?0:Math.sign(d);
 if(!p.grounded)groundStart=s.elapsed;
 const want=(p.grounded&&s.elapsed-groundStart>.11&&s.elapsed-lastPress>.15)||(!p.grounded&&p.airJumps>0&&s.elapsed-lastPress>.30&&p.vy> -160);
 let h=held;if(want){h=!held;if(h)lastPress=s.elapsed;}
 await input(a,h);receipt.samples.push({stage:'ascent',t:s.elapsed,p,target:target.id,a,h});await page.waitForTimeout(8);
}
await input(0,false);
receipt.stage=stage;receipt.final=await page.evaluate(()=>window.__echo.snapshot());receipt.scenery=await page.evaluate(()=>window.__echo.renderer.sceneryState);receipt.events=await page.evaluate(()=>window.__echo.eventLog);
await page.locator('#game-frame').screenshot({path:out+'/06-refuge-rest.png'});
if(receipt.won){await page.waitForTimeout(1600);await page.locator('#game-frame').screenshot({path:out+'/07-summit.png'});await page.locator('#again-button').tap();await page.waitForTimeout(250);receipt.restart=await page.evaluate(()=>window.__echo.snapshot());}
await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({stage,final:receipt.final,errors:receipt.errors,won:receipt.won?.elapsed,recovered:receipt.checkpointRecovery?.elapsed,landings:receipt.events.filter(e=>e.type==='land').length},null,2));await context.close();await browser.close();if(stage!==5||!receipt.won||receipt.restart?.state!=='playing')process.exitCode=1;
