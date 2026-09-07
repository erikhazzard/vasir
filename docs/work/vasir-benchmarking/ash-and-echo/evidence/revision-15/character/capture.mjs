import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const mode=process.env.ASH_CAPTURE_MODE || 'mobile';
const diagonal = process.env.ASH_DIAGONAL === '1';
const dir = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 for(const variant of process.argv.slice(2).length ? process.argv.slice(2) : ['baseline','candidate']) {
  const source=await fs.readFile(dir+(variant==='baseline'?'baseline-character.js':'character.js'),'utf8');
  const context=await browser.newContext({viewport:mode==='desktop'?{width:1280,height:900}:{width:390,height:844},deviceScaleFactor:1,isMobile:mode!=='desktop',hasTouch:mode!=='desktop',reducedMotion:mode==='gentle'?'reduce':'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/character.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace('return { update, emit, draw, reset };',`return window.__characterScratch = { update, emit, draw, reset, inspect() { return { clock, pose: {...pose}, jumpAge, jumpType, refillAge, mantleSpent, listenAge, restAge, restLandmark, wake: wake.filter(w=>w.life>0).map(w=>({...w})), fibreCount: fibres.length, wakeCapacity: wake.length, burstCapacity: bursts.length }; } };`)}));
  await page.route('**/ash-flow.js',route=>route.fulfill({contentType:'text/javascript',path:dir+'ash-flow.js'}));
  await page.route('**/ash-flow-atlas.png',route=>route.fulfill({contentType:'image/png',path:dir+'ash-flow-atlas.png'}));
  await page.addInitScript(()=>{window.__rafNext=null;window.__frameTime=1000;window.requestAnimationFrame=cb=>(window.__rafNext=cb,1);window.cancelAnimationFrame=()=>{window.__rafNext=null;};window.__advance=n=>{for(let i=0;i<n;i++){const cb=window.__rafNext;window.__rafNext=null;window.__frameTime+=1000/120;cb(window.__frameTime);}};});
  await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled,{},{polling:50});
  await page.evaluate(async()=>{const image=new Image();image.src='./ash-flow-atlas.png';await image.decode();window.__echo.assets['ash-flow-atlas']=image;window.__echo.begin();window.__advance(2);document.querySelector('#game-message').classList.remove('echo-game__message--visible');});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#intro')).opacity==='0',{},{polling:50});
  if(mode==='fallback')await page.evaluate(()=>{delete window.__echo.assets['ash-flow-atlas'];});
  const records=[];
  let inputAxis=0;
  const advance=(frames,input)=>{if(input&&'axis'in input)inputAxis=input.axis;return page.evaluate(({frames,input})=>{if(input)window.__echo.setInput(input);window.__advance(frames);},{frames,input:input?{...input,axis:inputAxis}:input});};
  const capture=async(name)=>{records.push({name,...await page.evaluate(()=>({snapshot:window.__echo.snapshot(),character:window.__characterScratch.inspect(),event:window.__echo.eventLog.at(-1)}))});await page.screenshot({path:dir+(diagonal?'diagonal-':'')+(mode==='mobile'?'':mode+'-')+variant+'-'+name+'.png',scale:'css'});};
  await page.evaluate(()=>{const e=window.__echo;const p=e.game.platforms.find(p=>p.id==='opening-refuge');Object.assign(e.game.player,{x:198,y:p.y-29,vx:0,vy:180,grounded:false,motion:'fall'});e.game.cameraY=p.y-590;});await advance(30,{axis:0});await capture('00-idle');await advance(60);await capture('01-idle-roll');
  await advance(2,{axis:diagonal?1:0,jumpPressed:true,jumpHeld:true});await capture('02-input');await advance(8,{jumpHeld:true});await capture('03-rise');
  await advance(18,{jumpHeld:true});await capture('04-rise');
  await advance(2,{jumpPressed:true,jumpHeld:true});await capture('05-air-input');await advance(8,{jumpHeld:true});await capture('06-tear');await advance(9,{jumpHeld:true});await capture('07-roll');await advance(9,{jumpHeld:true});await capture('07b-downstroke');await advance(7,{jumpHeld:true});await capture('08-knit');
  await advance(8,{axis:0,jumpHeld:true});await capture('08b-fold');await advance(8,{jumpHeld:true});await capture('08c-reform');await advance(8,{jumpHeld:true});await capture('09-spent-apex');await advance(28,{jumpHeld:true});await capture('10-fall');
  for(let i=0;i<150;i++){if(await page.evaluate(()=>window.__echo.game.player.grounded))break;await advance(1,{jumpHeld:false});}
  await capture('11-contact');await advance(6);await capture('11b-contact-50ms');await advance(6);await capture('11c-contact-100ms');await advance(9);await capture('12-rebound');await advance(45);await capture('13-rest');
  await page.evaluate(()=>{const e=window.__echo;e.restart();Object.assign(e.game.player,{x:60,y:4300,vx:0,vy:120,grounded:false,wallDir:-1,motion:'wallSlide',airJumps:0});e.game.cameraY=3910;});
  await advance(20,{axis:-1});await capture('14-wall');await advance(2,{axis:-1,jumpPressed:true,jumpHeld:true});await capture('15-wall-input');await advance(15,{axis:1,jumpHeld:true});await capture('16-kick');
  await page.evaluate(()=>{const e=window.__echo;e.restart();Object.assign(e.game.player,{x:336,y:4300,vx:0,vy:120,grounded:false,wallDir:1,motion:'wallSlide',airJumps:0});e.game.cameraY=3910;});
  await advance(20,{axis:1});await capture('17-right-wall');await advance(2,{axis:1,jumpPressed:true,jumpHeld:true});await capture('18-right-wall-input');await advance(15,{axis:-1,jumpHeld:true});await capture('19-right-kick');
  const paused=await page.evaluate(()=>{const before=JSON.stringify(window.__characterScratch.inspect());for(let i=0;i<12;i++)window.__echo.renderer.render(window.__echo.game,0);return before===JSON.stringify(window.__characterScratch.inspect());});
  await fs.writeFile(dir+(diagonal?'diagonal-':'')+(mode==='mobile'?'':mode+'-')+variant+'-report.json',JSON.stringify({sourceHash:createHash('sha256').update(source).digest('hex'),errors,paused,records},null,2));
  console.log(JSON.stringify({variant,errors,paused,records:records.map(r=>({name:r.name,air:r.snapshot.player.airJumps,ground:r.snapshot.player.grounded,event:r.event?.type}))}));await context.close();
 }
}finally{await browser.close();}
