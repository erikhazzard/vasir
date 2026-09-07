import { chromium } from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir = '/Users/erikhazzard/code/vasir/tmp/ash-and-echo/shared-light-pass/character/settle-fix';
const sourcePath = '/Users/erikhazzard/code/vasir/site/ash-and-echo/character.js';
const source = await fs.readFile(sourcePath, 'utf8');
await fs.writeFile(dir+'/implemented.js',source);
const sourceHash=createHash('sha256').update(source).digest('hex');
const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true });
try {
 for (const mode of ['mobile', 'reduced']) {
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/character.js', async route => route.fulfill({contentType:'text/javascript',body:source.replace('return { update, emit, draw, reset };', `return window.__characterScratch = { update, emit, draw, reset, inspect() { return { pose: {...pose}, jumpAge, jumpType, refillAge, mantleSpent, listenAge, restAge, restLandmark, wake: wake.filter(w=>w.life>0).map(w=>({...w})), fibreCount: fibres.length, wakeCapacity: wake.length, burstCapacity: bursts.length }; } };`)}));
  await page.addInitScript(()=>{
    window.__rafNext=null;window.__frameTime=1000;
    window.requestAnimationFrame=callback=>(window.__rafNext=callback,1);
    window.cancelAnimationFrame=()=>{window.__rafNext=null;};
    window.__advance=frames=>{for(let i=0;i<frames;i++){const callback=window.__rafNext;window.__rafNext=null;window.__frameTime+=1000/120;callback(window.__frameTime);}};
  });
  await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled, {}, {polling:50});
  await page.evaluate(()=>{window.__echo.begin();window.__advance(2);document.querySelector('#game-message').classList.remove('echo-game__message--visible');});
  const records=[];
  async function advance(frames,input) {await page.evaluate(({frames,input})=>{if(input)window.__echo.setInput(input);window.__advance(frames);},{frames,input});}
  async function capture(name) {
   const record=await page.evaluate(()=>({snapshot:window.__echo.snapshot(),event:window.__echo.eventLog.at(-1),character:window.__characterScratch.inspect()}));
   records.push({name,...record});await page.screenshot({path:`${dir}/${mode}-${name}.png`,scale:'css'});
  }
  await capture('00-ready');
  await advance(2,{jumpPressed:true,jumpHeld:true}); await advance(23,{jumpHeld:true}); await capture('01-charge-held');
  await advance(2,{jumpPressed:true,jumpHeld:true});await capture('02-spend');
  await advance(12,{jumpHeld:true});await capture('03-tear-100');
  await advance(48,{jumpHeld:true});await capture('04-spent-500');
  await advance(19,{jumpHeld:true});await capture('05-spent-658');
  for(let i=0;i<150;i++) { if(await page.evaluate(()=>window.__echo.game.player.grounded))break; await advance(1,{jumpHeld:true}); }
  await capture('06-ground-body');await advance(12,{jumpHeld:false});await capture('07-ground-gather');await advance(34,{jumpHeld:false});await capture('08-ground-refilled');
  // Fixture placement skips route travel only. A normal game step produces the
  // actual resonant landing event, and the production frame loop dispatches it.
  async function fixture(id,x,vx=0) {
   await page.evaluate(({id,x,vx})=>{
    const e=window.__echo;e.restart();e.setInput({axis:0,jumpHeld:false,jumpPressed:false});
    const platform=e.game.platforms.find(p=>p.id===id);
    Object.assign(e.game.player,{x:x??platform.x+platform.w*.65-12,y:platform.y-29,vx,vy:180,grounded:false,airJumps:0,motion:'fall'});
    e.game.cameraY=platform.y-470;window.__advance(2);
   },{id,x,vx});
  }
  await fixture('resonant-stone',320,100+1900/120);await capture('09-bell-contact');
  await advance(37,{jumpHeld:false});await capture('10-bell-before-ring');
  await advance(12,{jumpHeld:false});await capture('11-bell-eyes');
  await advance(40,{jumpHeld:false});await capture('12-bell-crown');
  await advance(1,{axis:-1});await capture('13-bell-move-interrupt');
  await fixture('opening-refuge',198);await capture('14-refuge-contact');
  await advance(48,{axis:0});await capture('14a-refuge-release');
  await advance(42,{axis:0});await capture('14b-refuge-exhale');
  await advance(78,{axis:0});await capture('15-refuge-rest');
  await advance(1,{axis:1});await capture('16-refuge-move-interrupt');
  const beforePause=await page.evaluate(()=>window.__characterScratch.inspect());
  await page.evaluate(()=>{const e=window.__echo;for(let i=0;i<12;i++)e.renderer.render(e.game,0);});
  const afterPause=await page.evaluate(()=>window.__characterScratch.inspect());
  await fs.writeFile(`${dir}/${mode}-report.json`,JSON.stringify({mode,sourceHash,proof:'Native 390 CSS pixels; production main loop advanced by controlled RAF in scratch only. Real game inputs for charge sequence; Fixture placement then real simulation landing for later named contacts; bell landing arrives with vx100 and axis0, then brakes naturally. Character response source unchanged except scratch read-only inspection. No timing performance claim.',errors,pauseStable:JSON.stringify(beforePause)===JSON.stringify(afterPause),records},null,2));
  console.log(JSON.stringify({mode,errors,pauseStable:JSON.stringify(beforePause)===JSON.stringify(afterPause),records:records.map(r=>({name:r.name,air:r.snapshot.player.airJumps,ground:r.snapshot.player.grounded,event:r.event?.type,jumpAge:r.character.jumpAge,missing:r.character.pose.missing,listenAge:r.character.listenAge,lookX:r.character.pose.lookX,bend:r.character.pose.bend,rest:r.character.pose.rest}))}));
  await context.close();
 }
} finally {await browser.close();}
