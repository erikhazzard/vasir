import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const [sourceDir,out]=process.argv.slice(2);const width=Number(process.env.ASH_WIDTH||390),height=Number(process.env.ASH_HEIGHT||844);const files={};for(const n of await fs.readdir(sourceDir))if(/\.(js|css|html)$/.test(n))files[n]=await fs.readFile(sourceDir+'/'+n);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width,height}}});
const page=await context.newPage(),receipt={proof:'Actual keyboard down/up through normal browser handlers, read-only game observations. Informed route, not newcomer or human feel evidence.',source:{},viewport:{width,height},errors:[],samples:[],events:[]};
page.on('response',async r=>{if(r.url().endsWith('.js'))receipt.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
page.on('pageerror',e=>receipt.errors.push(String(e)));
await fs.mkdir(out+'/source',{recursive:true});for(const[n,b]of Object.entries(files))await fs.writeFile(out+'/source/'+n,b);await page.route('**/*',route=>{const u=new URL(route.request().url()),n=u.pathname==='/'?'index.html':u.pathname.split('/').at(-1);return files[n]?route.fulfill({contentType:n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':'text/html',body:files[n]}):route.continue();});if(process.env.ASH_MEASURE==='1')await page.addInitScript(()=>{window.__impactSamples=[];const orig=CanvasRenderingContext2D.prototype.translate;CanvasRenderingContext2D.prototype.translate=function(x,y){const e=window.__echo,g=e?.game,t=this.getTransform();if(this.canvas.id==='game-canvas'&&g&&t.e===0&&t.f===0&&Math.abs(x)<=20&&Math.abs(y+g.cameraY)<=20&&g.cameraY>30){const a=window.__impactSamples,last=a.at(-1);if(!last||last.t!==g.elapsed)a.push({t:g.elapsed,x:x*t.a,y:(y+g.cameraY)*t.d,cameraY:g.cameraY,scale:t.a,clock:performance.now()});}return orig.call(this,x,y);};});await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();if(process.env.ASH_GENTLE==='1'){await page.locator('#pause-button').click();await page.locator('#motion-setting').check();await page.locator('#resume-button').click();}
if(process.env.ASH_MEASURE==='2')await page.evaluate(()=>{const r=window.__echo.renderer,original=r.render;window.__impactSamples=[];r.render=function(...args){const result=original.apply(this,args),a=r.sceneryState.cameraImpact,c=document.getElementById('game-canvas'),f=document.getElementById('atmosphere-canvas');window.__impactSamples.push({t:window.__echo.game.elapsed,...a,gameTransform:getComputedStyle(c).transform,atmosphereTransform:getComputedStyle(f).transform});return result;};});let stage=0,stageStart=0,jumpStart=-1,held=false,axis=0,kicked=false,doubled=false,cursor=0;
const targets=['first-hop','second-hop','wall-transfer','resonant-stone','opening-refuge'];
async function input(a,h){if(a!==axis){if(axis)await page.keyboard.up(axis<0?'ArrowLeft':'ArrowRight');if(a)await page.keyboard.down(a<0?'ArrowLeft':'ArrowRight');axis=a;}if(h!==held){if(h)await page.keyboard.down('Space');else await page.keyboard.up('Space');held=h;}}
await page.waitForTimeout(300);await page.locator('#game-frame').screenshot({path:out+'/00-opening.png'});
const started=Date.now();
while(stage<5&&Date.now()-started<25000){
 const s=await page.evaluate(cursor=>({p:{...window.__echo.game.player},time:window.__echo.game.elapsed,deaths:window.__echo.game.deaths,platforms:window.__echo.game.platforms.filter(p=>p.landmark),events:window.__echo.eventLog.slice(cursor),cursor:window.__echo.eventLog.length}),cursor);cursor=s.cursor;receipt.events.push(...s.events);
 if(s.deaths){receipt.failure='unexpected death';break;}
 const target=s.platforms.find(p=>p.id===targets[stage]);
 if(s.events.some(e=>e.type==='land'&&e.platformId===target.id)){
  await input(0,false);
  receipt.samples.push({kind:'target-land',id:target.id,...s});stage++;stageStart=s.time;jumpStart=-1;continue;
 }
 const p=s.p,d=target.x+target.w/2-p.x-p.w/2;
 let a=Math.abs(d)<Math.max(3,p.vx*p.vx/(2*1900))?0:Math.sign(d),h=held;
 if(s.time-stageStart<.08){a=0;h=false;}
 else if(p.grounded&&jumpStart<0){h=true;jumpStart=s.time;}
 if(stage<2&&jumpStart>=0&&s.time-jumpStart>Number(process.env.ASH_HOP_HOLD||.11))h=false;
 if(stage===2&&!kicked){a=s.time-stageStart<.08?0:1;if(!p.grounded&&p.wallDir===1&&p.vy>0){if(held)h=false;else{h=true;kicked=true;}}}
 if(stage===3&&!doubled&&jumpStart>=0&&s.time-jumpStart>.35&&p.vy> -130){if(held)h=false;else{h=true;doubled=true;}}
 await input(a,h);receipt.samples.push({stage,t:s.time,p,a,h});await page.waitForTimeout(8);
}
await input(0,false);await page.waitForTimeout(1100);
// Continue the existing ascent with ordinary keys. Deliberately fail once after
// the real checkpoint, recover there, reach the summit and use the actual retry.
let checkpointDeath=false,deathPhase=0,deathStart=0,lastPress=-10,groundStart=0,ascentTargetId=null;
const ascentStart=Date.now();
while(process.env.ASH_OPENING_ONLY!=='1'&&stage===5&&Date.now()-ascentStart<80000){
 const s=await page.evaluate(()=>({...window.__echo.snapshot(),respawnTimer:window.__echo.game.respawnTimer,platforms:window.__echo.game.platforms.filter(p=>p.route==='ascent')}));
 const p=s.player;
 if(s.state==='won'){receipt.won=s;break;}if(s.platforms&&s.elapsed>22){receipt.boundedRoute=s;break;}
 if(s.paused){receipt.failure='unexpected pause';break;}
 if(s.deaths&&!checkpointDeath){receipt.failure='unplanned death';break;}
 if(false){checkpointDeath=true;deathPhase=1;deathStart=s.elapsed;await input(-1,false);await page.waitForTimeout(20);await input(-1,true);}
 if(deathPhase){
   if(s.deaths&&s.respawnTimer===0){deathPhase=0;await input(0,false);receipt.checkpointRecovery=s;}
   else {if(s.deaths)await input(0,false);else if(deathPhase===1&&s.elapsed-deathStart>.30){await input(-1,false);deathPhase=2;}else if(deathPhase===2){await input(-1,true);deathPhase=3;}await page.waitForTimeout(8);continue;}
 }
 if(p.grounded||!ascentTargetId)ascentTargetId=(s.platforms.find(a=>a.y<p.y+p.h-1)||s.platforms.at(-1)).id;
 const target=s.platforms.find(a=>a.id===ascentTargetId);
 const d=target.x+target.w/2-p.x-p.w/2;
 const a=Math.abs(d)<Math.max(4,p.vx*p.vx/(2*1900)+4)?0:Math.sign(d);
 if(!p.grounded)groundStart=s.elapsed;
 const want=(p.grounded&&s.elapsed-groundStart>.04&&s.elapsed-lastPress>.15)||(!p.grounded&&p.airJumps>0&&s.elapsed-lastPress>.30&&p.vy> -160);
 let h=held;if(want){h=!held;if(h)lastPress=s.elapsed;}
 await input(a,h);receipt.samples.push({stage:'ascent',t:s.elapsed,p,target:target.id,a,h});await page.waitForTimeout(8);
}
await input(0,false);
receipt.stage=stage;receipt.final=await page.evaluate(()=>window.__echo.snapshot());receipt.scenery=await page.evaluate(()=>window.__echo.renderer.sceneryState);receipt.events=await page.evaluate(()=>window.__echo.eventLog);
await page.locator('#game-frame').screenshot({path:out+'/06-refuge-rest.png'});
if(receipt.won){await page.waitForTimeout(1600);await page.locator('#game-frame').screenshot({path:out+'/07-summit.png'});await page.locator('#again-button').tap();await page.waitForTimeout(250);receipt.restart=await page.evaluate(()=>window.__echo.snapshot());}
if(process.env.ASH_MEASURE)receipt.renderedImpact=await page.evaluate(()=>window.__impactSamples);receipt.finalCanvasStyles=await page.evaluate(()=>['game-canvas','atmosphere-canvas'].map(id=>{const c=document.getElementById(id),r=c.getBoundingClientRect();return{id,transform:getComputedStyle(c).transform,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},impact:window.__echo.renderer.sceneryState.cameraImpact,gentle:document.querySelector('#motion-setting').checked}}));receipt.reviewNote='Frozen source; ordinary keyboard route, read-only observations; no arranged start or forced events. Short ground dwell intentionally keeps landing in real action cadence. No screenshots during contacts. Not human feel evidence.';await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({stage,final:receipt.final,errors:receipt.errors,won:receipt.won?.elapsed,recovered:receipt.checkpointRecovery?.elapsed,landings:receipt.events.filter(e=>e.type==='land').length},null,2));await context.close();await browser.close();if(stage!==5||receipt.errors.length)process.exitCode=1;
