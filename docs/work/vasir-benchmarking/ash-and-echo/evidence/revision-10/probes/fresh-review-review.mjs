import { chromium } from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out = '/Users/erikhazzard/code/vasir/tmp/ash-and-echo/shared-light-pass/fresh-review';
const sourceRoot = '/Users/erikhazzard/code/vasir/site/ash-and-echo';
const files = ['lighting.js','renderer.js','atmosphere.js','depth.js','foreground.js','surface-ash.js','character.js','game.js','main.js'];
await fs.mkdir(out+'/served-source',{recursive:true});
const hash = b => createHash('sha256').update(b).digest('hex');
const report = {method:'390x844 CSS pixels, DPR1. Opening live browser input, then native keyboard input with controlled shipping RAF. No simulation placements during charge or opening route. Later lighting/rest probes explicitly arranged. No audio or phone performance judgment.',before:{},served:{},frames:[],errors:[]};
for(const f of files) report.before[f]=hash(await fs.readFile(sourceRoot+'/'+f));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const pending=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const attach=page=>{page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{const f=new URL(r.url()).pathname.split('/').at(-1);if(files.includes(f))pending.push((async()=>{const b=await r.body();report.served[f]=hash(b);await fs.writeFile(out+'/served-source/'+f,b);})());});};
  const live=await context.newPage();attach(live);
  await live.goto('http://localhost:8317/?fresh-review='+Date.now());
  await live.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);
  await live.locator('#start-button').tap();
  await live.screenshot({path:out+'/live-00-before.png'});
  await live.keyboard.down('Space');await live.waitForTimeout(100);
  await live.screenshot({path:out+'/live-01-input.png'});
  await live.keyboard.up('Space');await live.waitForTimeout(700);
  await live.screenshot({path:out+'/live-02-after.png'});
  report.live=await live.evaluate(()=>({snapshot:window.__echo.snapshot(),events:window.__echo.eventLog}));
  await live.close();
  const page=await context.newPage();attach(page);
  await page.addInitScript(()=>{let t=1000,id=0;const queue=new Map();window.requestAnimationFrame=fn=>(queue.set(++id,fn),id);window.cancelAnimationFrame=id=>queue.delete(id);window.__reviewAdvance=n=>{for(let i=0;i<n;i++){t+=1000/120;const q=[...queue.values()];queue.clear();for(const fn of q)fn(t);}};});
  await page.goto('http://localhost:8317/?fresh-review='+Date.now());
  await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled,null,{polling:50});await page.locator('#start-button').tap();
  const advance=n=>page.evaluate(n=>window.__reviewAdvance(n),n);
  const state=()=>page.evaluate(()=>({snapshot:window.__echo.snapshot(),events:window.__echo.eventLog.slice(-12),ash:window.__echo.renderer.sceneryState.surfaceAsh}));
  const shot=async(name,kind='ordinary controlled-clock input')=>{await page.screenshot({path:out+'/'+name+'.png'});report.frames.push({name,kind,...await state()});};
  await advance(3);await shot('charge-00-before');
  await page.keyboard.down('Space');await advance(26);await shot('charge-01-held');
  await page.keyboard.up('Space');await advance(1);await page.keyboard.down('Space');await advance(1);await shot('charge-02-spend');
  await advance(12);await shot('charge-03-100ms');await advance(48);await shot('charge-04-500ms');await advance(20);await shot('charge-05-667ms');await page.keyboard.up('Space');
  for(let i=0;i<180;i++){if((await state()).snapshot.player.grounded)break;await advance(1);}
  await shot('charge-06-land');await advance(14);await shot('charge-07-refilling');await advance(36);await shot('charge-08-refilled');
  await page.keyboard.press('KeyR');await advance(3);
  let cursor=await page.evaluate(()=>window.__echo.eventLog.length),stage=0,stageStart=0,jumpStart=-1,axis=0,held=false,kicked=false,doubled=false;
  const targets=['first-hop','second-hop','wall-transfer','resonant-stone','opening-refuge'];
  const input=async(a,h)=>{if(a!==axis){if(axis)await page.keyboard.up(axis<0?'ArrowLeft':'ArrowRight');if(a)await page.keyboard.down(a<0?'ArrowLeft':'ArrowRight');axis=a;}if(h!==held){if(h)await page.keyboard.down('Space');else await page.keyboard.up('Space');held=h;}};
  for(let count=0;count<2000&&stage<5;count++){
    const s=await page.evaluate(cursor=>({p:{...window.__echo.game.player},time:window.__echo.game.elapsed,deaths:window.__echo.game.deaths,platforms:window.__echo.game.platforms.filter(p=>p.landmark),events:window.__echo.eventLog.slice(cursor),cursor:window.__echo.eventLog.length}),cursor);cursor=s.cursor;
    if(s.deaths){report.routeFailure='death';break;}
    const target=s.platforms.find(p=>p.id===targets[stage]);
    if(s.events.some(e=>e.type==='wallJump'))await shot('route-wall-kick');
    if(s.events.some(e=>e.type==='land'&&e.platformId===target.id)){
      await input(0,false);await shot('route-'+target.id+'-contact');
      await advance(14);await shot('route-'+target.id+'-brake-117ms');
      if(stage===3||stage===4){await advance(40);await shot('route-'+target.id+'-rest-450ms');await advance(72);await shot('route-'+target.id+'-rest-1050ms');}
      stage++;stageStart=(await state()).snapshot.elapsed;jumpStart=-1;continue;
    }
    const p=s.p,d=target.x+target.w/2-p.x-p.w/2;let a=Math.abs(d)<Math.max(3,p.vx*p.vx/3800)?0:Math.sign(d),h=held;
    if(s.time-stageStart<.35){a=0;h=false;}else if(p.grounded&&jumpStart<0){h=true;jumpStart=s.time;}
    if(stage<2&&jumpStart>=0&&s.time-jumpStart>.11)h=false;
    if(stage===2&&!kicked){a=s.time-stageStart<.35?0:1;if(!p.grounded&&p.wallDir===1&&p.vy>0){if(held)h=false;else{h=true;kicked=true;}}}
    if(stage===3&&!doubled&&jumpStart>=0&&s.time-jumpStart>.35&&p.vy> -130){if(held)h=false;else{h=true;doubled=true;}}
    await input(a,h);await advance(2);
  }
  await input(0,false);report.routeStage=stage;report.routeEvents=await page.evaluate(()=>window.__echo.eventLog);
  // Arranged placement skips travel, then real collision produces the event.
  for(const [label,id,x,vx] of [['bell-still','resonant-stone',327,0],['bell-braking','resonant-stone',287,100],['refuge','opening-refuge',198,0]]){
    await page.evaluate(({id,x,vx})=>{const e=window.__echo;e.restart();const p=e.game.platforms.find(p=>p.id===id);Object.assign(e.game.player,{x,y:p.y-29,vx,vy:45,grounded:false,airJumps:0,motion:'fall'});e.game.cameraY=p.y-470;},{id,x,vx});
    for(const [n,t] of [[8,'contact'],[36,'367ms'],[18,'517ms'],[66,'1067ms']]){await advance(n);await shot('arranged-'+label+'-'+t,'arranged landing then real simulation');}
    await page.keyboard.down('ArrowLeft');await advance(2);await shot('arranged-'+label+'-move','arranged landing then native input');await page.keyboard.up('ArrowLeft');
  }
  for(const [label,camera,x,y] of [['light-crossing',2470,105,2840],['light-refuge',3520,198,3710],['light-upper',1000,170,1400],['light-summit',0,180,212]]){
    await page.evaluate(({camera,x,y})=>{const e=window.__echo;e.restart();Object.assign(e.game.player,{x,y,vx:0,vy:0,grounded:true,motion:'idle'});e.game.cameraY=camera;e.renderer.render(e.game,0);},{camera,x,y});
    await shot('arranged-'+label,'arranged composition; no reachability claim');
  }
  await context.close();
} catch(e){report.failure=String(e);console.error(e);}
finally {await Promise.allSettled(pending);await browser.close();report.browserClosed=true;report.after={};for(const f of files)report.after[f]=hash(await fs.readFile(sourceRoot+'/'+f));await fs.writeFile(out+'/review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({errors:report.errors,failure:report.failure,routeStage:report.routeStage,frames:report.frames.length,sourceChanged:files.filter(f=>report.before[f]!==report.after[f]),browserClosed:report.browserClosed}));}
