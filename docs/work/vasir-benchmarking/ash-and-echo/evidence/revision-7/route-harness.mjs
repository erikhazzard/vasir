import { chromium } from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir='/Users/erikhazzard/code/vasir/tmp/ash-and-echo/weight-and-place-pass/release-route';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:dir+'/video',size:{width:390,height:844}}});
const page=await context.newPage();const data={mode:'Actual browser keyboard down/up calls, read-only snapshots; no debug movement, state arrangement, or teleport',errors:[],samples:[],captures:[]};page.on('pageerror',e=>data.errors.push(String(e)));
await page.goto('http://127.0.0.1:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.screenshot({path:dir+'/00-title.png'});await page.locator('#start-button').tap();
let route=await page.evaluate(()=>window.__echo.game.platforms.filter(p=>!['wall','floor'].includes(p.kind)));
let deathStage=0,deathAge=0;
let target=0,hold=false,axis=0,lastPress=-10,lastGround=0,lastTime=0,lastTarget=-1,attemptedKick=false,kickDone=false,checkpointDeath=false,recovering=false;
async function apply(nextAxis,nextHold){if(nextAxis!==axis){if(axis)await page.keyboard.up(axis<0?'ArrowLeft':'ArrowRight');if(nextAxis)await page.keyboard.down(nextAxis<0?'ArrowLeft':'ArrowRight');axis=nextAxis;}if(nextHold!==hold){if(nextHold)await page.keyboard.down('Space');else await page.keyboard.up('Space');hold=nextHold;}}
async function capture(name){await page.screenshot({path:dir+'/'+name+'.png'});data.captures.push({name,time:lastTime,target});}
await page.waitForTimeout(400); await capture('00-opening');
const firstEvents=new Set();const begin=Date.now();
while(Date.now()-begin<120000){
 const s=await page.evaluate(()=>({ ...window.__echo.snapshot(),input:window.__echo.game.input,respawnTimer:window.__echo.game.respawnTimer,latest:window.__echo.eventLog.slice(-3),route:window.__echo.game.platforms.filter(p=>!["wall","floor"].includes(p.kind))}));
 route=s.route;const p=s.player;lastTime=s.elapsed;
 for(const e of s.latest){if(!firstEvents.has(e.type)){firstEvents.add(e.type);await capture('event-'+e.type);}}
 if(s.state==='won'){data.won=s;break;}
 if(s.paused){data.unexpectedPause=s;break;}
 if(s.deaths>0&&!checkpointDeath){data.unplannedDeath=s;break;}
 if(recovering){
   if(s.deaths>0&&s.respawnTimer===0&&p.grounded&&Math.abs(p.y-2420)<1){recovering=false;target=14;lastGround=s.elapsed;await apply(0,false);await capture('14-checkpoint-respawn');console.log('Recovered at checkpoint',s.elapsed);}
   else {
     if(s.deaths>0) await apply(0,false);
     else if(deathStage===0){await apply(-1,true);deathAge=s.elapsed;deathStage=1;}
     else if(deathStage===1&&s.elapsed-deathAge>.30){await apply(-1,false);deathStage=2;}
     else if(deathStage===2){await apply(-1,true);deathStage=3;}
     else await apply(-1,true);
     await page.waitForTimeout(12);continue;
   }
 }
 if(p.grounded){const above=route.findIndex(platform=>platform.y<p.y+p.h-1);target=above<0?route.length-1:above;} else lastGround=s.elapsed;
 const d=route[target].x+route[target].w/2-p.x-p.w/2;
 let nextAxis=Math.abs(d)<Math.max(4,p.vx*p.vx/(2*1900)+4)?0:Math.sign(d);
 let wants=(p.grounded&&s.elapsed-lastGround>.11)||(!p.grounded&&p.airJumps>0&&s.elapsed-lastPress>.30&&p.vy>-160);
 // Natural wall kick from right ledge 3. Browser events must generate the kick.
 if(target===3&&!kickDone){attemptedKick=true;nextAxis=1;wants=(p.grounded&&s.elapsed-lastGround>.11)||(!p.grounded&&p.wallDir===1);if(s.latest.some(e=>e.type==='wallJump')){kickDone=true;wants=false;nextAxis=-1;data.wallKick=s;await capture('11-route-wall-kick');}}
 // Reach halfway normally, then deliberately walk right off the refuge and down the wall into its thorns.
 if(s.checkpoint.active&&!checkpointDeath&&p.grounded&&Math.abs(p.y-2420)<1){checkpointDeath=true;recovering=true;await apply(0,false);await capture('13-checkpoint');console.log('Checkpoint, beginning authentic intentional fall',s.elapsed);await page.waitForTimeout(12);continue;}
 let nextHold=hold;
 if(wants){if(hold)nextHold=false;else{nextHold=true;lastPress=s.elapsed;}}
 await apply(nextAxis,nextHold);
 if(target!==lastTarget){console.log('target',target,'elapsed',s.elapsed.toFixed(2),'y',p.y.toFixed(1));if([1,6,15,20,26,27].includes(target))await capture('route-target-'+String(target).padStart(2,'0'));lastTarget=target;}
 data.samples.push({t:s.elapsed,p:{...p},target,cameraY:s.cameraY,checkpoint:s.checkpoint.active,deaths:s.deaths,input:{axis:nextAxis,jumpHeld:nextHold}});
 await page.waitForTimeout(12);
}
data.routeEvents=await page.evaluate(()=>window.__echo.eventLog);await apply(0,false);data.final=await page.evaluate(()=>window.__echo.snapshot());
if(data.won){await page.waitForTimeout(1700);await capture('20-summit-result');data.winPanel=await page.locator('#win-panel').innerText();await page.locator('#again-button').tap();await page.waitForTimeout(250);data.restart=await page.evaluate(()=>window.__echo.snapshot());await capture('21-restarted');}
data.events=await page.evaluate(()=>window.__echo.eventLog);data.frames=await page.evaluate(()=>window.__echo.frameSamples);data.timing={count:data.frames.length,median:[...data.frames].sort((a,b)=>a-b)[Math.floor(data.frames.length*.5)],p95:[...data.frames].sort((a,b)=>a-b)[Math.floor(data.frames.length*.95)],p99:[...data.frames].sort((a,b)=>a-b)[Math.floor(data.frames.length*.99)],max:Math.max(...data.frames),over33:data.frames.filter(x=>x>33.4).length,over50:data.frames.filter(x=>x>50).length};
await fs.writeFile(dir+'/route-verified.json',JSON.stringify(data,null,2));console.log(JSON.stringify({final:data.final,won:data.won,restart:data.restart,timing:data.timing,unplannedDeath:data.unplannedDeath},null,2));await context.close();await browser.close();
