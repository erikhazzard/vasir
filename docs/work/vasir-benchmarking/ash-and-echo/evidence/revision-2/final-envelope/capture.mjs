import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const dir='/Users/erikhazzard/code/vasir/tmp/ash-and-echo/final-envelope';
const root='/Users/erikhazzard/code/vasir/site/ash-and-echo';
const hashes={};for(const name of ['character.js','renderer.js','game.js','main.js']) hashes[name]=crypto.createHash('sha256').update(await fs.readFile(root+'/'+name)).digest('hex');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:dir+'/video',size:{width:390,height:844}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();
await page.evaluate(()=>{
 const echo=window.__echo;const original=echo.renderer.render.bind(echo.renderer);const canvas=document.querySelector('#game-canvas');
 window.__envelope={records:[],event:null,nextMark:0,done:false,apex:false};
 echo.renderer.render=(game,dt)=>{
  original(game,dt);const sample=window.__envelope;
  if(!sample.event){const event=echo.eventLog.at(-1);if(event?.type==='doubleJump')sample.event={...event};}
  if(!sample.event)return;
  const age=game.time-sample.event.at;
  const p=game.player;
  function capture(label,targetAge){sample.records.push({label,targetAge,eventAge:age,gameTime:game.time,event:{...sample.event},player:{...p},cameraY:game.cameraY,canvas:{width:canvas.width,height:canvas.height},png:canvas.toDataURL()});}
  if(!sample.done&&age+1e-6>=sample.nextMark){const i=Math.round(sample.nextMark*30);capture(String(i).padStart(2,'0')+'-'+Math.round(age*1000)+'ms',sample.nextMark);sample.nextMark+=1/30;if(sample.nextMark>.3001)sample.done=true;}
  if(age>.30&&!sample.apex&&p.motion!=='dead'&&!p.grounded&&Math.abs(p.vy)<55){sample.apex=true;capture('11-apex-'+Math.round(age*1000)+'ms',null);}
 };
});
await page.waitForTimeout(250);
// These are browser keyboard events handled by the production shell. No state,
// time, controller seam, route replacement, or simulation fields are changed.
await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');await page.waitForTimeout(32);await page.keyboard.down('Space');
await page.waitForFunction(()=>window.__envelope.done&&window.__envelope.apex,{},{timeout:4000});
await page.keyboard.up('Space');await page.waitForTimeout(400);
const result=await page.evaluate(()=>({records:window.__envelope.records,event:window.__envelope.event,done:window.__envelope.done,apex:window.__envelope.apex}));
for(const r of result.records){const name=r.label+'.png';await fs.writeFile(dir+'/'+name,Buffer.from(r.png.split(',')[1],'base64'));r.file=name;delete r.png;}
const video=page.video();await context.close();const videoPath=await video.path();await browser.close();
const liveHashes={};for(const name of Object.keys(hashes))liveHashes[name]=crypto.createHash('sha256').update(await fs.readFile(root+'/'+name)).digest('hex');
const report={mode:'LIVE production build. Actual browser keyboard edges. Read-only post-render full-canvas captures every ~33 ms through 300 ms plus apex. No game, animation, time, controller, source or route replacement. Video is the unmodified native Playwright page recording.',viewport:{width:390,height:844,deviceScaleFactor:1},hashes,liveHashes,identityStable:JSON.stringify(hashes)===JSON.stringify(liveHashes),video:videoPath,errors,...result};
await fs.writeFile(dir+'/capture.json',JSON.stringify(report,null,2));console.log(JSON.stringify({hashes,identityStable:report.identityStable,errors,video:videoPath,frames:result.records.map(r=>({file:r.file,eventAgeMs:Math.round(r.eventAge*1000),vy:r.player.vy}))},null,2));
